#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <roapi.h>
#include <propvarutil.h>
#include <wrl.h>
#include <wrl/implements.h>
#include <cstdio>
#include <cstdint>
#include <string>
#include <vector>
#include <atomic>

using Microsoft::WRL::ComPtr;
using Microsoft::WRL::RuntimeClass;
using Microsoft::WRL::RuntimeClassFlags;
using Microsoft::WRL::ClassicCom;
using Microsoft::WRL::FtmBase;

static HANDLE gStopEvent = nullptr;
static BOOL WINAPI consoleHandler(DWORD type){
  if(type==CTRL_C_EVENT||type==CTRL_BREAK_EVENT||type==CTRL_CLOSE_EVENT){if(gStopEvent)SetEvent(gStopEvent);return TRUE;}return FALSE;
}

class ActivationHandler final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, FtmBase, IActivateAudioInterfaceCompletionHandler>{
public:
  ActivationHandler():done_(CreateEventW(nullptr,TRUE,FALSE,nullptr)){}
  ~ActivationHandler(){if(done_)CloseHandle(done_);}
  HRESULT STDMETHODCALLTYPE ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) override{
    HRESULT hr=S_OK;ComPtr<IUnknown> activated;HRESULT activateHr=E_FAIL;
    if(!operation)hr=E_POINTER;else hr=operation->GetActivateResult(&activateHr,&activated);
    if(SUCCEEDED(hr))hr=activateHr;if(SUCCEEDED(hr)&&activated)hr=activated.As(&client_);result_=hr;SetEvent(done_);return S_OK;
  }
  HRESULT Wait(IAudioClient** client){const DWORD wait=WaitForSingleObject(done_,15000);if(wait!=WAIT_OBJECT_0)return HRESULT_FROM_WIN32(wait==WAIT_TIMEOUT?ERROR_TIMEOUT:ERROR_GEN_FAILURE);if(FAILED(result_))return result_;if(!client_)return E_FAIL;return client_.CopyTo(client);}
private:
  HANDLE done_=nullptr;HRESULT result_=E_PENDING;ComPtr<IAudioClient> client_;
};

static bool parseUInt(const wchar_t* text,DWORD& out){if(!text||!*text)return false;wchar_t* end=nullptr;unsigned long value=wcstoul(text,&end,10);if(!end||*end||value==0||value>0x7fffffffUL)return false;out=static_cast<DWORD>(value);return true;}
static void usage(){fwprintf(stderr,L"cfs-audio-loopback --pid <pid> [--include-tree|--exclude-tree] --stdout-s16le --rate 48000 --channels 2\n");}

