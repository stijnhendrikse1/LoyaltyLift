/**
 * LoyaltyLift — Form Engine
 * Renders questions dynamically, handles auto-save, conditional visibility, validation
 */

class LLFormEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.projectId = null;
    this.sectionId = null;
    this.sectionConfig = null;
    this.responses = {};
    this.saveTimers = {};
    this.saveStatus = null;
    this._createSaveIndicator();
  }

  _createSaveIndicator() {
    this.saveStatus = document.createElement('div');
    this.saveStatus.className = 'll-save-status saved';
    this.saveStatus.style.opacity = '0';
    this.saveStatus.textContent = 'Saved';
    document.body.appendChild(this.saveStatus);
  }

  async load(projectId, sectionId, sectionConfig) {
    this.projectId = projectId;
    this.sectionId = sectionId;
    this.sectionConfig = sectionConfig;

    // Load existing responses
    this.container.innerHTML = '<div class="ll-loading-page"><div class="ll-spinner"></div><span class="ll-text-sm ll-text-muted">Loading section...</span></div>';
    const data = await window.llClient.getSectionResponses(projectId, sectionId);
    this.responses = {};
    data.responses.forEach(r => {
      try { this.responses[r.question_key] = JSON.parse(r.value); }
      catch { this.responses[r.question_key] = r.value; }
    });

    this._render();
  }

  _render() {
    const section = this.sectionConfig;
    let html = `
      <div class="ll-flex ll-justify-between ll-items-center" style="margin-bottom: 1.5rem;">
        <div>
          <h2 class="ll-h2" style="margin-bottom: 0.25rem;">${this._esc(section.name)}</h2>
          <p class="ll-subtitle">${this._esc(section.description || '')}</p>
        </div>
        <div class="ll-flex ll-gap-2">
          <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llFormEngine.onBack()">Back</button>
          <button class="ll-btn ll-btn-primary ll-btn-sm" id="ll-submit-btn" onclick="llFormEngine.onSubmit()">Submit for Review</button>
        </div>
      </div>
      <div class="ll-card" style="padding: 1.5rem;">
    `;

    section.questions.forEach((q, i) => {
      const visible = this._checkVisibility(q);
      html += `<div class="ll-question" id="ll-q-${q.key}" style="margin-bottom: 1.5rem; ${visible ? '' : 'display:none;'}" data-key="${q.key}">`;
      html += this._renderQuestion(q, i);
      html += `</div>`;
    });

    html += `</div>`;
    this.container.innerHTML = html;
    this._bindEvents();
  }

  _renderQuestion(q, index) {
    const value = this.responses[q.key];
    const reqMark = q.required ? '<span style="color:var(--ll-brand);">*</span>' : '';
    let label = `<label class="ll-label">${this._esc(q.label)} ${reqMark}</label>`;

    if (q.helpText) {
      label += `<p class="ll-text-xs ll-text-muted" style="margin-bottom: 0.5rem;">${this._esc(q.helpText)}</p>`;
    }

    if (q.glossaryTerm) {
      label = `<label class="ll-label">
        ${this._esc(q.label)} ${reqMark}
        <span class="ll-glossary-term">${this._esc(q.glossaryTerm)}
          <span class="ll-glossary-tooltip">${this._getGlossaryDef(q.glossaryTerm)}</span>
        </span>
      </label>`;
    }

    let input = '';
    const strVal = value != null ? String(value) : '';

    switch (q.inputType) {
      case 'text':
        input = `<input type="text" class="ll-input" data-key="${q.key}" value="${this._escAttr(strVal)}" placeholder="${this._escAttr(q.placeholder || '')}" />`;
        break;

      case 'textarea':
        input = `<textarea class="ll-textarea" data-key="${q.key}" placeholder="${this._escAttr(q.placeholder || '')}">${this._esc(strVal)}</textarea>`;
        break;

      case 'number':
        input = `<input type="number" class="ll-input" data-key="${q.key}" value="${this._escAttr(strVal)}" placeholder="${this._escAttr(q.placeholder || '')}" ${q.validation?.min != null ? `min="${q.validation.min}"` : ''} ${q.validation?.max != null ? `max="${q.validation.max}"` : ''} />`;
        break;

      case 'date':
        input = `<input type="date" class="ll-input" data-key="${q.key}" value="${this._escAttr(strVal)}" />`;
        break;

      case 'currency':
        input = `<div class="ll-flex ll-gap-2">
          <select class="ll-select" style="width:100px;" data-key="${q.key}_currency" onchange="llFormEngine._onCurrencyChange('${q.key}', this)">
            <option value="USD" ${(this.responses[q.key + '_currency'] || 'USD') === 'USD' ? 'selected' : ''}>USD</option>
            <option value="EUR" ${this.responses[q.key + '_currency'] === 'EUR' ? 'selected' : ''}>EUR</option>
            <option value="GBP" ${this.responses[q.key + '_currency'] === 'GBP' ? 'selected' : ''}>GBP</option>
            <option value="AED" ${this.responses[q.key + '_currency'] === 'AED' ? 'selected' : ''}>AED</option>
            <option value="SAR" ${this.responses[q.key + '_currency'] === 'SAR' ? 'selected' : ''}>SAR</option>
            <option value="INR" ${this.responses[q.key + '_currency'] === 'INR' ? 'selected' : ''}>INR</option>
          </select>
          <input type="number" class="ll-input" data-key="${q.key}" value="${this._escAttr(strVal)}" placeholder="0.00" step="0.01" />
        </div>`;
        break;

      case 'select':
        input = `<select class="ll-select" data-key="${q.key}">
          <option value="">Select...</option>
          ${(q.options || []).map(o => `<option value="${this._escAttr(o.value)}" ${strVal === o.value ? 'selected' : ''}>${this._esc(o.label)}</option>`).join('')}
        </select>`;
        break;

      case 'multi_select':
        input = `<div class="ll-flex ll-flex-col ll-gap-2" data-key="${q.key}" data-type="multi_select">
          ${(q.options || []).map(o => {
            const checked = Array.isArray(value) && value.includes(o.value);
            return `<label class="ll-flex ll-items-center ll-gap-2" style="font-size:0.875rem;">
              <input type="checkbox" value="${this._escAttr(o.value)}" ${checked ? 'checked' : ''} onchange="llFormEngine._onMultiSelect('${q.key}')" />
              ${this._esc(o.label)}
            </label>`;
          }).join('')}
        </div>`;
        break;

      case 'boolean':
        input = `<div class="ll-flex ll-gap-4">
          <label class="ll-toggle">
            <input type="radio" name="ll-bool-${q.key}" value="true" data-key="${q.key}" ${strVal === 'true' ? 'checked' : ''} />
            <span style="font-size:0.875rem; cursor:pointer; padding:0.375rem 1rem; border-radius:0.375rem; border:1px solid var(--ll-gray-300); ${strVal === 'true' ? 'background:var(--ll-brand); color:white; border-color:var(--ll-brand);' : ''}">Yes</span>
          </label>
          <label class="ll-toggle">
            <input type="radio" name="ll-bool-${q.key}" value="false" data-key="${q.key}" ${strVal === 'false' ? 'checked' : ''} />
            <span style="font-size:0.875rem; cursor:pointer; padding:0.375rem 1rem; border-radius:0.375rem; border:1px solid var(--ll-gray-300); ${strVal === 'false' ? 'background:var(--ll-gray-600); color:white; border-color:var(--ll-gray-600);' : ''}">No</span>
          </label>
        </div>`;
        break;

      case 'file':
        input = `<div>
          <input type="file" id="ll-file-${q.key}" style="display:none;" onchange="llFormEngine._onFileSelect('${q.key}', this)" />
          <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="document.getElementById('ll-file-${q.key}').click()">Choose File</button>
          <span class="ll-text-xs ll-text-muted" id="ll-file-name-${q.key}" style="margin-left:0.5rem;">${strVal ? this._esc(strVal) : 'No file selected'}</span>
        </div>`;
        break;

      case 'grid':
        input = `<div id="ll-grid-${q.key}" class="ll-text-sm ll-text-muted">Grid editor loaded separately</div>`;
        break;

      default:
        input = `<input type="text" class="ll-input" data-key="${q.key}" value="${this._escAttr(strVal)}" placeholder="${this._escAttr(q.placeholder || '')}" />`;
    }

    return `${label}${input}<div class="ll-error-text" id="ll-err-${q.key}" style="display:none;"></div>`;
  }

  _bindEvents() {
    // Blur-save for text inputs and textareas
    this.container.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
      const key = el.dataset.key;
      if (!key) return;
      el.addEventListener('blur', () => this._saveField(key, el.value));
    });

    // Change-save for selects
    this.container.querySelectorAll('select[data-key]').forEach(el => {
      const key = el.dataset.key;
      el.addEventListener('change', () => this._saveField(key, el.value));
    });

    // Change-save for date inputs
    this.container.querySelectorAll('input[type="date"]').forEach(el => {
      const key = el.dataset.key;
      if (!key) return;
      el.addEventListener('change', () => this._saveField(key, el.value));
    });

    // Radio buttons (boolean)
    this.container.querySelectorAll('input[type="radio"]').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.dataset.key;
        this._saveField(key, el.value);
        // Update radio button styles
        const parent = el.closest('.ll-flex');
        parent.querySelectorAll('span').forEach(s => {
          s.style.background = '';
          s.style.color = '';
          s.style.borderColor = 'var(--ll-gray-300)';
        });
        const span = el.nextElementSibling;
        if (el.value === 'true') {
          span.style.background = 'var(--ll-brand)';
          span.style.color = 'white';
          span.style.borderColor = 'var(--ll-brand)';
        } else {
          span.style.background = 'var(--ll-gray-600)';
          span.style.color = 'white';
          span.style.borderColor = 'var(--ll-gray-600)';
        }
        this._updateConditionalVisibility();
      });
    });
  }

  async _saveField(key, value) {
    if (this.saveTimers[key]) clearTimeout(this.saveTimers[key]);

    this.responses[key] = value;
    this._updateConditionalVisibility();

    // Validate
    const q = this.sectionConfig.questions.find(q => q.key === key);
    if (q) {
      const err = this._validate(q, value);
      const errEl = document.getElementById(`ll-err-${key}`);
      if (errEl) {
        errEl.textContent = err || '';
        errEl.style.display = err ? 'block' : 'none';
      }
    }

    // Debounced save
    this._showSaveStatus('saving');
    this.saveTimers[key] = setTimeout(async () => {
      try {
        await window.llClient.saveResponse(this.projectId, this.sectionId, key, value);
        this._showSaveStatus('saved');
      } catch (err) {
        console.error('Save failed:', err);
        this._showSaveStatus('error');
      }
    }, 500);
  }

  _validate(q, value) {
    if (q.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'This field is required';
    }
    if (q.validation) {
      const v = q.validation;
      if (v.minLength && typeof value === 'string' && value.length < v.minLength) {
        return `Minimum ${v.minLength} characters`;
      }
      if (v.maxLength && typeof value === 'string' && value.length > v.maxLength) {
        return `Maximum ${v.maxLength} characters`;
      }
      if (v.pattern && typeof value === 'string' && !new RegExp(v.pattern).test(value)) {
        return v.patternMessage || 'Invalid format';
      }
    }
    return null;
  }

  _checkVisibility(q) {
    if (!q.visibleIf) return true;
    const refValue = this.responses[q.visibleIf.questionKey];
    return this._evaluateCondition(q.visibleIf, refValue);
  }

  _evaluateCondition(rule, refValue) {
    switch (rule.operator) {
      case 'eq': return String(refValue) === String(rule.value);
      case 'neq': return String(refValue) !== String(rule.value);
      case 'in': return Array.isArray(rule.value) && rule.value.includes(String(refValue));
      case 'contains':
        if (Array.isArray(refValue)) return refValue.includes(rule.value);
        return String(refValue).includes(String(rule.value));
      default: return true;
    }
  }

  _updateConditionalVisibility() {
    if (!this.sectionConfig) return;
    this.sectionConfig.questions.forEach(q => {
      const el = document.getElementById(`ll-q-${q.key}`);
      if (!el) return;
      const visible = this._checkVisibility(q);
      el.style.display = visible ? '' : 'none';
    });
  }

  _showSaveStatus(state) {
    this.saveStatus.className = `ll-save-status ${state}`;
    this.saveStatus.textContent = state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : 'Error saving';
    this.saveStatus.style.opacity = '1';
    if (state === 'saved') {
      setTimeout(() => { this.saveStatus.style.opacity = '0'; }, 2000);
    }
  }

  static _onMultiSelect(key) {
    const container = document.querySelector(`[data-key="${key}"][data-type="multi_select"]`);
    const checked = Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
    window.llFormEngine._saveField(key, checked);
  }

  static _onCurrencyChange(key, select) {
    window.llFormEngine._saveField(key + '_currency', select.value);
  }

  static async _onFileSelect(key, input) {
    const file = input.files[0];
    if (!file) return;
    const nameEl = document.getElementById(`ll-file-name-${key}`);
    nameEl.textContent = 'Uploading...';
    try {
      await window.llClient.uploadFile(
        window.llFormEngine.projectId,
        window.llFormEngine.sectionId,
        key,
        file
      );
      nameEl.textContent = file.name;
      window.llFormEngine._saveField(key, file.name);
    } catch (err) {
      console.error('File upload failed:', err);
      nameEl.textContent = 'Upload failed';
    }
  }

  validateAll() {
    let valid = true;
    this.sectionConfig.questions.forEach(q => {
      if (!this._checkVisibility(q)) return;
      const value = this.responses[q.key];
      const err = this._validate(q, value);
      const errEl = document.getElementById(`ll-err-${q.key}`);
      if (errEl) {
        errEl.textContent = err || '';
        errEl.style.display = err ? 'block' : 'none';
      }
      if (err) valid = false;
    });
    return valid;
  }

  async onSubmit() {
    if (!this.validateAll()) {
      alert('Please fill in all required fields before submitting.');
      return;
    }
    const btn = document.getElementById('ll-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      await window.llClient.submitSection(this.projectId, this.sectionId);
      alert('Section submitted for review!');
      this.onBack();
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit section. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for Review';
    }
  }

  onBack() {
    window.dispatchEvent(new CustomEvent('ll-navigate', { detail: { page: 'project', projectId: this.projectId } }));
  }

  _getGlossaryDef(term) {
    if (window.llGlossary) {
      const entry = window.llGlossary.find(g => g.term.toLowerCase() === term.toLowerCase());
      if (entry) return this._esc(entry.definition);
    }
    return 'Definition not found';
  }

  _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  _escAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.LLFormEngine = LLFormEngine;
