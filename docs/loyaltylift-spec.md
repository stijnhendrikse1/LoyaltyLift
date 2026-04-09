# LoyaltyLift — Functional Spec for Claude Code

> **Context:** This app replaces a 35+ tab Excel questionnaire used to onboard new clients onto LJI's GRAVTY loyalty platform. The existing spreadsheet collects program configuration, data models, sponsor details, member enrollment rules, tier structures, offers, integrations, and more. It has PII exposure, broken links, inconsistent validations, and overwhelms clients. This app fixes all of that.

---

## Architecture Decision: HubSpot CMS Frontend + Supabase Backend

The Claude Code session already knows how to build on HubSpot CMS. Use HubSpot CMS for the client-facing frontend (hosted pages, forms, styling). Use Supabase for the backend (database, auth, API, file storage, RLS). Connect them via API routes.

**Why HubSpot CMS:**
- LJI's marketing team already manages HubSpot
- Client-facing pages get LJI branding automatically
- No separate hosting/deployment to manage
- HubSpot handles email notifications, CRM integration natively

**Why Supabase backend:**
- Structured relational data with RLS for multi-tenant client isolation
- PII encryption at rest (solves the #1 critical issue from Sameer's review)
- Auth for both LJI internal users and client users
- Real-time subscriptions for progress tracking
- File storage for logos, documents, sample files

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HubSpot CMS (custom modules, HubL templates, JS) |
| Backend API | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth (magic link for clients, Google OAuth for LJI staff) |
| File Storage | Supabase Storage (logos, sample files, batch templates) |
| Notifications | HubSpot workflows (email alerts on section completion, assignment) |
| PII Handling | Column-level encryption via pgcrypto + RLS policies |

---

## Core Concepts

### 1. Project
A single client onboarding engagement. One project per client program (e.g., "Emirates Skywards Everyday"). Each project has:
- A client organization
- Assigned LJI team members
- A questionnaire instance with progress tracking
- A phase (Discovery → Solution Design → Launch Readiness)

### 2. Questionnaire Instance
A copy of the master questionnaire template, bound to a project. Contains sections, each with questions. Sections map 1:1 to the original spreadsheet tabs but are grouped into logical phases.

### 3. Section
A logical grouping of questions (replaces a spreadsheet tab). Each section has:
- A phase assignment (Discovery / Design / Launch)
- A status (Not Started / In Progress / In Review / Approved)
- An owner (client contact or LJI team member)
- Conditional visibility (some sections only appear based on prior answers — e.g., airline-specific sections only show if industry = Airlines)

### 4. Question
An individual input field with:
- Question text (replaces the "Questions" column)
- Help text / context (replaces the scattered "For better understanding" links)
- Input type (text, number, date, dropdown, multi-select, boolean, file upload, table/grid)
- Validation rules (required, format, min/max, conditional requirement)
- Example/sample value (shown as placeholder, not pre-filled)
- Industry relevance filter
- GRAVTY glossary term link (inline tooltip, not separate tab)

### 5. Data Model Grid
A special question type for the data model tabs (Member, Sponsor, Location, Product, BIT, Payment, Offer). Renders as an interactive table where clients:
- See all standard attributes with descriptions
- Toggle "Required" (Yes/No) per attribute
- Add custom attributes with name, type, description, length, etc.
- PII-flagged fields are visually marked and stored encrypted

---

## Section Structure (from spreadsheet tabs)

Map the 35+ tabs into these grouped sections. Phase determines when the section becomes active/visible to the client.

### Phase 1: Discovery

| Section ID | Section Name | Source Tab(s) | Conditional |
|-----------|-------------|--------------|-------------|
| `tenancy` | Tenancy Setup | 1.1, 1.2 | — |
| `program` | Program Details | 2 | — |
| `loyalty_accounts` | Loyalty Accounts & Currency | 3 | — |
| `policies` | Policies & Currency Conversion | 4 | — |
| `sponsor_mgmt` | Sponsor Management | 8.1 | — |
| `member_enrollment` | Member Enrollment & Opt-Out | 7.1 | — |
| `data_model_questions` | Data Model Scoping Questions | 6 | — |
| `tier_mgmt` | Tier Management | 9 | If program has tiers (from program details) |
| `accrual_redemption` | Earning & Redemption Rules | 10.1 | — |
| `offers_overview` | Offers Overview | 11.1 | — |
| `data_migration` | Data Migration | 18 | — |
| `marketing_connect` | Marketing & Communications | 17.1 | — |

### Phase 2: Solution Design

| Section ID | Section Name | Source Tab(s) | Conditional |
|-----------|-------------|--------------|-------------|
| `member_data_model` | Member Data Model | 7.2 | — |
| `sponsor_data_model` | Sponsor Data Model | 8.2 | — |
| `sponsor_details` | Sponsor Details | 8.3 | — |
| `location_data_model` | Sponsor Location Data Model | 8.4 | — |
| `location_details` | Sponsor Location Details | 8.5 | — |
| `product_data_model` | Product Data Model | 8.6 | — |
| `product_details` | Sponsor Reward Products | 8.7 | — |
| `bit_data_model` | Transaction (BIT) Data Model | 10.2 | — |
| `payment_data_model` | Payment Data Model | 10.3 | — |
| `offer_data_model` | Offer Data Model | 11.2 | — |
| `offer_kpi` | Offer KPI Setup | 5 | — |
| `custom_attributes` | Custom Attributes | 12 | — |
| `batches` | Batch Processing Setup | 13 | — |
| `role_mgmt` | Role & Permission Management | 14 | — |
| `user_mgmt` | User Management & Details | 15.1, 15.2 | — |
| `member_services` | Member Services Configuration | 16, 16.1–16.20 | Per-service conditional |
| `marketing_use_cases` | Marketing Communication Use Cases | 17.2 | — |
| `finance` | Finance Connect | 20 | — |
| `dwh` | DWH Integration | 19.1, 19.2 | — |

### Phase 3: Launch Readiness (conditional/industry-specific)

| Section ID | Section Name | Source Tab(s) | Conditional |
|-----------|-------------|--------------|-------------|
| `vertical_entities` | Vertical Entities | 21 | Hospitality industry |
| `aisense` | AiSense Alert Configuration | 22 | If AiSense module purchased |
| `airecommend` | AiRecommend Setup | 23 | If AiRecommend module purchased |
| `airetain` | AiRetain Setup | 24 | If AiRetain module purchased |
| `aitrust` | AiTrust Setup | 25 | If AiTrust module purchased |
| `airport_entity` | Airport Entity | 26 | Airlines industry |
| `distance_table` | Distance Table | 27 | Airlines industry |
| `cobranded_cards` | Co-branded Cards | 28 | If co-brand program exists |
| `subscription` | Subscription Module | 29 | If paid membership program |
| `retro_request` | Retro Request Setup | 30 | Airlines industry |
| `airline_redemption` | Airline Redemption Setup | 31 | Airlines industry |

---

## Database Schema

### Core Tables

```sql
-- Organizations (LJI clients)
CREATE TABLE public.client_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT, -- Retail, Airlines, Hospitality, Financial Services, Telco, Real Estate
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects (one per client engagement)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'discovery' CHECK (phase IN ('discovery', 'design', 'launch')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  lji_lead_id UUID REFERENCES auth.users(id), -- LJI project lead
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project members (both LJI staff and client contacts)
CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('lji_admin', 'lji_member', 'client_admin', 'client_member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Section instances (per project)
CREATE TABLE public.project_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- matches Section ID from structure above
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'in_review', 'approved', 'skipped')),
  owner_id UUID REFERENCES auth.users(id),
  visible BOOLEAN NOT NULL DEFAULT true, -- controlled by conditional logic
  phase TEXT NOT NULL CHECK (phase IN ('discovery', 'design', 'launch')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id)
);

-- Responses (answers to questions)
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_key TEXT NOT NULL, -- stable identifier for each question
  value JSONB NOT NULL, -- flexible: string, number, array, object for grid data
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id, question_key)
);

-- PII responses (separate table, column-level encryption)
CREATE TABLE public.responses_pii (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  value_encrypted BYTEA NOT NULL, -- pgcrypto encrypted
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id, question_key)
);

-- Data model attribute selections (for the grid-type sections)
CREATE TABLE public.data_model_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- e.g., 'member_data_model', 'sponsor_data_model'
  attribute_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false, -- client-added attribute
  config JSONB, -- overrides: data type, length, lookup values, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, section_id, attribute_name)
);

-- Entity detail rows (for sponsor details, location details, product details, user details templates)
CREATE TABLE public.entity_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL, -- e.g., 'sponsor_details', 'location_details'
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL, -- the row's column values
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- File uploads (logos, sample files, batch templates)
CREATE TABLE public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments / notes on sections or questions
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_key TEXT, -- null = section-level comment
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES public.comments(id), -- for threaded replies
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'response_updated', 'section_submitted', 'comment_added', etc.
  metadata JSONB, -- section_id, question_key, old_value, new_value
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

All tables scoped to project membership:

```sql
-- Users can only access projects they belong to
CREATE POLICY project_access ON public.projects FOR SELECT
  USING (id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()));

