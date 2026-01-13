# ✅ Final Setup - Preview API (Simplest Solution)

## Why Preview API?

After testing, we found that:
- ❌ **Authoring API** has an undocumented, complex schema
- ✅ **Preview API** uses the standard Experience Edge schema (simple!)
- ✅ **Same API key** you already have (Edge/Preview key)

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your Edge API Key

In **XM Cloud Deploy** → **Developer Settings** → **API Keys**:

1. Look for an existing API key (e.g., "Preview API Key" or "Edge API Key")
2. Or click **"Generate Preview API Token"**
3. Copy the key

### Step 2: Update `.env.local`

Open `C:\github\marketplace-starter\.env.local` and replace `your-edge-api-key-here`:

```bash
NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://edge-preview.sitecorecloud.io/api/graphql/v1
NEXT_PUBLIC_AUTHORING_API_KEY=paste-your-key-here
```

### Step 3: Restart and Test

```bash
# Restart dev server
npm run dev
```

Then in Sitecore Pages:
1. **Publish your page to Preview** (important!)
2. Refresh the extension
3. You should see real field values! 🎉

---

## Expected Console Output

After restart, you should see:

```
📦 Fetching 6 datasource items...
📡 Fetching datasource: /sitecore/content/sync/sync/Home/Data/HeroST/HeroST 1
✅ Fetched datasource: HeroST 1 with 5 fields
🔗 Enriching HeroST 1 with datasource fields
✅ Successfully fetched 6 of 6 datasources
```

---

## ⚠️ Important: Publish to Preview

Preview API only shows content that's been **published to Preview**:

1. Make content changes in Sitecore Pages
2. Click **"Publish" → "Publish to Preview"**
3. Wait 5-10 seconds
4. Refresh the extension

---

## For Production (Vercel)

Add the **same environment variables** in Vercel:

1. **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT = https://edge-preview.sitecorecloud.io/api/graphql/v1
   NEXT_PUBLIC_AUTHORING_API_KEY = your-edge-api-key
   ```
3. **Redeploy**

---

## Comparison: Preview vs Authoring API

| Feature | Preview API ✅ | Authoring API |
|---------|----------------|---------------|
| Setup | Simple | Complex (undocumented schema) |
| API Key | Edge key (you have it!) | Bearer token (expires 24h) |
| Content | After "Publish Preview" | Instant draft content |
| Schema | Standard (documented) | Custom (undocumented) |

**Verdict:** Preview API is the **best choice** for your extension! 🎯

---

## Next Steps

1. Get your Edge API key from Developer Settings
2. Update `.env.local`
3. Restart dev server
4. Publish a page to Preview in Sitecore
5. Test the extension!

**You're almost there!** 🚀
