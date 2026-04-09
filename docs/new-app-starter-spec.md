# New Application Starter Spec

> This document provides everything a fresh Claude Code session needs to scaffold a new application using the same architecture, design system, and patterns as T2D3 OS. The session has no prior context — this document IS the context.

---

## Claude Code Settings

Create `.claude/settings.local.json` in the project root:

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Glob(*)",
      "Grep(*)"
    ]
  }
}
```

This allows all tool operations without prompting.

---

## How We Work Together

- **Always commit and push** after completing each task. Push to both your working branch AND `main`.
- **Pull before reading code** — if there's another coding session running in parallel, always `git pull` before any audit, review, or code modification to avoid working from stale state.
- **Don't add features beyond what's asked.** A bug fix doesn't need surrounding code cleaned up.
- **Keep components under 500 lines.** Split into sub-components in separate files.
- **Never use `select("*")`** on tables with JSONB columns. List only needed columns.
- **Use optimistic updates** for data mutations. Never refetch all data after a single mutation.
- **Every button that fires an API call** must have a loading state and `disabled={loading}`.
- **Never call API on every onChange keystroke.** Use local state + blur save pattern.
- **Heavy libraries** (XLSX, Tiptap, etc.) must be dynamically imported: `const XLSX = await import("xlsx")`.
- **Error handling:** Never use empty catch blocks. At minimum `console.error("context:", err)`.
- **No emojis** in code or UI unless the user explicitly requests it.
- **Database writes:** Use `psql "$DATABASE_URL"` via bash. Reads can use Supabase client.
- **Batch database operations.** Never insert/update in a loop. Collect items, one batch call.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x (strict mode) |
| Database | Supabase (PostgreSQL + Auth + RLS + Realtime + Storage) | Latest |
| Styling | Tailwind CSS | 4.x (inline @theme in globals.css) |
| Font | Manrope (Google Fonts) | 400-800 weights |
| i18n | next-intl | 4.x |
| Icons | lucide-react | Latest |
| AI | Anthropic Claude SDK | Latest |
| Payments | Stripe | Latest |
| Rich Text | Tiptap | 3.x (dynamic import only) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | Latest |
| Analytics | Vercel Analytics | Latest |
| Hosting | Vercel | Serverless |

---

## Project Setup

### 1. Create the Next.js App

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app
```

### 2. Install Core Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr next-intl lucide-react @anthropic-ai/sdk stripe @vercel/analytics
npm install @dnd-kit/core @dnd-kit/sortable
npm install -D @tailwindcss/postcss
```

### 3. Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### 4. TypeScript Config

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5. PostCSS Config

`postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### 6. Next.js Config

`next.config.ts`:
```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    optimizePackageImports: ["lucide-react"],
  },
};

export default withNextIntl(nextConfig);
```

---

## Directory Structure

```
src/
├── app/
│   ├── (app)/                 # Protected routes (requires auth)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   └── layout.tsx         # Sidebar layout wrapper
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   └── ...
│   ├── layout.tsx             # Root layout
│   ├── globals.css            # Tailwind + custom theme
│   └── middleware.ts          # Actually at src/middleware.ts
├── components/
│   ├── ui/                    # Base UI (sidebar, buttons, modals, etc.)
│   └── ...                    # Feature-specific components
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   ├── permissions.ts
│   └── ...
├── i18n/
│   └── request.ts
├── messages/
│   ├── en.json
│   ├── de.json
│   ├── es.json
│   ├── fr.json
│   ├── nl.json
│   └── pt.json
└── middleware.ts              # Supabase session + security headers
```

---

## Global Styles — `src/app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --brand: #E8422F;          /* Replace with your brand color */
  --brand-dark: #D13A28;
  --brand-light: #FEF2F1;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --brand-dark: #F05A48;
  --brand-light: #2D1512;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-brand: var(--brand);
  --color-brand-dark: var(--brand-dark);
  --color-brand-light: var(--brand-light);
  --font-sans: var(--font-manrope);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-manrope), sans-serif;
  font-weight: 500;
}

