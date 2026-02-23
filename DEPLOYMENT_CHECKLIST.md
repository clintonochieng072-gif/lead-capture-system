# Vercel Deployment Checklist

Complete these steps before deploying LeadFlow to production:

## Pre-Deployment ✓

- [ ] Code is committed and pushed to GitHub
- [ ] All environment variables are documented in `.env.local.example`
- [ ] `.env.local` is in `.gitignore` (verified: ✓)
- [ ] Latest production build is successful (`npm run build` passes)
- [ ] No TypeScript or build warnings
- [ ] All features tested locally:
  - [ ] Landing page loads
  - [ ] Login button redirects to login page
  - [ ] "Continue with Google" / "Get Started for Free" buttons trigger OAuth
  - [ ] Dashboard loads after auth
  - [ ] Can create tracking links
  - [ ] Public buyer contact page works and submits contacts
  - [ ] Leads appear in dashboard

## Vercel Setup ✓

- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Project imported into Vercel

## Environment Variables in Vercel

In Vercel Project Settings → Environment Variables, add:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - from Supabase Settings → API
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase Settings → API
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - from Supabase Settings → API
- [ ] `NODE_ENV=production`

## Supabase OAuth Configuration

- [ ] Vercel deployment URL obtained (e.g., `https://leadflow.vercel.app`)
- [ ] OAuth callback added to Supabase:
  - [ ] Go to Supabase → Authentication → Providers → Google
  - [ ] Add `https://your-vercel-url/api/auth/callback` to Redirect URLs
  - [ ] Keep `http://localhost:3000/api/auth/callback` for local dev
  - [ ] Save

## Post-Deployment

- [ ] Deploy initiated from Vercel
- [ ] Deployment completes successfully
- [ ] Test production environment:
  - [ ] Landing page loads and is responsive
  - [ ] Login/signup buttons work
  - [ ] Dashboard accessible after auth
  - [ ] Can create a test tracking link
  - [ ] Public capture page works with test lead
  - [ ] Test lead appears in dashboard

## Monitoring & Maintenance

- [ ] Enable Vercel Analytics (optional)
- [ ] Set up Vercel Error Tracking (optional)
- [ ] Review Vercel logs for any errors
- [ ] Test OAuth flow end-to-end
- [ ] Verify Supabase connectivity

## Custom Domain (Optional)

- [ ] Custom domain purchased
- [ ] Domain added to Vercel Project → Settings → Domains
- [ ] DNS configured (CNAME or A record per Vercel instructions)
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] Update Supabase OAuth callback URL to custom domain:
  - [ ] From: `https://your-vercel-app.vercel.app/api/auth/callback`
  - [ ] To: `https://your-custom-domain.com/api/auth/callback`

---

**Once all items are checked, your LeadFlow SaaS is live on Vercel!**

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
