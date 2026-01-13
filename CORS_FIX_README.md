# CORS Fix Applied ✅

## What Was the Problem?

Browser security (CORS) was blocking direct calls from your extension (`http://localhost:3000`) to Sitecore's GraphQL API (`https://xmc-...sitecore-staging.cloud`).

## What We Fixed

✅ Created a **Next.js API proxy** at `/api/graphql`  
✅ Updated the GraphQL service to use the proxy automatically  
✅ Created `.env.local` file for your credentials

---

## Next Steps

### 1. Add Your API Key

Edit the `.env.local` file and replace `your-api-key-here` with your actual API key:

```bash
# Get your API key from:
# XM Cloud Deploy > Your Project > Developer Settings > API Keys
```

**File: `.env.local`**
```
NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://xmc-jsstestfdd5-testautomat0a8d-testingf323-s.sitecore-staging.cloud/sitecore/api/authoring/graphql/v1
NEXT_PUBLIC_AUTHORING_API_KEY=your-actual-api-key-guid-here
```

### 2. Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 3. Test It

1. Open your extension in Sitecore Pages
2. Open browser console (F12)
3. Look for success messages:
   ```
   ✅ Successfully fetched 6 of 6 datasources
   🔗 Enriching HeroST 1 with datasource fields
   ```

---

## How It Works Now

**Before (CORS Error):**
```
Browser → Sitecore GraphQL API ❌ Blocked by CORS
```

**After (Working):**
```
Browser → Next.js API Route (/api/graphql) → Sitecore GraphQL API ✅
        (same origin, no CORS)    (server-to-server, no CORS)
```

---

## For Vercel Deployment

When you deploy to Vercel, you need to add the **same environment variables**:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add both variables:
   ```
   NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT
   NEXT_PUBLIC_AUTHORING_API_KEY
   ```
3. Redeploy

The API proxy will work automatically in production too! 🎉

---

## Files Changed

- ✅ `src/app/api/graphql/route.ts` - New API proxy route
- ✅ `src/services/authoringGraphql.ts` - Updated to use proxy with full URL
- ✅ `.env.local` - Created with your config (needs API key)

## Recent Fix

Fixed "Invalid URL" error by constructing full URL for the proxy:
```typescript
// Before: '/api/graphql' (relative path - caused error)
// After: 'http://localhost:3000/api/graphql' (absolute URL - works!)
const clientEndpoint = this.useProxy 
  ? `${window.location.origin}/api/graphql`
  : this.endpoint;
```
