/**
 * Input Component
 * Accessible, validated input fields with Material Design styling
 */

export interface InputConfig {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date' | 'time';
  label?: string;
  placeholder?: string;
  value?: string;
  helperText?: string;
  errorText?: string;
  successText?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  maxLength?: number;
  minLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number;
  pattern?: string;
  showCharCount?: boolean;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (value: string) => void;
  onValidate?: (value: string) => boolean | string; // Return true if valid, error message if not
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onEnter?: (value: string) => void;
  className?: string;
  id?: string;
}

export class Input {
  private container: HTMLElement;
  private config: InputConfig;
  private inputEl: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;
  private helperEl: HTMLElement | null = null;
  private charCountEl: HTMLElement | null = null;
  private isValid: boolean = true;
  private uniqueId: string;

  constructor(container: string | HTMLElement, config: InputConfig = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)!
      : container;

    if (!this.container) {
      throw new Error('Input container not found');
    }

    this.config = config;
    this.uniqueId = config.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    const {
      type = 'text',
      label,
      placeholder,
      value = '',
      helperText,
      errorText,
      successText,
      leadingIcon,
      trailingIcon,
      maxLength,
      minLength,
      min,
      max,
      step,
      pattern,
      showCharCount,
      required,
      disabled,
      readonly,
      autocomplete,
      ariaLabel,
      ariaDescribedBy,
      className = ''
    } = this.config;

    // Build class names
    const wrapperClasses = [
      'input-field',
      errorText && 'input-field--error',
      successText && 'input-field--success',
      disabled && 'input-field--disabled',
      readonly && 'input-field--readonly',
      leadingIcon && 'input-field--has-leading-icon',
      trailingIcon && 'input-field--has-trailing-icon',
      className
    ].filter(Boolean).join(' ');

    // Generate IDs for labels and helpers
    const labelId = `${this.uniqueId}-label`;
    const helperId = `${this.uniqueId}-helper`;
    const errorId = `${this.uniqueId}-error`;

