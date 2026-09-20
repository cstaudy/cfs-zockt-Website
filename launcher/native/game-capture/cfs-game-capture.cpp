#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <dxgierror.h>
#include <dwmapi.h>
#include <io.h>
#include <fcntl.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <mutex>
#include <string>
#include <thread>
#include <vector>
#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")
#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "windowsapp.lib")
#pragma comment(lib, "RuntimeObject.lib")

using namespace std::chrono_literals;
using namespace winrt;
using namespace Windows::Graphics;
using namespace Windows::Graphics::Capture;
using namespace Windows::Graphics::DirectX;
using namespace Windows::Graphics::DirectX::Direct3D11;

static constexpr const char* kProtocol = "CFS_GAME_CAPTURE_WGC_V1";
static constexpr int kExitWindowClosed = 31;
static constexpr int kExitFrameStall = 32;
static constexpr int kExitDeviceLost = 33;
static constexpr int kExitCaptureError = 34;

struct Options {
  DWORD pid = 0;
  int width = 1920;
  int height = 1080;
  int fps = 60;
  bool cursor = true;
  int stallTimeoutMs = 5000;
  int startTimeoutMs = 8000;
};

static int clampi(int value, int lo, int hi) { return std::max(lo, std::min(hi, value)); }

static bool parse_int(const wchar_t* text, int& out) {
  if (!text || !*text) return false;
  wchar_t* end = nullptr;
  long value = wcstol(text, &end, 10);
  if (!end || *end != L'\0') return false;
  out = static_cast<int>(value);
  return true;
}

static bool capturable_window_score(HWND hwnd, DWORD pid, uint64_t& score) {
  score = 0;
  if (!IsWindow(hwnd) || !IsWindowVisible(hwnd)) return false;
  DWORD ownerPid = 0;
  GetWindowThreadProcessId(hwnd, &ownerPid);
  if (ownerPid != pid) return false;
  if (GetWindow(hwnd, GW_OWNER) != nullptr) return false;
  BOOL cloaked = FALSE;
  if (SUCCEEDED(DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked, sizeof(cloaked))) && cloaked) return false;
  RECT rect{};
  if (!GetClientRect(hwnd, &rect)) return false;
  const int w = rect.right - rect.left, h = rect.bottom - rect.top;
  if (w <= 1 || h <= 1) return false;
  score = static_cast<uint64_t>(w) * static_cast<uint64_t>(h);
  if (IsIconic(hwnd)) score /= 4;
  return true;
}

struct FindWindowContext { DWORD pid; HWND hwnd; uint64_t score; };
static BOOL CALLBACK enum_windows_proc(HWND hwnd, LPARAM param) {
  auto* ctx = reinterpret_cast<FindWindowContext*>(param);
  if (!ctx) return TRUE;
  uint64_t score = 0;
  if (capturable_window_score(hwnd, ctx->pid, score) && score > ctx->score) { ctx->hwnd = hwnd; ctx->score = score; }
  return TRUE;
}

static HWND find_window_for_pid(DWORD pid) {
  FindWindowContext ctx{pid, nullptr, 0};
  EnumWindows(enum_windows_proc, reinterpret_cast<LPARAM>(&ctx));
  return ctx.hwnd;
}

static uint64_t steady_ms() {
  return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count());
}

static bool is_device_lost_hresult(HRESULT hr) {
  return hr == DXGI_ERROR_DEVICE_REMOVED || hr == DXGI_ERROR_DEVICE_RESET || hr == DXGI_ERROR_DEVICE_HUNG || hr == DXGI_ERROR_DRIVER_INTERNAL_ERROR;
}

static IDirect3DDevice create_winrt_device(winrt::com_ptr<ID3D11Device>& d3d, winrt::com_ptr<ID3D11DeviceContext>& context) {
  UINT flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#if defined(_DEBUG)
  flags |= D3D11_CREATE_DEVICE_DEBUG;
#endif
  D3D_FEATURE_LEVEL featureLevel{};
  winrt::check_hresult(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, flags, nullptr, 0, D3D11_SDK_VERSION, d3d.put(), &featureLevel, context.put()));
  auto dxgi = d3d.as<IDXGIDevice>();
  winrt::com_ptr<IInspectable> inspectable;
  winrt::check_hresult(CreateDirect3D11DeviceFromDXGIDevice(dxgi.get(), inspectable.put()));
  return inspectable.as<IDirect3DDevice>();
}

