// --- Core App State ---
// Each stop: { format: 'hex'|'rgb', val: '#xxxxxx' }
let pickerState = [
    { format: 'hex', val: '#3b82f6' },
    { format: 'hex', val: '#8b5cf6' },
    { format: 'hex', val: '#d946ef' }
];

let gradientType = 'linear'; // 'linear' | 'solid'
let currentColorsArray = [];
let activePickerId = null; // index or 'title'

// --- Custom Picker Drag State ---
let currentH = 0, currentS = 1, currentV = 1;
let isDraggingSB = false;
let isDraggingHue = false;

// --- DOM References (static) ---
const angleRange = document.getElementById('angleRange');
const angleVal = document.getElementById('angleVal');
const gradientLayer = document.getElementById('gradientLayer');
const ambientGlow = document.getElementById('ambientGlow');
const smartSuggestionsContainer = document.getElementById('smartSuggestions');
const colorStopsList = document.getElementById('colorStopsList');
const addStopWrapper = document.getElementById('addStopWrapper');
const smartMatchesSection = document.getElementById('smartMatchesSection');

// Custom Popover Elements
const colorPopover = document.getElementById('colorPopover');
const sbArea = document.getElementById('sbArea');
const sbThumb = document.getElementById('sbThumb');
const hueArea = document.getElementById('hueArea');
const hueThumb = document.getElementById('hueThumb');
const popHex = document.getElementById('popHex');
const popR = document.getElementById('popR');
const popG = document.getElementById('popG');
const popB = document.getElementById('popB');
const eyeDropperBtn = document.getElementById('eyeDropperBtn');

// Theme
document.getElementById('themeToggle').addEventListener('click', () => { document.documentElement.classList.toggle('dark'); });

// --- Title Color Logic --- //
let titleColorHex = '#ffffff';

const wellTitle = document.getElementById('wellTitle');
const glowTitle = document.getElementById('glowTitle');
const visualTitle = document.getElementById('visualTitle');
const titleInput = document.getElementById('titleInput');
const titleSizeRange = document.getElementById('titleSizeRange');
const titleSizeVal = document.getElementById('titleSizeVal');
const mainTitle = document.getElementById('mainTitle');
const titleWrapper = document.getElementById('titleWrapper');
const previewContainer = document.getElementById('previewContainer');
const exportPngBtn = document.getElementById('exportPngBtn');
const exportJpgBtn = document.getElementById('exportJpgBtn');
const copyPreviewBtn = document.getElementById('copyPreviewBtn');
const toolbarPanelHost = document.getElementById('toolbarPanelHost');
const sizePanelBtn = document.getElementById('sizePanelBtn');
const textPanelBtn = document.getElementById('textPanelBtn');
const assetPanelBtn = document.getElementById('assetPanelBtn');
const sizePanel = document.getElementById('sizePanel');
const textPanel = document.getElementById('textPanel');
const assetPanel = document.getElementById('assetPanel');
const bannerPresetBtn = document.getElementById('bannerPresetBtn');
const bannerPresetBtnLabel = document.getElementById('bannerPresetBtnLabel');
const bannerPresetMenu = document.getElementById('bannerPresetMenu');
const bannerWidthInput = document.getElementById('bannerWidthInput');
const bannerHeightInput = document.getElementById('bannerHeightInput');
const bannerSizeLabel = document.getElementById('bannerSizeLabel');
const bannerSizeCloud = document.getElementById('bannerSizeCloud');

const BANNER_PRESETS = [
    { label: 'Wide HD', width: 1600, height: 900 },
    { label: 'Full HD', width: 1920, height: 1080 },
    { label: 'Header', width: 1500, height: 500 },
    { label: 'Social Ad', width: 1200, height: 628 },
    { label: 'Compact', width: 1024, height: 576 }
];

const bannerState = {
    width: 1600,
    height: 900,
    preset: '1600x900'
};
let bannerSizeCloudTimer = null;

function syncTitleWell(hex) {
    titleColorHex = hex;
    visualTitle.style.backgroundColor = hex;
    glowTitle.style.backgroundColor = hex;
    mainTitle.style.color = hex;
    mainTitle.classList.remove('text-white');
    if (pickerState && pickerState[0]) updateMainGradient();
}

function clampDimension(value, fallback, min, max) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function showBannerSizeCloud(message) {
    if (!bannerSizeCloud) return;
    bannerSizeCloud.textContent = message;
    bannerSizeCloud.classList.remove('hidden');
    clearTimeout(bannerSizeCloudTimer);
    bannerSizeCloudTimer = setTimeout(() => {
        bannerSizeCloud.classList.add('hidden');
    }, 2600);
}

function validateBannerDimensionInput(input, label, fallbackValue) {
    if (!input) {
        return { value: fallbackValue, valid: true };
    }

    const min = parseInt(input.min, 10);
    const max = parseInt(input.max, 10);
    const rawValue = input.value.trim();
    const parsed = parseInt(rawValue, 10);

    if (rawValue === '' || Number.isNaN(parsed)) {
        input.value = String(fallbackValue);
        showBannerSizeCloud(`${label} must be a number between ${min}px and ${max}px.`);
        return { value: fallbackValue, valid: false };
    }

    if (parsed < min || parsed > max) {
        const clamped = Math.min(max, Math.max(min, parsed));
        input.value = String(clamped);
        showBannerSizeCloud(`${label} must stay between ${min}px and ${max}px.`);
        return { value: clamped, valid: false };
    }

    input.value = String(parsed);
    return { value: parsed, valid: true };
}

function syncBannerPresetControl() {
    if (!bannerPresetBtn || !bannerPresetMenu) return;
    const match = BANNER_PRESETS.find(p => p.width === bannerState.width && p.height === bannerState.height);
    bannerState.preset = match ? `${match.width}x${match.height}` : 'custom';
    updateBannerPresetUI();
}

function updateBannerSizeLabel() {
    if (bannerSizeLabel) {
        bannerSizeLabel.innerText = `${bannerState.width} x ${bannerState.height} px`;
    }
}

function updateBannerPresetUI() {
    if (!bannerPresetBtnLabel || !bannerPresetMenu) return;

    const preset = bannerState.preset;
    const presetBtnText = (() => {
        if (preset === 'custom') return 'Custom Size';
        const found = BANNER_PRESETS.find(p => `${p.width}x${p.height}` === preset);
        if (!found) return 'Custom Size';
        return `${found.label} ${found.width} x ${found.height}`;
    })();

    bannerPresetBtnLabel.innerText = presetBtnText;
    bannerPresetMenu.querySelectorAll('.fancy-dropdown-item').forEach(el => {
        const val = el.getAttribute('data-value');
        el.classList.toggle('is-selected', val === preset);
    });
}

function applyBannerSize(width, height, syncPreset = true) {
    bannerState.width = clampDimension(width, bannerState.width, 320, 7680);
    bannerState.height = clampDimension(height, bannerState.height, 180, 4320);

    if (bannerWidthInput) bannerWidthInput.value = bannerState.width;
    if (bannerHeightInput) bannerHeightInput.value = bannerState.height;
    if (previewContainer) {
        previewContainer.style.aspectRatio = `${bannerState.width} / ${bannerState.height}`;
    }

    updateBannerSizeLabel();
    if (syncPreset) syncBannerPresetControl();
}

