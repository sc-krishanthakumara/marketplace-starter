# Sitecore Marketplace - Semantic Content Analyzer

A production-ready **Pages Context Panel** extension for XM Cloud that analyzes and displays page content organized by semantic categories (Heading, Paragraph, RichText, Label, etc.), with full component metadata.

## Features

- **✨ Semantic Content Classification**: Automatically categorizes text fields into meaningful buckets (Heading, Paragraph, RichText, Label, Link, Button, Image, List)
- **🌲 Component Tree View**: Visual hierarchy of all components on the current page
- **🔍 Real-time Search**: Filter content by text, component name, field name, or category
- **📊 Category Filtering**: Toggle visibility of specific semantic categories
- **🔄 Live Updates**: Automatically refreshes when the author switches pages or components
- **📱 Responsive UI**: Clean, modern interface optimized for the Pages context panel
- **🎯 Component Selection**: Click components in the tree to filter semantic items
- **🔗 Full Metadata**: Displays component name, datasource ID, field name, placeholder, and params for each text item

## Architecture

### Technology Stack

- **Framework**: Next.js 15+ with React 19
- **Language**: TypeScript (strict mode)
- **SDK**: Sitecore Marketplace SDK (@sitecore-marketplace-sdk/client & xmc)
- **Data Fetching**: GraphQL (graphql-request) for Experience Edge Preview API
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint

### Project Structure

```
marketplace-starter/
├── src/
│   ├── app/
│   │   ├── pages-contextpanel-extension/
│   │   │   └── page.tsx                 # Main extension entry point
│   │   └── layout.tsx                   # Root layout
│   ├── components/
│   │   ├── SearchBox.tsx                # Search input with debouncing
│   │   ├── ComponentTree.tsx            # Hierarchical component view
│   │   ├── SemanticList.tsx             # Categorized content display
│   │   └── __tests__/                   # Component tests
│   ├── services/
│   │   └── graphql.ts                   # Experience Edge GraphQL client
│   ├── utils/
│   │   ├── semanticClassifier.ts        # Text classification logic
│   │   ├── contentParser.ts             # GraphQL response parsing
│   │   ├── hooks/
│   │   │   └── useMarketplaceClient.ts  # SDK initialization hook
│   │   └── __tests__/                   # Utility tests
│   └── types/
│       └── index.ts                     # TypeScript definitions
├── jest.config.js                       # Jest configuration
├── jest.setup.js                        # Jest setup
├── tsconfig.json                        # TypeScript config
└── package.json                         # Dependencies & scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- XM Cloud tenant with Marketplace access
- Experience Edge Preview API credentials (for production use)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd marketplace-starter
```

2. **Install dependencies**

```bash
npm install
```

3. **Run in development mode**

```bash
npm run dev
```

The app will start on `http://localhost:3000`.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## Usage

### As a Marketplace Extension

1. **Package the Extension**: Build and package your extension according to Sitecore Marketplace guidelines
2. **Install in XM Cloud**: Upload to your tenant's Marketplace
3. **Open in Pages**: Navigate to XM Cloud Pages and open the context panel
4. **View Content**: The extension automatically loads when you select a page

### Page Context Panel Features

#### Search

- Type in the search box to filter content
- Searches across: text content, component names, field names, and categories
- Debounced input (300ms) for performance

#### Component Tree (Left Panel)

- Displays hierarchical structure of page components
- Shows component name, type, and field count
- Click to select a component and filter the semantic list
- Expandable/collapsible nodes

#### Semantic List (Right Panel)

- Groups text content by semantic category
- Click category chips to filter by type
- Expandable items show full metadata:
  - Component name
  - Field name
  - Datasource item ID
  - Rendering placeholder
  - Component parameters
  - Breadcrumb path

### Semantic Categories

The extension classifies content into these categories:

- **Heading**: Titles, headings (h1-h6), page titles
- **Paragraph**: Body text, descriptions, multi-line text
- **RichText**: HTML content, formatted text, WYSIWYG fields
- **Label**: Short text, names, captions, tags
- **Link**: URLs, CTAs, navigation links
- **Button**: Button text, call-to-action labels
- **Image**: Image URLs, thumbnails, media
- **List**: Lists, collections, menu items

### Classification Logic

The semantic classifier uses multiple signals:

