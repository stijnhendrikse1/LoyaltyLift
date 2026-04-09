/**
 * LoyaltyLift — Main Application
 * Handles routing, page rendering, navigation
 */

class LLApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.formEngine = null;
    this.currentPage = null;
    this.currentProject = null;

    window.addEventListener('ll-auth-change', (e) => this._onAuthChange(e.detail));
    window.addEventListener('ll-navigate', (e) => this.navigate(e.detail.page, e.detail));
    window.addEventListener('hashchange', () => this._handleRoute());
  }

  async init() {
    this._showLoading();
    const { user } = await window.llClient.init();
    if (user) {
      this._handleRoute();
    } else {
      this._showLogin();
    }
  }

  navigate(page, params) {
    const hash = params?.projectId ? `#${page}/${params.projectId}${params.sectionId ? '/' + params.sectionId : ''}` : `#${page}`;
    window.location.hash = hash;
  }

  _handleRoute() {
    const hash = window.location.hash.replace('#', '');
    const parts = hash.split('/');
    const page = parts[0] || 'dashboard';

    if (!window.llClient.isAuthenticated) {
      this._showLogin();
      return;
    }

    switch (page) {
      case 'dashboard':
        this._showDashboard();
        break;
      case 'project':
        this._showProject(parts[1]);
        break;
      case 'section':
        this._showSection(parts[1], parts[2]);
        break;
      case 'new-project':
        this._showNewProject();
        break;
      default:
        this._showDashboard();
    }
  }

  _onAuthChange({ user }) {
    if (user) {
      this._handleRoute();
    } else {
      this._showLogin();
    }
  }

  // --- Login Page ---
  _showLogin() {
    this.currentPage = 'login';
    this.container.innerHTML = `
      <div class="ll-flex ll-items-center ll-justify-center" style="min-height:100vh; background:var(--ll-gray-50);">
        <div class="ll-card" style="width:100%; max-width:400px; padding:2rem;">
          <div style="text-align:center; margin-bottom:2rem;">
            <h1 class="ll-h1" style="color:var(--ll-brand); margin-bottom:0.5rem;">LoyaltyLift</h1>
            <p class="ll-subtitle">Client Onboarding Portal</p>
          </div>
          <div id="ll-login-form">
            <label class="ll-label">Email address</label>
            <input type="email" class="ll-input" id="ll-login-email" placeholder="you@company.com" style="margin-bottom:1rem;" />
            <button class="ll-btn ll-btn-primary" style="width:100%;" id="ll-login-btn" onclick="llApp._doLogin()">
              Send Magic Link
            </button>
          </div>
          <div id="ll-login-sent" style="display:none; text-align:center;">
            <p style="color:var(--ll-green-700); font-size:0.875rem; margin-bottom:0.5rem;">Check your email!</p>
            <p class="ll-text-sm ll-text-muted">We sent a sign-in link to your email. Click it to continue.</p>
          </div>
        </div>
      </div>
    `;
    // Handle enter key
    const emailInput = document.getElementById('ll-login-email');
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._doLogin();
    });
  }

  async _doLogin() {
    const email = document.getElementById('ll-login-email').value.trim();
    if (!email) return;
    const btn = document.getElementById('ll-login-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      await window.llClient.signInWithMagicLink(email);
      document.getElementById('ll-login-form').style.display = 'none';
      document.getElementById('ll-login-sent').style.display = 'block';
    } catch (err) {
      console.error('Login error:', err);
      alert('Failed to send magic link. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Send Magic Link';
    }
  }

  // --- Dashboard ---
  async _showDashboard() {
    this.currentPage = 'dashboard';
    this._showLoading();
    try {
      const projects = await window.llClient.listProjects();
      this._renderDashboard(projects);
    } catch (err) {
      console.error('Dashboard error:', err);
      this.container.innerHTML = `<div class="ll-container"><div class="ll-card"><p class="ll-text-sm" style="color:var(--ll-brand);">Failed to load projects. ${err.message}</p></div></div>`;
    }
  }

  _renderDashboard(projects) {
    const isLji = window.llClient.isLjiMember;
    const phaseLabels = { discovery: 'Discovery', design: 'Solution Design', launch: 'Launch Readiness' };
    const statusBadges = {
      active: 'll-badge-green',
      paused: 'll-badge-yellow',
      completed: 'll-badge-blue',
      archived: 'll-badge-gray',
    };

    this.container.innerHTML = `
      <div class="ll-header">
        <div class="ll-flex ll-justify-between ll-items-center">
          <h1 class="ll-h1" style="color:var(--ll-brand);">LoyaltyLift</h1>
          <div class="ll-flex ll-items-center ll-gap-3">
            <span class="ll-text-sm ll-text-muted">${window.llClient.profile?.full_name || window.llClient.user?.email}</span>
            <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llApp._signOut()">Sign Out</button>
          </div>
        </div>
      </div>
      <div class="ll-container">
        <div class="ll-flex ll-justify-between ll-items-center" style="margin-bottom:1.5rem;">
          <div>
            <h2 class="ll-h2" style="margin-bottom:0;">Projects</h2>
            <p class="ll-subtitle">${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
          </div>
          ${isLji ? `<button class="ll-btn ll-btn-primary" onclick="llApp.navigate('new-project')">New Project</button>` : ''}
        </div>

        ${projects.length === 0 ? `
          <div class="ll-card" style="text-align:center; padding:3rem;">
            <p class="ll-h3" style="margin-bottom:0.5rem;">No projects yet</p>
            <p class="ll-text-sm ll-text-muted">${isLji ? 'Create your first project to get started.' : 'You have not been invited to any projects yet.'}</p>
          </div>
        ` : `
          <div class="ll-flex ll-flex-col ll-gap-4">
            ${projects.map(p => `
              <div class="ll-card ll-card-hover" onclick="llApp.navigate('project', { projectId: '${p.id}' })">
                <div class="ll-flex ll-justify-between ll-items-center" style="margin-bottom:0.75rem;">
                  <div>
                    <h3 class="ll-h3" style="font-size:1rem;">${this._esc(p.program_name)}</h3>
                    <p class="ll-text-xs ll-text-muted">${this._esc(p.client_org?.name || '')}</p>
                  </div>
                  <div class="ll-flex ll-gap-2">
                    <span class="ll-badge ${statusBadges[p.status] || 'll-badge-gray'}">${p.status}</span>
                    <span class="ll-badge ll-badge-purple">${phaseLabels[p.phase] || p.phase}</span>
                  </div>
                </div>
                <div class="ll-flex ll-items-center ll-gap-3">
                  <div class="ll-progress" style="flex:1;">
                    <div class="ll-progress-bar" style="width:${p.progress.pct}%;"></div>
                  </div>
                  <span class="ll-text-xs ll-text-muted">${p.progress.completed}/${p.progress.total} sections</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // --- New Project ---
  _showNewProject() {
    this.currentPage = 'new-project';
    this.container.innerHTML = `
      <div class="ll-header">
        <div class="ll-flex ll-items-center ll-gap-3">
          <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llApp.navigate('dashboard')">Back</button>
          <h1 class="ll-h1" style="color:var(--ll-brand);">New Project</h1>
        </div>
      </div>
      <div class="ll-container" style="max-width:600px;">
        <div class="ll-card" style="padding:1.5rem;">
          <div style="margin-bottom:1rem;">
            <label class="ll-label">Client Organization Name</label>
            <input type="text" class="ll-input" id="ll-np-org" placeholder="e.g., Emirates Group" />
          </div>
          <div style="margin-bottom:1rem;">
            <label class="ll-label">Industry</label>
            <select class="ll-select" id="ll-np-industry">
              <option value="">Select industry...</option>
              <option value="Retail">Retail</option>
              <option value="Airlines">Airlines</option>
              <option value="Hospitality">Hospitality</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Telco">Telco</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style="margin-bottom:1rem;">
            <label class="ll-label">Country</label>
            <input type="text" class="ll-input" id="ll-np-country" placeholder="e.g., United Arab Emirates" />
          </div>
          <div style="margin-bottom:1.5rem;">
            <label class="ll-label">Program Name</label>
            <input type="text" class="ll-input" id="ll-np-program" placeholder="e.g., Emirates Skywards Everyday" />
          </div>
          <button class="ll-btn ll-btn-primary" style="width:100%;" id="ll-np-btn" onclick="llApp._createProject()">Create Project</button>
        </div>
      </div>
    `;
  }

  async _createProject() {
    const orgName = document.getElementById('ll-np-org').value.trim();
    const industry = document.getElementById('ll-np-industry').value;
    const country = document.getElementById('ll-np-country').value.trim();
    const programName = document.getElementById('ll-np-program').value.trim();

    if (!orgName || !programName) {
      alert('Organization name and program name are required.');
      return;
    }

    const btn = document.getElementById('ll-np-btn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
      const project = await window.llClient.createProject({ orgName, industry, country, programName });
      this.navigate('project', { projectId: project.id });
    } catch (err) {
      console.error('Create project error:', err);
      alert('Failed to create project. ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Create Project';
    }
  }

  // --- Project Detail ---
  async _showProject(projectId) {
    this.currentPage = 'project';
    this._showLoading();
    try {
      const project = await window.llClient.getProject(projectId);
      this.currentProject = project;
      this._renderProject(project);
    } catch (err) {
      console.error('Project error:', err);
      this.container.innerHTML = `<div class="ll-container"><div class="ll-card"><p style="color:var(--ll-brand);">Failed to load project. ${err.message}</p></div></div>`;
    }
  }

  _renderProject(project) {
    const phaseLabels = { discovery: 'Discovery', design: 'Solution Design', launch: 'Launch Readiness' };
    const statusIcons = {
      not_started: { badge: 'll-badge-gray', label: 'Not Started' },
      in_progress: { badge: 'll-badge-blue', label: 'In Progress' },
      in_review: { badge: 'll-badge-yellow', label: 'In Review' },
      approved: { badge: 'll-badge-green', label: 'Approved' },
      skipped: { badge: 'll-badge-gray', label: 'Skipped' },
    };
    const isLji = window.llClient.isLjiMember;
    const sectionNames = this._getSectionNames();

    // Group sections by phase
    const phases = ['discovery', 'design', 'launch'];
    const grouped = {};
    phases.forEach(ph => { grouped[ph] = project.sections.filter(s => s.phase === ph); });

    this.container.innerHTML = `
      <div class="ll-header">
        <div class="ll-flex ll-justify-between ll-items-center">
          <div class="ll-flex ll-items-center ll-gap-3">
            <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llApp.navigate('dashboard')">Back</button>
            <div>
              <h1 class="ll-h1">${this._esc(project.program_name)}</h1>
              <p class="ll-text-xs ll-text-muted">${this._esc(project.client_org?.name || '')} &middot; ${this._esc(project.client_org?.industry || '')}</p>
            </div>
          </div>
          <div class="ll-flex ll-gap-2 ll-items-center">
            <span class="ll-badge ll-badge-purple">${phaseLabels[project.phase]}</span>
            ${isLji && project.phase !== 'launch' ? `<button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llApp._advancePhase('${project.id}')">Advance Phase</button>` : ''}
          </div>
        </div>
      </div>

      <div class="ll-container">
        <div class="ll-flex ll-justify-between ll-items-center" style="margin-bottom:0.5rem;">
          <span class="ll-text-sm ll-text-muted">Overall progress</span>
          <span class="ll-text-sm" style="font-weight:600;">${project.progress.pct}%</span>
        </div>
        <div class="ll-progress" style="margin-bottom:2rem;">
          <div class="ll-progress-bar" style="width:${project.progress.pct}%;"></div>
        </div>

        ${phases.map(ph => {
          const phaseSections = grouped[ph] || [];
          const visible = phaseSections.filter(s => s.visible);
          if (visible.length === 0 && ph !== project.phase) return '';
          const isCurrentPhase = ph === project.phase;
          return `
            <div style="margin-bottom:2rem;">
              <h3 class="ll-h3" style="margin-bottom:0.75rem; ${!isCurrentPhase ? 'opacity:0.5;' : ''}">${phaseLabels[ph]}</h3>
              <div class="ll-flex ll-flex-col ll-gap-2">
                ${visible.map(s => {
                  const si = statusIcons[s.status] || statusIcons.not_started;
                  const name = sectionNames[s.section_id] || s.section_id;
                  const clickable = isCurrentPhase || s.status !== 'not_started';
                  return `
                    <div class="ll-card ${clickable ? 'll-card-hover' : ''}" ${clickable ? `onclick="llApp.navigate('section', { projectId: '${project.id}', sectionId: '${s.section_id}' })"` : ''} style="${!isCurrentPhase ? 'opacity:0.6;' : ''}">
                      <div class="ll-flex ll-justify-between ll-items-center">
                        <span class="ll-text-sm" style="font-weight:500;">${this._esc(name)}</span>
                        <div class="ll-flex ll-gap-2 ll-items-center">
                          <span class="ll-badge ${si.badge}">${si.label}</span>
                          ${isLji && s.status === 'in_review' ? `<button class="ll-btn ll-btn-primary ll-btn-sm" onclick="event.stopPropagation(); llApp._approveSection('${project.id}', '${s.section_id}')">Approve</button>` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- Section Form ---
  async _showSection(projectId, sectionId) {
    this.currentPage = 'section';
    this._showLoading();

    // Load section config from templates
    const sectionConfig = await this._loadSectionConfig(sectionId);
    if (!sectionConfig) {
      this.container.innerHTML = `<div class="ll-container"><div class="ll-card"><p>Section template not found: ${sectionId}</p></div></div>`;
      return;
    }

    this.container.innerHTML = `
      <div class="ll-header">
        <div class="ll-flex ll-items-center ll-gap-3">
          <button class="ll-btn ll-btn-secondary ll-btn-sm" onclick="llApp.navigate('project', { projectId: '${projectId}' })">Back</button>
          <h1 class="ll-h1" style="color:var(--ll-brand);">LoyaltyLift</h1>
        </div>
      </div>
      <div class="ll-container" style="max-width:800px;" id="ll-section-form"></div>
    `;

    this.formEngine = new LLFormEngine('ll-section-form');
    window.llFormEngine = this.formEngine;
    await this.formEngine.load(projectId, sectionId, sectionConfig);
  }

  async _loadSectionConfig(sectionId) {
    // Section configs will be loaded from the template JS files
    if (window.llSectionTemplates && window.llSectionTemplates[sectionId]) {
      return window.llSectionTemplates[sectionId];
    }
    // Fallback: try to load dynamically
    try {
      const script = document.createElement('script');
      script.src = `/loyaltylift/templates/${sectionId}.js`;
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      return window.llSectionTemplates?.[sectionId] || null;
    } catch (err) {
      console.error('Failed to load section template:', sectionId, err);
      return null;
    }
  }

  async _approveSection(projectId, sectionId) {
    if (!confirm('Approve this section?')) return;
    try {
      await window.llClient.approveSection(projectId, sectionId);
      this._showProject(projectId);
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve section.');
    }
  }

  async _advancePhase(projectId) {
    if (!confirm('Advance to the next phase? This will unlock new sections.')) return;
    try {
      await window.llClient.advancePhase(projectId);
      this._showProject(projectId);
    } catch (err) {
      console.error('Advance phase error:', err);
      alert('Failed to advance phase.');
    }
  }

  async _signOut() {
    await window.llClient.signOut();
    window.location.hash = '';
  }

  _showLoading() {
    this.container.innerHTML = '<div class="ll-loading-page"><div class="ll-spinner"></div></div>';
  }

  _getSectionNames() {
    return {
      tenancy: 'Tenancy Setup',
      program: 'Program Details',
      loyalty_accounts: 'Loyalty Accounts & Currency',
      policies: 'Policies & Currency Conversion',
      sponsor_mgmt: 'Sponsor Management',
      member_enrollment: 'Member Enrollment & Opt-Out',
      data_model_questions: 'Data Model Scoping Questions',
      tier_mgmt: 'Tier Management',
      accrual_redemption: 'Earning & Redemption Rules',
      offers_overview: 'Offers Overview',
      data_migration: 'Data Migration',
      marketing_connect: 'Marketing & Communications',
      member_data_model: 'Member Data Model',
      sponsor_data_model: 'Sponsor Data Model',
      sponsor_details: 'Sponsor Details',
      location_data_model: 'Sponsor Location Data Model',
      location_details: 'Sponsor Location Details',
      product_data_model: 'Product Data Model',
      product_details: 'Sponsor Reward Products',
      bit_data_model: 'Transaction (BIT) Data Model',
      payment_data_model: 'Payment Data Model',
      offer_data_model: 'Offer Data Model',
      offer_kpi: 'Offer KPI Setup',
      custom_attributes: 'Custom Attributes',
      batches: 'Batch Processing Setup',
      role_mgmt: 'Role & Permission Management',
      user_mgmt: 'User Management',
      member_services: 'Member Services Configuration',
      marketing_use_cases: 'Marketing Communication Use Cases',
      finance: 'Finance Connect',
      dwh: 'DWH Integration',
      vertical_entities: 'Vertical Entities',
      aisense: 'AiSense Alert Configuration',
      airecommend: 'AiRecommend Setup',
      airetain: 'AiRetain Setup',
      aitrust: 'AiTrust Setup',
      airport_entity: 'Airport Entity',
      distance_table: 'Distance Table',
      cobranded_cards: 'Co-branded Cards',
      subscription: 'Subscription Module',
      retro_request: 'Retro Request Setup',
      airline_redemption: 'Airline Redemption Setup',
    };
  }

  _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.llApp = new LLApp('ll-app');
  window.llApp.init();
});
