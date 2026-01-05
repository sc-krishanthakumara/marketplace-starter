# Architecture Documentation

## Overview

The Semantic Content Analyzer is a Sitecore Marketplace extension that runs as a **Pages Context Panel** app. It provides real-time analysis of page content by extracting, classifying, and displaying text fields organized by semantic meaning.

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    XM Cloud Pages                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Pages Context Panel (iframe)               │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────────────┐ │     │
│  │  │      Semantic Content Analyzer App           │ │     │
│  │  │                                               │ │     │
│  │  │  ┌─────────────┐     ┌──────────────────┐   │ │     │
│  │  │  │  SearchBox  │     │  Component Tree  │   │ │     │
│  │  │  └─────────────┘     └──────────────────┘   │ │     │
│  │  │                                               │ │     │
│  │  │  ┌────────────────────────────────────────┐ │ │     │
│  │  │  │      Semantic List                     │ │ │     │
│  │  │  │  (Categorized Content)                 │ │ │     │
│  │  │  └────────────────────────────────────────┘ │ │     │
│  │  └──────────────────────────────────────────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Marketplace SDK
                            │ (Host/Client Bridge)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    XM Cloud Platform                         │
│  ┌────────────────────┐      ┌──────────────────────┐       │
│  │  Pages Context     │      │  Experience Edge     │       │
│  │  Events & State    │      │  Preview GraphQL     │       │
│  └────────────────────┘      └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Layer 1: Presentation Layer

**Components** (`src/components/`)

- **SearchBox**: Debounced search input with clear functionality
- **ComponentTree**: Hierarchical display of page components with expand/collapse
- **SemanticList**: Categorized content display with filtering and metadata

**Responsibilities**:
- Render UI elements
- Handle user interactions
- Manage local component state
- Emit events to parent

### Layer 2: Application Layer

**Main Extension** (`src/app/pages-contextpanel-extension/page.tsx`)

- Initializes Marketplace SDK client
- Subscribes to Pages context events
- Orchestrates data flow between layers
- Manages global application state
- Coordinates filtering and search

**Responsibilities**:
- Application state management
- Event subscription and handling
- Data flow coordination
- Filter orchestration

### Layer 3: Business Logic Layer

**Semantic Classifier** (`src/utils/semanticClassifier.ts`)

- Field name pattern matching
- Content analysis (HTML, URLs, etc.)
- Category assignment logic
- Text extraction and normalization
- Search filtering
- Category grouping

**Content Parser** (`src/utils/contentParser.ts`)

- GraphQL response parsing
- Component tree building
- Field extraction and normalization
- Semantic item creation
- Tree traversal utilities

**Responsibilities**:
- Core business logic
- Data transformation
- Classification algorithms
- Utility functions

### Layer 4: Data Access Layer

**GraphQL Service** (`src/services/graphql.ts`)

- Experience Edge API client
- Query construction
- Response handling
- Error management

**Marketplace Client Hook** (`src/utils/hooks/useMarketplaceClient.ts`)

- SDK initialization
- Retry logic
- State management
- Lifecycle handling

**Responsibilities**:
- External API communication
- Data fetching
- SDK integration

### Layer 5: Type Definitions

**Types** (`src/types/index.ts`)

- TypeScript interfaces
- Type unions
- Data models

## Data Flow

### Initialization Flow

```
1. Component Mount
   └─> useMarketplaceClient hook
       └─> ClientSDK.init()
           └─> Ready state

2. SDK Ready
   └─> Query "application.context"
       └─> Set app context
   └─> Query "pages.context" (with subscription)
       └─> Set pages context
       └─> Subscribe to updates

3. Pages Context Available
   └─> Fetch page content (GraphQL)
       └─> Parse response
           └─> Extract components
               └─> Classify fields
                   └─> Create semantic items
                       └─> Render UI
```

### Update Flow (Page Switch)

```
1. User switches page in Pages
   └─> Pages context event fired
       └─> SDK subscription callback
           └─> Update pages context state
               └─> Trigger content fetch
                   └─> Parse new content
                       └─> Update semantic items
                           └─> Re-render UI
```

### Filter Flow

```
1. User types in search box
   └─> Debounced input (300ms)
       └─> Update search query state
           └─> useMemo recalculates filtered items
               └─> filterBySearch()
                   └─> Re-render SemanticList

2. User toggles category filter
   └─> Update selected categories state
       └─> useMemo recalculates filtered items
           └─> Filter by category
               └─> Re-render SemanticList

3. User selects component in tree
   └─> Update selected component state
       └─> useMemo recalculates filtered items
           └─> Filter by component ID
               └─> Re-render SemanticList
```

## State Management

### Global State (PagesContextPanel)

```typescript
{
  // SDK State
  client: ClientSDK | null
  isInitialized: boolean
  error: Error | null

  // Context State
  pagesContext: PagesContext | undefined
  appContext: ApplicationContext | undefined

  // Content State
  pageContent: PageContent | null
  semanticItems: SemanticTextItem[]
  isLoading: boolean
  loadError: string | null

  // Filter State
  searchQuery: string
  selectedCategories: SemanticCategory[]
  selectedComponentId: string | undefined
}
```

