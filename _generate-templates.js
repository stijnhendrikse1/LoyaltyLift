const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('C:/Users/smfhe/LoyaltyLift/docs/excel-full-extract.json', 'utf8'));

const BASE = 'C:/Users/smfhe/LoyaltyLift/src/templates';

// ── Helpers ──────────────────────────────────────────────────
function toSnakeCase(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .split('_')
    .slice(0, 6)
    .join('_');
}

function toKey(text) {
  const s = toSnakeCase(text);
  return s.length > 50 ? s.substring(0, 50).replace(/_$/, '') : s;
}

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function isPii(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  // Exclude "program name", "loyalty program name", "company name", "sponsor name" etc from PII
  if (/\b(program|loyalty|sponsor|location|offer|product|tier|batch|currency)\s+name\b/.test(t)) return false;
  return /\b(email|phone|mobile|first\s*name|last\s*name|middle\s*name|member\s*name|\bname\b|address|passport|date of birth|dob|social|gender|salary|income)\b/.test(t);
}

function guessInputType(question, hint) {
  const q = (question || '').toLowerCase();
  const h = (hint || '').toLowerCase();
  if (/yes\s*\/\s*no|y\s*\/\s*n|\(yes\/no\)|\(y\/n\)/.test(q)) return 'boolean';
  if (/logo|image|file|upload|cloud drive link/.test(q) || /cloud drive link/.test(h)) return 'file';
  if (/date|launch date/.test(q) && !/format/.test(q)) return 'date';
  if (/currency|cost|price|amount|fee|revenue/.test(q) && /\$|\bfee\b|\bcost\b/.test(q)) return 'currency';
  if (/how many|number of|decimal\b|(?<!\w)count(?!r)|percentage|quantity/.test(q)) return 'number';
  if (/\n\s*\d+\.\s/.test(question || '') || /\n\s*-\s/.test(question || '')) return 'select';
  if (/please describe|provide details|elaborate|explain|specify the details/.test(q)) return 'textarea';
  if (/email/.test(q)) return 'text';
  return 'text';
}

function guessIndustryRelevance(val) {
  if (!val || val === '' || val === 'All') return undefined;
  return val.split(/[,\/&]/).map(s => s.trim()).filter(Boolean);
}

function isMandatory(val) {
  if (!val) return false;
  const v = String(val).toLowerCase().trim();
  return v === 'yes' || v === 'y';
}

// ── Build standard question array from Q&A sheet ──────────
function buildQuestions(sheetKey, opts = {}) {
  const rows = data[sheetKey];
  if (!rows) { console.log('  MISSING SHEET:', sheetKey); return []; }

  const header = rows[0];
  const qCol = header.findIndex(h => /question/i.test(h));
  const inputCol = header.findIndex(h => /input/i.test(h));
  const mandCol = header.findIndex(h => /mandatory/i.test(h));
  const indCol = header.findIndex(h => /industry/i.test(h));

  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sno = row[0];
    const questionText = row[qCol >= 0 ? qCol : 1];
    if (!questionText || typeof questionText !== 'string' || questionText.length < 5) continue;
    if (/^note:/i.test(questionText.trim())) continue;

    const hint = inputCol >= 0 ? row[inputCol] : '';
    const mand = mandCol >= 0 ? row[mandCol] : '';
    const ind = indCol >= 0 ? row[indCol] : '';

    const key = toKey(questionText);
    if (!key) continue;

    const inputType = opts.gridMode ? 'grid' : guessInputType(questionText, String(hint || ''));
    const q = {
      key,
      label: questionText.replace(/\n/g, ' ').substring(0, 300),
      inputType,
      required: isMandatory(mand),
      pii: isPii(questionText),
    };
    if (hint && typeof hint === 'string' && hint.length > 2 && !/please fill|please add|please provide/i.test(hint)) {
      q.placeholder = String(hint).substring(0, 200);
    }
    const rel = guessIndustryRelevance(String(ind || ''));
    if (rel) q.industryRelevance = rel;
    if (inputType === 'text' && /email/i.test(questionText)) {
      q.validation = { pattern: '^[^@]+@[^@]+\\.[^@]+$', patternMessage: 'Enter a valid email address' };
    }
    questions.push(q);
  }
  return questions;
}