/* Dark mode CSS overrides for Tailwind utility classes */
.dark .bg-white { background-color: #1a1a2e; }
.dark .text-gray-900 { color: #f1f5f9; }
.dark .text-gray-700 { color: #cbd5e1; }
.dark .text-gray-500 { color: #94a3b8; }
.dark .text-gray-400 { color: #64748b; }
.dark .border-gray-200 { border-color: #334155; }
.dark .border-gray-100 { border-color: #1e293b; }
.dark .border-gray-300 { border-color: #475569; }
.dark .bg-gray-50 { background-color: #1e293b; }
.dark .bg-gray-100 { background-color: #1e293b; }
.dark input, .dark textarea, .dark select {
  background-color: #1e293b;
  color: #f1f5f9;
  border-color: #475569;
}
```

---

## Design System (CLAUDE.md)

Create `CLAUDE.md` in the project root — Claude Code reads this automatically:

```markdown
# [App Name] — Design System & Coding Standards

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

### Text Colors
Primary: text-gray-900
Secondary: text-gray-500
Muted: text-gray-400
Labels: text-xs font-medium text-gray-700

### Tabs (border-bottom style)
Container: flex gap-1 border-b border-gray-200
Active: border-b-2 border-brand text-brand
Inactive: border-transparent text-gray-500 hover:text-gray-700

### Buttons
Primary: px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors
Secondary: px-3 py-1.5 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors
Danger: px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors

### Badges
inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
Color pairs: bg-[color]-100 text-[color]-700

### Input Fields
w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand outline-none

### Loading State
<div className="flex items-center justify-center py-16">
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand" />
</div>

### Empty States
<div className="text-center py-16">
  <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 mb-1">Title</h3>
  <p className="text-sm text-gray-500 max-w-md mx-auto">Description</p>
</div>

### Dark Mode
The app supports light/dark toggle. Use direct Tailwind colors — dark mode handled via CSS overrides in globals.css. Add dark: variants for edge cases (colored backgrounds like bg-purple-50 dark:bg-purple-950).

## Coding Standards

### Auth
Use requireAuth() from @/lib/permissions. Never inline auth checks.

### Text Input Pattern
Local state + blur save. Never call API on every onChange keystroke.

### Every mutation button needs: loading state + disabled={loading}

### Components under 500 lines. Split if larger.

### Database
Reads: Supabase client. Writes: psql "$DATABASE_URL" via bash.
Never select("*") on JSONB tables. Batch inserts, never loop.

### Heavy imports: dynamic import only (xlsx, tiptap, etc.)

### Error handling: No empty catch blocks. Always console.error at minimum.
```

---

## Core Files to Create

### `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component — ignore */ }
        },
      },
    }
  );
}
```

### `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `src/middleware.ts`

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Security headers
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // No-cache on API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    supabaseResponse.headers.set("Cache-Control", "no-store, private");
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

### `src/lib/permissions.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  profile: { is_superadmin: boolean; is_admin: boolean; admin_permissions: Record<string, Record<string, boolean>> | null };
}

export async function requireAuth(): Promise<AuthContext | Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, is_admin, admin_permissions")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    profile: {
      is_superadmin: !!profile?.is_superadmin,
      is_admin: !!profile?.is_admin,
      admin_permissions: profile?.admin_permissions as Record<string, Record<string, boolean>> | null ?? null,
    },
  };
}

export async function requireAdmin(): Promise<AuthContext | Response> {
  const ctx = await requireAuth();
  if (ctx instanceof Response) return ctx;
  if (!ctx.profile.is_superadmin && !ctx.profile.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return ctx;
}

export async function requireSuperadmin(): Promise<AuthContext | Response> {
  const ctx = await requireAuth();
  if (ctx instanceof Response) return ctx;
  if (!ctx.profile.is_superadmin) {
    return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  }
  return ctx;
}
```

### `src/i18n/request.ts`

```typescript
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### `src/messages/en.json`

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "loading": "Loading...",
    "saving": "Saving...",
    "search": "Search...",
    "signOut": "Sign out",
    "back": "Back",
    "next": "Next",
    "submit": "Submit",
    "close": "Close",
    "confirm": "Confirm",
    "download": "Download",
    "upload": "Upload",
    "export": "Export",
    "import": "Import"
  },
  "auth": {
    "signIn": "Sign in",
    "signInWithGoogle": "Sign in with Google",
    "magicLinkSent": "Check your email for a sign-in link",
    "enterEmail": "Enter your email",
    "noAccount": "Don't have an account?",
    "signUp": "Sign up"
  },
  "nav": {
    "dashboard": "Dashboard",
    "settings": "Settings",
    "admin": "Admin"
  }
}
```

Create identical starter files for `de.json`, `es.json`, `fr.json`, `nl.json`, `pt.json` — translate the values.

### `src/app/(auth)/login/page.tsx`

```typescript
"use client";

import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}

