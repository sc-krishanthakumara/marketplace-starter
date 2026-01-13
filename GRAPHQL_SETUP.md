# GraphQL Setup Guide

This guide will help you configure the extension to fetch real field values from your XM Cloud datasources.

## Quick Setup

### Step 1: Get Your API Credentials

1. **Open XM Cloud Deploy Portal**
   - Go to https://deploy.sitecorecloud.io/
   - Select your organization and project

2. **Get Your API Key**
   - Navigate to: **Project Settings** → **Developer Settings** → **API Keys**
   - Click **"Create API Key"**
   - Give it a name (e.g., "Marketplace Extension")
   - Copy the API key (you'll only see it once!)

3. **Get Your GraphQL Endpoint**
   - Your endpoint format: `https://xmc-{org}-{env}.sitecorecloud.io/sitecore/api/authoring/graphql/v1`
   - Example: `https://xmc-mycompany-staging.sitecorecloud.io/sitecore/api/authoring/graphql/v1`
   
   **To find yours:**
   - Look at your XM Cloud URL when editing content
   - Replace the path with `/sitecore/api/authoring/graphql/v1`

### Step 2: Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp env.example.txt .env.local
   ```

2. **Edit `.env.local` and add your credentials:**
   ```bash
   NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://xmc-yourorg-environment.sitecorecloud.io/sitecore/api/authoring/graphql/v1
   NEXT_PUBLIC_AUTHORING_API_KEY=your-actual-api-key-here
   ```

### Step 3: Restart the Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Restart it
npm run dev
```

### Step 4: Test It Out

1. Open your extension in XM Cloud Pages
2. Open the browser console (F12)
3. Look for these logs:
   - ✅ `"Created AuthoringGraphQLService"`
   - 📡 `"Fetching datasource: /Data/HeroST/HeroST 1"`
   - ✅ `"Fetched datasource: HeroST 1"`

4. You should now see **real field values** in the Semantic Content panel!

## Example Configuration

Here's a complete example:

```bash
# .env.local
NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://xmc-jssclientsdemo-staging.sitecorecloud.io/sitecore/api/authoring/graphql/v1
NEXT_PUBLIC_AUTHORING_API_KEY=1234ABCD-5678-90EF-GHIJ-KLMNOPQRSTUV
```

## Troubleshooting

### "GraphQL service not configured"

**Problem:** Extension shows component structure but no field values

**Solution:** 
1. Check that `.env.local` exists in the project root
2. Verify both variables are set correctly
3. Restart the dev server (`npm run dev`)

### "Error fetching datasource: 401 Unauthorized"

**Problem:** API key is invalid or expired

**Solution:**
1. Generate a new API key in XM Cloud Deploy
2. Update `NEXT_PUBLIC_AUTHORING_API_KEY` in `.env.local`
3. Restart dev server

### "Error fetching datasource: 404 Not Found"

**Problem:** Wrong GraphQL endpoint URL

**Solution:**
1. Verify your endpoint URL matches your XM Cloud instance
2. Make sure it ends with `/sitecore/api/authoring/graphql/v1`
3. Check that you're using the authoring endpoint (not edge)

### No datasources are being fetched

**Problem:** Components don't have datasource references

**Solution:**
- Check that your components are using datasources (not hardcoded fields)
- Look in the console for datasource paths like `local:/Data/...`

## What Gets Fetched?

The extension fetches field values from datasource items, including:

- ✅ **Single-Line Text** fields (Title, Name, etc.)
- ✅ **Multi-Line Text** fields (Description, etc.)
- ✅ **Rich Text** fields (HTML content)
- ✅ **Image** fields (URLs and metadata)
- ✅ **Link** fields (URLs and targets)
- ✅ **All other field types** (parsed as appropriate)

## Performance Notes

- **Parallel Fetching:** All datasources are fetched in parallel for speed
- **Caching:** Currently no caching (fetches on every page change)
- **Network:** Expect 100-500ms for typical pages with 5-10 components

## Security Notes

- ✅ API keys are environment variables (not committed to git)
- ✅ `.env.local` is in `.gitignore`
- ⚠️ Never share your `.env.local` file
- ⚠️ Use separate API keys for dev/staging/production

## Alternative: Without GraphQL Setup

If you don't configure GraphQL, the extension still works! You'll see:
- ✅ Component structure (tree view)
- ✅ Component names and metadata
- ✅ Datasource paths
- ❌ No actual field values

This is useful for:
- Testing the extension
- Understanding page structure
- Debugging component hierarchy

---

**Need help?** Check the console logs - they'll tell you exactly what's happening! 🔍
