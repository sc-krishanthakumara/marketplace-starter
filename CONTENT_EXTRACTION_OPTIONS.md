# Content Extraction Options

The extension now supports **TWO ways** to get real field content - **no API setup required** for Option 1!

## 🎨 Option 1: DOM Extraction (Recommended - No Setup!)

**How it works:**
- Reads content directly from the rendered page in the Sitecore editor
- No API keys or configuration needed
- Works immediately out of the box

**Pros:**
- ✅ **Zero configuration** - works immediately
- ✅ **No API calls** - instant results
- ✅ **Sees what users see** - extracts the actual rendered content
- ✅ **Free** - no API rate limits or costs

**Cons:**
- ⚠️ May not work if strict cross-origin policies are enabled
- ⚠️ Content matching is heuristic-based
- ⚠️ Can't distinguish field names (just extracts by type)

**Status:** **Automatically enabled** - the extension tries this first!

---

## 🔌 Option 2: GraphQL API (Fallback - Requires Setup)

**How it works:**
- Fetches datasource items via Sitecore's Authoring & Management GraphQL API
- Requires API credentials and configuration

**Pros:**
- ✅ **Precise field mapping** - knows exact field names
- ✅ **All field metadata** - gets field types, IDs, etc.
- ✅ **Reliable** - not affected by DOM structure changes
- ✅ **Complete data** - can access any field value

**Cons:**
- ⚠️ **Requires setup** - API keys and endpoint configuration needed
- ⚠️ **Network calls** - slower than DOM extraction
- ⚠️ **API limits** - may have rate limiting

**Setup Required:**
See **[GRAPHQL_SETUP.md](GRAPHQL_SETUP.md)** for instructions.

---

## How the Extension Chooses

The extension **automatically tries both methods** in order:

```
1. Try DOM Extraction
   ├─ If successful → Use extracted content ✅
   └─ If fails → Try GraphQL API
       ├─ If configured → Use GraphQL data ✅
       └─ If not configured → Show component structure only
```

---

## Testing DOM Extraction

**To see if DOM extraction is working:**

1. **Refresh the extension** in Sitecore Pages
2. **Open browser console** (F12)
3. **Look for these logs:**

**Success:**
```
🎨 Trying to extract content from rendered page...
✅ Successfully accessed parent document
🔍 Scanning page content...
✅ Extracted 15 content items from page
✅ Successfully extracted content from page DOM!
```

**Failure (will fall back to GraphQL):**
```
🎨 Trying to extract content from rendered page...
⚠️ Cannot access parent document (cross-origin restriction)
⚠️ DOM extraction returned no content, trying GraphQL...
```

---

## Which Option Should You Use?

### Use DOM Extraction (Option 1) if:
- ✅ You want it to work immediately without setup
- ✅ You're okay with heuristic content matching
- ✅ You just need to see the text content
- ✅ You want the fastest performance

### Use GraphQL API (Option 2) if:
- ✅ You need exact field names and IDs
- ✅ You need to access fields that aren't rendered
- ✅ You want precise component-to-datasource mapping
- ✅ DOM extraction isn't working (cross-origin issues)

### Use Both:
The extension is configured to **automatically try DOM first, then fall back to GraphQL**. This gives you:
- ✅ Immediate results when possible (DOM)
- ✅ Reliable fallback when needed (GraphQL)
- ✅ Best of both worlds!

---

## How DOM Extraction Works

The extension tries to access the parent window (the Pages editor) and extract content:

### What it extracts:
- **Headings** (h1-h6 tags)
- **Paragraphs** (p tags)
- **Buttons** (button elements and role="button")
- **Links** (a tags with href)
- **Labels** (label elements, .label classes)
- **Sitecore fields** (elements with data-field-id attributes)

### Smart Detection:
- Skips empty content
- Filters out navigation and UI elements
- Focuses on main content area
- Looks for Sitecore-specific attributes first

---

## Troubleshooting

### "Cannot access parent document (cross-origin)"

**Problem:** Browser security prevents accessing the parent window

**Solutions:**
1. ✅ Use GraphQL API (Option 2) instead
2. ✅ Deploy to same origin as Pages editor
3. ✅ Configure CORS if self-hosting

### "DOM extraction returned no content"

**Problem:** Can access parent but no content found

**Possible causes:**
- Page is still loading
- Content is in a shadow DOM
- Unusual page structure

**Solutions:**
1. ✅ Refresh and try again
2. ✅ Use GraphQL API (Option 2)
3. ✅ Check console for specific errors

### Both methods fail

**Result:** You'll see component structure without field values

**What's shown:**
- ✅ Component names
- ✅ Component hierarchy
- ✅ Datasource paths
- ✅ Placeholder information
- ❌ Field values

**This is still useful for:**
- Understanding page architecture
- Debugging component structure
- Seeing component relationships

---

## Current Implementation

```typescript
// Automatic multi-strategy approach:

try {
  // Try DOM extraction (no setup required)
  content = extractFromDOM();
  if (content.length > 0) return content; // Success!
  
  // Fall back to GraphQL if DOM fails
  if (graphqlConfigured) {
    content = await fetchViaGraphQL();
    return content;
  }
  
  // Show structure only if both fail
  return componentStructureOnly;
  
} catch (error) {
  return componentStructureOnly;
}
```

---

## Summary

| Feature | DOM Extraction | GraphQL API |
|---------|---------------|-------------|
| **Setup Required** | ❌ None | ✅ Yes |
| **Speed** | ⚡ Instant | 🐢 200-500ms |
| **Accuracy** | 🎯 Good | 🎯 Perfect |
| **Field Names** | ❌ Generic | ✅ Exact |
| **Reliability** | ⚠️ May fail | ✅ Reliable |
| **Cost** | 💰 Free | 💰 API calls |

**Recommendation:** Try DOM extraction first (it's automatic!). If it doesn't work or you need exact field mapping, set up GraphQL API.

---

**Questions?** Check the console - it tells you exactly which method is being used! 🔍
