# Production Deployment Guide

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                                    │
│                    (DNS + CDN + DDoS Protection)                      │
│                                                                      │
│  app.bizbot.ai → Vercel                                              │
│  api.bizbot.ai → Vercel (same project)                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL                                        │
│                    (App + API + Cron)                                 │
│                                                                      │
│  Region: Mumbai (bom1) — closest to Indian users                     │
│  Framework: Next.js 16                                               │
│  Functions: Serverless (auto-scaling)                                 │
│  Cron: /api/cron/* (every 15 min)                                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────┐
│    SUPABASE      │ │  OPENAI  │ │   RAZORPAY   │
│  (Mumbai/AP)     │ │   API    │ │   (India)    │
│                  │ │          │ │              │
│  - PostgreSQL    │ │  GPT-4o  │ │  Payments    │
│  - Auth          │ │  -mini   │ │  Webhooks    │
│  - Realtime      │ │          │ │              │
│  - Storage       │ │          │ │              │
└──────────────────┘ └──────────┘ └──────────────┘
```

---

## Step-by-Step Deployment

### Phase 1: Supabase Production Setup

#### 1.1 Create Production Project
```
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: bizbot-production
4. Region: South Asia (Mumbai) — ap-south-1
5. Generate a strong database password (save it securely)
6. Wait for project to provision (~2 minutes)
```

#### 1.2 Run Database Migrations
```bash
# Option A: Via Supabase CLI
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# Option B: Via SQL Editor in Dashboard
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste into SQL Editor → Run
# Then run 002_billing_enhancements.sql
```

#### 1.3 Configure Auth
```
1. Dashboard → Authentication → Providers
2. Enable Email (disable "Confirm email" for faster onboarding, or keep for security)
3. Enable Google:
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)
4. URL Configuration:
   - Site URL: https://app.bizbot.ai
   - Redirect URLs: https://app.bizbot.ai/callback
```

#### 1.4 Get API Keys
```
Dashboard → Settings → API
- Project URL: https://xxxxx.supabase.co
- anon/public key: eyJ...
- service_role key: eyJ... (KEEP SECRET)
```

#### 1.5 Enable Backups
```
Dashboard → Settings → Database → Backups
- Point-in-time recovery: Enabled (Pro plan)
- Daily backups: Automatic
- Retention: 7 days (Pro) or 30 days (Team)
```

---

### Phase 2: Vercel Deployment

#### 2.1 Connect Repository
```
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Framework: Next.js (auto-detected)
5. Root Directory: whatsapp-saas (if monorepo)
6. Build Command: npm run build
7. Output Directory: .next
```

#### 2.2 Set Environment Variables
```
In Vercel Dashboard → Settings → Environment Variables:

# Supabase
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...

# App
NEXT_PUBLIC_APP_URL = https://app.bizbot.ai

# WhatsApp
WHATSAPP_VERIFY_TOKEN = (generate: openssl rand -hex 32)
WHATSAPP_APP_SECRET = (from Meta Developer Dashboard)

# OpenAI
OPENAI_API_KEY = sk-...

# Razorpay
RAZORPAY_KEY_ID = rzp_live_...
RAZORPAY_KEY_SECRET = ...
RAZORPAY_WEBHOOK_SECRET = (generate: openssl rand -hex 32)

# n8n
N8N_WEBHOOK_URL = https://your-n8n.com/webhook
N8N_WEBHOOK_SECRET = (generate: openssl rand -hex 32)

# Cron
CRON_SECRET = (generate: openssl rand -hex 32)
```

#### 2.3 Configure Region
```
Vercel Dashboard → Settings → Functions
- Region: Mumbai (bom1)
- This ensures lowest latency for Indian users
```

#### 2.4 Deploy
```bash
# First deploy (or push to main branch)
vercel --prod

# Verify
curl https://app.bizbot.ai/api/health
```

---

### Phase 3: Domain & SSL

#### 3.1 Domain Setup (Cloudflare recommended)
```
1. Buy domain (e.g., bizbot.ai) from Namecheap/GoDaddy
2. Add to Cloudflare (free plan is fine)
3. In Vercel: Settings → Domains → Add "app.bizbot.ai"
4. In Cloudflare: Add CNAME record:
   - Name: app
   - Target: cname.vercel-dns.com
   - Proxy: ON (orange cloud)
```

#### 3.2 SSL Configuration
```
Cloudflare handles SSL automatically:
- SSL/TLS → Full (strict)
- Edge Certificates → Always Use HTTPS: ON
- HSTS: Enable (via our security headers)

Vercel also provides automatic SSL for custom domains.
Double encryption: Cloudflare ↔ Vercel (both HTTPS).
```

#### 3.3 Cloudflare Security Settings
```
Security → Settings:
- Security Level: Medium
- Challenge Passage: 30 minutes
- Browser Integrity Check: ON

Security → WAF:
- Enable managed rules (free tier includes basic protection)

Speed → Optimization:
- Auto Minify: JS, CSS, HTML
- Brotli: ON
```

---

### Phase 4: External Service Configuration

#### 4.1 WhatsApp Cloud API (Production)
```
1. Meta Developer Dashboard → Your App
2. App Review → Submit for review (required for production)
3. WhatsApp → Configuration:
   - Webhook URL: https://app.bizbot.ai/api/webhooks/whatsapp
   - Verify Token: (your WHATSAPP_VERIFY_TOKEN)
   - Subscribe: messages
4. WhatsApp → Getting Started:
   - Add production phone number
   - Complete business verification
```

#### 4.2 Razorpay (Production)
```
1. Switch to Live mode in Razorpay Dashboard
2. Settings → Webhooks:
   - URL: https://app.bizbot.ai/api/webhooks/razorpay
   - Secret: (your RAZORPAY_WEBHOOK_SECRET)
   - Events: subscription.*, payment.failed
3. Update RAZORPAY_KEY_ID to rzp_live_...
```

#### 4.3 OpenAI
```
1. Set usage limits: https://platform.openai.com/usage
2. Set monthly budget alert (e.g., $50)
3. Use organization API key (not personal)
```

---

## Security Checklist

### Application Security
- [x] Security headers (X-Frame-Options, HSTS, CSP)
- [x] Rate limiting on all API endpoints
- [x] Webhook signature validation (WhatsApp, Razorpay, n8n)
- [x] Row Level Security on all database tables
- [x] Input validation on all API routes
- [x] CSRF protection (SameSite cookies)
- [x] XSS prevention (React auto-escaping + headers)
- [x] SQL injection prevention (Supabase parameterized queries)
- [x] Sensitive data redaction in logs
- [x] Service role key never exposed to browser

### Infrastructure Security
- [ ] Enable Vercel's DDoS protection (automatic)
- [ ] Enable Cloudflare WAF rules
- [ ] Set up Supabase network restrictions (allow only Vercel IPs)
- [ ] Enable 2FA on all service accounts (Vercel, Supabase, Meta, Razorpay)
- [ ] Rotate API keys quarterly
- [ ] Set up secret scanning on GitHub repository
- [ ] Enable branch protection on main branch

### Data Security
- [ ] Supabase encryption at rest (automatic)
- [ ] TLS for all connections (automatic)
- [ ] WhatsApp access tokens encrypted before storage
- [ ] PII handling compliant with Indian IT Act
- [ ] Data retention policy (auto-delete messages after 90 days)
- [ ] Regular backup verification

---

## Monitoring & Alerting

### Uptime Monitoring
```
Service: Better Uptime (free tier) or UptimeRobot
Endpoint: https://app.bizbot.ai/api/health
Interval: 1 minute
Alert: Email + SMS on failure
```

### Error Tracking (Optional but recommended)
```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.ts (Sentry wizard handles this)
npx @sentry/wizard@latest -i nextjs
```

### Log Aggregation
```
Vercel → Settings → Log Drains
Options:
- Axiom (free tier: 500MB/month) — recommended
- Logtail (free tier: 1GB/month)
- Datadog (paid, enterprise)

All console.log/error output is captured automatically.
Our structured logger outputs JSON for easy parsing.
```

### Key Metrics to Monitor
```
1. Webhook response time (must be <5s for WhatsApp)
2. AI reply latency (target: <3s)
3. Message delivery rate (target: >95%)
4. Error rate (target: <1%)
5. Subscription conversion rate
6. Monthly message usage per business
```

---

## Scaling Recommendations

### Current Architecture Handles:
```
- 500 businesses
- 50,000 messages/month
- 100 concurrent webhook requests
- $50/month infrastructure cost
```

### When to Scale (and how):

| Trigger | Action | Cost |
|---------|--------|------|
| Webhook latency >3s | Add Redis queue (Upstash) | +$10/mo |
| 500+ businesses | Supabase Pro plan (connection pooling) | +$25/mo |
| 100K+ messages/month | Separate AI worker (Vercel Edge) | +$20/mo |
| Global users | Multi-region Vercel + Supabase | +$50/mo |
| 1000+ businesses | Dedicated n8n instance | +$30/mo |

### Scaling Roadmap:
```
Phase 1 (0-500 users): Current architecture [$50/mo]
Phase 2 (500-2000): Add Redis + connection pooling [$100/mo]
Phase 3 (2000-5000): Separate services + CDN [$300/mo]
Phase 4 (5000+): Kubernetes + dedicated DB [$1000+/mo]
```

---

## CI/CD Pipeline

### Workflow (`.github/workflows/ci.yml`):
```
Push to main:
  1. Lint (ESLint)
  2. Type Check (TypeScript)
  3. Build (Next.js)
  4. Deploy to Vercel (production)
  5. Health Check (verify deployment)

Pull Request:
  1. Lint
  2. Type Check
  3. Build (preview deployment)
```

### Required GitHub Secrets:
```
VERCEL_TOKEN        → Vercel → Settings → Tokens
VERCEL_ORG_ID       → Vercel → Settings → General → Team ID
VERCEL_PROJECT_ID   → Vercel → Project → Settings → General → Project ID
PRODUCTION_URL      → https://app.bizbot.ai
```

### Branch Strategy:
```
main        → Production (auto-deploy)
develop     → Staging (preview deployments)
feature/*   → Feature branches (preview deployments)
```

---

## Backup Strategy

### Database (Supabase)
```
Automatic:
- Point-in-time recovery (Pro plan): last 7 days
- Daily snapshots: automatic

Manual (weekly):
- Dashboard → Database → Backups → Download
- Store in Google Drive / S3

Script (automated):
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Application Code
```
- GitHub repository (primary)
- Enable branch protection on main
- Tag releases: v1.0.0, v1.1.0, etc.
```

### Environment Variables
```
- Store master copy in 1Password / Bitwarden
- Document in private team wiki
- Never commit to git
```

---

## Cost Breakdown (Production)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Cloudflare | Free | $0 |
| OpenAI | Pay-as-you-go | ~$5-50 |
| Razorpay | Free (2% per txn) | $0 |
| n8n Cloud | Starter | $20 |
| Domain | Annual | ~$1/mo |
| Monitoring | Free tiers | $0 |
| **Total** | | **~$70-120/mo** |

**Break-even: 8-12 paying customers at ₹999/month.**

---

## Launch Checklist

### Pre-Launch (1 week before)
- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] WhatsApp webhook verified and receiving
- [ ] Razorpay webhook configured and tested
- [ ] Google OAuth working with production redirect URL
- [ ] Health check endpoint returning 200
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) configured
- [ ] Backup verified (can restore)
- [ ] Rate limiting tested
- [ ] Security headers verified (securityheaders.com)

### Launch Day
- [ ] DNS propagated (check with dig/nslookup)
- [ ] SSL certificate active
- [ ] Test full user flow: register → connect WhatsApp → receive message → AI reply
- [ ] Test payment flow: select plan → pay → subscription active
- [ ] Monitor error logs for first 2 hours
- [ ] Have rollback plan ready (Vercel instant rollback)

### Post-Launch (first week)
- [ ] Monitor webhook delivery rate
- [ ] Monitor AI reply latency
- [ ] Check Supabase connection pool usage
- [ ] Review error logs daily
- [ ] Gather first user feedback
- [ ] Fix any critical bugs immediately
