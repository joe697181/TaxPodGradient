// --- Core App State ---
        const pickerState = [
            { format: 'hex', val: '#3b82f6' },
            { format: 'hex', val: '#8b5cf6' },
            { format: 'hex', val: '#d946ef' }
        ];
        let currentColorsArray = [];
        let activePickerId = null;

        // --- Custom Picker State ---
        let currentH = 0, currentS = 1, currentV = 1;
        let isDraggingSB = false;
        let isDraggingHue = false;

        // --- DOM Elements ---
        const wells = [document.getElementById('well0'), document.getElementById('well1'), document.getElementById('well2')];
        const visuals = [document.getElementById('visual0'), document.getElementById('visual1'), document.getElementById('visual2')];
        const glows = [document.getElementById('glow0'), document.getElementById('glow1'), document.getElementById('glow2')];
        const textInputs = [document.getElementById('input0'), document.getElementById('input1'), document.getElementById('input2')];

        const angleRange = document.getElementById('angleRange');
        const angleVal = document.getElementById('angleVal');
        const gradientLayer = document.getElementById('gradientLayer');
        const ambientGlow = document.getElementById('ambientGlow');
        const statusBadgeContainer = document.getElementById('statusBadgeContainer');
        const smartSuggestionsContainer = document.getElementById('smartSuggestions');

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

        // --- Custom Color Picker Popover Logic --- //

        // Close popover when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!colorPopover.classList.contains('hidden-popover') &&
                !colorPopover.contains(e.target) &&
                !wells.some(w => w.contains(e.target))) {
                closePicker();
            }
        });

        // Hide Eyedropper if not supported
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

        // Open Picker
        wells.forEach((well, i) => {
            well.addEventListener('click', () => {
                if (activePickerId === i) { closePicker(); return; }
                activePickerId = i;

                // Position Popover directly below the clicked well
                const rect = well.getBoundingClientRect();
                let leftPos = rect.left + window.scrollX - 100;
                if (leftPos < 20) leftPos = 20;

                colorPopover.style.top = `${rect.bottom + window.scrollY + 15}px`;
                colorPopover.style.left = `${leftPos}px`;
                colorPopover.classList.remove('hidden-popover');

                // Initialize from current color
                const color = chroma(pickerState[i].val);
                const hsv = color.hsv();
                currentH = isNaN(hsv[0]) ? 0 : hsv[0];
                currentS = isNaN(hsv[1]) ? 0 : hsv[1];
                currentV = isNaN(hsv[2]) ? 0 : hsv[2];

                updatePickerUIFromHSV();
            });
        });

        function closePicker() {
            colorPopover.classList.add('hidden-popover');
            activePickerId = null;
        }

        // Dragging Logic
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

        // Mouse Events
        sbArea.addEventListener('mousedown', (e) => { isDraggingSB = true; handleSBDraw(e); });
        hueArea.addEventListener('mousedown', (e) => { isDraggingHue = true; handleHueDraw(e); });
        window.addEventListener('mousemove', (e) => { handleSBDraw(e); handleHueDraw(e); });
        window.addEventListener('mouseup', () => { isDraggingSB = false; isDraggingHue = false; });

        // Touch Events
        sbArea.addEventListener('touchstart', (e) => { isDraggingSB = true; handleSBDraw(e); }, { passive: false });
        hueArea.addEventListener('touchstart', (e) => { isDraggingHue = true; handleHueDraw(e); }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (isDraggingSB || isDraggingHue) { e.preventDefault(); handleSBDraw(e); handleHueDraw(e); }
        }, { passive: false });
        window.addEventListener('touchend', () => { isDraggingSB = false; isDraggingHue = false; });

        // Update core logic from HSV
        function updateColorFromHSV() {
            const hex = chroma.hsv(currentH, currentS, currentV).hex();
            updatePickerUIFromHSV();

            if (activePickerId !== null) {
                pickerState[activePickerId].val = hex;
                syncInputsAndWells(activePickerId);
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

            // Update inputs inside popover
            const hex = finalColor.hex().replace('#', '').toUpperCase();
            const [r, g, b] = finalColor.rgb();

            if (document.activeElement !== popHex) popHex.value = hex;
            if (document.activeElement !== popR) popR.value = r;
            if (document.activeElement !== popG) popG.value = g;
            if (document.activeElement !== popB) popB.value = b;
        }

        // Popover Inputs logic
        popHex.addEventListener('change', (e) => updateColorFromHex('#' + e.target.value));
        [popR, popG, popB].forEach(input => {
            input.addEventListener('change', () => {
                const color = chroma(popR.value, popG.value, popB.value);
                updateColorFromHex(color.hex());
            });
        });

        // --- Main UI Panel Logic --- //

        // Tabs Toggle Logic (Hex vs RGB)
        window.toggleFormat = function (idx) {
            const isHex = pickerState[idx].format === 'hex';
            pickerState[idx].format = isHex ? 'rgb' : 'hex';

            const tabBg = document.getElementById(`tab-bg-${idx}`);
            const tabHex = document.getElementById(`tab-hex-${idx}`);
            const tabRgb = document.getElementById(`tab-rgb-${idx}`);

            if (pickerState[idx].format === 'rgb') {
                tabBg.style.transform = 'translateX(100%)';
                tabRgb.className = "relative z-10 flex-1 text-[10px] font-extrabold py-1 text-slate-800 dark:text-white transition-colors";
                tabHex.className = "relative z-10 flex-1 text-[10px] font-extrabold py-1 text-slate-500 dark:text-white/50 transition-colors";
            } else {
                tabBg.style.transform = 'translateX(0)';
                tabHex.className = "relative z-10 flex-1 text-[10px] font-extrabold py-1 text-slate-800 dark:text-white transition-colors";
                tabRgb.className = "relative z-10 flex-1 text-[10px] font-extrabold py-1 text-slate-500 dark:text-white/50 transition-colors";
            }
            syncInputsAndWells(idx);
        };

        // Text input directly on the panel
        textInputs.forEach((input, idx) => {
            input.addEventListener('change', (e) => {
                let val = e.target.value.trim();
                try {
                    let parsed = (pickerState[idx].format === 'rgb' && !val.startsWith('rgb')) ? chroma(`rgb(${val})`) : chroma(val);
                    pickerState[idx].val = parsed.hex();
                    syncInputsAndWells(idx);
                    updateMainGradient();
                    if (activePickerId === idx) updateColorFromHex(parsed.hex()); // sync popup if open
                } catch (err) { syncInputsAndWells(idx); } // revert on error
            });
        });

        // Sync visual wells and text inputs
        function syncInputsAndWells(idx) {
            const hexVal = pickerState[idx].val;
            visuals[idx].style.backgroundColor = hexVal;
            glows[idx].style.backgroundColor = hexVal;

            if (pickerState[idx].format === 'hex') {
                textInputs[idx].value = hexVal.toUpperCase();
            } else {
                const rgb = chroma(hexVal).rgb();
                textInputs[idx].value = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
            }
        }

        // Utility to ensure EXCELLENT readability with white text (Contrast >= 4.5)
        function getReadable(colorHex) {
            let c = chroma(colorHex);
            // Lower lightness until contrast is at least 4.5 (Excellent)
            while (chroma.contrast(c, '#ffffff') < 4.5 && c.get('lch.l') > 10) {
                c = c.set('lch.l', c.get('lch.l') - 3);
            }
            return c.hex();
        }

        // Setup Canva Presets (Curated Vibrant Styles)
        const canvaPresetsRaw = [
            ['#fde047', '#f97316', '#ef4444'], ['#fca5a5', '#f43f5e', '#be123c'], ['#fb923c', '#ea580c', '#c2410c'],
            ['#a7f3d0', '#10b981', '#047857'], ['#bae6fd', '#38bdf8', '#0284c7'], ['#e9d5ff', '#a855f7', '#7e22ce'],
            ['#d946ef', '#c026d3', '#a21caf'], ['#facc15', '#a3e635', '#4ade80'], ['#34d399', '#059669', '#064e3b'],
            ['#2dd4bf', '#0e7490', '#1e3a8a'], ['#fbbf24', '#d97706', '#92400e'], ['#f87171', '#c084fc', '#60a5fa'],
            ['#ef4444', '#b91c1c', '#7f1d1d'], ['#ec4899', '#be185d', '#831843'], ['#3b82f6', '#1d4ed8', '#1e3a8a'],
            ['#8b5cf6', '#6366f1', '#3b82f6'], ['#f472b6', '#d946ef', '#8b5cf6'], ['#14b8a6', '#0ea5e9', '#3b82f6']
        ];

        // Process all presets to guarantee excellent readability
        const canvaPresets = canvaPresetsRaw.map(group => group.map(getReadable));

        canvaPresets.forEach(colors => {
            const btn = document.createElement('button');
            btn.className = "preset-circle w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-white/40 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-md";
            btn.style.background = `linear-gradient(135deg, ${colors.join(', ')})`;
            btn.onclick = () => setGlobalColors(colors[0], colors[1], colors[2]);
            presetGrid.appendChild(btn);
        });

        // Vibrant Smart Matches
        function generateSmartMatches(baseHex) {
            const base = chroma(baseHex);

            // Reuses the globally scoped getReadable logic
            const safeBase = getReadable(baseHex);

            const palettes = [
                { name: "Analogous Pop", colors: [safeBase, getReadable(base.set('lch.h', '+45').set('lch.c', 100)), getReadable(base.set('lch.h', '+90').set('lch.c', 100))] },
                { name: "Deep Glow", colors: [safeBase, getReadable(base.set('lch.h', '+25').darken(0.5)), getReadable(base.set('lch.h', '+50').darken(1))] },
                { name: "Cool Shift", colors: [safeBase, getReadable(base.set('lch.h', '-45').set('lch.c', 100)), getReadable(base.set('lch.h', '-90').set('lch.c', 100))] }
            ];

            smartSuggestionsContainer.innerHTML = '';
            palettes.forEach(palette => {
                const btn = document.createElement('button');
                btn.className = "pill-button flex-1 rounded-xl shadow-md border border-black/10 dark:border-white/20 transition-all opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50";
                btn.style.background = `linear-gradient(90deg, ${palette.colors.join(', ')})`;
                btn.title = `Apply ${palette.name} Palette`;
                btn.onclick = () => setGlobalColors(palette.colors[0], palette.colors[1], palette.colors[2]);
                smartSuggestionsContainer.appendChild(btn);
            });
        }

        // Main Rendering Logic
        function setGlobalColors(c1, c2, c3) {
            pickerState[0].val = c1; syncInputsAndWells(0);
            pickerState[1].val = c2; syncInputsAndWells(1);
            pickerState[2].val = c3; syncInputsAndWells(2);
            updateMainGradient();
        }

        function updateMainGradient() {
            const angle = parseInt(angleRange.value);
            angleVal.innerText = angle;

            const chromaScale = chroma.scale([pickerState[0].val, pickerState[1].val, pickerState[2].val]).mode('lch');
            currentColorsArray = chromaScale.colors(5);

            const cssGradient = `linear-gradient(${angle}deg, ${currentColorsArray.join(', ')})`;
            gradientLayer.style.background = cssGradient;
            ambientGlow.style.background = cssGradient;

            const textBackgroundColor = getTopLeftColor(angle, chromaScale);
            checkContrast(textBackgroundColor);
            checkHarmony(pickerState[0].val, pickerState[1].val, pickerState[2].val);

            if (smartSuggestionsContainer.dataset.lastBase !== pickerState[0].val) {
                generateSmartMatches(pickerState[0].val);
                smartSuggestionsContainer.dataset.lastBase = pickerState[0].val;
            }
        }

        function getTopLeftColor(angle, scaleFunction) {
            const rad = angle * Math.PI / 180;
            const vx = Math.sin(rad);
            const vy = -Math.cos(rad);
            const corners = [{ x: -16, y: -9 }, { x: 16, y: -9 }, { x: 16, y: 9 }, { x: -16, y: 9 }];
            const projections = corners.map(c => c.x * vx + c.y * vy);
            const t = (projections[0] - Math.min(...projections)) / (Math.max(...projections) - Math.min(...projections));
            return scaleFunction(t).hex();
        }

        // Contrast Logic
        function checkContrast(bgColor) {
            const ratio = parseFloat(chroma.contrast(bgColor, '#ffffff').toFixed(1));
            // Curve the ratio into a fun 0-100% scale
            let ratioScale = Math.min(100, ratio >= 7 ? 100 : (ratio >= 4.5 ? Math.floor(90 + ((ratio - 4.5) / 2.5) * 9) : (ratio >= 3 ? Math.floor(60 + ((ratio - 3) / 1.5) * 29) : Math.floor((ratio / 3) * 59))));
            if (ratioScale < 0) ratioScale = 0;
            
            let emoji, titleMsg, adviceMsg, colorClass, gradientClass;

            if (ratioScale >= 90) {
                emoji = "😎"; titleMsg = "Readability"; adviceMsg = "Eyes say literal thank you!";
                colorClass = "text-emerald-700 dark:text-emerald-300"; gradientClass = "from-emerald-400 to-teal-500";
            } else if (ratioScale >= 60) {
                emoji = "🧐"; titleMsg = "Readability"; adviceMsg = "Squinting slightly. Use BOLD text!";
                colorClass = "text-amber-600 dark:text-amber-400"; gradientClass = "from-amber-400 to-orange-500";
            } else {
                emoji = "😵‍💫"; titleMsg = "Readability"; adviceMsg = "Big yikes. I am legally blind rn.";
                colorClass = "text-red-600 dark:text-red-400"; gradientClass = "from-red-500 to-rose-600";
            }

            statusBadgeContainer.innerHTML = `
                <div class="flex flex-col w-full relative z-10 w-[100%]">
                  <div class="flex justify-between items-end mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl animate-[bounce_2s_infinite] drop-shadow-md origin-bottom">${emoji}</span>
                      <span class="text-[11px] font-black tracking-widest uppercase ${colorClass} drop-shadow-sm">${titleMsg}</span>
                    </div>
                    <span class="text-xl font-black ${colorClass} drop-shadow-md">${ratioScale}%</span>
                  </div>
                  <div class="relative h-3 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-black/5 dark:border-white/10">
                     <div class="absolute inset-y-0 left-0 bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden" style="width: ${ratioScale}%;">
                        <div class="absolute inset-0 w-[200%] h-full opacity-40 bg-[linear-gradient(-45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                     </div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-white/80 text-center mt-3 bg-black/5 dark:bg-white/10 py-1.5 px-3 rounded-lg shadow-sm border border-black/5 dark:border-white/10 backdrop-blur-sm">${adviceMsg}</span>
                </div>
            `;
        }

        // Harmony Logic
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
            
            const harmonyBadgeContainer = document.getElementById('harmonyBadgeContainer');
            if(!harmonyBadgeContainer) return;

            // Algorithm to determine % Vibe Check mathematically
            let vibePct = 0;
            if (maxDist >= 260) {
                // Analogous clusters (very smooth)
                vibePct = Math.min(100, Math.floor(90 + (maxDist - 260) / 10));
            } else if (maxDist <= 150) {
                // Triadic spread (very vibrant)
                const diff = Math.abs(maxDist - 120);
                vibePct = Math.max(90, 100 - diff); 
            } else {
                // Complementary split / middle gap
                const diff = Math.abs(maxDist - 205);
                vibePct = Math.floor(40 + (diff / 55) * 49);
            }

            let emoji, titleMsg, adviceMsg, colorClass, gradientClass;

            if (vibePct >= 90) {
                emoji = "✨"; titleMsg = "Vibe Check"; adviceMsg = "Absolute masterpiece. It slays.";
                colorClass = "text-fuchsia-600 dark:text-fuchsia-400"; gradientClass = "from-fuchsia-400 to-purple-500";
            } else if (vibePct >= 60) {
                emoji = "💅"; titleMsg = "Vibe Check"; adviceMsg = "Kinda quirky, but we vibe with it.";
                colorClass = "text-blue-600 dark:text-blue-400"; gradientClass = "from-blue-400 to-indigo-500";
            } else {
                emoji = "🫠"; titleMsg = "Vibe Check"; adviceMsg = "A chaotic aesthetic choice.";
                colorClass = "text-rose-600 dark:text-rose-400"; gradientClass = "from-pink-500 to-rose-500";
            }

            harmonyBadgeContainer.innerHTML = `
                <div class="flex flex-col w-full relative z-10 w-[100%]">
                  <div class="flex justify-between items-end mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl animate-[bounce_2s_infinite] drop-shadow-md origin-bottom" style="animation-delay: 200ms">${emoji}</span>
                      <span class="text-[11px] font-black tracking-widest uppercase ${colorClass} drop-shadow-sm">${titleMsg}</span>
                    </div>
                    <span class="text-xl font-black ${colorClass} drop-shadow-md">${vibePct}%</span>
                  </div>
                  <div class="relative h-3 w-full bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-black/5 dark:border-white/10">
                     <div class="absolute inset-y-0 left-0 bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden" style="width: ${vibePct}%;">
                        <div class="absolute inset-0 w-[200%] h-full opacity-40 bg-[linear-gradient(-45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]"></div>
                     </div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-white/80 text-center mt-3 bg-black/5 dark:bg-white/10 py-1.5 px-3 rounded-lg shadow-sm border border-black/5 dark:border-white/10 backdrop-blur-sm">${adviceMsg}</span>
                </div>
            `;
        }

        // Export and Utils
        function showToast(msg) {
            document.getElementById('toastMsg').innerText = msg;
            const t = document.getElementById('toast');
            t.style.opacity = '1'; t.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 40px)'; }, 3000);
        }

        document.getElementById('copyCssBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(`background: linear-gradient(${angleRange.value}deg, ${currentColorsArray.join(', ')});`).then(() => showToast("CSS Code Copied!"));
        });

        document.getElementById('copyFigmaBtn').addEventListener('click', () => {
            let figmaText = `Figma Linear Gradient\nAngle: ${angleRange.value}°\n\nColor Stops:\n`;
            ['0%', '25%', '50%', '75%', '100%'].forEach((p, i) => { figmaText += `${p} - ${currentColorsArray[i].toUpperCase()}\n`; });
            navigator.clipboard.writeText(figmaText).then(() => showToast("Figma Stops Copied!"));
        });

        document.getElementById('randomizeBtn').addEventListener('click', () => {
            // New Vibrant Randomizer Logic
            // LCH Math: Force Lightness (55-75) avoids black/dullness. Force Chroma (80-100) ensures extreme vibrancy. Random Hue (0-360)
            const l = 55 + Math.random() * 20;
            const c = 80 + Math.random() * 20;
            const h = Math.random() * 360;
            const baseColor = chroma.lch(l, c, h);

            setGlobalColors(
                getReadable(baseColor.hex()),
                getReadable(baseColor.set('lch.h', '+45').set('lch.c', 100).hex()),
                getReadable(baseColor.set('lch.h', '+90').set('lch.c', 100).hex())
            );
        });

        angleRange.addEventListener('input', updateMainGradient);

        // Init
        setGlobalColors('#3b82f6', '#8b5cf6', '#d946ef');


        // Splash Screen Logic
        window.addEventListener('load', () => {
            const splash = document.getElementById('splashScreen');
            if (splash) {
                setTimeout(() => {
                    splash.style.transform = 'translateY(-100%)';
                    setTimeout(() => {
                        splash.style.display = 'none';
                    }, 800); // Wait for transform transition finish
                }, 2500); // Wait 2.5 seconds before swiping up
            }
        });

        window.copyHexColor = function(inputId) {
            const input = document.getElementById(inputId);
            if(input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    showToast(input.value + " Copied!");
                });
            }
        };