function LoginInner() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function handleMagicLink() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {t("signIn")}
        </h1>

        <button
          onClick={handleGoogle}
          className="w-full px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mb-4"
        >
          {t("signInWithGoogle")}
        </button>

        <div className="text-center text-xs text-gray-400 my-4">or</div>

        {sent ? (
          <p className="text-sm text-green-700 text-center">{t("magicLinkSent")}</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleMagicLink(); }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("enterEmail")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand outline-none mb-3"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {loading ? t("loading") : t("signIn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

### `src/app/api/auth/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Ensure profile exists (trigger may not have fired yet)
        const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await serviceClient.from("profiles").upsert({
          id: user.id,
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        });
        return NextResponse.redirect(`${origin}/dashboard`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### `src/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "My App",
  description: "My application description",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${manrope.variable} antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
```

### `src/app/(app)/layout.tsx` — Sidebar Layout

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

---

## Initial Database Schema

Run via `psql "$DATABASE_URL"`:

```sql
-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  admin_permissions JSONB,
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_members_read ON public.organization_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  ));

-- Helper function: get user's org IDs
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;
```

---

## Supabase Configuration

In the Supabase dashboard:
1. **Authentication → Providers:** Enable Google OAuth (add client ID + secret)
2. **Authentication → URL Configuration:** Set Site URL to your deployment URL, add localhost:3000 to redirect URLs
3. **Authentication → Email Templates:** Customize magic link email
4. **Database → Extensions:** Enable `pgcrypto` (for gen_random_uuid)

---

---

## Claude Code Skills

Skills are markdown files in `.claude/skills/` that Claude Code activates automatically based on what you're working on. They provide context-specific rules without cluttering the main CLAUDE.md.

Create these 4 starter skills:

### `.claude/skills/api.md`

```markdown
---
name: api
description: API route patterns, permission checks, error handling. Activate when working on any file in src/app/api/.
---

# API Route Standards

## Permission Functions (from @/lib/permissions)

| Function | Who Passes | Use When |
|---|---|---|
| requireAuth() | Any authenticated user | Public-facing data |
| requireAdmin() | is_admin or is_superadmin | Admin panel endpoints |
| requireSuperadmin() | is_superadmin only | Destructive admin ops |
| requireOrgRole(orgId, ["owner"]) | Org members with role | Org-scoped operations |

### Pattern
\`\`\`typescript
export async function GET(request: Request) {
  const ctx = await requireAuth();
  if (ctx instanceof Response) return ctx;
  const { supabase, user, profile } = ctx as AuthContext;
  // ... handler logic
}
\`\`\`

## Response Shapes
- GET list: { items: [...] } (named wrapper)
- GET single: { item: {...} }
- POST create: { item: {...} } with status 201
- Error: { error: "message" } with appropriate status code

## Error Handling
- 400: Invalid client input (missing fields, bad format)
- 401: Not authenticated
- 403: Authenticated but not authorized
- 404: Resource not found
- 429: Rate limited
- 500: Server error (database failure, external service down)

## Input Validation
Every POST/PATCH must validate required fields at the top:
\`\`\`typescript
const { title, description } = await request.json();
if (!title?.trim()) {
  return NextResponse.json({ error: "title required" }, { status: 400 });
}
\`\`\`
```

### `.claude/skills/frontend.md`

```markdown
---
name: frontend
description: Design system, component patterns, frontend coding standards. Activate when working on React components, pages, or UI elements.
---

# Frontend Standards

## Component Architecture
- Keep under 500 lines. Split into sub-components in separate files.
- Main shell: state + data fetching + layout (~200 lines)
- Sub-components: focused rendering (~100-200 lines each)

## State Management
- Use local state + blur save for text inputs (never API on every keystroke)
- Every mutation button: loading state + disabled={loading}
- Optimistic updates: update local state immediately, API in background
- Use AbortController in useEffect fetch calls

## List Rendering
- Wrap handlers in useCallback when passed to mapped items
- Use useMemo for filtered/sorted/grouped arrays

## Heavy Imports
Never statically import heavy libraries in "use client" components:
- Tiptap: use dynamic(() => import("..."), { ssr: false })
- XLSX: use const XLSX = await import("xlsx") inside handler
- Any library over 50KB: dynamic import on user action

## Loading States
Every route should have loading.tsx with skeleton placeholders.
Never show blank white page with centered spinner.
```

### `.claude/skills/database.md`