function setPresetBannerSize(value) {
    if (value === 'custom') {
        bannerState.preset = 'custom';
        updateBannerPresetUI();
        return;
    }
    const [width, height] = value.split('x').map(Number);
    bannerState.preset = value;
    applyBannerSize(width, height, true);
}

function setCustomBannerDimension() {
    const widthResult = validateBannerDimensionInput(bannerWidthInput, 'Width', bannerState.width);
    const heightResult = validateBannerDimensionInput(bannerHeightInput, 'Height', bannerState.height);
    const width = widthResult.value;
    const height = heightResult.value;
    applyBannerSize(width, height, true);
}

function openBannerPresetMenu() {
    if (!bannerPresetBtn || !bannerPresetMenu) return;
    bannerPresetBtn.classList.add('is-open');
    bannerPresetMenu.classList.remove('hidden');
}

function closeBannerPresetMenu() {
    if (!bannerPresetBtn || !bannerPresetMenu) return;
    bannerPresetBtn.classList.remove('is-open');
    bannerPresetMenu.classList.add('hidden');
}

function toggleBannerPresetMenu() {
    if (!bannerPresetMenu) return;
    const isHidden = bannerPresetMenu.classList.contains('hidden');
    if (isHidden) openBannerPresetMenu();
    else closeBannerPresetMenu();
}

function stepBannerDimension(which, dir, evt) {
    const input = which === 'bannerHeight' ? bannerHeightInput : bannerWidthInput;
    if (!input) return;

    const baseStep = 10;
    const step = (evt && evt.altKey) ? 1 : (evt && evt.shiftKey) ? 50 : baseStep;
    const delta = dir === 'down' ? -step : step;

    const current = clampDimension(input.value, which === 'bannerHeight' ? bannerState.height : bannerState.width, 1, 100000);
    input.value = String(current + delta);
    setCustomBannerDimension();
}

function setActiveToolbarPanel(panelName) {
    const panelMap = {
        size: sizePanel,
        text: textPanel,
        asset: assetPanel
    };
    const btnMap = {
        size: sizePanelBtn,
        text: textPanelBtn,
        asset: assetPanelBtn
    };

    const isClosing = !panelName || !panelMap[panelName] || !panelMap[panelName].classList.contains('hidden') === false ? false : false;
    Object.entries(panelMap).forEach(([key, panel]) => {
        if (!panel) return;
        panel.classList.toggle('hidden', key !== panelName);
    });
    Object.entries(btnMap).forEach(([key, btn]) => {
        if (!btn) return;
        btn.classList.toggle('is-active', key === panelName);
    });

    if (!toolbarPanelHost) return;
    const shouldShow = Boolean(panelName);
    toolbarPanelHost.classList.toggle('hidden', !shouldShow);
    if (!shouldShow) closeBannerPresetMenu();
}

function toggleToolbarPanel(panelName) {
    const panelMap = {
        size: sizePanel,
        text: textPanel,
        asset: assetPanel
    };
    const panel = panelMap[panelName];
    if (!panel) return;
    if (!panel.classList.contains('hidden')) {
        setActiveToolbarPanel(null);
        return;
    }
    setActiveToolbarPanel(panelName);
}

wellTitle.addEventListener('click', () => {
    if (activePickerId === 'title') { closePicker(); return; }
    activePickerId = 'title';
    const rect = wellTitle.getBoundingClientRect();
    let leftPos = rect.left + window.scrollX - 100;
    if (leftPos < 20) leftPos = 20;
    colorPopover.style.top = `${rect.bottom + window.scrollY + 15}px`;
    colorPopover.style.left = `${leftPos}px`;
    colorPopover.classList.remove('hidden-popover');
    const color = chroma(titleColorHex);
    const hsv = color.hsv();
    currentH = isNaN(hsv[0]) ? 0 : hsv[0];
    currentS = isNaN(hsv[1]) ? 0 : hsv[1];
    currentV = isNaN(hsv[2]) ? 0 : hsv[2];
    updatePickerUIFromHSV();
});

// --- Close popover when clicking outside ---
document.addEventListener('mousedown', (e) => {
    if (!colorPopover.classList.contains('hidden-popover') &&
        !colorPopover.contains(e.target) &&
        !e.target.closest('.custom-color-well')) {
        closePicker();
    }
});

// Hide EyeDropper if not supported
if (!('EyeDropper' in window)) {
    eyeDropperBtn.style.display = 'none';
} else {
    eyeDropperBtn.addEventListener('click', async () => {
        try {
            const dropper = new EyeDropper();
            const result = await dropper.open();
            updateColorFromHex(result.sRGBHex);
        } catch (e) { console.log(e); }
    });
}

function closePicker() {
    colorPopover.classList.add('hidden-popover');
    activePickerId = null;
}

// --- Dragging Logic for Popover SB/Hue ---
function handleSBDraw(e) {
    if (!isDraggingSB) return;
    const rect = sbArea.getBoundingClientRect();
    let x = (e.clientX || e.touches[0].clientX) - rect.left;
    let y = (e.clientY || e.touches[0].clientY) - rect.top;
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));
    currentS = x / rect.width;
    currentV = 1 - (y / rect.height);
    updateColorFromHSV();
}

function handleHueDraw(e) {
    if (!isDraggingHue) return;
    const rect = hueArea.getBoundingClientRect();
    let x = (e.clientX || e.touches[0].clientX) - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    currentH = (x / rect.width) * 360;
    updateColorFromHSV();
}

sbArea.addEventListener('mousedown', (e) => { isDraggingSB = true; handleSBDraw(e); });
hueArea.addEventListener('mousedown', (e) => { isDraggingHue = true; handleHueDraw(e); });
window.addEventListener('mousemove', (e) => { handleSBDraw(e); handleHueDraw(e); });
window.addEventListener('mouseup', () => { isDraggingSB = false; isDraggingHue = false; });

sbArea.addEventListener('touchstart', (e) => { isDraggingSB = true; handleSBDraw(e); }, { passive: false });
hueArea.addEventListener('touchstart', (e) => { isDraggingHue = true; handleHueDraw(e); }, { passive: false });
window.addEventListener('touchmove', (e) => {
    if (isDraggingSB || isDraggingHue) { e.preventDefault(); handleSBDraw(e); handleHueDraw(e); }
}, { passive: false });
window.addEventListener('touchend', () => { isDraggingSB = false; isDraggingHue = false; });

function updateColorFromHSV() {
    const hex = chroma.hsv(currentH, currentS, currentV).hex();
    updatePickerUIFromHSV();
    if (activePickerId === 'title') {
        syncTitleWell(hex);
    } else if (activePickerId !== null) {
        pickerState[activePickerId].val = hex;
        syncStopUI(activePickerId);
        updateMainGradient();
    }
}

function updateColorFromHex(hex) {
    if (!chroma.valid(hex)) return;
    const hsv = chroma(hex).hsv();
    currentH = isNaN(hsv[0]) ? 0 : hsv[0];
    currentS = isNaN(hsv[1]) ? 0 : hsv[1];
    currentV = isNaN(hsv[2]) ? 0 : hsv[2];
    updateColorFromHSV();
}

