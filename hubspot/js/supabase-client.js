/**
 * LoyaltyLift — Supabase Client
 * Handles auth, API calls, and real-time subscriptions
 */

const LL_CONFIG = {
  supabaseUrl: 'https://anbavrtkyjloxtncnkzm.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYmF2cnRreWpsb3h0bmNua3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjUwNzAsImV4cCI6MjA5MTMwMTA3MH0.qLZdjKvCrOu4MbUQOOekIcUzgA59qOXOoluFLFjYJqE',
};

class LoyaltyLiftClient {
  constructor() {
    this._supabase = null;
    this._user = null;
    this._profile = null;
    this._initPromise = null;
  }

  get supabase() {
    if (!this._supabase) {
      this._supabase = window.supabase.createClient(
        LL_CONFIG.supabaseUrl,
        LL_CONFIG.supabaseAnonKey
      );
    }
    return this._supabase;
  }

  async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this._user = session.user;
      await this._loadProfile();
    }
    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        this._user = session.user;
        await this._loadProfile();
      } else {
        this._user = null;
        this._profile = null;
      }
      window.dispatchEvent(new CustomEvent('ll-auth-change', { detail: { user: this._user, profile: this._profile } }));
    });
    return { user: this._user, profile: this._profile };
  }

  async _loadProfile() {
    if (!this._user) return;
    const { data } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', this._user.id)
      .maybeSingle();
    this._profile = data;
  }

  get user() { return this._user; }
  get profile() { return this._profile; }
  get isAuthenticated() { return !!this._user; }
  get isLjiAdmin() { return this._profile?.role === 'lji_admin'; }
  get isLjiMember() { return ['lji_admin', 'lji_member'].includes(this._profile?.role); }

  // --- Auth ---
  async signInWithMagicLink(email) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.auth.signOut();
    this._user = null;
    this._profile = null;
  }

  // --- Projects ---
  async listProjects() {
    const { data, error } = await this.supabase
      .from('projects')
      .select(`
        id, program_name, phase, status, created_at, updated_at,
        client_org:client_organizations(id, name, industry, logo_url),
        sections:project_sections(id, section_id, status, phase, visible)
      `)
      .order('updated_at', { ascending: false });
    if (error) { console.error('listProjects:', error); throw error; }
    return data.map(p => ({
      ...p,
      progress: this._calcProgress(p.sections),
    }));
  }

  async getProject(projectId) {
    const { data, error } = await this.supabase
      .from('projects')
      .select(`
        id, program_name, phase, status, created_at, updated_at,
        client_org:client_organizations(id, name, industry, country, logo_url),
        sections:project_sections(id, section_id, status, phase, visible, owner_id, completed_at),
        members:project_members(user_id, role, joined_at)
      `)
      .eq('id', projectId)
      .single();
    if (error) { console.error('getProject:', error); throw error; }
    data.progress = this._calcProgress(data.sections);
    return data;
  }

  async createProject({ orgName, industry, country, programName }) {
    // Create client org
    const { data: org, error: orgError } = await this.supabase
      .from('client_organizations')
      .insert({ name: orgName, industry, country })
      .select('id')
      .single();
    if (orgError) { console.error('createOrg:', orgError); throw orgError; }

    // Create project
    const { data: project, error: projError } = await this.supabase
      .from('projects')
      .insert({
        client_org_id: org.id,
        program_name: programName,
        lji_lead_id: this._user.id,
      })
      .select('id')
      .single();
    if (projError) { console.error('createProject:', projError); throw projError; }

    // Add current user as project member
    await this.supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: this._user.id, role: 'lji_admin' });

    // Create all sections from template
    const sections = this._getSectionTemplate();
    const sectionRows = sections.map(s => ({
      project_id: project.id,
      section_id: s.id,
      phase: s.phase,
      visible: !s.conditional, // conditional sections start hidden
    }));
    await this.supabase.from('project_sections').insert(sectionRows);

    return project;
  }

  // --- Sections ---
  async getSectionResponses(projectId, sectionId) {
    const [responsesResult, piiResult, selectionsResult, entityResult] = await Promise.all([
      this.supabase
        .from('responses')
        .select('id, question_key, value, responded_by, updated_at')
        .eq('project_id', projectId)
        .eq('section_id', sectionId),
      this.supabase
        .from('responses_pii')
        .select('id, question_key, updated_at')
        .eq('project_id', projectId)
        .eq('section_id', sectionId),
      this.supabase
        .from('data_model_selections')
        .select('id, attribute_name, is_required, is_custom, config')
        .eq('project_id', projectId)
        .eq('section_id', sectionId),
      this.supabase
        .from('entity_rows')
        .select('id, row_index, data')
        .eq('project_id', projectId)
        .eq('section_id', sectionId)
        .order('row_index'),
    ]);

    return {
      responses: responsesResult.data || [],
      piiResponses: piiResult.data || [],
      dataModelSelections: selectionsResult.data || [],
      entityRows: entityResult.data || [],
    };
  }

  async saveResponse(projectId, sectionId, questionKey, value) {
    const { error } = await this.supabase
      .from('responses')
      .upsert({
        project_id: projectId,
        section_id: sectionId,
        question_key: questionKey,
        value: JSON.stringify(value),
        responded_by: this._user.id,
      }, { onConflict: 'project_id,section_id,question_key' });
    if (error) { console.error('saveResponse:', error); throw error; }

    // Update section status to in_progress if not_started
    await this.supabase
      .from('project_sections')
      .update({ status: 'in_progress' })
      .eq('project_id', projectId)
      .eq('section_id', sectionId)
      .eq('status', 'not_started');

    // Log activity
    await this._logActivity(projectId, 'response_updated', { section_id: sectionId, question_key: questionKey });
  }

  async submitSection(projectId, sectionId) {
    const { error } = await this.supabase
      .from('project_sections')
      .update({ status: 'in_review' })
      .eq('project_id', projectId)
      .eq('section_id', sectionId);
    if (error) { console.error('submitSection:', error); throw error; }
    await this._logActivity(projectId, 'section_submitted', { section_id: sectionId });
  }

  async approveSection(projectId, sectionId) {
    const { error } = await this.supabase
      .from('project_sections')
      .update({ status: 'approved', completed_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('section_id', sectionId);
    if (error) { console.error('approveSection:', error); throw error; }
    await this._logActivity(projectId, 'section_approved', { section_id: sectionId });
  }

  // --- Comments ---
  async getComments(projectId, sectionId) {
    let query = this.supabase
      .from('comments')
      .select('id, section_id, question_key, body, author_id, parent_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (sectionId) query = query.eq('section_id', sectionId);
    const { data, error } = await query;
    if (error) { console.error('getComments:', error); throw error; }
    return data;
  }

  async addComment(projectId, sectionId, body, questionKey, parentId) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        project_id: projectId,
        section_id: sectionId,
        question_key: questionKey || null,
        body,
        author_id: this._user.id,
        parent_id: parentId || null,
      })
      .select('id')
      .single();
    if (error) { console.error('addComment:', error); throw error; }
    await this._logActivity(projectId, 'comment_added', { section_id: sectionId, question_key: questionKey });
    return data;
  }

  // --- Entity Rows ---
  async addEntityRow(projectId, sectionId, rowData) {
    // Get max row_index
    const { data: existing } = await this.supabase
      .from('entity_rows')
      .select('row_index')
      .eq('project_id', projectId)
      .eq('section_id', sectionId)
      .order('row_index', { ascending: false })
      .limit(1);
    const nextIndex = (existing?.[0]?.row_index ?? -1) + 1;
    const { data, error } = await this.supabase
      .from('entity_rows')
      .insert({ project_id: projectId, section_id: sectionId, row_index: nextIndex, data: rowData })
      .select('id, row_index, data')
      .single();
    if (error) { console.error('addEntityRow:', error); throw error; }
    return data;
  }

  async updateEntityRow(rowId, rowData) {
    const { error } = await this.supabase
      .from('entity_rows')
      .update({ data: rowData })
      .eq('id', rowId);
    if (error) { console.error('updateEntityRow:', error); throw error; }
  }

  async deleteEntityRow(rowId) {
    const { error } = await this.supabase
      .from('entity_rows')
      .delete()
      .eq('id', rowId);
    if (error) { console.error('deleteEntityRow:', error); throw error; }
  }

  // --- Data Model Selections ---
  async saveDataModelSelection(projectId, sectionId, attributeName, isRequired, isCustom, config) {
    const { error } = await this.supabase
      .from('data_model_selections')
      .upsert({
        project_id: projectId,
        section_id: sectionId,
        attribute_name: attributeName,
        is_required: isRequired,
        is_custom: isCustom || false,
        config: config || null,
      }, { onConflict: 'project_id,section_id,attribute_name' });
    if (error) { console.error('saveDataModelSelection:', error); throw error; }
  }

  // --- File Uploads ---
  async uploadFile(projectId, sectionId, questionKey, file) {
    const path = `${projectId}/${sectionId}/${questionKey}/${file.name}`;
    const { error: uploadError } = await this.supabase.storage
      .from('project-files')
      .upload(path, file, { upsert: true });
    if (uploadError) { console.error('uploadFile:', uploadError); throw uploadError; }

    const { data, error } = await this.supabase
      .from('file_uploads')
      .insert({
        project_id: projectId,
        section_id: sectionId,
        question_key: questionKey,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        uploaded_by: this._user.id,
      })
      .select('id, file_name, storage_path')
      .single();
    if (error) { console.error('insertFileRecord:', error); throw error; }
    return data;
  }

  // --- Invitations ---
  async inviteClient(projectId, email, role) {
    // Send magic link
    await this.signInWithMagicLink(email);
    // Pre-create project membership
    // Note: actual membership will be linked after user signs in
    return { invited: email };
  }

  // --- Phase Management ---
  async advancePhase(projectId) {
    const project = await this.getProject(projectId);
    const phases = ['discovery', 'design', 'launch'];
    const currentIdx = phases.indexOf(project.phase);
    if (currentIdx >= phases.length - 1) throw new Error('Already at final phase');
    const nextPhase = phases[currentIdx + 1];

    const { error } = await this.supabase
      .from('projects')
      .update({ phase: nextPhase })
      .eq('id', projectId);
    if (error) { console.error('advancePhase:', error); throw error; }

    // Make next phase sections visible
    await this.supabase
      .from('project_sections')
      .update({ visible: true })
      .eq('project_id', projectId)
      .eq('phase', nextPhase);

    await this._logActivity(projectId, 'phase_advanced', { from: project.phase, to: nextPhase });
  }

  // --- Activity Log ---
  async getActivityLog(projectId, limit) {
    const { data, error } = await this.supabase
      .from('activity_log')
      .select('id, user_id, action, metadata, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit || 50);
    if (error) { console.error('getActivityLog:', error); throw error; }
    return data;
  }

  async _logActivity(projectId, action, metadata) {
    await this.supabase.from('activity_log').insert({
      project_id: projectId,
      user_id: this._user?.id,
      action,
      metadata,
    });
  }

  // --- Helpers ---
  _calcProgress(sections) {
    if (!sections?.length) return { total: 0, completed: 0, pct: 0 };
    const visible = sections.filter(s => s.visible);
    const completed = visible.filter(s => s.status === 'approved').length;
    return {
      total: visible.length,
      completed,
      pct: visible.length ? Math.round((completed / visible.length) * 100) : 0,
    };
  }

  _getSectionTemplate() {
    return [
      // Phase 1: Discovery
      { id: 'tenancy', phase: 'discovery', conditional: false },
      { id: 'program', phase: 'discovery', conditional: false },
      { id: 'loyalty_accounts', phase: 'discovery', conditional: false },
      { id: 'policies', phase: 'discovery', conditional: false },
      { id: 'sponsor_mgmt', phase: 'discovery', conditional: false },
      { id: 'member_enrollment', phase: 'discovery', conditional: false },
      { id: 'data_model_questions', phase: 'discovery', conditional: false },
      { id: 'tier_mgmt', phase: 'discovery', conditional: true },
      { id: 'accrual_redemption', phase: 'discovery', conditional: false },
      { id: 'offers_overview', phase: 'discovery', conditional: false },
      { id: 'data_migration', phase: 'discovery', conditional: false },
      { id: 'marketing_connect', phase: 'discovery', conditional: false },
      // Phase 2: Design
      { id: 'member_data_model', phase: 'design', conditional: false },
      { id: 'sponsor_data_model', phase: 'design', conditional: false },
      { id: 'sponsor_details', phase: 'design', conditional: false },
      { id: 'location_data_model', phase: 'design', conditional: false },
      { id: 'location_details', phase: 'design', conditional: false },
      { id: 'product_data_model', phase: 'design', conditional: false },
      { id: 'product_details', phase: 'design', conditional: false },
      { id: 'bit_data_model', phase: 'design', conditional: false },
      { id: 'payment_data_model', phase: 'design', conditional: false },
      { id: 'offer_data_model', phase: 'design', conditional: false },
      { id: 'offer_kpi', phase: 'design', conditional: false },
      { id: 'custom_attributes', phase: 'design', conditional: false },
      { id: 'batches', phase: 'design', conditional: false },
      { id: 'role_mgmt', phase: 'design', conditional: false },
      { id: 'user_mgmt', phase: 'design', conditional: false },
      { id: 'member_services', phase: 'design', conditional: false },
      { id: 'marketing_use_cases', phase: 'design', conditional: false },
      { id: 'finance', phase: 'design', conditional: false },
      { id: 'dwh', phase: 'design', conditional: false },
      // Phase 3: Launch
      { id: 'vertical_entities', phase: 'launch', conditional: true },
      { id: 'aisense', phase: 'launch', conditional: true },
      { id: 'airecommend', phase: 'launch', conditional: true },
      { id: 'airetain', phase: 'launch', conditional: true },
      { id: 'aitrust', phase: 'launch', conditional: true },
      { id: 'airport_entity', phase: 'launch', conditional: true },
      { id: 'distance_table', phase: 'launch', conditional: true },
      { id: 'cobranded_cards', phase: 'launch', conditional: true },
      { id: 'subscription', phase: 'launch', conditional: true },
      { id: 'retro_request', phase: 'launch', conditional: true },
      { id: 'airline_redemption', phase: 'launch', conditional: true },
    ];
  }
}

// Global instance
window.llClient = new LoyaltyLiftClient();
