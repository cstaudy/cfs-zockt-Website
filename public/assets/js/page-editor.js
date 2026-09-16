  document.addEventListener("DOMContentLoaded", async () => {

  const $ = id =>
    document.getElementById(id);


  /* =========================================================
     DOM
     ========================================================= */

  const editorForm = $("editorForm");
  const creatorName = $("creatorName");
  const creatorPlan = $("creatorPlan");
  const creatorBio = $("creatorBio");
  const creatorAccent = $("creatorAccent");
  const themeSelect = $("themeSelect");
  const startModule = $("startModule");

  const previewName = $("previewName");
  const previewBio = $("previewBio");
  const previewPlan = $("previewPlan");

  const profileMessage = $("profileMessage");
  const syncInfo = $("syncInfo");
  const settingsStatus = $("settingsStatus");

  const widgetTabs = $("widgetTabs");
  const editorWidgetChip = $("editorWidgetChip");

  const widgetEnabled = $("widgetEnabled");
  const widgetTitle = $("widgetTitle");
  const supportTemplate = $("supportTemplate");
  const supportText = $("supportText");

  const widgetCreatorName = $("widgetCreatorName");
  const imageMode = $("imageMode");
  const creatorImageFile = $("creatorImageFile");
  const identityUploadPreview = $("identityUploadPreview");
  const removeCreatorImage = $("removeCreatorImage");

  const showCreatorName = $("showCreatorName");
  const showSupportText = $("showSupportText");
  const showImage = $("showImage");
  const showValue = $("showValue");

  const themePresetGrid = $("themePresetGrid");
  const presetGrid = $("presetGrid");

  const goalField = $("goalField");
  const widgetGoal = $("widgetGoal");
  const testValue = $("testValue");
  const testMode = $("testMode");
  const numberFormat = $("numberFormat");
  const progressStyle = $("progressStyle");
  const progressHeight = $("progressHeight");
  const progressHeightOut = $("progressHeightOut");
  const showProgress = $("showProgress");
  const showPercent = $("showPercent");
  const widgetDataHint = $("widgetDataHint");

  const thanksOptions = $("thanksOptions");
  const thanksText = $("thanksText");
  const thanksTestName = $("thanksTestName");
  const thanksEvent = $("thanksEvent");

  const widgetAccent = $("widgetAccent");
  const widgetAccentHex = $("widgetAccentHex");
  const widgetAccent2 = $("widgetAccent2");
  const widgetAccent2Hex = $("widgetAccent2Hex");
  const widgetBackground = $("widgetBackground");
  const widgetBackgroundHex = $("widgetBackgroundHex");
  const widgetTextColor = $("widgetTextColor");
  const widgetTextColorHex = $("widgetTextColorHex");

  const widgetOpacity = $("widgetOpacity");
  const widgetOpacityOut = $("widgetOpacityOut");

  const widgetFontSize = $("widgetFontSize");
  const widgetFontSizeOut = $("widgetFontSizeOut");

  const avatarSize = $("avatarSize");
  const avatarSizeOut = $("avatarSizeOut");

  const widgetBorderWidth = $("widgetBorderWidth");
  const widgetBorderWidthOut = $("widgetBorderWidthOut");

  const widgetRadius = $("widgetRadius");
  const widgetRadiusOut = $("widgetRadiusOut");

  const avatarShape = $("avatarShape");
  const widgetAlignment = $("widgetAlignment");
  const widgetDensity = $("widgetDensity");
  const widgetAnimation = $("widgetAnimation");

  const showShadow = $("showShadow");
  const showGlow = $("showGlow");
  const showBlur = $("showBlur");

  const previewOnlyNotice = $("previewOnlyNotice");

  const restoreSavedBtn = $("restoreSavedBtn");
  const resetWidgetBtn = $("resetWidgetBtn");
  const saveStudioBtn = $("saveStudioBtn");
  const saveStateChip = $("saveStateChip");
  const saveStateChipTop = $("saveStateChipTop");
  const studioMessage = $("studioMessage");

  const tiktokStatusChip = $("tiktokStatusChip");
  const dataModeChip = $("dataModeChip");
  const activeWidgetChip = $("activeWidgetChip");
  const previewAccessChip = $("previewAccessChip");

  const tiktokStage = $("tiktokStage");
  const previewCanvas = $("previewCanvas");
  const previewModeNote = $("previewModeNote");

  const zoomOutBtn = $("zoomOutBtn");
  const zoomInBtn = $("zoomInBtn");
  const zoomValue = $("zoomValue");

  const tiktokWidgetPreview = $("tiktokWidgetPreview");

  const normalWidgetContent = $("normalWidgetContent");
  const thanksWidgetContent = $("thanksWidgetContent");

  const widgetAvatar = $("widgetAvatar");
  const previewCreatorName = $("previewCreatorName");
  const previewWidgetTitle = $("previewWidgetTitle");
  const previewSupportText = $("previewSupportText");
  const previewValue = $("previewValue");
  const previewPercent = $("previewPercent");
  const previewProgress = $("previewProgress");
  const previewProgressBar = $("previewProgressBar");

  const thanksAvatar = $("thanksAvatar");
  const thanksCreatorName = $("thanksCreatorName");
  const previewThanksMessage = $("previewThanksMessage");
  const previewThanksEvent = $("previewThanksEvent");

  const dataCreatorName = $("dataCreatorName");
  const dataFollowers = $("dataFollowers");
  const dataLikes = $("dataLikes");
  const dataWidgetType = $("dataWidgetType");

  const sourceUrl = $("sourceUrl");
  const copySourceBtn = $("copySourceBtn");
  const openSourceBtn = $("openSourceBtn");
  const rotateSourceBtn = $("rotateSourceBtn");


  /* =========================================================
     STATE
     ========================================================= */

  let account = null;
  let entitlements = null;

  let currentSettings = {};
  let savedSettingsSnapshot = {};

  let activeWidget = "follower";

  let customImageData = "";

  let liveFollowers = 0;
  let liveLikes = 0;

  let liveLikesAvailable = false;

  let liveTikTokName = "";
  let liveTikTokAvatar = "";

  let tiktokConnected = false;

  let previewZoom = 100;

  let studioDirty = false;


  const widgetTypes = [
    "follower",
    "likes",
    "viewer",
    "gifts",
    "auto_thanks"
  ];


  /* =========================================================
     GENERAL HELPERS
     ========================================================= */

  function deepClone(value) {

    try {

      return JSON.parse(
        JSON.stringify(value || {})
      );

    } catch {

      return {};

    }

  }


  function hideNotice(element) {

    if (!element) return;

    element.textContent = "";
    element.className = "notice hidden";

  }


  function setNotice(
    element,
    text,
    danger = false
  ) {

    if (!element) return;

    element.textContent =
      String(text || "");

    element.className =
      danger
        ? "notice danger"
        : "notice";

  }


  function setChip(
    element,
    text,
    mode = ""
  ) {

    if (!element) return;

    element.className =
      `status-chip ${mode}`.trim();

    element.innerHTML = "";

    const dot =
      document.createElement("span");

    dot.className =
      "status-dot";

    element.append(
      dot,
      document.createTextNode(
        String(text || "")
      )
    );

  }


  function setSaveState(dirty) {

    studioDirty =
      Boolean(dirty);

    const text =
      studioDirty
        ? "UNGESPEICHERT"
        : "GESPEICHERT";

    const mode =
      studioDirty
        ? "warn"
        : "good";

    setChip(
      saveStateChip,
      text,
      mode
    );

    setChip(
      saveStateChipTop,
      text,
      mode
    );

  }


  function markDirty() {

    /*
      Gesperrte Widgets sind Preview-only.
      Änderungen dort dürfen den gespeicherten
      Studio-State nicht verändern.
    */

    if (!canUseWidget(activeWidget)) {

      updateAccessUI();

      return;

    }

    setSaveState(true);

  }


  function planRank(plan) {

    const value =
      String(plan || "FREE")
        .toUpperCase();

    if (
      [
        "PRO",
        "BUSINESS",
        "ENTERPRISE"
      ].includes(value)
    ) {
      return 2;
    }

    if (
      [
        "CREATOR",
        "PLUS"
      ].includes(value)
    ) {
      return 1;
    }

    return 0;

  }


  function planLabel(plan) {

    if (
      window.CFS &&
      typeof CFS.planLabel === "function"
    ) {

      return CFS.planLabel(
        plan || "FREE"
      );

    }

    return String(
      plan || "FREE"
    ).toUpperCase();

  }


  function canUseWidget(type) {

    if (type === "follower") {
      return true;
    }

    return planRank(
      account?.plan
    ) >= 1;

  }


  function widgetLabel(type) {

    const labels = {

      follower: "FOLLOWER",
      likes: "LIKES",
      viewer: "VIEWER",
      gifts: "GIFTS",
      auto_thanks: "AUTOTHANKS"

    };

    return labels[type] ||
      "WIDGET";

  }


  function formatFull(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "de-DE"
    );

  }


  function formatCompact(value) {

    const number =
      Number(value || 0);

    if (number >= 1000000) {

      return (
        number /
        1000000
      ).toLocaleString(
        "de-DE",
        {
          maximumFractionDigits: 1
        }
      ) + "M";

    }

    if (number >= 1000) {

      return (
        number /
        1000
      ).toLocaleString(
        "de-DE",
        {
          maximumFractionDigits: 1
        }
      ) + "K";

    }

    return formatFull(number);

  }


  function displayNumber(
    value,
    format
  ) {

    return format === "compact"
      ? formatCompact(value)
      : formatFull(value);

  }


  function normalizeHex(
    value,
    fallback = "#0A8CFF"
  ) {

    let result =
      String(value || "")
        .trim()
        .toUpperCase();

    if (!result.startsWith("#")) {
      result = "#" + result;
    }

    if (
      /^#[0-9A-F]{6}$/.test(result)
    ) {
      return result;
    }

    return String(fallback)
      .toUpperCase();

  }


  function rgba(
    hex,
    opacity
  ) {

    const clean =
      normalizeHex(
        hex,
        "#071321"
      ).slice(1);

    const r =
      parseInt(
        clean.slice(0, 2),
        16
      );

    const g =
      parseInt(
        clean.slice(2, 4),
        16
      );

    const b =
      parseInt(
        clean.slice(4, 6),
        16
      );

    const alpha =
      Math.max(
        0,
        Math.min(
          1,
          Number(opacity) || 0
        )
      );

    return `rgba(${r},${g},${b},${alpha})`;

  }


  function safeImageSource(source) {

    const value =
      String(source || "");

    if (
      /^https:\/\//i.test(value)
    ) {
      return value;
    }

    if (
      /^data:image\/(?:jpeg|png|webp);base64,/i.test(
        value
      )
    ) {
      return value;
    }

    return "";

  }


  /* =========================================================
     PROFILE
     ========================================================= */

  function createThemeOptions(
    themes,
    selected
  ) {

    const list =
      Array.isArray(themes) &&
      themes.length
        ? themes
        : ["cfs"];

    themeSelect.innerHTML = "";

    list.forEach(theme => {

      const option =
        document.createElement(
          "option"
        );

      option.value = theme;

      option.textContent =
        String(theme)
          .toUpperCase();

      themeSelect.appendChild(
        option
      );

    });

    themeSelect.value =
      list.includes(selected)
        ? selected
        : list[0];

  }


  function renderProfile() {

    previewName.textContent =
      account?.display_name ||
      creatorName.value ||
      "Creator";

    previewBio.textContent =
      creatorBio.value.trim() ||
      "Deine Bio erscheint hier.";

    previewPlan.textContent =
      planLabel(
        account?.plan ||
        "FREE"
      );

  }


  /* =========================================================
     DEFAULT WIDGETS
     ========================================================= */

  function defaultWidget(type) {

    const base = {

      enabled: true,

      title: "TikTok Widget",

      support_text:
        "Danke für euren Support ❤️",

      creator_name: "",

      show_creator_name: true,
      show_support_text: true,
      show_image: true,
      show_value: true,

      image_mode: "tiktok",

      layout: "bar",

      goal: 250,

      test_value: 160,
      test_mode: false,

      theme_preset: "cfs",

      accent: "#0A8CFF",
      accent2: "#19C2FF",

      background: "#071321",
      text_color: "#F4F8FF",

      background_opacity: .9,

      font_size: 22,
      avatar_size: 68,

      border_width: 1,
      border_radius: 18,

      avatar_shape: "rounded",

      alignment: "left",
      density: "comfortable",

      animation: "none",

      number_format: "full",

      progress_style: "gradient",
      progress_height: 13,

      show_shadow: true,
      show_glow: false,
      show_blur: false,

      show_progress: true,
      show_percent: true,

      thanks_text:
        "Danke {name} für deinen Support ❤️",

      thanks_test_name:
        "Community",

      thanks_event:
        "support"

    };


    if (type === "follower") {

      return {
        ...base,

        title:
          "Road to 250",

        goal:
          250,

        test_value:
          160
      };

    }


    if (type === "likes") {

      return {
        ...base,

        title:
          "Road to 2.000 Likes",

        support_text:
          "Danke für euren Support 💙",

        goal:
          2000,

        test_value:
          1873
      };

    }


    if (type === "viewer") {

      return {
        ...base,

        title:
          "Live dabei",

        support_text:
          "Schön, dass ihr dabei seid ❤️",

        layout:
          "compact",

        goal:
          100,

        test_value:
          42,

        show_progress:
          false,

        show_percent:
          false
      };

    }


    if (type === "gifts") {

      return {
        ...base,

        title:
          "Gift Goal",

        support_text:
          "Danke für euren Support ✨",

        layout:
          "creator-card",

        goal:
          25,

        test_value:
          8
      };

    }


    return {
      ...base,

      title:
        "Community Support",

      layout:
        "creator-card",

      show_value:
        false,

      show_progress:
        false,

      show_percent:
        false,

      animation:
        "pulse",

      thanks_text:
        "Danke {name} für deinen Support ❤️",

      thanks_test_name:
        "Community",

      thanks_event:
        "support"
    };

  }


  function defaultStudio() {

    return {

      version: 3,

      active_widget:
        "follower",

      custom_image_data:
        "",

      preview_scene:
        "grid",

      preview_zoom:
        100,

      widgets: {

        follower:
          defaultWidget(
            "follower"
          ),

        likes:
          defaultWidget(
            "likes"
          ),

        viewer:
          defaultWidget(
            "viewer"
          ),

        gifts:
          defaultWidget(
            "gifts"
          ),

        auto_thanks:
          defaultWidget(
            "auto_thanks"
          )

      }

    };

  }


  function getStudioFrom(settings) {

    const defaults =
      defaultStudio();

    const stored =
      settings
        ?.widgets
        ?.tiktok_studio;

    if (
      !stored ||
      typeof stored !== "object" ||
      Array.isArray(stored)
    ) {
      return defaults;
    }

    const studio = {

      ...defaults,
      ...stored,

      widgets: {
        ...defaults.widgets,
        ...(stored.widgets || {})
      }

    };

    widgetTypes.forEach(type => {

      studio.widgets[type] = {

        ...defaults.widgets[type],
        ...(stored.widgets?.[type] || {})

      };

    });

    studio.version = 3;

    return studio;

  }


  function getStudio() {

    return getStudioFrom(
      currentSettings
    );

  }


  /* =========================================================
     ACCESS / FREE PREVIEW
     ========================================================= */

  function updateWidgetAccess() {

    widgetTabs
      .querySelectorAll(
        "[data-widget-type]"
      )
      .forEach(button => {

        const type =
          button.dataset.widgetType;

        const allowed =
          canUseWidget(type);

        button.classList.toggle(
          "locked",
          !allowed
        );

        const state =
          button.querySelector(
            ".widget-tab-state"
          );

        if (!state) return;

        state.textContent =
          allowed
            ? (
                type === "follower"
                  ? "●"
                  : "◈"
              )
            : "🔒";

      });

  }


  function updateAccessUI() {

    const allowed =
      canUseWidget(
        activeWidget
      );

    previewAccessChip.hidden =
      allowed;

    saveStudioBtn.disabled =
      !allowed;

    if (allowed) {

      hideNotice(
        previewOnlyNotice
      );

      return;

    }

    setChip(
      previewAccessChip,
      "PREVIEW · PLAN FEATURE",
      "warn"
    );

    setNotice(
      previewOnlyNotice,
      `${widgetLabel(activeWidget)} ist in deinem aktuellen Plan gesperrt. Du kannst das Widget hier ansehen und ausprobieren, Änderungen an diesem gesperrten Widget werden aber nicht gespeichert.`
    );

  }


  /* =========================================================
     LAYOUT
     ========================================================= */

  function selectedLayout() {

    return document
      .querySelector(
        'input[name="layoutPreset"]:checked'
      )
      ?.value ||
      "bar";

  }


  function selectLayout(value) {

    const allowed = [
      "bar",
      "compact",
      "card",
      "pill",
      "ring",
      "vertical",
      "minimal",
      "creator-card"
    ];

    const safe =
      allowed.includes(value)
        ? value
        : "bar";

    const radio =
      document.querySelector(
        `input[name="layoutPreset"][value="${safe}"]`
      );

    if (radio) {
      radio.checked = true;
    }

  }


  /* =========================================================
     THEMES
     ========================================================= */

  const widgetThemes = {

    cfs: {

      accent: "#0A8CFF",
      accent2: "#19C2FF",
      background: "#071321",
      text: "#F4F8FF",

      opacity: 90,
      border: 1,
      radius: 18,

      avatar: "rounded",
      alignment: "left",
      density: "comfortable",
      animation: "none",

      shadow: true,
      glow: false,
      blur: false

    },

    neon: {

      accent: "#905DFF",
      accent2: "#FF4ECD",
      background: "#10081D",
      text: "#FFF6FF",

      opacity: 92,
      border: 2,
      radius: 22,

      avatar: "circle",
      alignment: "left",
      density: "comfortable",
      animation: "shine",

      shadow: true,
      glow: true,
      blur: false

    },

    glass: {

      accent: "#38D8FF",
      accent2: "#4F7DFF",
      background: "#10223A",
      text: "#F7FBFF",

      opacity: 64,
      border: 1,
      radius: 24,

      avatar: "rounded",
      alignment: "left",
      density: "comfortable",
      animation: "none",

      shadow: true,
      glow: true,
      blur: true

    },

    clean: {

      accent: "#397CC5",
      accent2: "#70B9E8",
      background: "#EDF4FB",
      text: "#102235",

      opacity: 94,
      border: 1,
      radius: 16,

      avatar: "circle",
      alignment: "left",
      density: "comfortable",
      animation: "none",

      shadow: true,
      glow: false,
      blur: false

    },

    midnight: {

      accent: "#2478D1",
      accent2: "#4CB4FF",
      background: "#06101E",
      text: "#EAF4FF",

      opacity: 96,
      border: 1,
      radius: 14,

      avatar: "rounded",
      alignment: "left",
      density: "compact",
      animation: "none",

      shadow: true,
      glow: false,
      blur: false

    }

  };


  function selectThemePreset(name) {

    themePresetGrid
      .querySelectorAll(
        "[data-widget-theme]"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.widgetTheme === name
        );

      });

  }


  function setColorPair(
    picker,
    text,
    value
  ) {

    const normalized =
      normalizeHex(
        value,
        normalizeHex(
          picker.value ||
          "#0A8CFF"
        )
      );

    picker.value =
      normalized.toLowerCase();

    text.value =
      normalized;

  }


  function applyThemePreset(name) {

    const theme =
      widgetThemes[name];

    if (!theme) return;

    setColorPair(
      widgetAccent,
      widgetAccentHex,
      theme.accent
    );

    setColorPair(
      widgetAccent2,
      widgetAccent2Hex,
      theme.accent2
    );

    setColorPair(
      widgetBackground,
      widgetBackgroundHex,
      theme.background
    );

    setColorPair(
      widgetTextColor,
      widgetTextColorHex,
      theme.text
    );

    widgetOpacity.value =
      theme.opacity;

    widgetBorderWidth.value =
      theme.border;

    widgetRadius.value =
      theme.radius;

    avatarShape.value =
      theme.avatar;

    widgetAlignment.value =
      theme.alignment;

    widgetDensity.value =
      theme.density;

    widgetAnimation.value =
      theme.animation;

    showShadow.checked =
      theme.shadow;

    showGlow.checked =
      theme.glow;

    showBlur.checked =
      theme.blur;

    selectThemePreset(name);

    renderPreview();

    markDirty();

  }


  /* =========================================================
     READ CONTROLS
     ========================================================= */

  function readControls() {

    return {

      enabled:
        widgetEnabled.checked,

      title:
        widgetTitle.value
          .trim()
          .slice(0, 70) ||
        "TikTok Widget",

      support_text:
        supportText.value
          .trim()
          .slice(0, 140),

      creator_name:
        widgetCreatorName.value
          .trim()
          .slice(0, 60),

      show_creator_name:
        showCreatorName.checked,

      show_support_text:
        showSupportText.checked,

      show_image:
        showImage.checked,

      show_value:
        showValue.checked,

      image_mode:
        [
          "tiktok",
          "custom",
          "cfs",
          "none"
        ].includes(
          imageMode.value
        )
          ? imageMode.value
          : "tiktok",

      layout:
        selectedLayout(),

      goal:
        Math.max(
          1,
          Math.min(
            100000000,
            Math.round(
              Number(
                widgetGoal.value
              ) || 1
            )
          )
        ),

      test_value:
        Math.max(
          0,
          Math.min(
            100000000,
            Math.round(
              Number(
                testValue.value
              ) || 0
            )
          )
        ),

      test_mode:
        testMode.checked,

      theme_preset:
        themePresetGrid
          .querySelector(
            ".theme-card.active"
          )
          ?.dataset
          ?.widgetTheme ||
        "custom",

      accent:
        normalizeHex(
          widgetAccent.value,
          "#0A8CFF"
        ),

      accent2:
        normalizeHex(
          widgetAccent2.value,
          "#19C2FF"
        ),

      background:
        normalizeHex(
          widgetBackground.value,
          "#071321"
        ),

      text_color:
        normalizeHex(
          widgetTextColor.value,
          "#F4F8FF"
        ),

      background_opacity:
        Math.max(
          0,
          Math.min(
            1,
            Number(
              widgetOpacity.value
            ) / 100
          )
        ),

      font_size:
        Math.max(
          14,
          Math.min(
            48,
            Math.round(
              Number(
                widgetFontSize.value
              ) || 22
            )
          )
        ),

      avatar_size:
        Math.max(
          34,
          Math.min(
            110,
            Math.round(
              Number(
                avatarSize.value
              ) || 68
            )
          )
        ),

      border_width:
        Math.max(
          0,
          Math.min(
            4,
            Math.round(
              Number(
                widgetBorderWidth.value
              ) || 0
            )
          )
        ),

      border_radius:
        Math.max(
          0,
          Math.min(
            40,
            Math.round(
              Number(
                widgetRadius.value
              ) || 0
            )
          )
        ),

      avatar_shape:
        [
          "rounded",
          "circle",
          "square"
        ].includes(
          avatarShape.value
        )
          ? avatarShape.value
          : "rounded",

      alignment:
        [
          "left",
          "center",
          "right"
        ].includes(
          widgetAlignment.value
        )
          ? widgetAlignment.value
          : "left",

      density:
        [
          "comfortable",
          "compact"
        ].includes(
          widgetDensity.value
        )
          ? widgetDensity.value
          : "comfortable",

      animation:
        [
          "none",
          "pulse",
          "float",
          "shine"
        ].includes(
          widgetAnimation.value
        )
          ? widgetAnimation.value
          : "none",

      number_format:
        numberFormat.value ===
        "compact"
          ? "compact"
          : "full",

      progress_style:
        [
          "gradient",
          "solid",
          "segments"
        ].includes(
          progressStyle.value
        )
          ? progressStyle.value
          : "gradient",

      progress_height:
        Math.max(
          3,
          Math.min(
            24,
            Math.round(
              Number(
                progressHeight.value
              ) || 13
            )
          )
        ),

      show_shadow:
        showShadow.checked,

      show_glow:
        showGlow.checked,

      show_blur:
        showBlur.checked,

      show_progress:
        showProgress.checked,

      show_percent:
        showPercent.checked,

      thanks_text:
        thanksText.value
          .trim()
          .slice(0, 120) ||
        "Danke {name} für deinen Support ❤️",

      thanks_test_name:
        thanksTestName.value
          .trim()
          .slice(0, 40) ||
        "Community",

      thanks_event:
        [
          "support",
          "follow",
          "gift",
          "share"
        ].includes(
          thanksEvent.value
        )
          ? thanksEvent.value
          : "support"

    };

  }


  /* =========================================================
     APPLY CONTROLS
     ========================================================= */

  function applyControls(config) {

    const c = {

      ...defaultWidget(
        activeWidget
      ),

      ...(config || {})

    };

    widgetEnabled.checked =
      c.enabled !== false;

    widgetTitle.value =
      c.title ||
      "TikTok Widget";

    supportText.value =
      c.support_text ||
      "";

    supportTemplate.value =
      [...supportTemplate.options]
        .some(
          option =>
            option.value ===
            c.support_text
        )
          ? c.support_text
          : "";

    widgetCreatorName.value =
      c.creator_name ||
      "";

    showCreatorName.checked =
      c.show_creator_name !== false;

    showSupportText.checked =
      c.show_support_text !== false;

    showImage.checked =
      c.show_image !== false;

    showValue.checked =
      c.show_value !== false;

    imageMode.value =
      [
        "tiktok",
        "custom",
        "cfs",
        "none"
      ].includes(c.image_mode)
        ? c.image_mode
        : "tiktok";

    selectLayout(
      c.layout ||
      "bar"
    );

    selectThemePreset(
      c.theme_preset ||
      "cfs"
    );

    widgetGoal.value =
      Number(
        c.goal || 1
      );

    testValue.value =
      Number(
        c.test_value || 0
      );

    testMode.checked =
      Boolean(
        c.test_mode
      );

    numberFormat.value =
      c.number_format ===
      "compact"
        ? "compact"
        : "full";

    progressStyle.value =
      [
        "gradient",
        "solid",
        "segments"
      ].includes(
        c.progress_style
      )
        ? c.progress_style
        : "gradient";

    progressHeight.value =
      Number(
        c.progress_height ||
        13
      );

    setColorPair(
      widgetAccent,
      widgetAccentHex,
      c.accent ||
      "#0A8CFF"
    );

    setColorPair(
      widgetAccent2,
      widgetAccent2Hex,
      c.accent2 ||
      "#19C2FF"
    );

    setColorPair(
      widgetBackground,
      widgetBackgroundHex,
      c.background ||
      "#071321"
    );

    setColorPair(
      widgetTextColor,
      widgetTextColorHex,
      c.text_color ||
      "#F4F8FF"
    );

    widgetOpacity.value =
      Math.round(
        Number(
          c.background_opacity ??
          .9
        ) * 100
      );

    widgetFontSize.value =
      Number(
        c.font_size || 22
      );

    avatarSize.value =
      Number(
        c.avatar_size || 68
      );

    widgetBorderWidth.value =
      Number(
        c.border_width ?? 1
      );

    widgetRadius.value =
      Number(
        c.border_radius ?? 18
      );

    avatarShape.value =
      c.avatar_shape ||
      "rounded";

    widgetAlignment.value =
      c.alignment ||
      "left";

    widgetDensity.value =
      c.density ||
      "comfortable";

    widgetAnimation.value =
      c.animation ||
      "none";

    showShadow.checked =
      c.show_shadow !== false;

    showGlow.checked =
      Boolean(
        c.show_glow
      );

    showBlur.checked =
      Boolean(
        c.show_blur
      );

    showProgress.checked =
      c.show_progress !== false;

    showPercent.checked =
      c.show_percent !== false;

    thanksText.value =
      c.thanks_text ||
      "Danke {name} für deinen Support ❤️";

    thanksTestName.value =
      c.thanks_test_name ||
      "Community";

    thanksEvent.value =
      c.thanks_event ||
      "support";

    updateWidgetSpecificControls();

    updateAccessUI();

    renderPreview();

  }


  /* =========================================================
     WIDGET-SPECIFIC UI
     ========================================================= */

  function updateWidgetSpecificControls() {

    thanksOptions.hidden =
      activeWidget !==
      "auto_thanks";

    goalField.hidden =
      activeWidget ===
      "auto_thanks";

    if (activeWidget === "viewer") {

      widgetDataHint.textContent =
        "Viewer nutzt aktuell den Testwert. Die echte Zuschauerzahl folgt mit der TikTok-LIVE-Bridge.";

      return;

    }

    if (activeWidget === "gifts") {

      widgetDataHint.textContent =
        "Gifts nutzt aktuell den Testwert. Gift-Events werden später über die TikTok-LIVE-Bridge verbunden.";

      return;

    }

    if (
      activeWidget ===
      "auto_thanks"
    ) {

      widgetDataHint.textContent =
        "AutoThanks wird im Studio simuliert. Die automatische Auslösung folgt mit der TikTok-LIVE-Bridge.";

      return;

    }

    if (activeWidget === "likes") {

      widgetDataHint.textContent =
        "Likes nutzt TikTok Profil-Likes, wenn TikTok sie für denselben verbundenen Account liefert. Das sind keine LIVE-Likes.";

      return;

    }

    widgetDataHint.textContent =
      "Follower nutzt deinen echten TikTok-Followerstand. Testmodus verändert nur die Studio-Vorschau.";

  }


  /* =========================================================
     REAL / TEST VALUES
     ========================================================= */

  function getRealValue(type) {

    if (type === "follower") {

      return tiktokConnected
        ? liveFollowers
        : null;

    }

    if (
      type === "likes" &&
      liveLikesAvailable
    ) {

      return liveLikes;

    }

    return null;

  }


  function getDisplayValue(config) {

    const real =
      getRealValue(
        activeWidget
      );

    if (
      !config.test_mode &&
      real !== null
    ) {

      return real;

    }

    return Number(
      config.test_value || 0
    );

  }


  /* =========================================================
     IMAGE
     ========================================================= */

  function updateUploadPreview() {

    identityUploadPreview.innerHTML =
      "";

    const source =
      safeImageSource(
        customImageData
      );

    if (!source) {

      identityUploadPreview.textContent =
        "BILD";

      return;

    }

    const image =
      document.createElement(
        "img"
      );

    image.src = source;

    image.alt =
      "Creator-Bild";

    identityUploadPreview
      .appendChild(image);

  }


  function resolveAvatarSource(config) {

    if (
      !config.show_image ||
      config.image_mode === "none"
    ) {

      return "";

    }

    if (
      config.image_mode ===
      "custom"
    ) {

      return safeImageSource(
        customImageData
      );

    }

    if (
      config.image_mode ===
      "tiktok"
    ) {

      return safeImageSource(
        liveTikTokAvatar
      );

    }

    if (
      config.image_mode ===
      "cfs"
    ) {

      return "/assets/img/logo-header.png";

    }

    return "";

  }


  function renderAvatarElement(
    element,
    config
  ) {

    element.innerHTML = "";

    element.classList.remove(
      "circle",
      "square"
    );

    if (
      config.avatar_shape ===
      "circle"
    ) {

      element.classList.add(
        "circle"
      );

    }

    if (
      config.avatar_shape ===
      "square"
    ) {

      element.classList.add(
        "square"
      );

    }

    if (
      !config.show_image ||
      config.image_mode ===
      "none"
    ) {

      element.hidden = true;

      return;

    }

    element.hidden = false;

    const source =
      resolveAvatarSource(
        config
      );

    if (source) {

      const image =
        document.createElement(
          "img"
        );

      image.src = source;

      image.alt = "Creator";

      element.appendChild(
        image
      );

      return;

    }

    const initials =
      (
        config.creator_name ||
        liveTikTokName ||
        account?.display_name ||
        "CFS"
      )
        .trim()
        .slice(0, 2)
        .toUpperCase();

    element.textContent =
      initials || "CFS";

  }


  /* =========================================================
     AUTOTHANKS
     ========================================================= */

  function thanksEventLabel(event) {

    const labels = {

      support: "SUPPORT",
      follow: "FOLLOW",
      gift: "GIFT",
      share: "SHARE"

    };

    return labels[event] ||
      "SUPPORT";

  }


  function renderThanks(config) {

    const creator =
      config.creator_name ||
      liveTikTokName ||
      account?.display_name ||
      "Creator";

    thanksCreatorName.textContent =
      creator;

    thanksCreatorName.hidden =
      !config.show_creator_name;

    renderAvatarElement(
      thanksAvatar,
      config
    );

    const name =
      config.thanks_test_name ||
      "Community";

    const source =
      String(
        config.thanks_text ||
        "Danke {name} für deinen Support ❤️"
      );

    const marker =
      "__CFS_NAME__";

    const parts =
      source
        .replaceAll(
          "{name}",
          marker
        )
        .split(marker);

    previewThanksMessage.innerHTML =
      "";

    parts.forEach(
      (part, index) => {

        if (part) {

          previewThanksMessage
            .appendChild(
              document.createTextNode(
                part
              )
            );

        }

        if (
          index <
          parts.length - 1
        ) {

          const nameSpan =
            document.createElement(
              "span"
            );

          nameSpan.className =
            "thanks-name";

          nameSpan.textContent =
            name;

          previewThanksMessage
            .appendChild(
              nameSpan
            );

        }

      }
    );

    previewThanksEvent.textContent =
      thanksEventLabel(
        config.thanks_event
      );

  }


  /* =========================================================
     DATA MODE
     ========================================================= */

  function updateDataModeChip(config) {

    if (
      !canUseWidget(
        activeWidget
      )
    ) {

      setChip(
        dataModeChip,
        "PREVIEW",
        "warn"
      );

      previewModeNote.textContent =
        "PLAN PREVIEW";

      return;

    }

    if (config.test_mode) {

      setChip(
        dataModeChip,
        "TESTMODUS",
        "warn"
      );

      previewModeNote.textContent =
        "TESTDATEN";

      return;

    }

    if (
      activeWidget ===
      "follower"
    ) {

      setChip(
        dataModeChip,
        tiktokConnected
          ? "TIKTOK FOLLOWER"
          : "KEINE TIKTOK-DATEN",
        tiktokConnected
          ? "good"
          : "warn"
      );

      previewModeNote.textContent =
        tiktokConnected
          ? "ECHTE TIKTOK-DATEN"
          : "VORSCHAU";

      return;

    }

    if (
      activeWidget ===
      "likes"
    ) {

      setChip(
        dataModeChip,
        liveLikesAvailable
          ? "TIKTOK PROFIL-LIKES"
          : "PROFIL-LIKES NICHT VERFÜGBAR",
        liveLikesAvailable
          ? "info"
          : "warn"
      );

      previewModeNote.textContent =
        liveLikesAvailable
          ? "PROFIL-LIKES · NICHT LIVE-LIKES"
          : "VORSCHAU";

      return;

    }

    setChip(
      dataModeChip,
      "LIVE BRIDGE FOLGT",
      "warn"
    );

    previewModeNote.textContent =
      "LIVE BRIDGE FOLGT";

  }


  /* =========================================================
     PREVIEW
     ========================================================= */

  function renderPreview() {

    const config =
      readControls();

    const value =
      getDisplayValue(
        config
      );

    const goal =
      Math.max(
        1,
        Number(
          config.goal || 1
        )
      );

    const rawPercent =
      activeWidget ===
      "auto_thanks"
        ? 0
        : (
            value /
            goal *
            100
          );

    const percent =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(
            rawPercent
          )
            ? rawPercent
            : 0
        )
      );


    widgetOpacityOut.value =
      `${Math.round(config.background_opacity * 100)}%`;

    widgetFontSizeOut.value =
      `${config.font_size} px`;

    avatarSizeOut.value =
      `${config.avatar_size} px`;

    widgetBorderWidthOut.value =
      `${config.border_width} px`;

    widgetRadiusOut.value =
      `${config.border_radius} px`;

    progressHeightOut.value =
      `${config.progress_height} px`;


    tiktokWidgetPreview.className =
      [
        "tiktok-widget",
        `layout-${config.layout}`,
        `widget-type-${activeWidget}`,
        `align-${config.alignment}`,
        `density-${config.density}`
      ].join(" ");


    if (config.show_shadow) {

      tiktokWidgetPreview
        .classList
        .add(
          "has-shadow"
        );

    }

    if (config.show_glow) {

      tiktokWidgetPreview
        .classList
        .add(
          "has-glow"
        );

    }

    if (config.show_blur) {

      tiktokWidgetPreview
        .classList
        .add(
          "has-blur"
        );

    }

    if (
      config.animation !==
      "none"
    ) {

      tiktokWidgetPreview
        .classList
        .add(
          `anim-${config.animation}`
        );

    }


    tiktokWidgetPreview.style
      .setProperty(
        "--w-accent",
        config.accent
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-accent2",
        config.accent2
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-bg",
        rgba(
          config.background,
          config.background_opacity
        )
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-text",
        config.text_color
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-font",
        `${config.font_size}px`
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-radius",
        `${config.border_radius}px`
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-border",
        `${config.border_width}px`
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-avatar-size",
        `${config.avatar_size}px`
      );

    tiktokWidgetPreview.style
      .setProperty(
        "--w-progress-height",
        `${config.progress_height}px`
      );


    /*
      WICHTIG:
      Ring-Fortschritt entspricht jetzt
      wirklich dem berechneten Prozentwert.
    */

    tiktokWidgetPreview.style
      .setProperty(
        "--w-ring-progress",
        `${percent}%`
      );


    tiktokWidgetPreview.style.opacity =
      config.enabled
        ? "1"
        : ".38";


    const creatorDisplay =
      config.creator_name ||
      liveTikTokName ||
      account?.display_name ||
      "Creator";


    if (
      activeWidget ===
      "auto_thanks"
    ) {

      normalWidgetContent.hidden =
        true;

      thanksWidgetContent.hidden =
        false;

      renderThanks(config);

    } else {

      normalWidgetContent.hidden =
        false;

      thanksWidgetContent.hidden =
        true;

      renderAvatarElement(
        widgetAvatar,
        config
      );

      previewCreatorName.textContent =
        creatorDisplay;

      previewCreatorName.hidden =
        !config.show_creator_name;

      previewWidgetTitle.textContent =
        config.title;

      previewSupportText.textContent =
        config.support_text ||
        "";

      previewSupportText.hidden =
        !config.show_support_text ||
        !config.support_text;

      previewValue.hidden =
        !config.show_value;

      previewPercent.hidden =
        !config.show_percent;

      previewProgress.hidden =
        !config.show_progress;


      previewProgress.className =
        "widget-progress";


      if (
        config.progress_style ===
        "solid"
      ) {

        previewProgress
          .classList
          .add(
            "progress-solid"
          );

      }


      if (
        config.progress_style ===
        "segments"
      ) {

        previewProgress
          .classList
          .add(
            "progress-segments"
          );

      }


      previewProgressBar.style.width =
        `${percent}%`;


      previewPercent.textContent =
        `${Math.round(percent)}%`;


      previewValue.innerHTML =
        "";


      const strong =
        document.createElement(
          "strong"
        );


      strong.textContent =
        displayNumber(
          value,
          config.number_format
        );


      if (
        activeWidget ===
        "viewer"
      ) {

        previewValue.append(
          strong,
          document.createTextNode(
            " Zuschauer"
          )
        );

      } else if (
        activeWidget ===
        "gifts"
      ) {

        previewValue.append(
          strong,
          document.createTextNode(
            ` / ${displayNumber(goal,config.number_format)} Gifts`
          )
        );

      } else if (
        activeWidget ===
        "likes"
      ) {

        previewValue.append(
          strong,
          document.createTextNode(
            ` / ${displayNumber(goal,config.number_format)} Likes`
          )
        );

      } else {

        previewValue.append(
          strong,
          document.createTextNode(
            ` / ${displayNumber(goal,config.number_format)}`
          )
        );

      }

    }


    const label =
      widgetLabel(
        activeWidget
      );


    setChip(
      activeWidgetChip,
      label,
      canUseWidget(activeWidget)
        ? (
            activeWidget ===
            "follower"
              ? "good"
              : "info"
          )
        : "warn"
    );


    setChip(
      editorWidgetChip,
      label,
      canUseWidget(activeWidget)
        ? "info"
        : "warn"
    );


    dataWidgetType.textContent =
      label;


    updateDataModeChip(
      config
    );

    updateAccessUI();

  }


  /* =========================================================
     SCENE
     ========================================================= */

  function applyScene(scene) {

    const allowed = [
      "grid",
      "stream",
      "clean",
      "transparent"
    ];

    const safe =
      allowed.includes(scene)
        ? scene
        : "grid";

    tiktokStage.className =
      `tiktok-stage scene-${safe}`;

    tiktokStage.dataset.scene =
      safe;

    document
      .querySelectorAll(
        ".preview-scene-buttons [data-scene]"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.scene === safe
        );

      });

  }


  /* =========================================================
     ZOOM
     ========================================================= */

  function applyZoom(value) {

    previewZoom =
      Math.max(
        60,
        Math.min(
          140,
          Math.round(
            Number(value) ||
            100
          )
        )
      );

    previewCanvas.style.transform =
      `scale(${previewZoom / 100})`;

    zoomValue.textContent =
      `${previewZoom}%`;

  }


  /* =========================================================
     WORKING STUDIO
     ========================================================= */

  function saveCurrentControlsIntoMemory() {

    /*
      Gesperrte Preview-Widgets werden
      NICHT in den Working-State geschrieben.
    */

    if (
      !canUseWidget(
        activeWidget
      )
    ) {
      return;
    }

    const studio =
      getStudio();

    studio.widgets[
      activeWidget
    ] =
      readControls();

    studio.active_widget =
      activeWidget;

    studio.custom_image_data =
      customImageData;

    studio.preview_scene =
      tiktokStage.dataset.scene ||
      "grid";

    studio.preview_zoom =
      previewZoom;

    studio.version = 3;


    currentSettings = {

      ...currentSettings,

      widgets: {

        ...(currentSettings.widgets || {}),

        tiktok_studio:
          studio

      }

    };

  }


  /* =========================================================
     SWITCH WIDGET
     ========================================================= */

  function switchWidget(type) {

    if (
      !widgetTypes.includes(type)
    ) {
      return;
    }

    if (
      type === activeWidget
    ) {
      return;
    }


    /*
      Aktuelles Widget sichern,
      aber nur wenn dieses im Plan
      wirklich verfügbar ist.
    */

    if (
      canUseWidget(
        activeWidget
      )
    ) {

      saveCurrentControlsIntoMemory();

    } else {

      /*
        Preview-only Änderungen werden
        beim Verlassen verworfen.
      */

      const studio =
        getStudio();

      customImageData =
        safeImageSource(
          studio.custom_image_data
        );

      applyScene(
        studio.preview_scene ||
        "grid"
      );

      applyZoom(
        studio.preview_zoom ||
        100
      );

      updateUploadPreview();

    }


    activeWidget = type;


    widgetTabs
      .querySelectorAll(
        "[data-widget-type]"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.widgetType ===
          activeWidget
        );

      });


    const studio =
      getStudio();


    /*
      Gesperrtes Widget:
      gespeicherte Version anzeigen,
      falls vorhanden.
      Ansonsten V3-Default.
    */

    let config =
      studio.widgets[
        activeWidget
      ];


    if (
      !canUseWidget(
        activeWidget
      )
    ) {

      const savedStudio =
        getStudioFrom(
          savedSettingsSnapshot
        );

      config =
        savedStudio.widgets[
          activeWidget
        ] ||
        defaultWidget(
          activeWidget
        );

    }


    applyControls(config);


    /*
      WICHTIG:
      Reiner Tab-Wechsel markiert
      NICHT mehr als ungespeichert.
    */

    updateAccessUI();

  }


  /* =========================================================
     LOAD CREATOR SETTINGS
     ========================================================= */

  async function loadCreatorSettings() {

    try {

      const data =
        await CFS.json(
          "/api/creator/settings"
        );


      entitlements =
        data.entitlements ||
        entitlements;


      currentSettings =
        data.settings &&
        typeof data.settings ===
        "object"
          ? data.settings
          : {};


      savedSettingsSnapshot =
        deepClone(
          currentSettings
        );


      const profile =
        currentSettings.profile ||
        {};


      const dashboard =
        currentSettings.dashboard ||
        {};


      creatorBio.value =
        profile.bio ||
        "";


      creatorAccent.value =
        profile.accent ||
        "#148cff";


      startModule.value =
        dashboard.start_module ||
        "dashboard";


      const themes =
        Array.isArray(
          entitlements?.themes
        ) &&
        entitlements.themes.length
          ? entitlements.themes
          : ["cfs"];


      createThemeOptions(
        themes,
        profile.theme ||
        themes[0]
      );


      const studio =
        getStudio();


      customImageData =
        safeImageSource(
          studio.custom_image_data
        );


      const requested =
        studio.active_widget;


      activeWidget =
        widgetTypes.includes(
          requested
        ) &&
        canUseWidget(
          requested
        )
          ? requested
          : "follower";


      widgetTabs
        .querySelectorAll(
          "[data-widget-type]"
        )
        .forEach(button => {

          button.classList.toggle(
            "active",
            button.dataset.widgetType ===
            activeWidget
          );

        });


      applyScene(
        studio.preview_scene ||
        "grid"
      );


      applyZoom(
        studio.preview_zoom ||
        100
      );


      updateUploadPreview();


      applyControls(
        studio.widgets[
          activeWidget
        ]
      );


      syncInfo.textContent =
        data.updated_at
          ? `Letzte Server-Speicherung: ${new Date(data.updated_at).toLocaleString("de-DE")}`
          : "Standardeinstellungen geladen.";


      setChip(
        settingsStatus,
        "SETTINGS ONLINE",
        "good"
      );


      renderProfile();


      setSaveState(false);


    } catch (error) {

      setNotice(
        profileMessage,
        error.message ||
        "Creator-Einstellungen konnten nicht geladen werden.",
        true
      );


      setChip(
        settingsStatus,
        "SETTINGS FEHLER",
        "warn"
      );

    }

  }


  /* =========================================================
     FOLLOWER DATA
     ========================================================= */

  async function loadFollowerData() {

    try {

      const data =
        await CFS.json(
          "/api/creator/widgets/follower-goal"
        );


      sourceUrl.value =
        data.source_url ||
        "";


      liveFollowers =
        Number(
          data.tiktok
            ?.follower_count ||
          0
        );


      liveTikTokName =
        data.tiktok
          ?.display_name ||
        "";


      liveTikTokAvatar =
        data.tiktok
          ?.avatar_url ||
        "";


      tiktokConnected =
        Boolean(
          data.tiktok
            ?.connected
        );


      dataFollowers.textContent =
        tiktokConnected
          ? formatFull(
              liveFollowers
            )
          : "–";


      dataCreatorName.textContent =
        liveTikTokName ||
        account?.display_name ||
        "Creator";


      if (tiktokConnected) {

        setChip(
          tiktokStatusChip,
          `TIKTOK VERBUNDEN · ${formatFull(liveFollowers)} FOLLOWER`,
          "good"
        );

      } else {

        setChip(
          tiktokStatusChip,
          "TIKTOK NICHT VERBUNDEN",
          "warn"
        );

      }


      renderPreview();


    } catch {

      tiktokConnected = false;


      setChip(
        tiktokStatusChip,
        "TIKTOK DATEN FEHLER",
        "warn"
      );

    }

  }


  /* =========================================================
     TIKTOK PROFILE LIKES
     ========================================================= */

  async function loadTikTokProfileStats() {

    liveLikesAvailable =
      false;


    try {

      const data =
        await CFS.json(
          "/api/tiktok/status"
        );


      if (!data?.connected) {

        dataLikes.textContent =
          "–";

        renderPreview();

        return;

      }


      const profile =
        data.profile || {};


      const profileName =
        String(
          profile.display_name ||
          ""
        );


      const sameProfile =
        !liveTikTokName ||
        !profileName ||
        profileName ===
        liveTikTokName;


      if (!sameProfile) {

        dataLikes.textContent =
          "Nicht verfügbar";

        renderPreview();

        return;

      }


      if (
        profile.likes_count !==
        undefined &&
        profile.likes_count !==
        null
      ) {

        liveLikes =
          Number(
            profile.likes_count
          ) || 0;

        liveLikesAvailable =
          true;

      }


      if (
        !liveTikTokAvatar
      ) {

        liveTikTokAvatar =
          profile.avatar_url ||
          "";

      }


      if (
        !liveTikTokName
      ) {

        liveTikTokName =
          profileName;

      }


      dataLikes.textContent =
        liveLikesAvailable
          ? formatFull(
              liveLikes
            )
          : "Nicht verfügbar";


      dataCreatorName.textContent =
        liveTikTokName ||
        account?.display_name ||
        "Creator";


      renderPreview();


    } catch {

      liveLikesAvailable =
        false;

      dataLikes.textContent =
        "Nicht verfügbar";

    }

  }


  /* =========================================================
     IMAGE VALIDATION / COMPRESSION
     ========================================================= */

  function detectImageType(bytes) {

    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "image/png";
    }


    if (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return "image/jpeg";
    }


    if (
      bytes.length >= 12 &&
      String.fromCharCode(
        ...bytes.slice(0, 4)
      ) === "RIFF" &&
      String.fromCharCode(
        ...bytes.slice(8, 12)
      ) === "WEBP"
    ) {
      return "image/webp";
    }


    return "";

  }


  function loadImage(url) {

    return new Promise(
      (resolve, reject) => {

        const image =
          new Image();

        image.onload =
          () => resolve(image);

        image.onerror =
          () =>
            reject(
              new Error(
                "Bild konnte nicht gelesen werden."
              )
            );

        image.src = url;

      }
    );

  }


  async function compressCreatorImage(
    file
  ) {

    if (
      !file ||
      file.size >
      3 * 1024 * 1024
    ) {

      throw new Error(
        "Das Bild darf maximal 3 MB groß sein."
      );

    }


    const header =
      new Uint8Array(
        await file
          .slice(0, 16)
          .arrayBuffer()
      );


    const detected =
      detectImageType(
        header
      );


    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(
        detected
      )
    ) {

      throw new Error(
        "Bitte nur JPG, PNG oder WebP verwenden."
      );

    }


    const objectUrl =
      URL.createObjectURL(
        file
      );


    try {

      const image =
        await loadImage(
          objectUrl
        );


      const maxSize = 220;


      const scale =
        Math.min(
          1,
          maxSize /
          Math.max(
            image.naturalWidth,
            image.naturalHeight
          )
        );


      const width =
        Math.max(
          1,
          Math.round(
            image.naturalWidth *
            scale
          )
        );


      const height =
        Math.max(
          1,
          Math.round(
            image.naturalHeight *
            scale
          )
        );


      const canvas =
        document.createElement(
          "canvas"
        );


      canvas.width = width;
      canvas.height = height;


      const context =
        canvas.getContext("2d");


      if (!context) {

        throw new Error(
          "Bildverarbeitung wird von diesem Browser nicht unterstützt."
        );

      }


      context.clearRect(
        0,
        0,
        width,
        height
      );


      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );


      const qualities = [
        .78,
        .68,
        .58,
        .48,
        .40
      ];


      for (
        const quality
        of qualities
      ) {

        let result =
          canvas.toDataURL(
            "image/webp",
            quality
          );


        if (
          !result.startsWith(
            "data:image/webp"
          )
        ) {

          result =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );

        }


        if (
          result.length <=
          28000
        ) {

          return result;

        }

      }


      throw new Error(
        "Das Bild konnte nicht klein genug gespeichert werden."
      );


    } finally {

      URL.revokeObjectURL(
        objectUrl
      );

    }

  }


  /* =========================================================
     ACCORDIONS
     ========================================================= */

  document
    .querySelectorAll(
      "[data-accordion]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          button
            .closest(
              ".control-group"
            )
            ?.classList
            .toggle(
              "open"
            );

        }
      );

    });


  /* =========================================================
     PROFILE EVENTS
     ========================================================= */

  editorForm.addEventListener(
    "input",
    renderProfile
  );


  editorForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      setNotice(
        profileMessage,
        "Speichere Creator-Einstellungen …"
      );


      /*
        WICHTIGER FIX:
        Profil-Speicherung basiert auf dem
        zuletzt SERVERSEITIG gespeicherten Stand.

        Ungespeicherte Widget-Änderungen werden
        dadurch NICHT heimlich mitgespeichert.
      */

      const unsavedWorkingStudio =
        studioDirty
          ? getStudio()
          : null;


      const nextSettings = {

        ...deepClone(
          savedSettingsSnapshot
        ),

        profile: {

          ...(
            savedSettingsSnapshot.profile ||
            {}
          ),

          bio:
            creatorBio.value.trim(),

          accent:
            creatorAccent.value,

          theme:
            themeSelect.value

        },

        dashboard: {

          ...(
            savedSettingsSnapshot.dashboard ||
            {}
          ),

          start_module:
            startModule.value

        }

      };


      try {

        const saved =
          await CFS.json(
            "/api/creator/settings",
            {

              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  settings:
                    nextSettings
                })

            }
          );


        const serverSettings =
          saved.settings ||
          nextSettings;


        savedSettingsSnapshot =
          deepClone(
            serverSettings
          );


        currentSettings =
          deepClone(
            serverSettings
          );


        /*
          Lokale, noch nicht gespeicherte
          Widget-Arbeit bleibt im Browser erhalten,
          wurde aber NICHT an den Server gesendet.
        */

        if (
          studioDirty &&
          unsavedWorkingStudio
        ) {

          currentSettings.widgets = {

            ...(currentSettings.widgets || {}),

            tiktok_studio:
              unsavedWorkingStudio

          };

        }


        setNotice(
          profileMessage,
          "Creator-Einstellungen wurden gespeichert."
        );


        syncInfo.textContent =
          `Letzte Server-Speicherung: ${new Date(saved.updated_at || Date.now()).toLocaleString("de-DE")}`;


        setChip(
          settingsStatus,
          "SETTINGS ONLINE",
          "good"
        );


        renderProfile();


      } catch (error) {

        setNotice(
          profileMessage,
          error.message ||
          "Creator-Einstellungen konnten nicht gespeichert werden.",
          true
        );

      }

    }
  );


  /* =========================================================
     WIDGET TABS
     ========================================================= */

  widgetTabs.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-widget-type]"
        );

      if (!button) return;

      switchWidget(
        button.dataset.widgetType
      );

    }
  );


  /* =========================================================
     SUPPORT TEMPLATE
     ========================================================= */

  supportTemplate.addEventListener(
    "change",
    () => {

      if (
        supportTemplate.value
      ) {

        supportText.value =
          supportTemplate.value;

      }

      renderPreview();

      markDirty();

    }
  );


  /* =========================================================
     THEME
     ========================================================= */

  themePresetGrid.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-widget-theme]"
        );

      if (!button) return;

      applyThemePreset(
        button.dataset.widgetTheme
      );

    }
  );


  /* =========================================================
     LAYOUT
     ========================================================= */

  presetGrid.addEventListener(
    "change",
    () => {

      selectLayout(
        selectedLayout()
      );

      renderPreview();

      markDirty();

    }
  );


  /* =========================================================
     COLORS
     ========================================================= */

  const colorPairs = [

    [
      widgetAccent,
      widgetAccentHex
    ],

    [
      widgetAccent2,
      widgetAccent2Hex
    ],

    [
      widgetBackground,
      widgetBackgroundHex
    ],

    [
      widgetTextColor,
      widgetTextColorHex
    ]

  ];


  colorPairs.forEach(pair => {

    const picker = pair[0];
    const text = pair[1];


    picker.addEventListener(
      "input",
      () => {

        text.value =
          normalizeHex(
            picker.value
          );

        selectThemePreset(
          "custom"
        );

        renderPreview();

        markDirty();

      }
    );


    text.addEventListener(
      "change",
      () => {

        const normalized =
          normalizeHex(
            text.value,
            normalizeHex(
              picker.value
            )
          );


        picker.value =
          normalized.toLowerCase();

        text.value =
          normalized;


        selectThemePreset(
          "custom"
        );

        renderPreview();

        markDirty();

      }
    );

  });


  /* =========================================================
     LIVE CONTROLS
     ========================================================= */

  const designInputs =
    new Set([
      widgetOpacity,
      widgetFontSize,
      avatarSize,
      widgetBorderWidth,
      widgetRadius,
      avatarShape,
      widgetAlignment,
      widgetDensity,
      widgetAnimation,
      progressStyle,
      progressHeight,
      showShadow,
      showGlow,
      showBlur
    ]);


  const liveInputs = [

    widgetEnabled,
    widgetTitle,
    supportText,
    widgetCreatorName,
    imageMode,

    showCreatorName,
    showSupportText,
    showImage,
    showValue,

    widgetGoal,
    testValue,
    testMode,

    numberFormat,
    progressStyle,
    progressHeight,

    showProgress,
    showPercent,

    thanksText,
    thanksTestName,
    thanksEvent,

    widgetOpacity,
    widgetFontSize,
    avatarSize,
    widgetBorderWidth,
    widgetRadius,

    avatarShape,
    widgetAlignment,
    widgetDensity,
    widgetAnimation,

    showShadow,
    showGlow,
    showBlur

  ];


  liveInputs.forEach(input => {

    const update =
      () => {

        if (
          designInputs.has(input)
        ) {

          selectThemePreset(
            "custom"
          );

        }

        renderPreview();

        markDirty();

      };


    input.addEventListener(
      "input",
      update
    );


    input.addEventListener(
      "change",
      update
    );

  });


  /* =========================================================
     SCENES
     ========================================================= */

  document
    .querySelectorAll(
      ".preview-scene-buttons [data-scene]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          applyScene(
            button.dataset.scene
          );

          markDirty();

        }
      );

    });


  /* =========================================================
     ZOOM
     ========================================================= */

  zoomOutBtn.addEventListener(
    "click",
    () => {

      applyZoom(
        previewZoom - 10
      );

      markDirty();

    }
  );


  zoomInBtn.addEventListener(
    "click",
    () => {

      applyZoom(
        previewZoom + 10
      );

      markDirty();

    }
  );


  /* =========================================================
     CREATOR IMAGE
     ========================================================= */

  creatorImageFile.addEventListener(
    "change",
    async () => {

      const file =
        creatorImageFile
          .files?.[0];

      if (!file) return;


      try {

        setNotice(
          studioMessage,
          "Creator-Bild wird vorbereitet …"
        );


        customImageData =
          await compressCreatorImage(
            file
          );


        imageMode.value =
          "custom";

        showImage.checked =
          true;


        updateUploadPreview();

        renderPreview();

        markDirty();


        if (
          canUseWidget(
            activeWidget
          )
        ) {

          setNotice(
            studioMessage,
            "Creator-Bild ist bereit. Zum dauerhaften Übernehmen bitte speichern."
          );

        } else {

          setNotice(
            studioMessage,
            "Creator-Bild wird nur in dieser Preview angezeigt. Dieses Widget ist in deinem Plan gesperrt."
          );

        }


      } catch (error) {

        setNotice(
          studioMessage,
          error.message ||
          "Bild konnte nicht verarbeitet werden.",
          true
        );

      }


      creatorImageFile.value =
        "";

    }
  );


  removeCreatorImage.addEventListener(
    "click",
    () => {

      customImageData = "";


      if (
        imageMode.value ===
        "custom"
      ) {

        imageMode.value =
          liveTikTokAvatar
            ? "tiktok"
            : "cfs";

      }


      updateUploadPreview();

      renderPreview();

      markDirty();

    }
  );


  /* =========================================================
     RESTORE WIDGET STUDIO ONLY
     ========================================================= */

  restoreSavedBtn.addEventListener(
    "click",
    () => {

      if (!studioDirty) {

        setNotice(
          studioMessage,
          "Es gibt aktuell keine ungespeicherten Widget-Änderungen."
        );

        return;

      }


      const confirmed =
        window.confirm(
          "Ungespeicherte Widget-Änderungen wirklich verwerfen?"
        );


      if (!confirmed) return;


      /*
        Nur Widget Studio zurücksetzen.
        Profilfelder bleiben unangetastet.
      */

      const savedStudio =
        getStudioFrom(
          savedSettingsSnapshot
        );


      currentSettings = {

        ...currentSettings,

        widgets: {

          ...(currentSettings.widgets || {}),

          ...(
            savedSettingsSnapshot.widgets ||
            {}
          ),

          tiktok_studio:
            savedStudio

        }

      };


      customImageData =
        safeImageSource(
          savedStudio.custom_image_data
        );


      activeWidget =
        canUseWidget(
          savedStudio.active_widget
        )
          ? savedStudio.active_widget
          : "follower";


      widgetTabs
        .querySelectorAll(
          "[data-widget-type]"
        )
        .forEach(button => {

          button.classList.toggle(
            "active",
            button.dataset.widgetType ===
            activeWidget
          );

        });


      applyScene(
        savedStudio.preview_scene ||
        "grid"
      );


      applyZoom(
        savedStudio.preview_zoom ||
        100
      );


      updateUploadPreview();


      applyControls(
        savedStudio.widgets[
          activeWidget
        ]
      );


      setSaveState(false);


      setNotice(
        studioMessage,
        "Der letzte gespeicherte Widget-Stand wurde wiederhergestellt."
      );

    }
  );


  /* =========================================================
     RESET CURRENT WIDGET
     ========================================================= */

  resetWidgetBtn.addEventListener(
    "click",
    () => {

      const confirmed =
        window.confirm(
          `Das Widget ${widgetLabel(activeWidget)} auf die V3-Standardwerte zurücksetzen?`
        );


      if (!confirmed) return;


      applyControls(
        defaultWidget(
          activeWidget
        )
      );


      if (
        canUseWidget(
          activeWidget
        )
      ) {

        markDirty();

        setNotice(
          studioMessage,
          "V3-Standardwerte wurden geladen. Zum dauerhaften Übernehmen noch speichern."
        );

      } else {

        setNotice(
          studioMessage,
          "V3-Standardwerte werden nur als Preview angezeigt. Das Widget ist in deinem Plan gesperrt."
        );

      }

    }
  );


  /* =========================================================
     SAVE STUDIO
     ========================================================= */

  saveStudioBtn.addEventListener(
    "click",
    async () => {

      if (
        !canUseWidget(
          activeWidget
        )
      ) {

        setNotice(
          studioMessage,
          "Dieses Widget ist nur als Preview verfügbar und kann in deinem aktuellen Plan nicht gespeichert werden.",
          true
        );

        return;

      }


      saveStudioBtn.disabled =
        true;


      saveStudioBtn.textContent =
        "WIRD GESPEICHERT …";


      setNotice(
        studioMessage,
        "TikTok Widget Studio wird gespeichert …"
      );


      try {

        saveCurrentControlsIntoMemory();


        const workingStudio =
          getStudio();


        const savedStudio =
          getStudioFrom(
            savedSettingsSnapshot
          );


        /*
          WICHTIGER FREE/PREVIEW FIX:

          Wir starten vom gespeicherten Studio.
          Nur Widgets, die der aktuelle Plan
          wirklich benutzen darf, werden aus
          dem Working-State übernommen.

          Gesperrte Preview-Widgets werden
          niemals versehentlich gespeichert.
        */

        const studioToSave =
          deepClone(
            savedStudio
          );


        widgetTypes.forEach(type => {

          if (
            canUseWidget(type)
          ) {

            studioToSave.widgets[type] =
              deepClone(
                workingStudio.widgets[type]
              );

          }

        });


        studioToSave.version = 3;


        studioToSave.active_widget =
          canUseWidget(
            activeWidget
          )
            ? activeWidget
            : (
                canUseWidget(
                  savedStudio.active_widget
                )
                  ? savedStudio.active_widget
                  : "follower"
              );


        studioToSave.custom_image_data =
          workingStudio.custom_image_data ||
          "";


        studioToSave.preview_scene =
          workingStudio.preview_scene ||
          "grid";


        studioToSave.preview_zoom =
          workingStudio.preview_zoom ||
          100;


        /*
          Studio-Speicherung basiert ebenfalls
          auf dem zuletzt serverseitig
          gespeicherten Settings-Stand.

          Dadurch überschreibt sie keine
          ungespeicherten Profiländerungen.
        */

        const nextSettings = {

          ...deepClone(
            savedSettingsSnapshot
          ),

          widgets: {

            ...(
              savedSettingsSnapshot.widgets ||
              {}
            ),

            tiktok_studio:
              studioToSave

          }

        };


        const serialized =
          JSON.stringify(
            nextSettings
          );


        const bytes =
          new TextEncoder()
            .encode(
              serialized
            )
            .length;


        if (
          bytes >
          60 * 1024
        ) {

          throw new Error(
            "Deine Creator-Settings wären zu groß. Bitte entferne das eigene Bild oder verwende ein kleineres Bild."
          );

        }


        const saved =
          await CFS.json(
            "/api/creator/settings",
            {

              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  settings:
                    nextSettings
                })

            }
          );


        currentSettings =
          saved.settings ||
          nextSettings;


        savedSettingsSnapshot =
          deepClone(
            currentSettings
          );


        setSaveState(false);


        setNotice(
          studioMessage,
          "TikTok Widget Studio V3 wurde gespeichert."
        );


        setChip(
          settingsStatus,
          "SETTINGS ONLINE",
          "good"
        );


        syncInfo.textContent =
          `Letzte Server-Speicherung: ${new Date(saved.updated_at || Date.now()).toLocaleString("de-DE")}`;


      } catch (error) {

        setSaveState(true);


        setNotice(
          studioMessage,
          error.message ||
          "TikTok Widget Studio konnte nicht gespeichert werden.",
          true
        );


      } finally {

        saveStudioBtn.disabled =
          !canUseWidget(
            activeWidget
          );


        saveStudioBtn.textContent =
          "TIKTOK WIDGETS SPEICHERN";

      }

    }
  );


  /* =========================================================
     OBS COPY
     ========================================================= */

  copySourceBtn.addEventListener(
    "click",
    async () => {

      const value =
        sourceUrl.value.trim();


      if (
        !/^https:\/\//i.test(
          value
        )
      ) {

        setNotice(
          studioMessage,
          "Es ist aktuell keine gültige OBS-URL verfügbar.",
          true
        );

        return;

      }


      try {

        await navigator.clipboard
          .writeText(value);


        setNotice(
          studioMessage,
          "Follower-OBS-URL wurde kopiert."
        );


      } catch {

        sourceUrl.focus();
        sourceUrl.select();

        document.execCommand(
          "copy"
        );


        setNotice(
          studioMessage,
          "Follower-OBS-URL wurde kopiert."
        );

      }

    }
  );


  /* =========================================================
     OBS OPEN
     ========================================================= */

  openSourceBtn.addEventListener(
    "click",
    () => {

      const value =
        sourceUrl.value.trim();


      if (
        !/^https:\/\//i.test(
          value
        )
      ) {

        setNotice(
          studioMessage,
          "Es ist aktuell keine gültige OBS-URL verfügbar.",
          true
        );

        return;

      }


      window.open(
        value,
        "_blank",
        "noopener,noreferrer"
      );

    }
  );


  /* =========================================================
     OBS ROTATE
     ========================================================= */

  rotateSourceBtn.addEventListener(
    "click",
    async () => {

      const confirmed =
        window.confirm(
          "OBS-Schlüssel wirklich erneuern? Die bisherige Widget-URL funktioniert danach nicht mehr."
        );


      if (!confirmed) return;


      rotateSourceBtn.disabled =
        true;


      try {

        const data =
          await CFS.json(
            "/api/creator/widgets/follower-goal/rotate-key",
            {
              method: "POST"
            }
          );


        sourceUrl.value =
          data.source_url ||
          "";


        setNotice(
          studioMessage,
          "Neuer Follower-OBS-Schlüssel wurde erstellt."
        );


      } catch (error) {

        setNotice(
          studioMessage,
          error.message ||
          "OBS-Schlüssel konnte nicht erneuert werden.",
          true
        );


      } finally {

        rotateSourceBtn.disabled =
          false;

      }

    }
  );


  /* =========================================================
     BEFORE UNLOAD
     ========================================================= */

  window.addEventListener(
    "beforeunload",
    event => {

      if (!studioDirty) return;

      event.preventDefault();

      event.returnValue = "";

    }
  );


  /* =========================================================
     START
     ========================================================= */

  hideNotice(
    profileMessage
  );

  hideNotice(
    studioMessage
  );

  hideNotice(
    previewOnlyNotice
  );


  if (
    !window.CFS ||
    typeof CFS.requireAuth !==
    "function"
  ) {

    setNotice(
      studioMessage,
      "Die cfs_zockt Basisdatei /assets/js/app.js konnte nicht geladen werden.",
      true
    );

    return;

  }


  const authResult =
    await CFS.requireAuth();


  if (!authResult) {
    return;
  }


  account =
    authResult.account ||
    authResult;


  entitlements =
    authResult.entitlements ||
    null;


  creatorName.value =
    account?.display_name ||
    "";


  creatorPlan.value =
    planLabel(
      account?.plan ||
      "FREE"
    );


  previewName.textContent =
    account?.display_name ||
    "Creator";


  previewPlan.textContent =
    planLabel(
      account?.plan ||
      "FREE"
    );


  updateWidgetAccess();


  await loadCreatorSettings();


  updateWidgetAccess();


  await loadFollowerData();


  await loadTikTokProfileStats();


  updateUploadPreview();


  renderProfile();


  renderPreview();


  updateAccessUI();


  setSaveState(false);

});