### Component State

Each component manages its own local UI state:

- **SearchBox**: `value`, `debouncedValue`
- **ComponentTree**: `expandedIds`
- **SemanticList**: `expandedCategories`, item expansion state

## Classification Algorithm

### Multi-Signal Approach

The semantic classifier uses a weighted decision tree:

```
1. Check Template Name
   └─> If match → Use template category (High confidence)

2. Check Field Type
   └─> If Sitecore type → Map to category (High confidence)

3. Check Field Name
   └─> If pattern match → Use name category (Medium confidence)
       └─> Refine with Content Analysis
           └─> If HTML detected → Override to RichText

4. Check Content Patterns
   └─> If pattern match → Use content category (Medium confidence)

5. Fallback Heuristics
   └─> Length > 200 → Paragraph
   └─> Length > 50 → Paragraph
   └─> Default → Label
```

### Pattern Matching

**Field Name Patterns**: RegExp matching against common naming conventions
- Case-insensitive
- Suffix matching (`/title$/i`)
- Word boundary matching

**Content Patterns**: RegExp and string analysis
- HTML tag detection (`/<[^>]+>/`)
- URL patterns (`/^https?:\/\//`)
- Image extensions (`/\.(jpg|png|gif)$/`)

## Performance Considerations

### Optimization Strategies

1. **Debounced Search**: 300ms debounce on search input prevents excessive re-renders
2. **Memoization**: `useMemo` for filtered items computation
3. **Callback Memoization**: `useCallback` for event handlers
4. **Virtual Scrolling**: (Future enhancement for large lists)
5. **Lazy Loading**: Components load data only when visible

### Performance Metrics

- Initial load: < 2s
- Page switch: < 1s
- Search response: < 300ms (debounce)
- Filter toggle: < 100ms

## Security Considerations

### API Security

- API keys stored in environment variables
- Never expose credentials in client code
- Use HTTPS for all API calls
- Validate and sanitize all GraphQL responses

### XSS Prevention

- All user content is displayed as text (not HTML)
- Plain text extraction for rich text fields
- React's built-in XSS protection

### Content Security Policy

- Restrict iframe embedding
- Limit external resource loading
- Validate message origins in SDK communication

## Scalability

### Current Limitations

- In-memory state management (not suitable for very large pages)
- No pagination (all content loaded at once)
- Limited to single page at a time

### Future Enhancements

1. **Pagination**: Load components/items in chunks
2. **Virtual Scrolling**: Render only visible items
3. **Caching**: Cache parsed content for recently viewed pages
4. **Web Workers**: Offload parsing to background thread
5. **GraphQL Subscriptions**: Real-time updates for collaborative editing

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │     E2E     │  (Future)
        └─────────────┘
       ┌───────────────┐
       │  Integration  │  (Limited)
       └───────────────┘
      ┌─────────────────┐
      │   Unit Tests    │  (Comprehensive)
      └─────────────────┘
```

### Coverage Goals

- Utilities: 90%+
- Components: 80%+
- Integration: 60%+
- Overall: 80%+

### Test Types

1. **Unit Tests**: Pure functions, classifiers, parsers
2. **Component Tests**: Rendering, interactions, props
3. **Integration Tests**: Data flow, SDK integration (future)
4. **E2E Tests**: Full user workflows (future)

## Deployment

### Build Process

```
1. Development
   └─> npm run dev
       └─> Next.js dev server
           └─> Hot reload enabled

2. Production Build
   └─> npm run build
       └─> TypeScript compilation
       └─> Next.js optimization
       └─> Static generation
           └─> Output to .next/

3. Deployment
   └─> npm start (for server)
   └─> or export as static site
   └─> Deploy to hosting platform
```

### Environment Configuration

- **Development**: `.env.local`
- **Staging**: `.env.staging`
- **Production**: Environment variables set in hosting platform

## Monitoring and Observability

### Logging

- Console logging for development
- Structured logging for production (future)
- Error boundary for React errors

### Error Handling

- Try-catch blocks around API calls
- Error state management in components
- User-friendly error messages

### Analytics (Future)

- Track feature usage
- Monitor performance metrics
- Error rate tracking

## Extensibility

### Adding New Features

1. **New Semantic Categories**: Update types, patterns, UI
2. **Custom Filters**: Add filter state and logic
3. **New Data Sources**: Implement service layer
4. **Custom Views**: Create new components

### Plugin Architecture (Future)

- Custom classifier plugins
- Custom renderer plugins
- Custom data source plugins

## References

- [Sitecore Marketplace SDK](https://doc.sitecore.com/xmc/en/developers/xm-cloud/marketplace-sdk.html)
- [Experience Edge GraphQL](https://doc.sitecore.com/xmc/en/developers/xm-cloud/the-experience-edge-for-xm-graphql-schema.html)
- [Next.js Architecture](https://nextjs.org/docs/architecture)
