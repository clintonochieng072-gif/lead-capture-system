# LeadFlow Vercel Deployment Guide

This guide walks you through deploying LeadFlow to Vercel with Supabase integration.

## Prerequisites

- Vercel account (free tier is fine)
- GitHub account (to link your repository)
- Supabase project already created (see [SETUP.md](./SETUP.md) if you haven't done this yet)
- Your Supabase API keys ready

## Step 1: Push Your Code to GitHub

1. Initialize a git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: LeadFlow SaaS"
   ```

2. Create a new GitHub repository and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/leadflow.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Create a Vercel Project

1. Go to [https://vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"New Project"**
3. Select **"Import Git Repository"**
4. Find and select your `leadflow` repository
5. Click **"Import"**

## Step 3: Configure Environment Variables

On the Vercel import page (or in Project Settings > Environment Variables), add the following variables:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | From Supabase → Settings → API → Anon Public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | From Supabase → Settings → API → Service Role Key |
| `NODE_ENV` | `production` | For production builds |

**Where to find these values:**
1. Open your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` is secret and should ONLY be set in Vercel (not committed to git). Vercel keeps server-only env vars secure.

## Step 4: Update Supabase OAuth Callback URL

After your Vercel project is created, you'll have a production URL (e.g., `https://leadflow.vercel.app`).

1. Go to your Supabase project → **Authentication** → **Providers** → **Google**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://leadflow.vercel.app/api/auth/callback
   ```
3. Click **Save**

(Keep your local `http://localhost:3000/api/auth/callback` for development)

## Step 5: Deploy

Once environment variables are set:

1. Click **"Deploy"** on the Vercel project page
2. Vercel will build and deploy your Next.js app
3. Wait for the deployment to complete (usually 1–2 minutes)
4. You'll get a production URL: `https://leadflow.vercel.app` (or your custom domain)

## Step 6: Test the Production Deployment

1. Visit your Vercel URL (e.g., `https://leadflow.vercel.app`)
2. Test the landing page, login, and lead capture flow
3. Try creating a tracking link and submitting a lead through the public capture page
4. Verify leads appear in your dashboard

## Troubleshooting

### "Cannot read properties of undefined" or Webpack errors

- Clear Vercel cache: Go to **Project Settings** → **Git** → **Redeploy** (choose a previous deployment and re-deploy)
- If persists, check that all environment variables are set correctly

### "Failed to connect to Supabase"

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check that your Supabase project is active and accessible
- In Supabase, verify that the **anon role** has permission to read `tracking_links` table

### Google OAuth not working

- Check that `https://your-vercel-url/api/auth/callback` is added to Supabase OAuth Redirect URLs
- Verify Google OAuth credentials are still valid in your Google Cloud Console
- Test with a fresh browser (incognito mode) to clear any cached redirects

### Leads not being inserted

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Check Supabase Database → **Tables** → `leads` to see if any leads are appearing
- In Vercel, go to **Deployment** → **Logs** and look for errors in the `/api/track/[slug]` endpoint

## Custom Domain (Optional)

To use a custom domain (e.g., `leadflow.io`):

1. In Vercel Project Settings → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS setup instructions (usually CNAME or A record)
4. Update your Supabase OAuth callback URL to use the custom domain:
   ```
   https://leadflow.io/api/auth/callback
   ```

## Monitoring & Logs

Vercel provides built-in monitoring:

- **Deployment Logs**: Click a deployment to see build output
- **Function Logs**: Real-time logs from API routes (e.g., `/api/track/[slug]`)
- **Analytics**: View page speed, Core Web Vitals, and traffic

To view function logs:
1. Go to **Deployments** → select a deployment
2. Click **"Functions"** tab
3. Click an API route to see recent invocations and logs

## Next Steps

Once deployed to production:

1. **Set up a custom domain** (optional but recommended for a SaaS)
2. **Enable Supabase backups** in your Supabase project settings
3. **Monitor analytics** to track user growth and lead volume
4. **Set up email notifications** (optional: configure Supabase to send welcome/confirmation emails)
5. **Scale** your tracking infrastructure if handling high volume

---

For more help, see:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment/vercel)
- [Supabase Docs](https://supabase.com/docs)
