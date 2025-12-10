# Vercel Environment Variables Setup

## Critical Issue Found & Fixed

The frontend was trying to call the backend but **Vercel environment variables were not set**, causing the frontend to build with an undefined `NEXT_PUBLIC_API_URL`. This made API URLs relative to the Vercel domain, resulting in 404/405 errors.

**Browser console error showed:**
```
GET https://agent-os-web3.vercel.app/dashboard/agentos-web3-production.up.railway.app/api/memory/conversation/...
```

This is wrong—it should be:
```
GET https://agentos-web3-production.up.railway.app/api/memory/conversation/...
```

## Solution: Set Vercel Environment Variables

### Step 1: Open Vercel Dashboard
1. Go to https://vercel.com
2. Log in to your account
3. Click on the **AgentOS-web3** project (or find it in your projects list)

### Step 2: Navigate to Settings
1. Click **Settings** (gear icon at top)
2. Click **Environment Variables** in the left sidebar

### Step 3: Add NEXT_PUBLIC_API_URL
1. Click **Add New** button
2. Fill in the form:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://agentos-web3-production.up.railway.app`
   - **Environment**: Select **Production** (and optionally **Preview** and **Development**)
3. Click **Save**

### Step 4: Redeploy Frontend
1. After saving, click the **Deployments** tab
2. Find the latest deployment at the top
3. Click the **...** menu on that deployment
4. Select **Redeploy** (or wait for auto-redeploy if you have it enabled)
5. Wait for the deployment to complete (green checkmark)

### Step 5: Verify
Once the deployment completes:
1. Open https://agent-os-web3.vercel.app/dashboard in your browser
2. Open DevTools (F12) → Console tab
3. You should **NOT** see 404/405 errors anymore
4. Connect your wallet and try sending a chat message
5. The message should POST to the correct Railway backend URL

## Why This Matters

- `NEXT_PUBLIC_*` variables in Next.js are **embedded at build time** into the frontend
- Vercel must have these variables set in the **dashboard**, not just in `.env.production` files
- Local `.env.production` is only used for local builds; Vercel uses its own environment settings
- Without `NEXT_PUBLIC_API_URL` set, the frontend defaults to `http://localhost:3000`, which causes relative path issues in production

## Troubleshooting

If you still see 404 errors after redeployment:

1. **Hard refresh your browser**: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Clear browser cache**: Clear all cache for `agent-os-web3.vercel.app`
3. **Check Vercel logs**: In Deployments → Click your latest deployment → Logs tab
4. **Verify the variable was saved**: Go back to Settings → Environment Variables and confirm `NEXT_PUBLIC_API_URL` is there

## After Setup

Once `NEXT_PUBLIC_API_URL` is set in Vercel and the frontend is redeployed:
- ✅ Frontend will call Railway backend correctly
- ✅ Chat messages will post to `/api/agent/research`
- ✅ Memory will save to `/api/memory/conversation`
- ✅ Agent creation will work
- ✅ All E2E flows will function properly

Let me know once you've set the Vercel env var and redeployed—I can then test the production app end-to-end.
