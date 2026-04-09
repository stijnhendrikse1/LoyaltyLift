# LoyaltyLift — Design System & Coding Standards

## Architecture
- Frontend: HubSpot CMS (custom modules, HubL templates, vanilla JS)
- Backend: Supabase (PostgreSQL + RLS + Edge Functions + Storage + Auth)
- Auth: Magic link (clients), Google OAuth (LJI staff - future)
- Supabase Project ID: anbavrtkyjloxtncnkzm
- Supabase URL: https://anbavrtkyjloxtncnkzm.supabase.co

## Git Workflow
Always commit and push changes immediately after completing work.

## Database Access
- Read queries: use Supabase client or MCP tools
- Write operations (CREATE, ALTER, INSERT, UPDATE, DELETE, migrations): use Supabase MCP apply_migration or execute_sql
- Never select("*") on tables with JSONB columns
- Batch inserts, never loop

## Design System

### Cards
bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6

### Page Layout
max-w-5xl mx-auto space-y-6 sm:space-y-8

### Headers
H1: text-2xl font-bold text-gray-900
H2: text-lg sm:text-xl font-bold text-gray-900 mb-4
H3: text-sm font-semibold text-gray-700
Subtitle: text-sm text-gray-500

### Buttons
Primary: px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors
Secondary: px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors

### Badges
inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium

### Input Fields
w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand outline-none

### Brand Colors
--brand: #E8422F (LJI red)
--brand-dark: #D13A28
--brand-light: #FEF2F1

## Coding Standards

### Text Input Pattern
Local state + blur save. Never call API on every onChange keystroke.

### Mutation Buttons
Every button that fires an API call must have loading state + disabled when loading.

### Error Handling
Never empty catch blocks. At minimum console.error("context:", err).

### Heavy Library Imports
Dynamic import on user action (XLSX, etc.)