    // Build HTML structure
    const html = `
      <div class="${wrapperClasses}">
        ${label ? `
          <label for="${this.uniqueId}" id="${labelId}" class="input-field__label">
            ${label}${required ? ' <span class="required">*</span>' : ''}
          </label>
        ` : ''}

        <div class="input-field__wrapper">
          ${leadingIcon ? `
            <span class="input-field__icon input-field__icon--leading material-symbols-outlined" aria-hidden="true">
              ${leadingIcon}
            </span>
          ` : ''}

          <input
            type="${type}"
            id="${this.uniqueId}"
            class="input-field__input"
            value="${value}"
            ${placeholder ? `placeholder="${placeholder}"` : ''}
            ${maxLength ? `maxlength="${maxLength}"` : ''}
            ${minLength ? `minlength="${minLength}"` : ''}
            ${min !== undefined ? `min="${min}"` : ''}
            ${max !== undefined ? `max="${max}"` : ''}
            ${step !== undefined ? `step="${step}"` : ''}
            ${pattern ? `pattern="${pattern}"` : ''}
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            ${readonly ? 'readonly' : ''}
            ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
            ${ariaLabel ? `aria-label="${ariaLabel}"` : label ? `aria-labelledby="${labelId}"` : ''}
            aria-invalid="${!!errorText}"
            aria-describedby="${[
              helperText && helperId,
              errorText && errorId,
              showCharCount && `${this.uniqueId}-count`,
              ariaDescribedBy
            ].filter(Boolean).join(' ')}"
          />

          ${trailingIcon ? `
            <span class="input-field__icon input-field__icon--trailing material-symbols-outlined" aria-hidden="true">
              ${trailingIcon}
            </span>
          ` : ''}
        </div>

        <div class="input-field__footer">
          ${errorText ? `
            <div id="${errorId}" class="input-field__error" role="alert">
              <span class="material-symbols-outlined">error</span>
              ${errorText}
            </div>
          ` : successText ? `
            <div class="input-field__success">
              <span class="material-symbols-outlined">check_circle</span>
              ${successText}
            </div>
          ` : helperText ? `
            <div id="${helperId}" class="input-field__helper">
              ${helperText}
            </div>
          ` : ''}

          ${showCharCount && maxLength ? `
            <div id="${this.uniqueId}-count" class="input-field__char-count">
              <span class="current">${value.length}</span> / ${maxLength}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Get references to elements
    this.inputEl = this.container.querySelector('.input-field__input');
    this.errorEl = this.container.querySelector('.input-field__error');
    this.helperEl = this.container.querySelector('.input-field__helper');
    this.charCountEl = this.container.querySelector('.input-field__char-count .current');
  }

  private attachEventListeners(): void {
    if (!this.inputEl) return;

    // Input event
    this.inputEl.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;

      // Update character count
      if (this.charCountEl) {
        this.charCountEl.textContent = value.length.toString();
      }

      // Call onChange
      if (this.config.onChange) {
        this.config.onChange(value);
      }

      // Validate
      this.validate();
    });

    // Focus event
    this.inputEl.addEventListener('focus', (e) => {
      this.container.querySelector('.input-field')?.classList.add('input-field--focused');
      if (this.config.onFocus) {
        this.config.onFocus(e);
      }
    });

    // Blur event
    this.inputEl.addEventListener('blur', (e) => {
      this.container.querySelector('.input-field')?.classList.remove('input-field--focused');
      this.validate();
      if (this.config.onBlur) {
        this.config.onBlur(e);
      }
    });

    // Enter key
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.config.onEnter) {
        e.preventDefault();
        this.config.onEnter(this.inputEl!.value);
      }
    });
  }

  private validate(): boolean {
    if (!this.inputEl || !this.config.onValidate) {
      return true;
    }

    const value = this.inputEl.value;
    const result = this.config.onValidate(value);

    if (result === true) {
      this.setError('');
      this.isValid = true;
    } else if (typeof result === 'string') {
      this.setError(result);
      this.isValid = false;
    }

    return this.isValid;
  }

  // Public methods

  public getValue(): string {
    return this.inputEl?.value || '';
  }

  public setValue(value: string): void {
    if (this.inputEl) {
      this.inputEl.value = value;

      // Update character count
      if (this.charCountEl) {
        this.charCountEl.textContent = value.length.toString();
      }

      // Trigger change handler
      if (this.config.onChange) {
        this.config.onChange(value);
      }
    }
  }

  public setError(errorText: string): void {
    const fieldEl = this.container.querySelector('.input-field');
    const errorEl = this.container.querySelector('.input-field__error');

    if (errorText) {
      fieldEl?.classList.add('input-field--error');
      fieldEl?.classList.remove('input-field--success');
      this.inputEl?.setAttribute('aria-invalid', 'true');

      if (errorEl) {
        errorEl.innerHTML = `
          <span class="material-symbols-outlined">error</span>
          ${errorText}
        `;
      }
    } else {
      fieldEl?.classList.remove('input-field--error');
      this.inputEl?.setAttribute('aria-invalid', 'false');

      if (errorEl) {
        errorEl.innerHTML = '';
      }
    }
  }

  public setSuccess(successText: string): void {
    const fieldEl = this.container.querySelector('.input-field');

    if (successText) {
      fieldEl?.classList.add('input-field--success');
      fieldEl?.classList.remove('input-field--error');
      this.inputEl?.setAttribute('aria-invalid', 'false');
    } else {
      fieldEl?.classList.remove('input-field--success');
    }
  }

  public setDisabled(disabled: boolean): void {
    if (this.inputEl) {
      this.inputEl.disabled = disabled;
      const fieldEl = this.container.querySelector('.input-field');

      if (disabled) {
        fieldEl?.classList.add('input-field--disabled');
      } else {
        fieldEl?.classList.remove('input-field--disabled');
      }
    }
  }

  public focus(): void {
    this.inputEl?.focus();
  }

  public blur(): void {
    this.inputEl?.blur();
  }

  public clear(): void {
    this.setValue('');
  }

  public isValidInput(): boolean {
    return this.isValid && this.inputEl?.validity.valid === true;
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}