static GraphicsCaptureItem create_item_for_window(HWND hwnd) {
  auto factory = winrt::get_activation_factory<GraphicsCaptureItem, IGraphicsCaptureItemInterop>();
  GraphicsCaptureItem item{nullptr};
  winrt::check_hresult(factory->CreateForWindow(hwnd, winrt::guid_of<GraphicsCaptureItem>(), winrt::put_abi(item)));
  return item;
}

static void scale_bgra_letterbox(const uint8_t* src, int srcW, int srcH, int srcStride, std::vector<uint8_t>& out, int outW, int outH) {
  if (!src || srcW <= 0 || srcH <= 0 || srcStride <= 0 || outW <= 0 || outH <= 0) return;
  const size_t bytes = static_cast<size_t>(outW) * static_cast<size_t>(outH) * 4u;
  out.assign(bytes, 0);
  for (size_t i = 3; i < out.size(); i += 4) out[i] = 255;
  const double scale = std::min(static_cast<double>(outW) / srcW, static_cast<double>(outH) / srcH);
  const int drawW = std::max(1, static_cast<int>(srcW * scale));
  const int drawH = std::max(1, static_cast<int>(srcH * scale));
  const int offX = (outW - drawW) / 2;
  const int offY = (outH - drawH) / 2;
  for (int y = 0; y < drawH; ++y) {
    const int sy = std::min(srcH - 1, static_cast<int>(static_cast<int64_t>(y) * srcH / drawH));
    const uint8_t* srcRow = src + static_cast<size_t>(sy) * srcStride;
    uint8_t* dstRow = out.data() + (static_cast<size_t>(offY + y) * outW + offX) * 4u;
    for (int x = 0; x < drawW; ++x) {
      const int sx = std::min(srcW - 1, static_cast<int>(static_cast<int64_t>(x) * srcW / drawW));
      const uint8_t* p = srcRow + static_cast<size_t>(sx) * 4u;
      uint8_t* q = dstRow + static_cast<size_t>(x) * 4u;
      q[0] = p[0]; q[1] = p[1]; q[2] = p[2]; q[3] = 255;
    }
  }
}

static bool write_all(HANDLE out, const uint8_t* data, size_t bytes) {
  size_t offset = 0;
  while (offset < bytes) {
    DWORD written = 0;
    const DWORD chunk = static_cast<DWORD>(std::min<size_t>(bytes - offset, 1u << 20));
    if (!WriteFile(out, data + offset, chunk, &written, nullptr) || written == 0) return false;
    offset += written;
  }
  return true;
}