-- Responses scoped to project membership
CREATE POLICY response_access ON public.responses FOR ALL
  USING (project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()));

-- PII responses: only LJI admins and client admins can read
CREATE POLICY pii_access ON public.responses_pii FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members
    WHERE user_id = auth.uid() AND role IN ('lji_admin', 'client_admin')
  ));

-- Client members can write but not read PII (write-only for data entry)
CREATE POLICY pii_write ON public.responses_pii FOR INSERT
  WITH CHECK (project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  ));
```

---

## Question Template Schema

Questions are defined as a JSON config (not in the database — they're the "form schema"). Store in a `questionnaire-templates/` directory as TypeScript/JSON files.

```typescript
interface Question {
  key: string;                    // stable identifier, e.g., "program_name"
  label: string;                  // question text
  helpText?: string;              // context, replaces "For better understanding" links
  inputType: 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'boolean' | 'file' | 'textarea' | 'grid' | 'currency';
  options?: { value: string; label: string }[];  // for select/multi_select
  placeholder?: string;           // example value
  required: boolean;
  requiredIf?: ConditionalRule;   // conditional requirement
  visibleIf?: ConditionalRule;    // conditional visibility
  pii: boolean;                   // if true, stored in responses_pii
  industryRelevance?: string[];   // filter: ['All'] or ['Airlines', 'Hospitality']
  glossaryTerm?: string;          // links to inline glossary tooltip
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    patternMessage?: string;
  };
}