int wmain(int argc,wchar_t** argv){
  DWORD pid=0;PROCESS_LOOPBACK_MODE mode=PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;bool stdoutPcm=false;
  for(int i=1;i<argc;i++){
    std::wstring arg=argv[i];
    if(arg==L"--pid"&&i+1<argc){if(!parseUInt(argv[++i],pid)){usage();return 2;}}
    else if(arg==L"--include-tree")mode=PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;
    else if(arg==L"--exclude-tree")mode=PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE;
    else if(arg==L"--stdout-s16le")stdoutPcm=true;
    else if((arg==L"--rate"||arg==L"--channels")&&i+1<argc){++i;}
    else if(arg==L"--probe"){fwprintf(stdout,L"CFS_AUDIO_LOOPBACK_V1\n");return 0;}
    else{usage();return 2;}
  }
  if(!pid||!stdoutPcm){usage();return 2;}

  HRESULT hr=RoInitialize(RO_INIT_MULTITHREADED);const bool roOk=SUCCEEDED(hr)||hr==S_FALSE;if(!roOk){fwprintf(stderr,L"RoInitialize failed: 0x%08lx\n",hr);return 3;}
  gStopEvent=CreateEventW(nullptr,TRUE,FALSE,nullptr);HANDLE audioEvent=CreateEventW(nullptr,FALSE,FALSE,nullptr);SetConsoleCtrlHandler(consoleHandler,TRUE);
  if(!gStopEvent||!audioEvent){fwprintf(stderr,L"Event creation failed.\n");return 4;}

  AUDIOCLIENT_ACTIVATION_PARAMS params{};params.ActivationType=AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;params.ProcessLoopbackParams.TargetProcessId=pid;params.ProcessLoopbackParams.ProcessLoopbackMode=mode;
  PROPVARIANT activation{};PropVariantInit(&activation);activation.vt=VT_BLOB;activation.blob.cbSize=sizeof(params);activation.blob.pBlobData=reinterpret_cast<BYTE*>(&params);
  ComPtr<ActivationHandler> handler=Microsoft::WRL::Make<ActivationHandler>();ComPtr<IActivateAudioInterfaceAsyncOperation> operation;
  hr=ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,__uuidof(IAudioClient),&activation,handler.Get(),&operation);
  if(FAILED(hr)){fwprintf(stderr,L"ActivateAudioInterfaceAsync failed: 0x%08lx\n",hr);return 5;}
  ComPtr<IAudioClient> client;hr=handler->Wait(&client);if(FAILED(hr)){fwprintf(stderr,L"Process loopback activation failed: 0x%08lx\n",hr);return 6;}

  WAVEFORMATEX format{};format.wFormatTag=WAVE_FORMAT_PCM;format.nChannels=2;format.nSamplesPerSec=48000;format.wBitsPerSample=16;format.nBlockAlign=static_cast<WORD>(format.nChannels*format.wBitsPerSample/8);format.nAvgBytesPerSec=format.nSamplesPerSec*format.nBlockAlign;format.cbSize=0;
  hr=client->Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_LOOPBACK|AUDCLNT_STREAMFLAGS_EVENTCALLBACK|AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM|AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,0,0,&format,nullptr);
  if(FAILED(hr)){fwprintf(stderr,L"IAudioClient::Initialize failed: 0x%08lx\n",hr);return 7;}
  hr=client->SetEventHandle(audioEvent);if(FAILED(hr)){fwprintf(stderr,L"SetEventHandle failed: 0x%08lx\n",hr);return 8;}
  ComPtr<IAudioCaptureClient> capture;hr=client->GetService(__uuidof(IAudioCaptureClient),reinterpret_cast<void**>(capture.GetAddressOf()));if(FAILED(hr)){fwprintf(stderr,L"GetService failed: 0x%08lx\n",hr);return 9;}
  hr=client->Start();if(FAILED(hr)){fwprintf(stderr,L"Start failed: 0x%08lx\n",hr);return 10;}

  HANDLE stdoutHandle=GetStdHandle(STD_OUTPUT_HANDLE);std::vector<BYTE> silence;HANDLE waits[2]={gStopEvent,audioEvent};
  while(true){DWORD wait=WaitForMultipleObjects(2,waits,FALSE,2000);if(wait==WAIT_OBJECT_0)break;if(wait!=WAIT_OBJECT_0+1&&wait!=WAIT_TIMEOUT)break;
    UINT32 packet=0;while(SUCCEEDED(capture->GetNextPacketSize(&packet))&&packet){BYTE* data=nullptr;UINT32 frames=0;DWORD flags=0;hr=capture->GetBuffer(&data,&frames,&flags,nullptr,nullptr);if(FAILED(hr))break;DWORD bytes=frames*format.nBlockAlign;const BYTE* writeData=data;
      if(flags&AUDCLNT_BUFFERFLAGS_SILENT){silence.assign(bytes,0);writeData=silence.data();}
      DWORD written=0;if(bytes&&!WriteFile(stdoutHandle,writeData,bytes,&written,nullptr)){capture->ReleaseBuffer(frames);SetEvent(gStopEvent);break;}capture->ReleaseBuffer(frames);
    }
  }
  client->Stop();CloseHandle(audioEvent);CloseHandle(gStopEvent);gStopEvent=nullptr;RoUninitialize();return 0;
}