function updatePickerUIFromHSV() {
    const pureHueHex = chroma.hsv(currentH, 1, 1).hex();
    sbArea.style.backgroundColor = pureHueHex;
    sbThumb.style.left = `${currentS * 100}%`;
    sbThumb.style.top = `${(1 - currentV) * 100}%`;
    const hueX = (currentH / 360) * 100;
    hueThumb.style.left = `${hueX}%`;
    const finalColor = chroma.hsv(currentH, currentS, currentV);
    sbThumb.style.backgroundColor = finalColor.hex();
    hueThumb.style.backgroundColor = pureHueHex;
    const hex = finalColor.hex().replace('#', '').toUpperCase();
    const [r, g, b] = finalColor.rgb();
    if (document.activeElement !== popHex) popHex.value = hex;
    if (document.activeElement !== popR) popR.value = r;
    if (document.activeElement !== popG) popG.value = g;
    if (document.activeElement !== popB) popB.value = b;
}

popHex.addEventListener('change', (e) => updateColorFromHex('#' + e.target.value));
[popR, popG, popB].forEach(input => {
    input.addEventListener('change', () => {
        const color = chroma(popR.value, popG.value, popB.value);
        updateColorFromHex(color.hex());
    });
});

// ===================================================
// DYNAMIC COLOR STOPS RENDERING
// ===================================================

const STOP_LABELS = ['Primary', 'Secondary', 'Tertiary', 'Quaternary', 'Quinary'];
const MAX_STOPS = 5;
const MIN_STOPS_LINEAR = 2;
const MIN_STOPS_SOLID = 1;

function getStopLabel(i) {
    return STOP_LABELS[i] || `Stop ${i + 1}`;
}

function renderColorStops() {
    colorStopsList.innerHTML = '';

    pickerState.forEach((state, idx) => {
        const item = createStopItem(idx, state);
        colorStopsList.appendChild(item);
    });

    // Manage add/remove button visibility
    updateAddButtonVisibility();
}