1. **Field Name Patterns**: Regex matching on common field naming conventions
2. **Field Type**: Sitecore field types (Single-Line Text, Rich Text, etc.)
3. **Content Analysis**: HTML detection, URL patterns, content length
4. **Template Name**: Sitecore template information (when available)

## API Integration

### GraphQL Service

The `ExperienceEdgeService` class handles all GraphQL queries:

```typescript
import { ExperienceEdgeService } from '@/src/services/graphql';

const service = new ExperienceEdgeService({
  endpoint: 'https://edge.sitecorecloud.io/api/graphql/v1',
  apiKey: 'YOUR_API_KEY',
  siteName: 'YOUR_SITE',
});

// Fetch page content
const response = await service.fetchPageContent(itemId, language);

// Fetch datasource item
const datasource = await service.fetchDatasourceItem(itemId, language);
```

### Configuration

Update the service configuration in `src/app/pages-contextpanel-extension/page.tsx`:

```typescript
const service = new ExperienceEdgeService({
  endpoint: process.env.NEXT_PUBLIC_EDGE_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_EDGE_API_KEY,
  siteName: process.env.NEXT_PUBLIC_SITE_NAME,
});
```

Add environment variables to `.env.local`:

```
NEXT_PUBLIC_EDGE_ENDPOINT=https://edge.sitecorecloud.io/api/graphql/v1
NEXT_PUBLIC_EDGE_API_KEY=your-api-key
NEXT_PUBLIC_SITE_NAME=your-site-name
```

## Development

### Adding New Semantic Categories

1. **Update Types**: Add to `SemanticCategory` union in `src/types/index.ts`
2. **Add Patterns**: Update `FIELD_PATTERNS` in `src/utils/semanticClassifier.ts`
3. **Add Colors/Icons**: Update `CATEGORY_COLORS` and `CATEGORY_ICONS` in `src/components/SemanticList.tsx`
4. **Write Tests**: Add test cases in `src/utils/__tests__/semanticClassifier.test.ts`

### Customizing the UI

All component styles are defined inline using TypeScript style objects. To customize:

1. Edit the `styles` constant in each component file
2. Modify colors, spacing, typography to match your brand
3. Use CSS-in-JS or add a stylesheet for more complex styling

### Live Updates

The extension subscribes to Pages events using the Marketplace SDK:

```typescript
client.query("pages.context", {
  subscribe: true,
  onSuccess: (res) => {
    setPagesContext(res);
  },
});
```

This automatically triggers content refresh when:
- User navigates to a different page
- User selects a different component
- Page content is updated

## Testing Strategy

### Unit Tests

- **Utilities**: Test classification logic, parsing functions, filters
- **Components**: Test rendering, user interactions, state changes
- **Coverage Target**: 80%+ code coverage

### Test Files

- `src/utils/__tests__/semanticClassifier.test.ts`: Classification logic
- `src/utils/__tests__/contentParser.test.ts`: Content parsing
- `src/components/__tests__/SearchBox.test.tsx`: Search component

### Running Specific Tests

```bash
# Run specific test file
npm test semanticClassifier.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="classifyField"
```

## Troubleshooting

### Extension Not Loading

1. Verify Marketplace SDK initialization in browser console
2. Check that the extension is properly registered in XM Cloud
3. Ensure you're opening the context panel in XM Cloud Pages (not Content Editor)

### No Content Displayed

1. Check browser console for GraphQL errors
2. Verify API credentials and endpoint configuration
3. Ensure the page has published/preview content available
4. Check that the item has fields with text content

### Performance Issues

1. Reduce debounce delay in SearchBox (default: 300ms)
2. Implement pagination for large component trees
3. Use React.memo() for expensive component renders
4. Add virtual scrolling for long lists

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Lint your code (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Additional Resources

- [Sitecore Marketplace Documentation](https://doc.sitecore.com/xmc/en/developers/xm-cloud/marketplace.html)
- [XM Cloud Developer Portal](https://developers.sitecore.com/xm-cloud)
- [Experience Edge GraphQL API](https://doc.sitecore.com/xmc/en/developers/xm-cloud/the-experience-edge-for-xm-graphql-schema.html)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Contact the Sitecore community forums
- Refer to the official Sitecore Marketplace documentation

---

**Built with ❤️ for the Sitecore XM Cloud community**
