# Using Preview API (Simpler Alternative)

## Why Preview API?

✅ **Easier Setup** - Uses the same schema as Experience Edge  
✅ **Same API Key** - Use your existing Edge API key  
✅ **Simpler Query** - Standard GraphQL schema  

⚠️ **Trade-off** - Authors must **publish to preview** before seeing content in the extension

---

## Quick Setup

### Step 1: Get Your Edge API Key

You already have this! It's the API key from:
- **XM Cloud Deploy** → **Developer Settings** → **API Keys**
- Or the key you created for Experience Edge

### Step 2: Update `.env.local`

```bash
# Preview API Configuration
NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT=https://edge-preview.sitecorecloud.io/api/graphql/v1
NEXT_PUBLIC_AUTHORING_API_KEY=your-edge-api-key-here
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Test It

1. In Sitecore Pages, **publish your page to Preview**
2. Open your extension in Sitecore Pages
3. Check browser console for:
   ```
   ✅ Successfully fetched 6 of 6 datasources
   ```

---

## Author Workflow

With Preview API, the workflow is:

1. Author edits content ✏️
2. Author clicks **"Publish Preview"** 🚀
3. Extension refreshes automatically ✅
4. Extension shows the updated content 📋

---

## Switching Back to Authoring API (Advanced)

If you want **instant updates** without publishing:

1. Use **Authoring API endpoint**:
   ```
   https://xmc-jsstestfdd5-testautomat0a8d-testingf323-s.sitecore-staging.cloud/sitecore/api/authoring/graphql/v1
   ```

2. Get a **separate Authoring API key** (not the Edge key)

3. Fix the GraphQL query to match Authoring schema (more complex)

But **Preview API is recommended** for getting started! 🎯

---

## Troubleshooting

**Q: Extension shows "0 items"**  
A: Make sure you've **published the page to Preview** first

**Q: Still getting GraphQL errors**  
A: Check that you're using the **Edge API key**, not a different key

**Q: Content is stale**  
A: Click **"Publish Preview"** in Sitecore Pages to refresh