// CSS for inputs (to be added to styles/components.css)
export const inputStyles = `
.input-field {
  position: relative;
  margin-bottom: 20px;
}

.input-field__label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface-high, #111827);
}

.input-field__label .required {
  color: var(--color-error, #dc2626);
}

.input-field__wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field__input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--on-surface-high, #111827);
  background-color: var(--input-bg, rgba(0, 0, 0, 0.02));
  border: 1px solid var(--input-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  transition: border-color 200ms, background-color 200ms;
}

/* Height variants based on density */
[data-density="compact"] .input-field__input {
  padding: 6px 10px;
  font-size: 13px;
}

[data-density="comfortable"] .input-field__input {
  padding: 10px 14px;
  font-size: 14px;
}

/* With icons */
.input-field--has-leading-icon .input-field__input {
  padding-left: 40px;
}

.input-field--has-trailing-icon .input-field__input {
  padding-right: 40px;
}

.input-field__icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
  font-size: 20px;
  pointer-events: none;
}

.input-field__icon--leading {
  left: 12px;
}

.input-field__icon--trailing {
  right: 12px;
}

/* Focus state */
.input-field__input:focus {
  outline: none;
  border-color: var(--input-border-focus, #3b82f6);
  background-color: var(--input-bg-focus, rgba(59, 130, 246, 0.04));
}

.input-field__input:focus-visible {
  outline: 2px solid var(--focus-ring-color, #3b82f6);
  outline-offset: 2px;
}

/* Error state */
.input-field--error .input-field__input {
  border-color: var(--color-error, #dc2626);
  background-color: rgba(220, 38, 38, 0.04);
}

.input-field__error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-error, #dc2626);
}

.input-field__error .material-symbols-outlined {
  font-size: 16px;
}

/* Success state */
.input-field--success .input-field__input {
  border-color: var(--color-success, #16a34a);
  background-color: rgba(22, 163, 74, 0.04);
}

.input-field__success {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-success, #16a34a);
}

.input-field__success .material-symbols-outlined {
  font-size: 16px;
}

/* Helper text */
.input-field__helper {
  margin-top: 4px;
  font-size: 12px;
  color: var(--on-surface-med, rgba(17, 24, 39, 0.7));
}

/* Footer */
.input-field__footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  min-height: 20px;
}

/* Character count */
.input-field__char-count {
  margin-top: 4px;
  font-size: 12px;
  color: var(--on-surface-low, rgba(17, 24, 39, 0.55));
  text-align: right;
}

/* Disabled state */
.input-field--disabled .input-field__input {
  opacity: var(--opacity-disabled, 0.45);
  cursor: not-allowed;
  background-color: var(--input-bg-disabled, rgba(0, 0, 0, 0.04));
}

.input-field--disabled .input-field__label,
.input-field--disabled .input-field__icon {
  opacity: var(--opacity-disabled, 0.45);
}

/* Readonly state */
.input-field--readonly .input-field__input {
  background-color: transparent;
  border-style: dashed;
  cursor: default;
}

/* Dark mode adjustments */
[data-theme="dark"] .input-field__input {
  background-color: var(--input-bg, rgba(255, 255, 255, 0.05));
  border-color: var(--input-border, rgba(255, 255, 255, 0.15));
  color: var(--on-surface-high, #f9fafb);
}

[data-theme="dark"] .input-field__input:focus {
  background-color: var(--input-bg-focus, rgba(59, 130, 246, 0.08));
}

[data-theme="dark"] .input-field--error .input-field__input {
  background-color: rgba(220, 38, 38, 0.08);
}

[data-theme="dark"] .input-field--success .input-field__input {
  background-color: rgba(22, 163, 74, 0.08);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .input-field__input {
    transition: none;
  }
}
`;