# Quick Start Guide

Get up and running with the Semantic Content Analyzer in minutes!

## Prerequisites

- ✅ Node.js 18 or higher
- ✅ npm or yarn
- ✅ XM Cloud tenant with Marketplace access

## Installation Steps

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd marketplace-starter

# Install dependencies
npm install
```

### 2. Configure Environment (Optional)

For production use with real XM Cloud data:

```bash
# Copy the example environment file
cp env.example.txt .env.local

# Edit .env.local with your credentials
# - NEXT_PUBLIC_EDGE_ENDPOINT
# - NEXT_PUBLIC_EDGE_API_KEY
# - NEXT_PUBLIC_SITE_NAME
```

> **Note**: The app works with mock data by default for development and testing.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000/pages-contextpanel-extension`

### 4. Test the Extension

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Using the Extension

### Development Mode

When running locally with `npm run dev`:

1. Open `http://localhost:3000/pages-contextpanel-extension`
2. The extension will load with **mock data**
3. You can test the UI and functionality without a real XM Cloud connection

### In XM Cloud Pages

To use the extension in your XM Cloud environment:

1. **Build the production bundle**:
   ```bash
   npm run build
   ```

2. **Deploy to hosting** (Vercel, Netlify, Azure, etc.)

3. **Register in XM Cloud Marketplace**:
   - Navigate to your XM Cloud portal
   - Go to Marketplace
   - Register your extension with the deployment URL

4. **Open in Pages**:
   - Navigate to XM Cloud Pages
   - Open a page for editing
   - Open the context panel
   - Your extension should appear!

## Understanding the Interface

### Main Layout

```
┌──────────────────────────────────────────────────────┐
│  Semantic Content Analyzer                 [App]     │
│  Page: Home | Language: en | Items: 12 / 15         │
├──────────────────────────────────────────────────────┤
│  🔍 [Search text content...]                         │
├──────────────────────────────────────────────────────┤
│  [H] Heading (3)  [P] Paragraph (5)  [RT] Rich...    │
├─────────────────────────┬────────────────────────────┤
│  Component Tree         │  Semantic Content          │
│  ▼ Hero Banner         │  ▼ Heading (3)             │
│    • 4 fields          │    └─ Welcome to XM...     │
│  ▼ Content Section     │  ▼ Paragraph (5)           │
│    • 2 fields          │    └─ Build amazing...     │
│    ▶ Feature List      │                             │
│  • Footer              │                             │
└─────────────────────────┴────────────────────────────┘
```

### Key Features

1. **Search Box** (Top):
   - Type to filter content
   - Searches text, components, fields, categories
   - 300ms debounce for performance

2. **Category Filters** (Below search):
   - Click to toggle category visibility
   - Shows count for each category
   - Multiple categories can be selected

3. **Component Tree** (Left):
   - Shows page structure
   - Click to expand/collapse
   - Click to filter items by component

4. **Semantic List** (Right):
   - Grouped by category
   - Click category header to expand/collapse
   - Click "Show more" to see full text
   - Displays full metadata for each item

## Common Tasks

### Viewing All Content

1. Clear the search box (if any text is entered)
2. Deselect all category filters (click active chips)
3. Deselect any selected component in tree
4. Expand all category sections

### Finding Specific Content

1. **By text**: Type in search box
2. **By component**: Click component in tree
3. **By category**: Click category filter chip
4. **Combine**: Use search + filters together

### Inspecting Metadata

1. Find the text item you're interested in
2. Click "Show more" if text is truncated
3. View metadata below the text:
   - Component name and ID
   - Field name
   - Datasource item ID
   - Rendering placeholder
   - Component parameters
   - Breadcrumb path

## Troubleshooting

### Extension Not Loading

**Problem**: Blank screen or error message

**Solutions**:
- Check browser console for errors
- Verify Node.js version (18+)
- Try clearing `.next` folder and rebuilding:
  ```bash
  rm -rf .next
  npm run build
  npm run dev
  ```

### No Content Displayed

**Problem**: "No components found" or empty lists

**Solutions**:
- In development mode: Check that mock data is loading
- In XM Cloud: Verify page has content and you're in Pages editor
- Check browser console for API errors
- Verify environment variables (if using real API)

### Tests Failing

**Problem**: Test suite has failures

**Solutions**:
- Ensure all dependencies are installed:
  ```bash
  npm install
  ```
- Clear Jest cache:
  ```bash
  npx jest --clearCache
  npm test
  ```
- Check Node.js version compatibility

### Performance Issues

**Problem**: Slow loading or laggy UI

**Solutions**:
- Reduce search debounce time in `SearchBox.tsx`
- Clear browser cache and reload
- Check for large component trees (>100 components)
- Consider pagination (future enhancement)

## Next Steps

### Customize the Extension

1. **Add new semantic categories**:
   - See [CONTRIBUTING.md](CONTRIBUTING.md#adding-semantic-categories)

2. **Customize the UI**:
   - Edit style objects in component files
   - Modify colors in `CATEGORY_COLORS`
   - Adjust spacing and typography

3. **Extend functionality**:
   - Add export features
   - Implement custom filters
   - Add analytics tracking

### Learn More

- 📖 [README.md](README.md) - Full documentation
- 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- 🤝 [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide
- 📝 [CHANGELOG.md](CHANGELOG.md) - Version history

## Get Help

- 🐛 **Found a bug?** [Open an issue](https://github.com/your-repo/issues)
- 💡 **Have a question?** Check the documentation first
- 🤝 **Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Happy analyzing!** 🎉

If you find this extension helpful, please give it a ⭐ on GitHub!