interface ConditionalRule {
  questionKey: string;       // reference another question's key
  operator: 'eq' | 'neq' | 'in' | 'contains';
  value: string | string[];
}

interface Section {
  id: string;
  name: string;
  description: string;
  phase: 'discovery' | 'design' | 'launch';
  visibleIf?: ConditionalRule;
  questions: Question[];
}
```

---

## UI / Pages

### 1. Project Dashboard (LJI internal)
- List of all active projects with progress bars
- Quick stats: sections completed / total, last activity, assigned team
- Filterable by phase, status, client

### 2. Project Detail (LJI internal)
- All sections listed by phase, with status badges
- Click section to view/edit responses
- Comment thread per section
- Activity timeline
- "Advance Phase" button to unlock next phase's sections

### 3. Client Portal (client-facing)
- Welcome page with "Read Me First" content (from the existing "Read me" tab)
- Workshop plan / timeline view (from Workshop Plan Template tab)
- Only shows sections assigned to the current phase
- Section list with progress indicators
- Guided, one-section-at-a-time flow (optional: can also see all visible sections)

### 4. Section Form (shared between LJI and client views)
- Renders questions from the template
- Input controls matched to question type:
  - `select` → dropdown with search
  - `multi_select` → checkbox group or tag input
  - `boolean` → Yes/No toggle (not free text — fixes the "Y" vs "Yes" inconsistency)
  - `date` → date picker (fixes format inconsistency)
  - `file` → drag-and-drop upload to Supabase Storage
  - `grid` → interactive table (for data model sections)
  - `currency` → number input with currency selector
- Conditional visibility: questions appear/disappear based on prior answers in real time
- Auto-save on blur (not on every keystroke)
- "Submit for Review" button changes section status to `in_review`
- Inline glossary tooltips on GRAVTY-specific terms

### 5. Data Model Grid View (special UI for sections like Member Data Model)
- Table showing all standard GRAVTY attributes with columns:
  - Business Name, Attribute Name, Description, Data Type, Sample Value, PII flag
- Toggle column: "Required for your program?" (Yes/No)
- "Add Custom Attribute" row at bottom
- Expandable row detail for editing lookup values, length, etc.
- Filter by: Group (Contact Info, Personal Info, etc.), Required only, PII only

### 6. Entity Detail Template (for Sponsor Details, Location Details, Product Details, User Details)
- Spreadsheet-like grid for entering multiple rows of entity data
- Column headers with descriptions (from the "Attribute Description" row in current spreadsheet)
- Validation per column (data type, character limit, mandatory)
- Add/remove rows
- CSV import option (for clients with existing data)
- CSV export (for LJI to pull into GRAVTY config)

### 7. Glossary (accessible from any page)
- Searchable glossary panel (slide-out sidebar, not separate page)
- Auto-linked from question labels when glossary terms appear
- Content from the existing Glossary tab (terms, definitions, examples)

---

## Key Behaviors

### Auto-save
- All inputs auto-save on blur via API call to Supabase
- Debounced — no API call per keystroke
- Visual indicator: "Saved" / "Saving..." in corner
- Optimistic UI update

### Conditional Logic
- Sections: visibility controlled by answers in prior sections
  - Example: `tier_mgmt` visible only if `program.has_tiers == true`
  - Example: `airport_entity` visible only if `program.industry == 'Airlines'`
- Questions: visibility/requirement controlled by other answers in same section
  - Example: "Specify decimal precision" required only if "rewards in decimals" = Yes
  - Example: "Paid tier fee" visible only if tier type includes "Paid"

### Validation
- Client-side: immediate feedback on blur
- Server-side: validated again on "Submit for Review"
- Types:
  - Required fields cannot be empty
  - Email format validation
  - URL format validation (fixes the broken link problem)
  - Date format enforced by date picker (eliminates DD/MM vs MM/DD confusion)
  - Number fields reject text
  - Character length limits per the data model specs
  - Dropdown-only fields prevent free-text entry (fixes the "General cell" problem from Sameer's review)

### Progress Tracking
- Per-section: % of required questions answered
- Per-phase: sections completed / total
- Overall project: phases completed
- Dashboard shows this for LJI; client portal shows their own progress

### Comments & Collaboration
- Threaded comments per section and per question
- @mention LJI team or client contacts
- Email notification via HubSpot workflow on new comment

### Export
- "Export to Excel" button per section (for backward compatibility with existing GRAVTY config import workflows)
- Full project export as structured JSON
- PDF summary report of all responses

---

## Member Services Sub-sections

The Member Services area (tab 16 in the spreadsheet) has 20 sub-service configs (16.1–16.20). Model these as child sections under `member_services`:

Each sub-service has the same pattern:
1. Service Identity (visible name, description)
2. Attribute Config (which fields to use, permitted values, mandatory flags)
3. Service Policies / Rules (business logic)

Render as an accordion or tabbed sub-navigation within the Member Services section. Each sub-service's visibility is conditional on the parent toggle in section 16 ("Enable" column).

Sub-services:
`points_adjustment`, `bit_creation`, `bit_cancellation`, `profile_update`, `tier_change`, `member_merge`, `membership_stage_change`, `member_deletion`, `membership_cancellation`, `award_redemption`, `privilege_issuance`, `privilege_extension`, `privilege_consumption`, `reinstate_privilege`, `privilege_cancellation`, `privilege_choice_swap`, `privilege_transfer`, `points_transfer`, `offer_acceptance`, `points_expiry_extension`

---

## API Endpoints (Supabase Edge Functions)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/projects` | List projects for current user |
| GET | `/projects/:id` | Project detail with section statuses |
| GET | `/projects/:id/sections/:sectionId` | Section with all responses |
| PUT | `/projects/:id/responses` | Upsert a response (auto-save) |
| PUT | `/projects/:id/responses/pii` | Upsert PII response (encrypted) |
| POST | `/projects/:id/sections/:sectionId/submit` | Submit section for review |
| POST | `/projects/:id/sections/:sectionId/approve` | Approve section (LJI only) |
| GET | `/projects/:id/comments` | List comments |
| POST | `/projects/:id/comments` | Add comment |
| POST | `/projects/:id/entity-rows` | Add entity detail row |
| PUT | `/projects/:id/entity-rows/:rowId` | Update entity detail row |
| DELETE | `/projects/:id/entity-rows/:rowId` | Delete entity detail row |
| POST | `/projects/:id/files` | Upload file |
| GET | `/projects/:id/export/:format` | Export (xlsx, json, pdf) |
| POST | `/projects` | Create new project (LJI admin only) |
| POST | `/projects/:id/invite` | Invite client user via magic link |
| PUT | `/projects/:id/phase` | Advance project phase |