```markdown
---
name: database
description: Database conventions, RLS patterns, migration rules. Activate when working on migrations, RLS policies, or database queries.
---

# Database Standards

## Migration Rules
- One migration per feature: YYYYMMDD_descriptive_name.sql
- All DDL must be idempotent: IF NOT EXISTS, OR REPLACE
- Always add updated_at triggers
- FK: ON DELETE CASCADE for children, SET NULL for optional refs

## RLS Patterns
Every table must have RLS enabled.

Project-scoped:
\`\`\`sql
CREATE POLICY select ON public.{table} FOR SELECT
  USING (project_id IN (SELECT public.user_project_ids()));
\`\`\`

User-scoped:
\`\`\`sql
CREATE POLICY own ON public.{table} FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
\`\`\`

Admin read:
\`\`\`sql
CREATE POLICY admin ON public.{table} FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_superadmin OR is_admin)));
\`\`\`

## Query Rules
- Never select("*") on tables with JSONB columns
- Batch inserts: never insert in a loop
- Parallelize independent queries with Promise.all()
- Use .maybeSingle() instead of .single() when row may not exist
```

### `.claude/skills/security.md`

```markdown
---
name: security
description: Security standards, CSP rules, input sanitization, access control. Activate when working on auth, user input, email, webhooks, or security-sensitive code.
---

# Security Standards

## Server-Side Feature Gates (MANDATORY)
Every API route for a paid feature must check permissions server-side.
UI-only gates are insufficient — users can call APIs directly.

## CSP Headers
Set in middleware.ts. When adding external domains, update CSP.
Never remove existing CSP directives.

## No Raw innerHTML
Never use document.write() or innerHTML without sanitization.

## Email Content
Never interpolate user content directly into email HTML.
Always escape: \`\`\`typescript
const safe = str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
\`\`\`

## Input Sanitization
User text going into AI prompts: use sanitizeForPrompt() (strips injection markers, truncates).
User text going into HTML: use sanitize() from sanitize-html.

## URL Validation (SSRF Prevention)
Before server-side fetch to user-provided URLs:
- Parse with new URL()
- Block private IPs (10.x, 172.16-31.x, 192.168.x, 127.x)
- Block non-http(s) protocols
- Set timeout (10s max)
```

---

## CLAUDE.md Template

The `CLAUDE.md` in the project root is Claude Code's primary instruction file. It's read automatically on every conversation. Copy the design system section from the spec above into it, plus add:

```markdown
# [Your App Name] — Design System & Coding Standards

## Git Workflow
Always commit and push changes immediately after completing work.
Push to both your working branch AND main.

## Database Access
- Read queries: use the Supabase client
- Write operations (CREATE, ALTER, INSERT, UPDATE, DELETE, migrations): use psql via bash
- Example: psql "$DATABASE_URL" -c "YOUR SQL HERE"

[... paste the full design system from the Design System section above ...]

## Coding Standards

### AI Models
Import from @/lib/ai-models:
import { AI_MODEL_PRIMARY, AI_MODEL_FAST } from "@/lib/ai-models";
Never hardcode model strings.

### Text Input Pattern
Local state + blur save. Never call API on every onChange keystroke.

### Mutation Buttons
Every button that fires an API call must have loading state + disabled={loading}.

### Component Size
Keep under 500 lines. Split into sub-components.

### Error Handling
Never empty catch blocks. At minimum console.error("context:", err).

### Heavy Library Imports
Never statically import heavy libraries in "use client" components.
Use dynamic import on user action.

### Loading States
Every route directory should have loading.tsx with skeleton layout.

### Auth
Use requireAuth() or requireProjectRole() from @/lib/permissions.
Never inline auth checks.
```

---

## What This Spec Does NOT Include

This is a starter. You'll need to build:
- The sidebar component (`src/components/ui/sidebar.tsx`)
- Protected pages and their layouts
- API routes for your domain
- Additional database tables for your features
- Stripe integration for payments
- Help/documentation pages
- Admin panel

The patterns above ensure your new app starts with the same quality foundation: proper auth, security headers, i18n, dark mode, design system, and coding conventions.

---

## First Steps After Setup

1. Create the project: `npx create-next-app@latest`
2. Install dependencies
3. Create all files listed above
4. Set up Supabase project and run the SQL schema
5. Configure Google OAuth in Supabase
6. Add env vars to `.env.local`
7. Run `npm run dev` — login page should work
8. Create your first protected page at `src/app/(app)/dashboard/page.tsx`
9. Build from there

The design system in CLAUDE.md will guide Claude Code to produce consistent UI across all features.