// ── Build data model attributes ──────────────────────────
function buildDataModelAttributes(sheetKey) {
  const rows = data[sheetKey];
  if (!rows) { console.log('  MISSING DM SHEET:', sheetKey); return []; }
  const header = rows[0];
  const attrs = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const bName = row[0];
    const aName = row[1];
    if (!aName || typeof aName !== 'string' || aName.length < 2) continue;
    if (/^note:/i.test(bName || '')) continue;
    if (/^note:/i.test(aName)) continue;

    const attr = {
      businessName: String(bName || ''),
      attributeName: String(aName),
      description: String(row[2] || ''),
      sampleValue: String(row[3] || ''),
      dataType: String(row[4] || ''),
    };
    if (row[5]) attr.lookupType = String(row[5]);
    if (row[6]) attr.lovType = String(row[6]);
    attrs.push(attr);
  }
  return attrs;
}

// ── Write a section file ────────────────────────────────
function writeSectionFile(filename, sectionDef) {
  const { id, name, description, phase, visibleIf, questions } = sectionDef;
  let code = `import type { Section } from '../types';\n\n`;
  code += `export const ${toCamelId(id)}Section: Section = {\n`;
  code += `  id: '${id}',\n`;
  code += `  name: '${esc(name)}',\n`;
  code += `  description: '${esc(description)}',\n`;
  code += `  phase: '${phase}',\n`;
  if (visibleIf) {
    code += `  visibleIf: {\n`;
    code += `    questionKey: '${visibleIf.questionKey}',\n`;
    code += `    operator: '${visibleIf.operator}',\n`;
    code += `    value: ${typeof visibleIf.value === 'string' ? `'${esc(visibleIf.value)}'` : JSON.stringify(visibleIf.value)},\n`;
    code += `  },\n`;
  }
  code += `  questions: [\n`;
  for (const q of questions) {
    code += `    {\n`;
    code += `      key: '${q.key}',\n`;
    code += `      label: '${esc(q.label)}',\n`;
    code += `      inputType: '${q.inputType}',\n`;
    code += `      required: ${q.required},\n`;
    code += `      pii: ${q.pii},\n`;
    if (q.placeholder) code += `      placeholder: '${esc(q.placeholder)}',\n`;
    if (q.industryRelevance) code += `      industryRelevance: ${JSON.stringify(q.industryRelevance)},\n`;
    if (q.validation) code += `      validation: ${JSON.stringify(q.validation)},\n`;
    if (q.helpText) code += `      helpText: '${esc(q.helpText)}',\n`;
    if (q.options) {
      code += `      options: [\n`;
      for (const o of q.options) {
        code += `        { value: '${esc(o.value)}', label: '${esc(o.label)}' },\n`;
      }
      code += `      ],\n`;
    }
    code += `    },\n`;
  }
  code += `  ],\n`;
  code += `};\n`;
  fs.writeFileSync(path.join(BASE, 'sections', filename), code, 'utf8');
  console.log(`  wrote sections/${filename} (${questions.length} questions)`);
}

function toCamelId(id) {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ── Write data model attribute file ──────────────────────
function writeDataModelFile(filename, attrs, entityName) {
  let code = `import type { DataModelAttribute } from '../types';\n\n`;
  code += `export const ${entityName}Attributes: DataModelAttribute[] = [\n`;
  for (const a of attrs) {
    code += `  {\n`;
    code += `    businessName: '${esc(a.businessName)}',\n`;
    code += `    attributeName: '${esc(a.attributeName)}',\n`;
    code += `    description: '${esc(a.description)}',\n`;
    if (a.sampleValue) code += `    sampleValue: '${esc(a.sampleValue)}',\n`;
    code += `    dataType: '${esc(a.dataType)}',\n`;
    if (a.lookupType) code += `    lookupType: '${esc(a.lookupType)}',\n`;
    if (a.lovType) code += `    lovType: '${esc(a.lovType)}',\n`;
    code += `  },\n`;
  }
  code += `];\n`;
  fs.writeFileSync(path.join(BASE, 'data-models', filename), code, 'utf8');
  console.log(`  wrote data-models/${filename} (${attrs.length} attributes)`);
}

// ── Loyalty Account (sheet 3) special handling ──────────
function buildLoyaltyAccountQuestions() {
  const rows = data['3 - Loyalty Account'];
  if (!rows) return [];
  const header = rows[0];
  const questions = [];
  for (let ci = 0; ci < header.length; ci++) {
    const label = header[ci];
    if (!label || typeof label !== 'string' || label.length < 5) continue;
    if (/^note:/i.test(label)) continue;
    const key = toKey(label);
    if (!key) continue;
    questions.push({
      key,
      label: label.replace(/\n/g, ' ').substring(0, 300),
      inputType: /yes\s*\/\s*no/i.test(label) ? 'boolean' :
                 /cost|price|selling/i.test(label) ? 'currency' :
                 /logo/i.test(label) ? 'file' :
                 /expir|descri|detail/i.test(label) ? 'textarea' : 'text',
      required: true,
      pii: false,
    });
  }
  return questions;
}

// ── Policy (sheet 4) special handling ──────────────────
function buildPolicyQuestions() {
  const rows = data['4 - Policy Setup & Currency Con'];
  if (!rows) return [];
  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sno = row[0];
    const qText = row[1];
    if (!qText || typeof qText !== 'string' || qText.length < 10) continue;
    if (/^note:|^currency$|^loyalty currency$/i.test(qText.trim())) continue;
    // Section headers
    if (/^\d+$/.test(String(sno)) && /policies|policy|award|reward/i.test(qText) && qText.length < 50) continue;

    const key = toKey(qText);
    if (!key) continue;
    const mand = row[8] || '';
    questions.push({
      key,
      label: qText.replace(/\n/g, ' ').substring(0, 300),
      inputType: guessInputType(qText, ''),
      required: isMandatory(mand),
      pii: false,
      industryRelevance: guessIndustryRelevance(String(row[9] || '')),
    });
  }
  return questions;
}

