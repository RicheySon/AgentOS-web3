# Railway Production Setup - Complete Fix Guide

## 🚀 Step-by-Step Instructions

### STEP 1: Access Railway Dashboard

1. Go to https://railway.app
2. Sign in with your account
3. Select the **AgentOS-web3-production** project
4. Click on the **Backend Service** (the Express API)

---

### STEP 2: Set Environment Variables

Click the **Variables** tab on the right side. You'll see a form to add environment variables.

**Add these variables one by one:**

```env
CHAINGPT_API_KEY=597bfa27-12b5-410b-8680-d02c94584770
CHAINGPT_API_URL=https://api.chaingpt.org
BNB_PRIVATE_KEY=0xd9e25f44ae486674c6587c7fe2f72ddcf828b03911924b17a1baa09f98b72fc6
BNB_WALLET_ADDRESS=0x2f914bcbad5bf4967bbb11e4372200b7c7594aeb
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
BNB_CHAIN_ID=97
BASE_PRIVATE_KEY=0xd9e25f44ae486674c6587c7fe2f72ddcf828b03911924b17a1baa09f98b72fc6
BASE_WALLET_ADDRESS=0x2f914bcbad5bf4967bbb11e4372200b7c7594aeb
BASE_TESTNET_RPC=https://sepolia.base.org
BASE_CHAIN_ID=84532
BASE_CONTRACT_ADDRESS=0xfba199c705761D98aD1cD98c34C0d544e39c1984
MEMBASE_HUB=https://testnet.hub.membase.io
MEMBASE_ID=agentos-web3-agent
MEMBASE_ACCOUNT=0xC3faA4bfB0FB3d8428C81738500651AbE4cdC464
CORS_ORIGIN=https://agent-os-web3.vercel.app
NODE_ENV=production
PORT=3000
LOG_LEVEL=INFO
```

**Important:** 
- Copy each variable exactly as shown
- Do NOT add quotes around values
- Railway will auto-detect and format them

---

### STEP 3: Redeploy

After setting variables:
1. Go to the **Deployments** tab
2. Click the current deployment
3. Click **Trigger Deploy** (or the redeploy button)
4. Wait for deployment to complete (status: green checkmark)

⏱️ This takes ~2-3 minutes.

---

### STEP 4: Verify Environment Variables Were Set

Once deployed, open a terminal and run:

```bash
# Test the health endpoint
curl https://agentos-web3-production.up.railway.app/api/health

# Should return something like:
# {"status":"ok","timestamp":"2025-12-09T..."}
```

---

### STEP 5: Test Each Feature

#### Test 1: Chat/AI
```bash
curl -X POST https://agentos-web3-production.up.railway.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is blockchain?"}'

# Should return a real response from ChainGPT, NOT the fallback error
```

#### Test 2: Get Wallet Balance
```bash
curl https://agentos-web3-production.up.railway.app/api/blockchain/balance/0x2f914bcbad5bf4967bbb11e4372200b7c7594aeb

# Should return balance in BNB, NOT an error
```

#### Test 3: Save Chat History
```bash
curl -X POST https://agentos-web3-production.up.railway.app/api/memory/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-test-001",
    "userMessage": "Hello agent",
    "aiResponse": "Hello user!"
  }'

# Should return success
```

#### Test 4: Retrieve Chat History
```bash
curl https://agentos-web3-production.up.railway.app/api/memory/conversation/agent-test-001

# Should return the messages you saved above
# If history is empty after redeploy/restart, persistence is broken
```

---

## 🔧 Troubleshooting

### Problem: "I apologize, but I am currently unable to process your request"

**This means:** ChainGPT API key is still not set or invalid.

**Solution:**
1. Go back to Railway Variables
2. Verify `CHAINGPT_API_KEY` is exactly: `597bfa27-12b5-410b-8680-d02c94584770`
3. No spaces, no quotes
4. Redeploy
5. Wait 2-3 minutes
6. Test again

---

### Problem: "No wallet loaded. Please set BNB_PRIVATE_KEY in environment"

**This means:** Blockchain env vars are not set.

**Solution:**
1. Go to Railway Variables
2. Verify these are set:
   - `BNB_PRIVATE_KEY`
   - `BNB_WALLET_ADDRESS`
   - `BNB_TESTNET_RPC`
3. Redeploy
4. Test balance endpoint

---

### Problem: Chat history resets after restart

**This means:** Memory is not persisting. Currently uses local JSON file.

**Options:**

**Option A: Enable Membase (Recommended)**
- Requires Membase SDK properly configured
- Requires valid `MEMBASE_ACCOUNT` on testnet.hub.membase.io
- Would need to test separately

**Option B: Add PostgreSQL to Railway (Recommended)**
1. In Railway dashboard, click "New"
2. Add PostgreSQL
3. Set database connection strings
4. Update `MembaseService.js` to use database instead of JSON file
5. Redeploy

**Option C: Use Railway Persistent Volumes**
1. In Railway service config
2. Add mount: `/app/data` → Railway Volume
3. This persists data across restarts
4. Current code already saves to `data/memory_store.json`

---

## 🧪 Full Integration Test

Once environment is set, run this complete test:

```bash
#!/bin/bash

API="https://agentos-web3-production.up.railway.app"

echo "Testing AgentOS Production Backend..."
echo ""

# 1. Health check
echo "✓ Health Check"
curl -s $API/api/health | jq .

echo ""
echo "✓ Chat Request"
curl -s -X POST $API/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain Ethereum"}' | jq .

echo ""
echo "✓ Get Balance"
curl -s $API/api/blockchain/balance/0x2f914bcbad5bf4967bbb11e4372200b7c7594aeb | jq .

echo ""
echo "✓ Memory Test - Save"
curl -s -X POST $API/api/memory/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test-agent",
    "userMessage": "Test message",
    "aiResponse": "Test response"
  }' | jq .

echo ""
echo "✓ Memory Test - Retrieve"
curl -s $API/api/memory/conversation/test-agent | jq .

echo ""
echo "All tests complete!"
```

---

## 📋 Verification Checklist

- [ ] All 16 environment variables set in Railway
- [ ] Backend redeployed after setting variables
- [ ] Health endpoint returns 200 OK
- [ ] Chat request returns real ChainGPT response (not fallback)
- [ ] Balance check returns actual wallet balance
- [ ] Memory save endpoint returns success
- [ ] Memory retrieve endpoint returns saved messages
- [ ] Frontend at Vercel can make API calls without CORS errors
- [ ] No "API key undefined" errors in logs
- [ ] No "No wallet loaded" errors in logs

---

## 🚨 Important Notes

1. **Do NOT commit `.env.production` to git** - Environment variables should only be in Railway
2. **Private keys in Railway** - These are masked in the UI, only accessible to services
3. **Redeploy takes 2-3 minutes** - Don't test immediately after clicking deploy
4. **Memory persistence** - Current setup uses local JSON, will lose data on restart. This is expected for testing but should be replaced with database for production.

---

## Next Phase: Production Hardening

After basic setup works:

1. **Database Setup** - Move from JSON file to PostgreSQL for persistence
2. **Logging** - Check Railway logs to ensure no errors
3. **Monitoring** - Set up alerts for failed API calls
4. **Rate Limiting** - Add rate limits to prevent abuse
5. **Security** - Review CORS settings, add authentication

