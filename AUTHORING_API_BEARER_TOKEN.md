# Using Authoring API with Bearer Token ✅

## What You Have

✅ **OAuth Bearer Token** from Sitecore CLI  
✅ **Instant access** to draft content (no publish needed!)  
✅ **Full Authoring API** access

---

## Quick Setup (Already Done!)

Your `.env.local` now has:

```bash
NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://xmc-jsstestfdd5-testautomat0a8d-testingf323-s.sitecore-staging.cloud/sitecore/api/authoring/graphql/v1
NEXT_PUBLIC_AUTHORING_BEARER_TOKEN=your-access-token-here
```

---

## 🚀 Test It Now!

### Step 1: Restart Dev Server

```bash
npm run dev
```

### Step 2: Open Extension in Sitecore Pages

1. Go to Sitecore Pages
2. Open your extension
3. Check console for:
   ```
   ✅ Successfully fetched 6 of 6 datasources
   🔗 Enriching ComponentName with datasource fields
   ```

### Step 3: See Real Content!

No "Publish Preview" needed - you'll see draft content **instantly**! 🎉

---

## ⚠️ Token Expires in 24 Hours

Your access token will expire on: **Jan 7, 2026 at 8:21 AM**

### How to Refresh:

```bash
# Run this command to get a new token:
dotnet sitecore cloud login

# Find new token in:
./sitecore/user.json
```

Then:
1. Copy the new `accessToken` value
2. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_AUTHORING_BEARER_TOKEN=new-token-here
   ```
3. Restart dev server

---

## 🔒 For Production: Use Long-Lived API Keys

Bearer tokens are **great for development** but expire quickly.

For production deployment:

### Option 1: Use Preview API Instead
- Create an API key in XM Cloud Deploy
- Use Preview endpoint: `https://edge-preview.sitecorecloud.io/api/graphql/v1`
- Requires "Publish Preview" but token never expires

### Option 2: Implement Token Refresh
- Use the `refreshToken` from `user.json`
- Implement automatic token refresh in your app
- More complex but gives instant draft content

**Recommendation:** Use **Preview API** for production (simpler)

---

## Authentication Comparison

| Method | Setup | Content | Token Expiry |
|--------|-------|---------|--------------|
| **Bearer Token** (Current) | ✅ Easy | ✅ Instant draft | ⚠️ 24 hours |
| **Preview API Key** | ✅ Easy | ⚠️ After publish | ✅ Never |
| **Authoring API Key** | ❌ Not available | ✅ Instant draft | ✅ Never |

---

## Troubleshooting

**Q: "403 Forbidden" errors**  
A: Token expired. Run `dotnet sitecore cloud login` again

**Q: "No authentication configured" warning**  
A: Check `.env.local` has `NEXT_PUBLIC_AUTHORING_BEARER_TOKEN`

**Q: Want to switch to Preview API?**  
A: See `PREVIEW_API_SETUP.md`

---

**You're all set! Restart the dev server and test it!** 🚀
