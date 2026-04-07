const fs = require('fs');

let htmlPath = 'index.html';
let jsPath = 'script.js';

let html = fs.readFileSync(htmlPath, 'utf8');

// Replace input0, input1, input2 with wrapped div
for (let i = 0; i <= 2; i++) {
    let inputID = `input${i}`;
    let val = i === 0 ? '#3B82F6' : (i === 1 ? '#8B5CF6' : '#D946EF');

    // First find the raw <input> definition
    let regex = new RegExp(`(<input type="text" id="${inputID}"[\\s\\S]*?value="${val}">)`, 'i');
    
    html = html.replace(regex, (match) => {
        // Add pr-6 and left alignment to give space for icon
        let updatedInput = match.replace('py-1.5', 'py-1.5 pr-6 pl-2');
        
        return `<div class="relative w-full">
                            ` + updatedInput + `
                            <button class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none" onclick="copyHexColor('${inputID}')" title="Copy to clipboard">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>`;
    });
}
fs.writeFileSync(htmlPath, html, 'utf8');

// Add copyHexColor to script.js
let js = fs.readFileSync(jsPath, 'utf8');

let newFunc = `
        window.copyHexColor = function(inputId) {
            const input = document.getElementById(inputId);
            if(input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    showToast(input.value + " Copied!");
                });
            }
        };
`;

if (!js.includes('window.copyHexColor')) {
    js += newFunc;
    fs.writeFileSync(jsPath, js, 'utf8');
}

console.log("Copy buttons added!");