// ── Offer KPI (sheet 5) special handling ──────────────
function buildOfferKpiQuestions() {
  const rows = data['5 - Offer KPI Setup'];
  if (!rows) return [];
  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const kpiName = row[1];
    if (!kpiName || typeof kpiName !== 'string' || kpiName.length < 5) continue;
    if (/^note:/i.test(kpiName.trim())) continue;
    questions.push({
      key: toKey(kpiName),
      label: kpiName.replace(/\n/g, ' '),
      helpText: String(row[2] || ''),
      inputType: 'boolean',
      required: false,
      pii: false,
    });
  }
  return questions;
}

// ── Accrual/Redemption (sheet 10.1) ──────────────────
function buildAccrualRedemptionQuestions() {
  const rows = data['10.1 - AccrualRedemption'];
  if (!rows) return [];
  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const area = row[1];
    const qText = row[2];
    if (!qText || typeof qText !== 'string' || qText.length < 10) continue;
    if (/^s\.no|^name of/i.test(String(row[0] || ''))) continue;
    const key = toKey(qText);
    if (!key) continue;
    questions.push({
      key,
      label: qText.replace(/\n/g, ' ').substring(0, 300),
      helpText: area ? String(area) : undefined,
      inputType: guessInputType(qText, ''),
      required: isMandatory(row[4]),
      pii: false,
    });
  }
  return questions;
}

// ── Sponsor Details Template (8.3) ──────────────────
function buildSponsorDetailsQuestions() {
  const rows = data['8.3 - Sponsor Details Template'];
  if (!rows) return [];
  const header = rows[0]; // Attribute Name row
  const descRow = rows[1]; // Attribute Description row
  const dataTypeRow = rows[2];
  const mandRow = rows.find(r => /mandatory/i.test(String(r[0] || '')));
  const questions = [];
  for (let ci = 1; ci < header.length; ci++) {
    const label = header[ci];
    if (!label || typeof label !== 'string' || label.length < 3) continue;
    const key = toKey(label);
    if (!key) continue;
    const desc = descRow ? String(descRow[ci] || '') : '';
    const mand = mandRow ? isMandatory(mandRow[ci]) : false;
    questions.push({
      key,
      label: label.replace(/\n/g, ' '),
      helpText: desc.substring(0, 300),
      inputType: /logo|banner|image/i.test(label) ? 'file' :
                 /date/i.test(label) ? 'date' :
                 /latitude|longitude|count|revenue|rate|value|threshold/i.test(label) ? 'number' :
                 /email/i.test(label) ? 'text' : 'text',
      required: mand,
      pii: isPii(label),
    });
  }
  return questions;
}

// ── Location Details Template (8.5) ──────────────────
function buildLocationDetailsQuestions() {
  const rows = data['8.5 - Sponsor Location Details '];
  if (!rows) return [];
  const header = rows[0];
  const descRow = rows[1];
  const mandRow = rows.find(r => /mandatory/i.test(String(r[0] || '')));
  const questions = [];
  for (let ci = 1; ci < header.length; ci++) {
    const label = header[ci];
    if (!label || typeof label !== 'string' || label.length < 3) continue;
    const key = toKey(label);
    if (!key) continue;
    const mand = mandRow ? isMandatory(mandRow[ci]) : false;
    const desc = descRow ? String(descRow[ci] || '') : '';
    questions.push({
      key,
      label: label.replace(/\n/g, ' '),
      helpText: desc.substring(0, 300),
      inputType: /image/i.test(label) ? 'file' :
                 /latitude|longitude/i.test(label) ? 'number' :
                 /url/i.test(label) ? 'text' : 'text',
      required: mand,
      pii: isPii(label),
    });
  }
  return questions;
}

