// Class for managing input fields with clear and fullscreen functionality
// ???  Seems to be in the details-area - email, name and comments???
export class InputManager {
    constructor() {
        this.init();
    }
    init() {
        this.setupEventDelegation();
        this.initializeClearButtons();
    }
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            this.handleButtonClick(e);
        });
        document.addEventListener('input', (e) => {
            if (e.target.matches('.text-input, textarea[data-clearable]')) {
                this.handleInput(e.target);
            }
        });
    }
    handleButtonClick(e) {
        const btn = e.target.closest('.control-btn');
        if (!btn) return;

        const inputWrapper = btn.closest('.input-wrapper, .textarea-wrapper');
        const input = inputWrapper?.querySelector('.text-input, textarea');
        console.log("Button clicked: ", btn, " for input: ", input);
        if (btn.classList.contains('clear-btn')) {
            this.clearInput(input);
            if (btn.closest('.textarea-wrapper')) {
                this.autoResizeTextarea(input);
            }
        }
    }
    handleInput(input) {
        console.log(`${input.id} input:`, input.value);
        this.toggleClearButton(input);
        
        if (input.id === 'customTextarea') {
            this.autoResizeTextarea(input);
        }
    }
    clearInput(input) {
        if (!input) return;
        input.value = '';
        input.focus();
        input.dispatchEvent(new Event('input'));
    }
    toggleClearButton(input) {
        const clearBtn = input?.closest('.input-wrapper, .textarea-wrapper')
                           ?.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.style.visibility = input.value ? 'visible' : 'hidden';
        }
    }
    initializeClearButtons() {
        document.querySelectorAll('.text-input, textarea[data-clearable]').forEach(input => {
            this.toggleClearButton(input);
        });
    }
    autoResizeTextarea(textarea) {        
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    }
}