function createStopItem(idx, state) {
    const isSolid = gradientType === 'solid';
    const minStops = isSolid ? MIN_STOPS_SOLID : MIN_STOPS_LINEAR;
    const canRemove = pickerState.length > minStops;

    const wrapper = document.createElement('div');
    wrapper.className = 'color-stop-item flex items-center gap-4 bg-white/5 dark:bg-white/5 p-4 rounded-3xl border border-black/5 dark:border-white/5 transition-all hover:bg-white/10 dark:hover:bg-white/10';
    wrapper.dataset.stopIdx = idx;

    // Color Well
    const well = document.createElement('div');
    well.className = 'custom-color-well flex-shrink-0';
    well.id = `well${idx}`;

    const glow = document.createElement('div');
    glow.className = 'color-glow';
    glow.id = `glow${idx}`;

    const visual = document.createElement('div');
    visual.className = 'color-picker-visual';
    visual.id = `visual${idx}`;
    visual.style.backgroundColor = state.val;
    glow.style.backgroundColor = state.val;

    well.appendChild(glow);
    well.appendChild(visual);
    well.addEventListener('click', () => openStopPicker(idx));

    // Middle Info: Label + HEX/RGB + Input
    const content = document.createElement('div');
    content.className = 'flex-1 min-w-0 flex flex-col gap-2';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center';

    const labelEl = document.createElement('span');
    labelEl.className = 'apple-caption';
    labelEl.textContent = getStopLabel(idx);
    header.appendChild(labelEl);

    // Mini Tabs
    const tabRow = document.createElement('div');
    tabRow.className = 'relative flex w-20 p-1 bg-black/5 dark:bg-white/10 rounded-xl cursor-pointer';
    tabRow.onclick = () => toggleStopFormat(idx);

    const tabBg = document.createElement('div');
    tabBg.id = `tab-bg-${idx}`;
    tabBg.className = 'absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-slate-600 rounded-lg shadow-sm transition-transform duration-200 ease-out z-0';
    if (state.format === 'rgb') tabBg.style.transform = 'translateX(100%)';

    const tabHex = document.createElement('button');
    tabHex.id = `tab-hex-${idx}`;
    tabHex.className = `relative z-10 flex-1 text-[10px] font-black py-1 transition-colors ${state.format === 'hex' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/40'}`;
    tabHex.textContent = 'HEX';

    const tabRgb = document.createElement('button');
    tabRgb.id = `tab-rgb-${idx}`;
    tabRgb.className = `relative z-10 flex-1 text-[10px] font-black py-1 transition-colors ${state.format === 'rgb' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/40'}`;
    tabRgb.textContent = 'RGB';

    tabRow.appendChild(tabBg);
    tabRow.appendChild(tabHex);
    tabRow.appendChild(tabRgb);
    header.appendChild(tabRow);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'relative w-full';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input${idx}`;
    input.className = 'w-full text-xs font-mono font-bold text-slate-700 dark:text-white bg-black/5 dark:bg-white/5 border border-transparent rounded-xl py-2 pl-3 pr-12 transition-all outline-none uppercase focus:bg-white dark:focus:bg-white/10 focus:border-blue-500/30';
    input.value = state.format === 'hex' ? state.val.toUpperCase() : (() => { const [r,g,b] = chroma(state.val).rgb(); return `${r}, ${g}, ${b}`; })();

    input.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        try {
            let parsed = (pickerState[idx].format === 'rgb' && !val.startsWith('rgb')) ? chroma(`rgb(${val})`) : chroma(val);
            pickerState[idx].val = parsed.hex();
            syncStopUI(idx);
            updateMainGradient();
            if (activePickerId === idx) updateColorFromHex(parsed.hex());
        } catch (err) { syncStopUI(idx); }
    });

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 text-slate-500 dark:text-white/50 hover:text-blue-500 hover:border-blue-500/20 hover:bg-white dark:hover:bg-white/15 transition-all active:scale-95';
    copyBtn.title = 'Copy color code';
    copyBtn.setAttribute('aria-label', 'Copy color code');
    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener('click', () => copyHexColor(input.id));

    inputWrap.appendChild(input);
    inputWrap.appendChild(copyBtn);

    content.appendChild(header);
    content.appendChild(inputWrap);

    wrapper.appendChild(well);
    wrapper.appendChild(content);

    // Remove Button
    if (canRemove) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all active:scale-90';
        removeBtn.title = 'Remove Stop';
        removeBtn.onclick = () => removeColorStop(idx);
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
        wrapper.appendChild(removeBtn);
    }

    return wrapper;
}

function openStopPicker(idx) {
    if (activePickerId === idx) { closePicker(); return; }
    activePickerId = idx;

    const well = document.getElementById(`well${idx}`);
    const rect = well.getBoundingClientRect();
    let leftPos = rect.left + window.scrollX - 100;
    if (leftPos < 20) leftPos = 20;
    if (leftPos + 280 > window.innerWidth - 20) leftPos = window.innerWidth - 300;

    colorPopover.style.top = `${rect.bottom + window.scrollY + 15}px`;
    colorPopover.style.left = `${leftPos}px`;
    colorPopover.classList.remove('hidden-popover');

    const color = chroma(pickerState[idx].val);
    const hsv = color.hsv();
    currentH = isNaN(hsv[0]) ? 0 : hsv[0];
    currentS = isNaN(hsv[1]) ? 0 : hsv[1];
    currentV = isNaN(hsv[2]) ? 0 : hsv[2];
    updatePickerUIFromHSV();
}

function syncStopUI(idx) {
    const state = pickerState[idx];
    const visual = document.getElementById(`visual${idx}`);
    const glow = document.getElementById(`glow${idx}`);
    const input = document.getElementById(`input${idx}`);
    if (visual) visual.style.backgroundColor = state.val;
    if (glow) glow.style.backgroundColor = state.val;
    if (input) {
        if (state.format === 'hex') {
            input.value = state.val.toUpperCase();
        } else {
            const [r, g, b] = chroma(state.val).rgb();
            input.value = `${r}, ${g}, ${b}`;
        }
    }
}

function toggleStopFormat(idx) {
    const state = pickerState[idx];
    state.format = state.format === 'hex' ? 'rgb' : 'hex';

    const tabBg = document.getElementById(`tab-bg-${idx}`);
    const tabHex = document.getElementById(`tab-hex-${idx}`);
    const tabRgb = document.getElementById(`tab-rgb-${idx}`);
    if (!tabBg) return;

    if (state.format === 'rgb') {
        tabBg.style.transform = 'translateX(100%)';
        tabRgb.className = 'relative z-10 flex-1 text-[10px] font-black py-1 text-slate-800 dark:text-white transition-colors';
        tabHex.className = 'relative z-10 flex-1 text-[10px] font-black py-1 text-slate-500 dark:text-white/40 transition-colors';
    } else {
        tabBg.style.transform = 'translateX(0)';
        tabHex.className = 'relative z-10 flex-1 text-[10px] font-black py-1 text-slate-800 dark:text-white transition-colors';
        tabRgb.className = 'relative z-10 flex-1 text-[10px] font-black py-1 text-slate-500 dark:text-white/40 transition-colors';
    }
    syncStopUI(idx);
}

// Keep toggleFormat as a global alias for backwards compatibility
window.toggleFormat = toggleStopFormat;

window.addColorStop = function () {
    if (pickerState.length >= MAX_STOPS) {
        showToast(`Max ${MAX_STOPS} color stops!`);
        return;
    }
    // Generate a new color based on the last stop, shifted hue
    const lastHex = pickerState[pickerState.length - 1].val;
    const newHex = getReadable(chroma(lastHex).set('lch.h', '+40').saturate(0.5).hex());
    pickerState.push({ format: 'hex', val: newHex });
    renderColorStops();
    updateMainGradient();
    // Animate the new item
    const newItem = colorStopsList.lastElementChild;
    if (newItem) {
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
            newItem.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateY(0)';
        });
    }
};

window.removeColorStop = function (idx) {
    const minStops = gradientType === 'solid' ? MIN_STOPS_SOLID : MIN_STOPS_LINEAR;
    if (pickerState.length <= minStops) return;

    // If active picker is being removed or is above idx, close/adjust
    if (activePickerId === idx) closePicker();
    else if (typeof activePickerId === 'number' && activePickerId > idx) activePickerId--;

    pickerState.splice(idx, 1);
    renderColorStops();
    updateMainGradient();
};

function updateAddButtonVisibility() {
    const isSolid = gradientType === 'solid';
    if (addStopWrapper) {
        addStopWrapper.style.display = (isSolid || pickerState.length >= MAX_STOPS) ? 'none' : '';
    }
    if (smartMatchesSection) {
        smartMatchesSection.style.display = isSolid ? 'none' : '';
    }
}

// ===================================================
// GRADIENT TYPE TOGGLE
// ===================================================

window.setGradientType = function (type) {
    gradientType = type;

    const tab = document.getElementById('gradientTypeTab');
    const btnLinear = document.getElementById('btnLinearGradient');
    const btnSolid = document.getElementById('btnSolidColor');

    if (type === 'solid') {
        tab.style.transform = 'translateX(calc(100% + 4px))';
        btnLinearGradient.className = 'relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-2.5 text-slate-500 dark:text-white/40 transition-colors rounded-xl';
        btnSolidColor.className = 'relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-2.5 text-slate-800 dark:text-white transition-colors rounded-xl';
        // Trim to 1 stop
        if (pickerState.length > 1) {
            pickerState = [pickerState[0]];
        }
        // Hide angle slider section
        const angleSection = angleRange ? angleRange.closest('div.mt-8') : null;
        if (angleSection) angleSection.style.display = 'none';
    } else {
        tab.style.transform = 'translateX(0)';
        btnLinearGradient.className = 'relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-2.5 text-slate-800 dark:text-white transition-colors rounded-xl';
        btnSolidColor.className = 'relative z-10 flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-2.5 text-slate-500 dark:text-white/40 transition-colors rounded-xl';
        // Restore to at least 2 stops if switching back from solid
        if (pickerState.length < MIN_STOPS_LINEAR) {
            const base = pickerState[0].val;
            pickerState.push({ format: 'hex', val: getReadable(chroma(base).set('lch.h', '+60').hex()) });
        }
        // Show angle slider section
        const angleSection = angleRange ? angleRange.closest('div.mt-8') : null;
        if (angleSection) angleSection.style.display = '';
    }

    renderColorStops();
    updateMainGradient();
};

// ===================================================
// MAIN RENDERING LOGIC
// ===================================================

// Utility to ensure EXCELLENT readability with white text (Contrast >= 4.5)
function getReadable(colorHex) {
    let c;
    try { c = chroma(colorHex); } catch (e) { return colorHex; }
    while (chroma.contrast(c, '#ffffff') < 4.5 && c.get('lch.l') > 10) {
        c = c.set('lch.l', c.get('lch.l') - 3);
    }
    return c.hex();
}

function setGlobalColors(...colors) {
    // Clamp to max stops
    const clamped = colors.slice(0, MAX_STOPS);
    pickerState = clamped.map(c => ({ format: 'hex', val: c }));
    renderColorStops();
    updateMainGradient();
}

function updateMainGradient() {
    const angle = parseInt(angleRange.value);
    angleVal.innerText = angle;

    if (gradientType === 'solid') {
        const solidColor = pickerState[0].val;
        gradientLayer.style.background = solidColor;
        ambientGlow.style.background = solidColor;
        currentColorsArray = [solidColor];
        checkContrast(solidColor);
        checkHarmony(solidColor, solidColor, solidColor);
    } else {
        const vals = pickerState.map(s => s.val);
        let chromaScale;
        if (vals.length === 1) {
            chromaScale = chroma.scale([vals[0], vals[0]]).mode('lch');
        } else {
            chromaScale = chroma.scale(vals).mode('lch');
        }
        currentColorsArray = chromaScale.colors(Math.max(5, vals.length));
        const cssGradient = `linear-gradient(${angle}deg, ${currentColorsArray.join(', ')})`;
        gradientLayer.style.background = cssGradient;
        ambientGlow.style.background = cssGradient;

        const textBackgroundColor = getBackgroundSamplePoint(angle, chromaScale);
        checkContrast(textBackgroundColor);
        checkHarmony(vals[0], vals[Math.floor(vals.length / 2)], vals[vals.length - 1]);

        if (smartSuggestionsContainer.dataset.lastBase !== vals[0] || smartSuggestionsContainer.dataset.lastCount !== String(vals.length)) {
            generateSmartMatches(vals[0]);
            smartSuggestionsContainer.dataset.lastBase = vals[0];
            smartSuggestionsContainer.dataset.lastCount = String(vals.length);
        }
    }
}

function getBackgroundSamplePoint(angle, scaleFunction) {
    const rad = angle * Math.PI / 180;
    const vx = Math.sin(rad);
    const vy = -Math.cos(rad);
    const sampleX = -11.2;
    const sampleY = -5.4;
    const corners = [{ x: -16, y: -9 }, { x: 16, y: -9 }, { x: 16, y: 9 }, { x: -16, y: 9 }];
    const projections = corners.map(c => c.x * vx + c.y * vy);
    const minP = Math.min(...projections);
    const maxP = Math.max(...projections);
    const sampleP = sampleX * vx + sampleY * vy;
    const t = (sampleP - minP) / (maxP - minP);
    return scaleFunction(Math.max(0, Math.min(1, t))).hex();
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerText = Math.floor(progress * (end - start) + start) + '%';
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function checkContrast(bgColor) {
    const textColor = (typeof titleColorHex !== 'undefined') ? titleColorHex : '#ffffff';
    const ratio = parseFloat(chroma.contrast(bgColor, textColor).toFixed(3));
    let ratioScale;
    if (ratio >= 7) { ratioScale = 95 + ((ratio - 7) / 14) * 5; }
    else if (ratio >= 4.5) { ratioScale = 80 + ((ratio - 4.5) / 2.5) * 15; }
    else if (ratio >= 3) { ratioScale = 60 + ((ratio - 3) / 1.5) * 20; }
    else if (ratio >= 1.5) { ratioScale = 30 + ((ratio - 1.5) / 1.5) * 30; }
    else { ratioScale = ((ratio - 1) / 0.5) * 30; }
    ratioScale = Math.round(Math.max(0, Math.min(100, ratioScale)));
    let emoji, titleMsg, adviceMsg, colorClass, gradientClass;
    if (ratioScale >= 95) { emoji = "😎"; titleMsg = "Retina Gold"; adviceMsg = "Crystal clear. Even your grandma could read this."; colorClass = "text-emerald-700 dark:text-emerald-300"; gradientClass = "from-emerald-400 to-teal-500"; }
    else if (ratioScale >= 80) { emoji = "🧐"; titleMsg = "Pro Status"; adviceMsg = "Clean, crisp, and professional. We love to see it."; colorClass = "text-emerald-600 dark:text-emerald-400"; gradientClass = "from-emerald-300 to-teal-400"; }
    else if (ratioScale >= 60) { emoji = "🤓"; titleMsg = "Just Fine"; adviceMsg = "It works, but don't expect a design award."; colorClass = "text-amber-600 dark:text-amber-400"; gradientClass = "from-amber-400 to-orange-500"; }
    else if (ratioScale >= 30) { emoji = "🫠"; titleMsg = "Squint City"; adviceMsg = "Are you trying to hide a secret message?"; colorClass = "text-orange-600 dark:text-orange-400"; gradientClass = "from-orange-500 to-rose-500"; }
    else { emoji = "🗑️"; titleMsg = "Visual War Crime"; adviceMsg = "Absolute trash and zero visibility. Actually impressive how bad this is."; colorClass = "text-red-600 dark:text-red-400"; gradientClass = "from-red-500 to-rose-600"; }
    const wrap = document.getElementById('contrastDisplayWrap');
    if (wrap) {
        wrap.classList.remove('opacity-0'); wrap.classList.add('opacity-100');
        document.getElementById('contrastEmoji').innerText = emoji;
        document.getElementById('contrastTitle').innerText = titleMsg;
        document.getElementById('contrastTitle').className = `text-xs font-bold tracking-tight transition-colors duration-500 uppercase ${colorClass}`;
        const pctEl = document.getElementById('contrastPct');
        let currentPct = parseInt(pctEl.innerText) || 0;
        animateValue(pctEl, currentPct, ratioScale, 1000);
        pctEl.className = `score-display transition-colors duration-500 ${colorClass}`;
        const bar = document.getElementById('contrastBar');
        bar.style.width = `${ratioScale}%`;
        bar.className = `progress-bar-fill bg-gradient-to-r ${gradientClass}`;
        document.getElementById('contrastAdvice').innerText = adviceMsg;
    }
}

function checkHarmony(c1, c2, c3) {
    let h1 = chroma(c1).get('lch.h');
    let h2 = chroma(c2).get('lch.h');
    let h3 = chroma(c3).get('lch.h');
    h1 = isNaN(h1) ? 0 : h1;
    h2 = isNaN(h2) ? 0 : h2;
    h3 = isNaN(h3) ? 0 : h3;
    const hues = [h1, h2, h3].sort((a, b) => a - b);
    const d1 = hues[1] - hues[0];
    const d2 = hues[2] - hues[1];
    const d3 = (360 - hues[2]) + hues[0];
    const maxDist = Math.max(d1, d2, d3);
    let vibePct = 0;
    if (maxDist >= 260) { vibePct = Math.min(100, Math.floor(90 + (maxDist - 260) / 10)); }
    else if (maxDist <= 150) { const diff = Math.abs(maxDist - 120); vibePct = Math.max(90, 100 - diff); }
    else { const diff = Math.abs(maxDist - 205); vibePct = Math.floor(35 + (diff / 55) * 54); }
    let emoji, titleMsg, adviceMsg, colorClass, gradientClass;
    if (vibePct >= 90) { emoji = "✨"; titleMsg = "Vibe Lord"; adviceMsg = "This is a straight up mood. Absolute fire."; colorClass = "text-fuchsia-600 dark:text-fuchsia-400"; gradientClass = "from-fuchsia-400 to-purple-500"; }
    else if (vibePct >= 65) { emoji = "💅"; titleMsg = "Decent Energy"; adviceMsg = "It's giving 'I know what I'm doing' vibes."; colorClass = "text-blue-600 dark:text-blue-400"; gradientClass = "from-blue-400 to-indigo-500"; }
    else if (vibePct >= 40) { emoji = "🤨"; titleMsg = "Chaotic Neutral"; adviceMsg = "It's... unique? Let's call it 'Experimental'."; colorClass = "text-amber-600 dark:text-amber-400"; gradientClass = "from-amber-400 to-orange-500"; }
    else { emoji = "🗑️"; titleMsg = "Literal Dog Water"; adviceMsg = "This combination is a mess. My eyes are offended."; colorClass = "text-rose-600 dark:text-rose-400"; gradientClass = "from-pink-500 to-rose-500"; }
    const wrap = document.getElementById('vibeDisplayWrap');
    if (wrap) {
        wrap.classList.remove('opacity-0'); wrap.classList.add('opacity-100');
        document.getElementById('vibeEmoji').innerText = emoji;
        document.getElementById('vibeTitle').innerText = titleMsg;
        document.getElementById('vibeTitle').className = `text-xs font-bold tracking-tight transition-colors duration-500 uppercase ${colorClass}`;
        const pctEl = document.getElementById('vibePct');
        let currentPct = parseInt(pctEl.innerText) || 0;
        animateValue(pctEl, currentPct, vibePct, 1000);
        pctEl.className = `score-display transition-colors duration-500 ${colorClass}`;
        const bar = document.getElementById('vibeBar');
        bar.style.width = `${vibePct}%`;
        bar.className = `progress-bar-fill bg-gradient-to-r ${gradientClass}`;
        document.getElementById('vibeAdvice').innerText = adviceMsg;
    }
}

// ===================================================
// SMART MATCHES
// ===================================================

function generateSmartMatches(baseHex) {
    const base = chroma(baseHex);
    const count = pickerState.length;
    
    const getAdaptivePalette = (profile) => {
        let colors = [];
        for (let i = 0; i < count; i++) {
            let c;
            const t = i / (Math.max(1, count - 1)); // 0 to 1
            
            if (profile === 'analogous') {
                // Spread hue by 25-40 degrees each step
                c = base.set('lch.h', `+${t * 90}`).set('lch.c', 90 + (t * 10));
            } else if (profile === 'deep') {
                // Darken and shift hue slightly
                c = base.set('lch.h', `+${t * 40}`).darken(t * 1.2);
            } else {
                // Cool Shift: Shift hue backwards
                c = base.set('lch.h', `-${t * 90}`).set('lch.c', 90 + (t * 10));
            }
            colors.push(getReadable(c.hex()));
        }
        return colors;
    };

    const palettes = [
        { name: "Analogous Pop", colors: getAdaptivePalette('analogous') },
        { name: "Deep Glow", colors: getAdaptivePalette('deep') },
        { name: "Cool Shift", colors: getAdaptivePalette('cool') }
    ];

    smartSuggestionsContainer.innerHTML = '';
    palettes.forEach(palette => {
        const btn = document.createElement('button');
        btn.className = "flex-1 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 transition-all opacity-90 hover:opacity-100 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 neon-breath";
        btn.style.background = `linear-gradient(90deg, ${palette.colors.join(', ')})`;
        btn.title = `Apply ${palette.name} Palette (${count} colors)`;
        btn.onclick = () => setGlobalColors(...palette.colors);
        smartSuggestionsContainer.appendChild(btn);
    });
}

// ===================================================
// PRESETS
// ===================================================

const canvaPresetsRaw = [
    ['#fde047', '#f97316', '#ef4444'], ['#fca5a5', '#f43f5e', '#be123c'], ['#fb923c', '#ea580c', '#c2410c'],
    ['#a7f3d0', '#10b981', '#047857'], ['#bae6fd', '#38bdf8', '#0284c7'], ['#e9d5ff', '#a855f7', '#7e22ce'],
    ['#d946ef', '#c026d3', '#a21caf'], ['#facc15', '#a3e635', '#4ade80'], ['#34d399', '#059669', '#064e3b'],
    ['#2dd4bf', '#0e7490', '#1e3a8a'], ['#fbbf24', '#d97706', '#92400e'], ['#f87171', '#c084fc', '#60a5fa'],
    ['#ef4444', '#b91c1c', '#7f1d1d'], ['#ec4899', '#be185d', '#831843'], ['#3b82f6', '#1d4ed8', '#1e3a8a'],
    ['#8b5cf6', '#6366f1', '#3b82f6'], ['#f472b6', '#d946ef', '#8b5cf6'], ['#14b8a6', '#0ea5e9', '#3b82f6']
];
const canvaPresets = canvaPresetsRaw.map(group => group.map(getReadable));
const presetGrid = document.getElementById('presetGrid');
canvaPresets.forEach(colors => {
    const btn = document.createElement('button');
    btn.className = "w-10 h-10 rounded-full border border-black/10 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all hover:scale-110 active:scale-90";
    btn.style.background = `linear-gradient(135deg, ${colors.join(', ')})`;
    btn.onclick = () => {
        if (gradientType === 'solid') setGradientType('linear');
        setGlobalColors(colors[0], colors[1], colors[2]);
    };
    presetGrid.appendChild(btn);
});

// ===================================================
// EXPORT & UTILITIES
// ===================================================

function updateTitleFromInput() {
    if (mainTitle && titleInput) {
        mainTitle.innerText = titleInput.value;
    }
}

// Sync contenteditable back to input
if (mainTitle) {
    mainTitle.addEventListener('input', () => {
        if (titleInput) titleInput.value = mainTitle.innerText;
    });
}

function updateTitleSize() {
    if (mainTitle && titleSizeRange && titleSizeVal) {
        const size = titleSizeRange.value;
        mainTitle.style.fontSize = `${size}px`;
        titleSizeVal.innerText = size;
    }
}

if (titleInput) titleInput.addEventListener('input', updateTitleFromInput);
if (titleSizeRange) titleSizeRange.addEventListener('input', updateTitleSize);

window.setTitleAlign = function (align, btn) {
    if (!mainTitle || !titleWrapper) return;

    mainTitle.style.textAlign = align;
    titleWrapper.dataset.align = align;

    const container = btn.parentElement;
    if (!container) return;

    container.querySelectorAll('button').forEach(b => {
        b.classList.remove('bg-white', 'dark:bg-white/10', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        b.classList.add('text-slate-500', 'dark:text-white/40');
    });

    btn.classList.add('bg-white', 'dark:bg-white/10', 'text-slate-900', 'dark:text-white', 'shadow-sm');
    btn.classList.remove('text-slate-500', 'dark:text-white/40');
};

async function exportBanner(format) {
    const targetWidth = bannerState.width;
    const targetHeight = bannerState.height;
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const extension = format === 'png' ? 'png' : 'jpg';
    const quality = format === 'png' ? undefined : 1.0;
    const exportMultiplier = getRenderMultiplier(targetWidth, targetHeight);
    const defaultFileName = `taxpod-pro-banner-${Date.now()}.${extension}`;

    showToast(`Preparing ${targetWidth} x ${targetHeight} ${format.toUpperCase()} export at ${exportMultiplier}x detail...`);

    try {
        const canvas = await renderPreviewCanvas(exportMultiplier);
        await saveExportCanvas(canvas, {
            defaultFileName,
            extension,
            mimeType,
            quality
        });
        showToast(`Exported ${targetWidth} x ${targetHeight} ${format.toUpperCase()}.`);
    } catch (err) {
        if (err && err.name === 'AbortError') {
            showToast('Export canceled.');
            return;
        }
        console.error("Export Error:", err);
        showToast("Export failed. Please check console.");
    }
}

function getRenderMultiplier(targetWidth, targetHeight) {
    const maxCanvasDimension = 8192;
    const requestedMultiplier = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
    return Math.max(1, Math.min(
        requestedMultiplier,
        Math.floor(maxCanvasDimension / Math.max(targetWidth, targetHeight)) || 1
    ));
}

async function renderPreviewCanvas(multiplier = 1) {
    const preview = previewContainer;
    if (!preview) throw new Error('Preview container not found.');

    const captureScale = (bannerState.width / preview.offsetWidth) * multiplier;
    preview.classList.add('is-exporting');
    const originalRadius = preview.style.borderRadius;
    const originalShadow = preview.style.boxShadow;
    const originalTransform = preview.style.transform;

    if (document.activeElement) document.activeElement.blur();
    preview.style.borderRadius = '0';
    preview.style.boxShadow = 'none';
    preview.style.transform = 'none';

    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
        return await html2canvas(preview, {
            scale: captureScale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: preview.offsetWidth,
            height: preview.offsetHeight,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight
        });
    } finally {
        preview.classList.remove('is-exporting');
        preview.style.borderRadius = originalRadius;
        preview.style.boxShadow = originalShadow;
        preview.style.transform = originalTransform;
    }
}

async function saveExportCanvas(canvas, { defaultFileName, extension, mimeType, quality }) {
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) resolve(result);
            else reject(new Error('Failed to create export file.'));
        }, mimeType, quality);
    });

    if ('showSaveFilePicker' in window && window.isSecureContext) {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [
                {
                    description: extension === 'png' ? 'PNG Image' : 'JPEG Image',
                    accept: {
                        [mimeType]: [`.${extension}`]
                    }
                }
            ]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
    }

    const link = document.createElement('a');
    link.download = defaultFileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportJPG() {
    return exportBanner('jpg');
}

function exportPNG() {
    return exportBanner('png');
}

if (exportJpgBtn) exportJpgBtn.addEventListener('click', exportJPG);
if (exportPngBtn) exportPngBtn.addEventListener('click', exportPNG);
if (copyPreviewBtn) copyPreviewBtn.addEventListener('click', copyPreviewImage);

async function copyPreviewImage() {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        showToast('Image copy is not supported in this browser.');
        return;
    }

    const multiplier = getRenderMultiplier(bannerState.width, bannerState.height);
    showToast(`Copying preview image at ${bannerState.width} x ${bannerState.height}...`);

    try {
        const canvas = await renderPreviewCanvas(multiplier);
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) resolve(result);
                else reject(new Error('Failed to create preview image.'));
            }, 'image/png');
        });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Preview image copied to clipboard.');
    } catch (err) {
        console.error('Copy Image Error:', err);
        showToast('Copy image failed. Please check browser permissions.');
    }
}

function showToast(msg) {
    document.getElementById('toastMsg').innerText = msg;
    const t = document.getElementById('toast');
    t.style.opacity = '1'; t.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 40px)'; }, 3000);
}

document.getElementById('copyCssBtn').addEventListener('click', () => {
    let cssText;
    if (gradientType === 'solid') {
        cssText = `background: ${pickerState[0].val};`;
    } else {
        cssText = `background: linear-gradient(${angleRange.value}deg, ${currentColorsArray.join(', ')});`;
    }
    navigator.clipboard.writeText(cssText).then(() => showToast("CSS Code Copied!"));
});

document.getElementById('copyFigmaBtn').addEventListener('click', () => {
    let figmaText;
    if (gradientType === 'solid') {
        figmaText = `Figma Solid Color\n${pickerState[0].val.toUpperCase()}`;
    } else {
        figmaText = `Figma Linear Gradient\nAngle: ${angleRange.value}°\n\nColor Stops:\n`;
        const stops = currentColorsArray;
        stops.forEach((c, i) => { figmaText += `${Math.round((i / (stops.length - 1)) * 100)}% - ${c.toUpperCase()}\n`; });
    }
    navigator.clipboard.writeText(figmaText).then(() => showToast("Figma Stops Copied!"));
});

let hasShownShortcutHint = false;

function randomizeGradient() {
    const profiles = ['analogous', 'complementary', 'triadic', 'tonal'];
    const chosenProfile = profiles[Math.floor(Math.random() * profiles.length)];
    const l = 55 + Math.random() * 20;
    const c = 80 + Math.random() * 20;
    const h = Math.random() * 360;
    const baseColor = chroma.lch(l, c, h);
    let colors = [];
    switch (chosenProfile) {
        case 'analogous': colors = [baseColor.hex(), baseColor.set('lch.h', '+30').hex(), baseColor.set('lch.h', '+60').hex()]; break;
        case 'complementary': colors = [baseColor.hex(), baseColor.set('lch.h', '+180').set('lch.c', '-30').hex(), baseColor.set('lch.h', '+20').hex()]; break;
        case 'triadic': colors = [baseColor.hex(), baseColor.set('lch.h', '+120').set('lch.l', '-10').hex(), baseColor.set('lch.h', '+240').set('lch.l', '+10').hex()]; break;
        case 'tonal': colors = [baseColor.hex(), baseColor.set('lch.c', '-40').set('lch.l', '-20').hex(), baseColor.set('lch.c', '+10').set('lch.l', '+15').hex()]; break;
    }
    const finalColors = colors.map(clk => getReadable(clk));

    // Maintain current number of stops when randomizing
    if (gradientType === 'solid') {
        setGlobalColors(finalColors[0]);
    } else {
        const currentCount = pickerState.length;
        const toUse = finalColors.slice(0, currentCount);
        // Pad if needed
        while (toUse.length < currentCount) {
            const last = chroma(toUse[toUse.length - 1]);
            toUse.push(getReadable(last.set('lch.h', '+30').hex()));
        }
        setGlobalColors(...toUse);
    }

    const preview = document.getElementById('previewContainer');
    if (preview) {
        preview.style.transform = 'scale(0.99)';
        setTimeout(() => { preview.style.transform = 'scale(1)'; }, 150);
    }
}

document.getElementById('randomizeBtn').addEventListener('click', () => {
    randomizeGradient();
    if (!hasShownShortcutHint) {
        const hint = document.getElementById('shortcutHint');
        if (hint) {
            hint.classList.replace('opacity-0', 'opacity-100');
            hint.classList.replace('scale-75', 'scale-100');
            hint.classList.replace('-top-16', '-top-20');
            setTimeout(() => {
                hint.classList.replace('opacity-100', 'opacity-0');
                hint.classList.replace('scale-100', 'scale-75');
                hint.classList.replace('-top-20', '-top-16');
            }, 4000);
        }
        hasShownShortcutHint = true;
    }
});

previewContainer.addEventListener('click', (e) => {
    // Randomization on banner click disabled to prevent accidents while editing text
});

// ===================================================
// SUBJECT UPLOAD & DRAGGING & SCALING
// ===================================================
const subjectUpload = document.getElementById('subjectUpload');
const uploadTrigger = document.getElementById('uploadTrigger');
const resetSubject = document.getElementById('resetSubject');
const subjectWrapper = document.getElementById('subjectWrapper');
const subjectImage = document.getElementById('subjectImage');
const subjectPlaceholder = document.getElementById('subjectPlaceholder');
const scaleControlGroup = document.getElementById('scaleControlGroup');
const subjectScaleRange = document.getElementById('subjectScaleRange');
const subjectScaleVal = document.getElementById('subjectScaleVal');
const resizeHandles = Array.from(document.querySelectorAll('[data-resize-dir]'));
const dragHint = document.getElementById('dragHint');

let isDraggingSubject = false;
let isResizingSubject = false;
let isDraggingTitle = false;
let subjectX = 0;
let subjectY = 0;
let titleX = 0;
let titleY = 0;
let subjectScale = 1;
let startX, startY, startScale, startWidth, startHeight, resizeDirection;
let startTitleX, startTitleY;

uploadTrigger.addEventListener('click', () => subjectUpload.click());

subjectUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            subjectImage.src = event.target.result;
            subjectImage.classList.remove('hidden');
            subjectPlaceholder.classList.add('hidden');
            if (dragHint) dragHint.classList.remove('hidden');
            if (scaleControlGroup) scaleControlGroup.classList.remove('hidden');
            showToast("Subject Uploaded! Try dragging or scaling it.");
            subjectX = 0; subjectY = 0; subjectScale = 1;
            if (subjectScaleRange) subjectScaleRange.value = 100;
            if (subjectScaleVal) subjectScaleVal.innerText = "100";
            updateSubjectTransform();
        };
        reader.readAsDataURL(file);
    }
});

resetSubject.addEventListener('click', () => {
    subjectImage.classList.add('hidden');
    subjectImage.src = "";
    subjectPlaceholder.classList.remove('hidden');
    if (dragHint) dragHint.classList.add('hidden');
    if (scaleControlGroup) scaleControlGroup.classList.add('hidden');
    subjectUpload.value = ''; // Fix for selecting same image again
    subjectX = 0; subjectY = 0; subjectScale = 1;
    updateSubjectTransform();
    showToast("Subject Reset");
});

subjectScaleRange.addEventListener('input', (e) => {
    const val = e.target.value;
    subjectScaleVal.innerText = val;
    subjectScale = val / 100;
    updateSubjectTransform();
});

function startResize(e) {
    const handle = e.target.closest('[data-resize-dir]');
    if (!handle) return;
    isResizingSubject = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const rect = subjectWrapper.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    startScale = subjectScale;
    startWidth = rect.width;
    startHeight = rect.height;
    resizeDirection = handle.getAttribute('data-resize-dir') || 'se';
    e.stopPropagation();
    e.preventDefault();
}

function startDrag(e) {
    if (isResizingSubject) return;
    isDraggingSubject = true;
    subjectWrapper.classList.add('is-dragging');
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    startX = clientX - subjectX;
    startY = clientY - subjectY;
    e.stopPropagation();
}

function updateInteract(e) {
    if (isResizingSubject) {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const vectors = {
            n: [0, -1],
            ne: [1, -1],
            e: [1, 0],
            se: [1, 1],
            s: [0, 1],
            sw: [-1, 1],
            w: [-1, 0],
            nw: [-1, -1]
        };
        const [vx, vy] = vectors[resizeDirection] || vectors.se;
        const deltaX = (clientX - startX) * vx;
        const deltaY = (clientY - startY) * vy;
        const primaryDelta = vx && vy ? ((deltaX + deltaY) / 2) : (vx ? deltaX : deltaY);
        const baseSize = Math.max(startWidth, startHeight, 1);
        const newScale = startScale * (1 + primaryDelta / baseSize);
        subjectScale = Math.max(0.1, Math.min(3, newScale));
        
        // Sync with UI
        if (subjectScaleRange) subjectScaleRange.value = Math.round(subjectScale * 100);
        if (subjectScaleVal) subjectScaleVal.innerText = Math.round(subjectScale * 100);
        
        updateSubjectTransform();
    } else if (isDraggingSubject) {
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        subjectX = clientX - startX;
        subjectY = clientY - startY;
        updateSubjectTransform();
    }
}

function stopInteract() {
    isDraggingSubject = false;
    isResizingSubject = false;
    resizeDirection = null;
    subjectWrapper.classList.remove('is-dragging');
}

function updateSubjectTransform() {
    subjectWrapper.style.transform = `translate(${subjectX}px, ${subjectY}px) scale(${subjectScale})`;
}

// Title Dragging Logic
function startTitleDrag(e) {
    if (e.target.contentEditable === 'true' && document.activeElement === e.target) return;
    if (isResizingSubject || isDraggingSubject) return;
    
    isDraggingTitle = true;
    titleWrapper.classList.add('is-dragging-title');
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    startTitleX = clientX - titleX;
    startTitleY = clientY - titleY;
    e.stopPropagation();
}

function updateTitleDrag(e) {
    if (!isDraggingTitle) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    titleX = clientX - startTitleX;
    titleY = clientY - startTitleY;
    updateTitleTransform();
}

function updateTitleTransform() {
    titleWrapper.style.transform = `translate(${titleX}px, ${titleY}px)`;
}

resizeHandles.forEach((handle) => {
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });
});
subjectWrapper.addEventListener('mousedown', startDrag);
subjectWrapper.addEventListener('touchstart', startDrag, { passive: false });
titleWrapper.addEventListener('mousedown', startTitleDrag);
titleWrapper.addEventListener('touchstart', startTitleDrag, { passive: false });

window.addEventListener('mousemove', (e) => {
    updateInteract(e);
    updateTitleDrag(e);
});
window.addEventListener('touchmove', (e) => {
    updateInteract(e);
    updateTitleDrag(e);
}, { passive: false });

window.addEventListener('mouseup', () => {
    stopInteract();
    isDraggingTitle = false;
    titleWrapper.classList.remove('is-dragging-title');
});
window.addEventListener('touchend', () => {
    stopInteract();
    isDraggingTitle = false;
    titleWrapper.classList.remove('is-dragging-title');
});

angleRange.addEventListener('input', updateMainGradient);
if (bannerWidthInput) bannerWidthInput.addEventListener('change', setCustomBannerDimension);
if (bannerHeightInput) bannerHeightInput.addEventListener('change', setCustomBannerDimension);
if (bannerWidthInput) bannerWidthInput.addEventListener('blur', setCustomBannerDimension);
if (bannerHeightInput) bannerHeightInput.addEventListener('blur', setCustomBannerDimension);
if (bannerPresetBtn) bannerPresetBtn.addEventListener('click', (e) => { e.preventDefault(); toggleBannerPresetMenu(); });

if (bannerPresetMenu) {
    bannerPresetMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.fancy-dropdown-item');
        if (!item) return;
        const val = item.getAttribute('data-value');
        if (!val) return;
        setPresetBannerSize(val);
        closeBannerPresetMenu();
    });
}

document.addEventListener('mousedown', (e) => {
    if (!bannerPresetMenu || !bannerPresetBtn) return;
    if (bannerPresetMenu.classList.contains('hidden')) return;
    if (bannerPresetMenu.contains(e.target) || bannerPresetBtn.contains(e.target)) return;
    closeBannerPresetMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!bannerPresetMenu || bannerPresetMenu.classList.contains('hidden')) return;
    closeBannerPresetMenu();
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.fancy-stepper-btn');
    if (!btn) return;
    const which = btn.getAttribute('data-stepper');
    const dir = btn.getAttribute('data-dir');
    if (!which || !dir) return;
    stepBannerDimension(which, dir, e);
});

if (mainTitle) {
    mainTitle.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
    });
}

// ===================================================
// INIT
// ===================================================
applyBannerSize(bannerState.width, bannerState.height, true);
updateBannerPresetUI();
renderColorStops();
setGlobalColors('#3b82f6', '#8b5cf6', '#d946ef');
syncTitleWell('#ffffff');
updateTitleSize();

// Splash Screen Logic
window.addEventListener('load', () => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        setTimeout(() => {
            splash.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                splash.style.display = 'none';
                setTimeout(openOnboarding, 400);
            }, 800);
        }, 2500);
    }
});

window.setTitleWeight = function(weight, btn) {
    if (mainTitle) {
        mainTitle.style.fontWeight = weight;
        
        // UI Sync
        const container = btn.parentElement;
        container.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-white', 'dark:bg-white/10', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            b.classList.add('text-slate-500', 'dark:text-white/40');
        });
        
        btn.classList.add('bg-white', 'dark:bg-white/10', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        btn.classList.remove('text-slate-500', 'dark:text-white/40');
    }
};

// Onboarding Modal Logic
window.openOnboarding = function () {
    const modal = document.getElementById('onboardingModal');
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    modal.classList.remove('hidden');
    modal.offsetHeight;
    overlay.classList.add('opacity-100');
    content.classList.add('opacity-100', 'scale-100');
    content.classList.remove('scale-95');
};

window.closeOnboarding = function () {
    const modal = document.getElementById('onboardingModal');
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    overlay.classList.remove('opacity-100');
    content.classList.remove('opacity-100', 'scale-100');
    content.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 500);
};

window.copyHexColor = function (inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            showToast(input.value + " Copied!");
        });
    }
};