// ── Product Details (8.7) ──────────────────────────
function buildProductDetailsQuestions() {
  const rows = data['8.7 - Sponsor Reward Products T'];
  if (!rows) return [];
  const header = rows[0];
  const descRow = rows[1];
  const mandRow = rows.find(r => /mandatory/i.test(String(r[0] || '')));
  const questions = [];
  for (let ci = 1; ci < header.length; ci++) {
    const label = header[ci];
    if (!label || typeof label !== 'string' || label.length < 3) continue;
    const key = toKey(label);
    if (!key) continue;
    const mand = mandRow ? isMandatory(mandRow[ci]) : false;
    questions.push({
      key,
      label: label.replace(/\n/g, ' '),
      helpText: descRow ? String(descRow[ci] || '') : undefined,
      inputType: /date/i.test(label) ? 'date' :
                 /cost|reward$/i.test(label) ? 'number' : 'text',
      required: mand,
      pii: false,
    });
  }
  return questions;
}

// ── Data Model Questions (sheet 6) ──────────────────
function buildDataModelQuestions() {
  const rows = data['6 - Data Model Related Question'];
  if (!rows) return [];
  const questions = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip headers and section titles
    if (/^s\.\s*no/i.test(String(row[0] || ''))) continue;
    if (row[0] === '' && row[2] === '' && row[3] === '') continue;
    const qText = row[1];
    if (!qText || typeof qText !== 'string' || qText.length < 10) continue;
    if (/data model$/i.test(qText.trim())) continue;
    const key = toKey(qText);
    if (!key) continue;
    questions.push({
      key,
      label: qText.replace(/\n/g, ' ').substring(0, 300),
      inputType: guessInputType(qText, ''),
      required: isMandatory(row[3]),
      pii: false,
    });
  }
  return questions;
}

// ── Offers (sheet 11.1) ──────────────────────────
function buildOffersQuestions() {
  const sheetKey = Object.keys(data).find(k => k.startsWith('11.1'));
  if (!sheetKey) { console.log('  MISSING 11.1 sheet'); return []; }
  return buildQuestions(sheetKey);
}

// ── Member Services (16+) ──────────────────────────
function buildMemberServicesQuestions() {
  const questions = [];
  // Sheet 16 and 16.1-16.20
  const serviceSheets = Object.keys(data).filter(k => /^16/.test(k));
  for (const sk of serviceSheets) {
    const rows = data[sk];
    if (!rows || rows.length < 2) continue;
    const header = rows[0];
    const qCol = header.findIndex(h => /question|service|feature/i.test(String(h || '')));
    const col = qCol >= 0 ? qCol : 1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const qText = row[col];
      if (!qText || typeof qText !== 'string' || qText.length < 5) continue;
      if (/^note:|^s\.\s*no/i.test(qText.trim())) continue;
      const key = toKey(sk.replace(/[^a-zA-Z0-9]/g, '_') + '_' + qText);
      if (!key) continue;
      questions.push({
        key,
        label: qText.replace(/\n/g, ' ').substring(0, 300),
        inputType: guessInputType(qText, ''),
        required: false,
        pii: isPii(qText),
      });
    }
  }
  return questions;
}

// ── Batches (sheet 13) ──────────────────────────
function buildBatchesQuestions() {
  const sheetKey = Object.keys(data).find(k => k.startsWith('13'));
  if (!sheetKey) { console.log('  MISSING 13 sheet'); return []; }
  return buildQuestions(sheetKey);
}

// ── Role Management (sheet 14) ──────────────────
function buildRoleMgmtQuestions() {
  const sheetKey = Object.keys(data).find(k => k.startsWith('14'));
  if (!sheetKey) { console.log('  MISSING 14 sheet'); return []; }
  return buildQuestions(sheetKey);
}

// ── Custom Attributes (sheet 12) ──────────────────
function buildCustomAttributesQuestions() {
  const sheetKey = Object.keys(data).find(k => k.startsWith('12'));
  if (!sheetKey) { console.log('  MISSING 12 sheet'); return []; }
  return buildQuestions(sheetKey);
}