---

## Seeding: Questionnaire Template Data

The build must include a seed script that converts all question content from the existing spreadsheet into the template JSON format. This is a one-time data extraction, not a runtime dependency on the spreadsheet.

For each section, extract:
- Question text (column B typically)
- Input hints / sample values (column C)
- Mandatory flag (column D)
- Industry relevance (column E where present)
- For data model sections: full attribute table with all metadata columns

Store as TypeScript files in `src/templates/sections/`:
```
src/templates/
  sections/
    tenancy.ts
    program.ts
    loyalty-accounts.ts
    ...
  glossary.ts
  data-models/
    member-attributes.ts
    sponsor-attributes.ts
    ...
```

---

## Implementation Priority

### Sprint 1: Foundation
- Supabase schema + RLS
- Auth (magic link for clients, Google for LJI)
- Project CRUD
- Section status management
- HubSpot CMS page templates (project dashboard, section form)

### Sprint 2: Core Form Engine
- Question renderer (all input types)
- Auto-save
- Conditional visibility
- Validation (client + server)
- Glossary panel

### Sprint 3: Data Models & Grids
- Data model grid component
- Entity detail template (spreadsheet-like grid)
- CSV import/export
- File upload

### Sprint 4: Collaboration & Polish
- Comments / threading
- Activity log
- Progress tracking
- Email notifications via HubSpot
- Member services accordion with conditional sub-sections

### Sprint 5: Export & Launch
- Excel export per section
- Full project JSON export
- PDF summary
- "Read Me" welcome flow
- Workshop plan / timeline view

---

## What This Spec Does NOT Cover

- GRAVTY API integration (pushing approved responses directly into GRAVTY config) — future phase
- Client self-service project creation (LJI creates projects for now)
- Multi-language support for the questionnaire itself (English only for v1)
- Offline/disconnected mode
- Version history / diff on individual responses (activity log covers audit trail)
- Stripe/payments (not applicable)

---

## Files to Reference

The Claude Code session should have access to:
1. `Client_Discovery_Questionnaire_Updated.xlsx` — the source spreadsheet with all content to extract
2. `Review_Summary__Questionnaire_Improvement_Areas.pdf` — Sameer's review (requirements context)
3. This spec

The session already knows how to work with HubSpot CMS. Use the existing patterns from that session for page templates, modules, and JS.