static int run_capture(const Options& opt) {
  winrt::init_apartment(winrt::apartment_type::multi_threaded);
  if (!GraphicsCaptureSession::IsSupported()) {
    std::cerr << "Windows.Graphics.Capture is not supported on this system.\n";
    return 11;
  }
  HWND hwnd = find_window_for_pid(opt.pid);
  if (!hwnd) {
    std::cerr << "No visible top-level window found for PID " << opt.pid << ".\n";
    return 12;
  }

  winrt::com_ptr<ID3D11Device> d3d;
  winrt::com_ptr<ID3D11DeviceContext> context;
  auto device = create_winrt_device(d3d, context);
  auto item = create_item_for_window(hwnd);
  auto initialSize = item.Size();
  if (initialSize.Width <= 0 || initialSize.Height <= 0) return 13;

  auto framePool = Direct3D11CaptureFramePool::CreateFreeThreaded(device, DirectXPixelFormat::B8G8R8A8UIntNormalized, 2, initialSize);
  auto session = framePool.CreateCaptureSession(item);
  try { session.IsCursorCaptureEnabled(opt.cursor); } catch (...) {}

  std::atomic_bool running{true};
  std::mutex frameMutex;
  std::vector<uint8_t> latest(static_cast<size_t>(opt.width) * static_cast<size_t>(opt.height) * 4u, 0);
  for (size_t i = 3; i < latest.size(); i += 4) latest[i] = 255;
  std::atomic_bool haveFrame{false};
  std::atomic<uint64_t> lastSourceFrameMs{0};
  std::atomic<int> fatalExitCode{0};
  winrt::com_ptr<ID3D11Texture2D> staging;
  UINT stagingW = 0, stagingH = 0;

  auto closedToken = item.Closed([&](auto const&, auto const&) {
    fatalExitCode.store(kExitWindowClosed, std::memory_order_release);
    std::cerr << "CFS_GAME_CAPTURE_EVENT window_closed\n";
    running = false;
  });
  auto frameToken = framePool.FrameArrived([&](Direct3D11CaptureFramePool const& sender, IInspectable const&) {
    try {
      auto frame = sender.TryGetNextFrame();
      if (!frame) return;
      auto content = frame.ContentSize();
      auto surface = frame.Surface();
      auto access = surface.as<IDirect3DDxgiInterfaceAccess>();
      winrt::com_ptr<ID3D11Texture2D> texture;
      winrt::check_hresult(access->GetInterface(__uuidof(ID3D11Texture2D), texture.put_void()));
      D3D11_TEXTURE2D_DESC desc{};
      texture->GetDesc(&desc);
      if (!staging || stagingW != desc.Width || stagingH != desc.Height) {
        D3D11_TEXTURE2D_DESC sd = desc;
        sd.BindFlags = 0;
        sd.MiscFlags = 0;
        sd.Usage = D3D11_USAGE_STAGING;
        sd.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
        sd.MipLevels = 1;
        sd.ArraySize = 1;
        staging = nullptr;
        winrt::check_hresult(d3d->CreateTexture2D(&sd, nullptr, staging.put()));
        stagingW = desc.Width; stagingH = desc.Height;
      }
      context->CopyResource(staging.get(), texture.get());
      D3D11_MAPPED_SUBRESOURCE mapped{};
      winrt::check_hresult(context->Map(staging.get(), 0, D3D11_MAP_READ, 0, &mapped));
      const int srcW = std::max(1, std::min<int>(static_cast<int>(desc.Width), content.Width));
      const int srcH = std::max(1, std::min<int>(static_cast<int>(desc.Height), content.Height));
      std::vector<uint8_t> scaled;
      scale_bgra_letterbox(static_cast<const uint8_t*>(mapped.pData), srcW, srcH, static_cast<int>(mapped.RowPitch), scaled, opt.width, opt.height);
      context->Unmap(staging.get(), 0);
      {
        std::lock_guard<std::mutex> lock(frameMutex);
        latest.swap(scaled);
        lastSourceFrameMs.store(steady_ms(), std::memory_order_release);
        haveFrame.store(true, std::memory_order_release);
      }
      if (content.Width > 0 && content.Height > 0 && (content.Width != initialSize.Width || content.Height != initialSize.Height)) {
        initialSize = content;
        try { framePool.Recreate(device, DirectXPixelFormat::B8G8R8A8UIntNormalized, 2, initialSize); } catch (...) {}
      }
    } catch (winrt::hresult_error const& e) {
      const HRESULT hr = static_cast<HRESULT>(e.code().value);
      const int exitCode = is_device_lost_hresult(hr) ? kExitDeviceLost : kExitCaptureError;
      fatalExitCode.store(exitCode, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT " << (exitCode == kExitDeviceLost ? "device_lost" : "capture_error") << " hr=0x" << std::hex << static_cast<uint32_t>(hr) << std::dec << "\n";
      running = false;
    } catch (...) {
      fatalExitCode.store(kExitCaptureError, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT capture_error\n";
      running = false;
    }
  });

  session.StartCapture();
  _setmode(_fileno(stdout), _O_BINARY);
  HANDLE out = GetStdHandle(STD_OUTPUT_HANDLE);
  if (out == INVALID_HANDLE_VALUE || out == nullptr) return 14;

  const auto interval = std::chrono::microseconds(1000000 / std::max(1, opt.fps));
  auto next = std::chrono::steady_clock::now();
  const uint64_t startedAtMs = steady_ms();
  std::vector<uint8_t> frameOut;
  while (running) {
    next += interval;
    if (!IsWindow(hwnd)) {
      fatalExitCode.store(kExitWindowClosed, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT window_closed\n";
      break;
    }
    const HRESULT removedReason = d3d->GetDeviceRemovedReason();
    if (FAILED(removedReason)) {
      fatalExitCode.store(kExitDeviceLost, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT device_lost hr=0x" << std::hex << static_cast<uint32_t>(removedReason) << std::dec << "\n";
      break;
    }
    const uint64_t nowMs = steady_ms(), sourceMs = lastSourceFrameMs.load(std::memory_order_acquire);
    if (!haveFrame.load(std::memory_order_acquire) && nowMs - startedAtMs > static_cast<uint64_t>(opt.startTimeoutMs)) {
      fatalExitCode.store(kExitFrameStall, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT startup_frame_timeout\n";
      break;
    }
    if (haveFrame.load(std::memory_order_acquire) && sourceMs && nowMs - sourceMs > static_cast<uint64_t>(opt.stallTimeoutMs)) {
      fatalExitCode.store(kExitFrameStall, std::memory_order_release);
      std::cerr << "CFS_GAME_CAPTURE_EVENT frame_stall\n";
      break;
    }
    if (haveFrame.load(std::memory_order_acquire)) {
      {
        std::lock_guard<std::mutex> lock(frameMutex);
        frameOut = latest;
      }
      if (!write_all(out, frameOut.data(), frameOut.size())) { running = false; break; }
    }
    std::this_thread::sleep_until(next);
  }

  try { framePool.FrameArrived(frameToken); } catch (...) {}
  try { item.Closed(closedToken); } catch (...) {}
  try { session.Close(); } catch (...) {}
  try { framePool.Close(); } catch (...) {}
  const int fatal = fatalExitCode.load(std::memory_order_acquire);
  if (fatal) return fatal;
  return haveFrame.load(std::memory_order_acquire) ? 0 : 15;
}

int wmain(int argc, wchar_t** argv) {
  if (argc >= 2 && std::wstring(argv[1]) == L"--probe") {
    try {
      winrt::init_apartment(winrt::apartment_type::multi_threaded);
      if (!GraphicsCaptureSession::IsSupported()) return 2;
      std::cout << kProtocol << std::endl;
      return 0;
    } catch (...) { return 3; }
  }

  Options opt;
  for (int i = 1; i < argc; ++i) {
    const std::wstring arg = argv[i];
    auto nextValue = [&](int& target) -> bool { if (i + 1 >= argc) return false; ++i; return parse_int(argv[i], target); };
    if (arg == L"--pid") { int value = 0; if (!nextValue(value) || value <= 0) return 4; opt.pid = static_cast<DWORD>(value); }
    else if (arg == L"--width") { int value = 0; if (!nextValue(value)) return 4; opt.width = clampi(value, 64, 3840); }
    else if (arg == L"--height") { int value = 0; if (!nextValue(value)) return 4; opt.height = clampi(value, 64, 2160); }
    else if (arg == L"--fps") { int value = 0; if (!nextValue(value)) return 4; opt.fps = clampi(value, 15, 60); }
    else if (arg == L"--cursor") { int value = 1; if (!nextValue(value)) return 4; opt.cursor = value != 0; }
    else if (arg == L"--stall-timeout-ms") { int value = 0; if (!nextValue(value)) return 4; opt.stallTimeoutMs = clampi(value, 2000, 30000); }
    else if (arg == L"--start-timeout-ms") { int value = 0; if (!nextValue(value)) return 4; opt.startTimeoutMs = clampi(value, opt.stallTimeoutMs, 60000); }
    else { std::wcerr << L"Unknown argument: " << arg << L"\n"; return 4; }
  }
  if (!opt.pid) { std::cerr << "Missing --pid.\n"; return 4; }
  try { return run_capture(opt); }
  catch (winrt::hresult_error const& e) { std::wcerr << L"Capture failed: " << e.message().c_str() << L" (0x" << std::hex << static_cast<uint32_t>(e.code()) << L")\n"; return 20; }
  catch (std::exception const& e) { std::cerr << "Capture failed: " << e.what() << "\n"; return 21; }
  catch (...) { std::cerr << "Capture failed.\n"; return 22; }
}