// ── User Management (15.1 + 15.2) ──────────────
function buildUserMgmtQuestions() {
  const questions = [];
  for (const prefix of ['15.1', '15.2']) {
    const sk = Object.keys(data).find(k => k.startsWith(prefix));
    if (sk) questions.push(...buildQuestions(sk));
  }
  return questions;
}

// ── DWH (19.1 + 19.2) ──────────────────────────
function buildDwhQuestions() {
  const questions = [];
  for (const prefix of ['19.1', '19.2']) {
    const sk = Object.keys(data).find(k => k.startsWith(prefix));
    if (sk) questions.push(...buildQuestions(sk));
  }
  return questions;
}

// ── Marketing Use Cases (17.2) ──────────────────
function buildMarketingUseCasesQuestions() {
  const sk = Object.keys(data).find(k => k.startsWith('17.2'));
  if (!sk) { console.log('  MISSING 17.2 sheet'); return []; }
  return buildQuestions(sk);
}

// ── Marketing Connect (17.1) ──────────────────
function buildMarketingConnectQuestions() {
  const sk = Object.keys(data).find(k => k.startsWith('17.1'));
  if (!sk) { console.log('  MISSING 17.1 sheet'); return []; }
  return buildQuestions(sk);
}

// ── Data Migration (18) ──────────────────────
function buildDataMigrationQuestions() {
  const sk = Object.keys(data).find(k => k.startsWith('18'));
  if (!sk) { console.log('  MISSING 18 sheet'); return []; }
  return buildQuestions(sk);
}

// ── Finance (20) ──────────────────────────────
function buildFinanceQuestions() {
  const sk = Object.keys(data).find(k => k.startsWith('20'));
  if (!sk) { console.log('  MISSING 20 sheet'); return []; }
  return buildQuestions(sk);
}

// ── Launch phase sheets ──────────────────────────
function buildLaunchQuestions(sheetPrefix) {
  const sk = Object.keys(data).find(k => k.startsWith(sheetPrefix));
  if (!sk) { console.log('  MISSING sheet prefix:', sheetPrefix); return []; }
  return buildQuestions(sk);
}

// ── Tenancy (1.1 + 1.2) ──────────────────────────
function buildTenancyQuestions() {
  const q11 = buildQuestions('1.1 - Tenancy setup');
  // 1.2 is an admin template - create grid-like questions
  const rows12 = data['1.2 - Tenancy Setup - Program A'];
  if (rows12 && rows12.length > 0) {
    const header = rows12[0];
    for (let ci = 1; ci < header.length; ci++) {
      const label = header[ci];
      if (!label) continue;
      q11.push({
        key: 'admin_' + toKey(label),
        label: `Program Administrator - ${String(label).trim()}`,
        inputType: /email/i.test(label) ? 'text' : 'text',
        required: true,
        pii: isPii(label),
        validation: /email/i.test(label) ? { pattern: '^[^@]+@[^@]+\\.[^@]+$', patternMessage: 'Enter a valid email address' } : undefined,
      });
    }
  }
  return q11;
}

// ────────────────────────────────────────────────────────────
// GENERATE ALL FILES
// ────────────────────────────────────────────────────────────
console.log('\n=== Generating LoyaltyLift Template Files ===\n');

