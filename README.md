# FlowNex AI — WhatsApp & Instagram Automation SaaS

AI-powered messaging automation for Indian small businesses. Auto-reply to WhatsApp & Instagram DMs, capture leads, book appointments, and follow up automatically.

## Features

- **AI Auto-Reply** — GPT-4o-mini powered responses in Hindi, English, and Hinglish
- **Multi-Channel** — WhatsApp + Instagram DMs in one unified inbox
- **Lead Capture** — Every contact saved automatically with qualification scoring
- **Appointment Booking** — AI books appointments directly from conversations
- **Follow-Up Automation** — Automated sequences for inactive leads
- **Language Detection** — Automatically mirrors customer's language and tone
- **Analytics Dashboard** — Track messages, leads, conversions, response times
- **Razorpay Billing** — Monthly/yearly subscriptions with Indian payment methods

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes (serverless)
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** OpenAI GPT-4o-mini with function calling
- **Payments:** Razorpay
- **Automations:** n8n workflows
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase account
- OpenAI API key (for AI features)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/FlowNex-ai.git
cd FlowNex-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual values

# Run database migrations
# (Apply SQL files from supabase/migrations/ in your Supabase dashboard)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler check |
| `npm run test:build` | Full CI check (typecheck + lint + build) |
| `npm run test:e2e` | Run E2E tests (requires dev server) |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Callback
│   ├── (dashboard)/     # All dashboard pages
│   └── api/             # API routes (webhooks, payments, etc.)
├── components/
│   ├── ui/              # Reusable UI primitives
│   ├── layout/          # Sidebar, Topbar, Navigation
│   └── dashboard/       # Page-specific components
└── lib/
    ├── ai/              # AI engine (sales assistant, language detection)
    ├── auth/            # Auth actions (login, register, logout)
    ├── automations/     # n8n event emitter + scheduler
    ├── instagram/       # Instagram DM client + handler
    ├── payments/        # Razorpay + subscription guard
    ├── queue/           # Message queue (retry logic)
    ├── security/        # Rate limiter, logger, headers
    ├── supabase/        # Supabase clients (browser, server, admin)
    └── whatsapp/        # WhatsApp Cloud API client + handler
```

## Environment Variables

See [`.env.local.example`](.env.local.example) for all required variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase secret key (server only) |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Webhook verification token |
| `WHATSAPP_APP_SECRET` | For production | Meta app secret for signature validation |
| `OPENAI_API_KEY` | For AI features | OpenAI API key |
| `RAZORPAY_KEY_ID` | For payments | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Razorpay webhook secret |
| `CRON_SECRET` | Yes | Protects cron endpoints |

## Database

Migrations are in `supabase/migrations/`. Apply them in order:

1. `001_initial_schema.sql` — Core tables (businesses, leads, conversations, messages, etc.)
2. `002_billing_enhancements.sql` — Billing tables (invoices, plans)
3. `003_instagram_support.sql` — Instagram channel support

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set all environment variables in Vercel Dashboard → Settings → Environment Variables.

See [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) for the full deployment guide.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/MVP_DEFINITION.md`](docs/MVP_DEFINITION.md) | Product strategy & pricing |
| [`docs/AUTH_IMPLEMENTATION.md`](docs/AUTH_IMPLEMENTATION.md) | Authentication architecture |
| [`docs/WHATSAPP_INTEGRATION.md`](docs/WHATSAPP_INTEGRATION.md) | WhatsApp Cloud API integration |
| [`docs/AI_SALES_ASSISTANT.md`](docs/AI_SALES_ASSISTANT.md) | AI engine documentation |
| [`docs/AUTOMATION_WORKFLOWS.md`](docs/AUTOMATION_WORKFLOWS.md) | n8n workflow guide |
| [`docs/BILLING_INTEGRATION.md`](docs/BILLING_INTEGRATION.md) | Razorpay payment integration |
| [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) | Deployment & scaling guide |
| [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) | E2E testing guide |
| [`docs/QA_AUDIT_REPORT.md`](docs/QA_AUDIT_REPORT.md) | Quality audit results |

## License

Private — All rights reserved.