// ── Phase 1: Discovery ──────────────────────────────────────
const discoverySections = [
  { file: 'tenancy.ts', id: 'tenancy', name: 'Tenancy Setup', desc: 'Program tenancy configuration and administrator setup', builder: buildTenancyQuestions },
  { file: 'program.ts', id: 'program', name: 'Program Details', desc: 'Core program information including name, currency, and date formats', builder: () => buildQuestions('2 - Program Details') },
  { file: 'loyalty-accounts.ts', id: 'loyalty-accounts', name: 'Loyalty Accounts', desc: 'Loyalty currency accounts, tags, and expiration policies', builder: buildLoyaltyAccountQuestions },
  { file: 'policies.ts', id: 'policies', name: 'Policy Setup & Currency Conversion', desc: 'Reward policies, redemption policies, membership policies, and currency conversion rates', builder: buildPolicyQuestions },
  { file: 'sponsor-mgmt.ts', id: 'sponsor-mgmt', name: 'Sponsor Management', desc: 'Participating brands, partners, and sponsor hierarchy configuration', builder: () => buildQuestions('8.1 - Sponsor Management') },
  { file: 'member-enrollment.ts', id: 'member-enrollment', name: 'Member Enrolment & Opt-Out', desc: 'Member enrollment channels, verification, referral programs, and opt-out policies', builder: () => buildQuestions('7.1 - Member Enrolment & Opt-Ou') },
  { file: 'data-model-questions.ts', id: 'data-model-questions', name: 'Data Model Related Questions', desc: 'Questions about existing data models for locations, products, and payments', builder: buildDataModelQuestions },
  { file: 'tier-mgmt.ts', id: 'tier-mgmt', name: 'Tier Management', desc: 'Tier structure, qualification criteria, upgrade/downgrade policies, and tier entitlements', builder: () => buildQuestions('9 - Tier Management'), visibleIf: { questionKey: 'program_has_tiers', operator: 'eq', value: 'true' } },
  { file: 'accrual-redemption.ts', id: 'accrual-redemption', name: 'Accrual & Redemption', desc: 'Earning criteria, qualifying criteria, exclusions, and base accrual/redemption offers', builder: buildAccrualRedemptionQuestions },
  { file: 'offers-overview.ts', id: 'offers-overview', name: 'Offers Overview', desc: 'Promotional offers, campaigns, and offer management configuration', builder: buildOffersQuestions },
  { file: 'data-migration.ts', id: 'data-migration', name: 'Data Migration', desc: 'Data migration strategy, scope, source systems, and migration approach', builder: buildDataMigrationQuestions },
  { file: 'marketing-connect.ts', id: 'marketing-connect', name: 'Marketing Connect', desc: 'Marketing communication platform integration and triggered events', builder: buildMarketingConnectQuestions },
];

console.log('Phase 1: Discovery');
for (const s of discoverySections) {
  const questions = s.builder();
  writeSectionFile(s.file, { id: s.id, name: s.name, description: s.desc, phase: 'discovery', visibleIf: s.visibleIf, questions });
}

// ── Phase 2: Design ──────────────────────────────────────
const designSections = [
  { file: 'member-data-model.ts', id: 'member-data-model', name: 'Member Data Model', desc: 'Member profile attributes and data model configuration', builder: () => buildQuestions('7.2 - Member Data Model', { gridMode: true }) },
  { file: 'sponsor-data-model.ts', id: 'sponsor-data-model', name: 'Sponsor Data Model', desc: 'Sponsor entity attributes and data model configuration', builder: () => buildQuestions('8.2 - Sponsor Data Model', { gridMode: true }) },
  { file: 'sponsor-details.ts', id: 'sponsor-details', name: 'Sponsor Details Template', desc: 'Detailed sponsor information template for onboarding each sponsor', builder: buildSponsorDetailsQuestions },
  { file: 'location-data-model.ts', id: 'location-data-model', name: 'Sponsor Location Data Model', desc: 'Location entity attributes and data model configuration', builder: () => buildQuestions('8.4 - Sponsor Location Data Mod', { gridMode: true }) },
  { file: 'location-details.ts', id: 'location-details', name: 'Sponsor Location Details', desc: 'Detailed location information template for each sponsor location', builder: buildLocationDetailsQuestions },
  { file: 'product-data-model.ts', id: 'product-data-model', name: 'Product Data Model', desc: 'Product/SKU entity attributes and data model configuration', builder: () => buildQuestions('8.6 - Product Data Model', { gridMode: true }) },
  { file: 'product-details.ts', id: 'product-details', name: 'Sponsor Reward Products Template', desc: 'Detailed product/SKU information template for reward catalog', builder: buildProductDetailsQuestions },
  { file: 'bit-data-model.ts', id: 'bit-data-model', name: 'BIT Data Model', desc: 'Transaction (BIT) entity attributes and data model configuration', builder: () => buildQuestions('10.2 - BIT Data Model', { gridMode: true }) },
  { file: 'payment-data-model.ts', id: 'payment-data-model', name: 'Payment Data Model', desc: 'Payment entity attributes and data model configuration', builder: () => { const sk = Object.keys(data).find(k => k.startsWith('10.3')); return sk ? buildQuestions(sk, { gridMode: true }) : []; } },
  { file: 'offer-data-model.ts', id: 'offer-data-model', name: 'Offer Data Model', desc: 'Offer entity attributes and data model configuration', builder: () => { const sk = Object.keys(data).find(k => k.startsWith('11.2')); return sk ? buildQuestions(sk, { gridMode: true }) : []; } },
  { file: 'offer-kpi.ts', id: 'offer-kpi', name: 'Offer KPI Setup', desc: 'Key Performance Indicators for measuring offer effectiveness', builder: buildOfferKpiQuestions },
  { file: 'custom-attributes.ts', id: 'custom-attributes', name: 'Custom Attributes', desc: 'Custom attribute definitions for extending entity data models', builder: buildCustomAttributesQuestions },
  { file: 'batches.ts', id: 'batches', name: 'Batches', desc: 'Batch processing configuration for bulk operations', builder: buildBatchesQuestions },
  { file: 'role-mgmt.ts', id: 'role-mgmt', name: 'Role Management', desc: 'User roles, permissions, and access control configuration', builder: buildRoleMgmtQuestions },
  { file: 'user-mgmt.ts', id: 'user-mgmt', name: 'User Management', desc: 'System user accounts and user detail configuration', builder: buildUserMgmtQuestions },
  { file: 'member-services.ts', id: 'member-services', name: 'Member Services', desc: 'Customer service operations and member service configurations', builder: buildMemberServicesQuestions },
  { file: 'marketing-use-cases.ts', id: 'marketing-use-cases', name: 'Marketing Communication Use Cases', desc: 'Triggered marketing events, templates, and communication workflows', builder: buildMarketingUseCasesQuestions },
  { file: 'finance.ts', id: 'finance', name: 'Finance Connect', desc: 'Financial integration, billing, and reporting configuration', builder: buildFinanceQuestions },
  { file: 'dwh.ts', id: 'dwh', name: 'DWH Integration', desc: 'Data Warehouse integration and table synchronization configuration', builder: buildDwhQuestions },
];

console.log('\nPhase 2: Design');
for (const s of designSections) {
  const questions = s.builder();
  writeSectionFile(s.file, { id: s.id, name: s.name, description: s.desc, phase: 'design', questions });
}

// ── Phase 3: Launch ──────────────────────────────────────
const launchSections = [
  { file: 'vertical-entities.ts', id: 'vertical-entities', name: 'Vertical Entities', desc: 'Industry-specific vertical entity configuration for hospitality', prefix: '21', visibleIf: { questionKey: 'program_industry', operator: 'eq', value: 'Hospitality' } },
  { file: 'aisense.ts', id: 'aisense', name: 'AiSense', desc: 'AiSense module configuration for intelligent sensing', prefix: '22', visibleIf: { questionKey: 'modules_purchased', operator: 'contains', value: 'AiSense' } },
  { file: 'airecommend.ts', id: 'airecommend', name: 'AiRecommend', desc: 'AiRecommend module configuration for personalized recommendations', prefix: '23', visibleIf: { questionKey: 'modules_purchased', operator: 'contains', value: 'AiRecommend' } },
  { file: 'airetain.ts', id: 'airetain', name: 'AiRetain', desc: 'AiRetain module configuration for member retention', prefix: '24', visibleIf: { questionKey: 'modules_purchased', operator: 'contains', value: 'AiRetain' } },
  { file: 'aitrust.ts', id: 'aitrust', name: 'AiTrust', desc: 'AiTrust module configuration for fraud detection and trust scoring', prefix: '25', visibleIf: { questionKey: 'modules_purchased', operator: 'contains', value: 'AiTrust' } },
  { file: 'airport-entity.ts', id: 'airport-entity', name: 'Airport Entity', desc: 'Airport entity configuration for airline loyalty programs', prefix: '26', visibleIf: { questionKey: 'program_industry', operator: 'eq', value: 'Airlines' } },
  { file: 'distance-table.ts', id: 'distance-table', name: 'Distance Table', desc: 'Route distance table configuration for airline mileage programs', prefix: '27', visibleIf: { questionKey: 'program_industry', operator: 'eq', value: 'Airlines' } },
  { file: 'cobranded-cards.ts', id: 'cobranded-cards', name: 'Co-branded Cards', desc: 'Co-branded credit/debit card program configuration', prefix: '28', visibleIf: { questionKey: 'has_cobranded_card', operator: 'eq', value: 'true' } },
  { file: 'subscription.ts', id: 'subscription', name: 'Subscription Module', desc: 'Paid membership and subscription tier configuration', prefix: '29', visibleIf: { questionKey: 'has_paid_membership', operator: 'eq', value: 'true' } },
  { file: 'retro-request.ts', id: 'retro-request', name: 'Retro Request Setup', desc: 'Retroactive points claim configuration for airline programs', prefix: '30', visibleIf: { questionKey: 'program_industry', operator: 'eq', value: 'Airlines' } },
  { file: 'airline-redemption.ts', id: 'airline-redemption', name: 'Airline Redemption Setup', desc: 'Airline-specific redemption rules and award ticket configuration', prefix: '31', visibleIf: { questionKey: 'program_industry', operator: 'eq', value: 'Airlines' } },
];

console.log('\nPhase 3: Launch');
for (const s of launchSections) {
  const questions = buildLaunchQuestions(s.prefix);
  writeSectionFile(s.file, { id: s.id, name: s.name, description: s.desc, phase: 'launch', visibleIf: s.visibleIf, questions });
}

// ── Data Model Attribute Files ──────────────────────────
console.log('\nData Models');
const dmSheets = [
  { sheet: '7.2 - Member Data Model', file: 'member-attributes.ts', entity: 'member' },
  { sheet: '8.2 - Sponsor Data Model', file: 'sponsor-attributes.ts', entity: 'sponsor' },
  { sheet: '8.4 - Sponsor Location Data Mod', file: 'location-attributes.ts', entity: 'location' },
  { sheet: '8.6 - Product Data Model', file: 'product-attributes.ts', entity: 'product' },
];

// BIT Data Model
dmSheets.push({ sheet: '10.2 - BIT Data Model', file: 'bit-attributes.ts', entity: 'bit' });

// Payment Data Model
const paySheet = Object.keys(data).find(k => k.startsWith('10.3'));
if (paySheet) dmSheets.push({ sheet: paySheet, file: 'payment-attributes.ts', entity: 'payment' });

// Offer Data Model
const offerSheet = Object.keys(data).find(k => k.startsWith('11.2'));
if (offerSheet) dmSheets.push({ sheet: offerSheet, file: 'offer-attributes.ts', entity: 'offer' });

for (const dm of dmSheets) {
  const attrs = buildDataModelAttributes(dm.sheet);
  writeDataModelFile(dm.file, attrs, dm.entity);
}

// ── Glossary ──────────────────────────────────────────────
console.log('\nGlossary');
const glossaryRows = data['Glossary'];
let glossaryCode = `import type { GlossaryEntry } from './types';\n\nexport const glossary: GlossaryEntry[] = [\n`;
if (glossaryRows) {
  for (let i = 1; i < glossaryRows.length; i++) {
    const row = glossaryRows[i];
    const term = row[1];
    const def = row[2];
    if (!term || typeof term !== 'string' || term.length < 2) continue;
    if (!def || String(def).length < 2) continue;
    glossaryCode += `  {\n`;
    glossaryCode += `    term: '${esc(term)}',\n`;
    glossaryCode += `    definition: '${esc(def)}',\n`;
    if (row[3] && String(row[3]).length > 2) {
      glossaryCode += `    example: '${esc(String(row[3]))}',\n`;
    }
    glossaryCode += `  },\n`;
  }
}
glossaryCode += `];\n`;
fs.writeFileSync(path.join(BASE, 'glossary.ts'), glossaryCode, 'utf8');
console.log(`  wrote glossary.ts`);

// ── Index ──────────────────────────────────────────────────
console.log('\nIndex');
const allSections = [...discoverySections, ...designSections, ...launchSections];
let indexCode = `export type { Section, Question, ConditionalRule, GlossaryEntry, DataModelAttribute } from './types';\nexport { glossary } from './glossary';\n\n`;

// Import all section files
for (const s of allSections) {
  const varName = toCamelId(s.id) + 'Section';
  indexCode += `import { ${varName} } from './sections/${s.file.replace('.ts', '')}';\n`;
}

indexCode += `\nimport type { Section } from './types';\n\n`;
indexCode += `export const allSections: Section[] = [\n`;
for (const s of allSections) {
  indexCode += `  ${toCamelId(s.id)}Section,\n`;
}
indexCode += `];\n\n`;

indexCode += `export const discoverySections: Section[] = allSections.filter(s => s.phase === 'discovery');\n`;
indexCode += `export const designSections: Section[] = allSections.filter(s => s.phase === 'design');\n`;
indexCode += `export const launchSections: Section[] = allSections.filter(s => s.phase === 'launch');\n\n`;

// Re-export all sections individually
for (const s of allSections) {
  const varName = toCamelId(s.id) + 'Section';
  indexCode += `export { ${varName} };\n`;
}

// Re-export data models
indexCode += `\n// Data Model Attributes\n`;
for (const dm of dmSheets) {
  const varName = dm.entity + 'Attributes';
  indexCode += `export { ${varName} } from './data-models/${dm.file.replace('.ts', '')}';\n`;
}

fs.writeFileSync(path.join(BASE, 'index.ts'), indexCode, 'utf8');
console.log(`  wrote index.ts`);

console.log('\n=== Generation Complete ===\n');
console.log('Available sheets:', Object.keys(data).join(', '));
