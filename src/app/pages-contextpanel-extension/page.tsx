"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  ApplicationContext,
  PagesContext,
} from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import type {
  PageContent,
  SemanticTextItem,
  SemanticCategory,
} from "@/src/types";
import { ExperienceEdgeService } from "@/src/services/graphql";
import {
  parsePageContent,
  extractSemanticItems,
} from "@/src/utils/contentParser";
import { filterBySearch } from "@/src/utils/semanticClassifier";
import {
  extractPageContentFromContext,
  enrichPageContentWithDatasources,
  enrichPageContentWithDOMContent,
  debugPagesContext,
} from "@/src/utils/pagesContextParser";
import { createAuthoringGraphQLService } from "@/src/services/authoringGraphql";
import { SearchBox } from "@/src/components/SearchBox";
import { ComponentTree } from "@/src/components/ComponentTree";
import { SemanticList } from "@/src/components/SemanticList";

function PagesContextPanel() {
  const { client, error, isInitialized } = useMarketplaceClient();

  // Context state
  const [pagesContext, setPagesContext] = useState<PagesContext>();
  const [appContext, setAppContext] = useState<ApplicationContext>();

  // Content state
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [semanticItems, setSemanticItems] = useState<SemanticTextItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    SemanticCategory[]
  >([]);
  const [selectedComponentId, setSelectedComponentId] = useState<
    string | undefined
  >();
  
  // View mode state
  const [viewMode, setViewMode] = useState<'semantic' | 'all'>('semantic');

  // Initialize contexts
  useEffect(() => {
    if (!error && isInitialized && client) {
      client
        .query("application.context")
        .then((res) => {
          console.log("Success retrieving application.context:", res.data);
          setAppContext(res.data);
        })
        .catch((error) => {
          console.error("Error retrieving application.context:", error);
        });

      client
        .query("pages.context", {
          subscribe: true,
          onSuccess: (res) => {
            console.log("Success retrieving pages.context:", res);
            setPagesContext(res);
          },
        })
        .catch((error) => {
          console.error("Error retrieving pages.context:", error);
        });
    } else if (error) {
      console.error("Error initializing Marketplace client:", error);
    }
  }, [client, error, isInitialized]);

  // Fetch page content when context changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!pagesContext?.pageInfo?.id) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        console.log(
          "📄 Extracting content for page:",
          pagesContext.pageInfo.name,
          pagesContext.pageInfo.id
        );

        // Debug: Log the full context to see what's available
        debugPagesContext(pagesContext);

        // Step 1: Extract component structure from the Pages context
        let realPageContent = extractPageContentFromContext(pagesContext);
        
        console.log("✅ Extracted component structure:", realPageContent);
        
        // If no components found in real data, fall back to mock for demo
        if (realPageContent.components.length === 0) {
          console.warn("⚠️ No components found in Pages context, using mock data for demo");
          const mockPageContent = createMockPageContent(pagesContext);
          setPageContent(mockPageContent);
          const mockItems = extractSemanticItems(mockPageContent);
          setSemanticItems(mockItems);
          return;
        }

        // Step 2: Try to enrich with content (multiple strategies)
        
        // Strategy 1: Extract from rendered page DOM (no API needed!)
        try {
          console.log("🎨 Trying to extract content from rendered page...");
          const domEnriched = enrichPageContentWithDOMContent(realPageContent);
          
          // Check if DOM extraction actually found REAL content
          // (not just placeholder "DataSource" fields)
          const realFields = domEnriched.components.flatMap(c => 
            c.fields.filter(f => f.name !== 'DataSource')
          );
          
          if (realFields.length > 0) {
            console.log(`✅ Successfully extracted ${realFields.length} fields from page DOM!`);
            realPageContent = domEnriched;
          } else {
            console.log("⚠️ DOM extraction returned no content, trying GraphQL...");
            throw new Error("DOM extraction failed");
          }
        } catch (domError) {
          // Strategy 2: Fall back to GraphQL API
          try {
            const graphqlService = createAuthoringGraphQLService();
            
            if (graphqlService) {
              console.log("🚀 Fetching datasource field values via GraphQL...");
              realPageContent = await enrichPageContentWithDatasources(
                realPageContent,
                graphqlService
              );
              console.log("✅ Enriched with datasource fields:", realPageContent);
            } else {
              console.warn("⚠️ No content extraction method available");
              console.log("💡 Options:");
              console.log("   1. DOM extraction failed (cross-origin restriction)");
              console.log("   2. GraphQL not configured");
              console.log("");
              console.log("📋 Current state: Showing component structure only");
              console.log("   - Component names: ✅");
              console.log("   - Datasource paths: ✅");  
              console.log("   - Field values: ❌");
              console.log("");
              console.log("🔧 To get field values, see: GRAPHQL_SETUP.md");
            }
          } catch (graphqlError) {
            console.warn("⚠️ Could not fetch datasource fields:", graphqlError);
            console.log("Showing component structure only...");
          }
        }

        // Use the extracted (and possibly enriched) content
        setPageContent(realPageContent);
        const items = extractSemanticItems(realPageContent);
        setSemanticItems(items);
        console.log(`✅ Extracted ${items.length} semantic items from real page data`);
        
      } catch (err) {
        console.error("❌ Error extracting page content:", err);
        
        // On error, try to provide helpful debugging info
        console.log("Falling back to mock data due to error");
        try {
          const mockPageContent = createMockPageContent(pagesContext);
          setPageContent(mockPageContent);
          const items = extractSemanticItems(mockPageContent);
          setSemanticItems(items);
        } catch (mockErr) {
          console.error("Failed to create mock data:", mockErr);
          setLoadError(
            err instanceof Error ? err.message : "Failed to load content"
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [pagesContext]);

  // Filter items based on search, category selection, and view mode
  const filteredItems = useMemo(() => {
    let items = semanticItems;

    // In 'all' mode, show everything including non-semantic items
    // In 'semantic' mode, filter out DataSource pseudo-fields
    if (viewMode === 'semantic') {
      items = items.filter(item => item.metadata.fieldName !== 'DataSource');
    }

    // Filter by search query
    if (searchQuery) {
      items = filterBySearch(items, searchQuery);
    }

    // Filter by selected categories (if any are selected)
    if (selectedCategories.length > 0) {
      items = items.filter((item) =>
        selectedCategories.includes(item.category)
      );
    }

    // Filter by selected component
    if (selectedComponentId) {
      items = items.filter(
        (item) => item.metadata.componentId === selectedComponentId
      );
    }

    return items;
  }, [semanticItems, searchQuery, selectedCategories, selectedComponentId, viewMode]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleToggleCategory = useCallback((category: SemanticCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  }, []);

  const handleSelectComponent = useCallback((componentId: string) => {
    setSelectedComponentId((prev) =>
      prev === componentId ? undefined : componentId
    );
  }, []);

  // Loading states
  if (!isInitialized) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Initializing Marketplace client...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Initialization Error</h2>
        <p style={styles.errorMessage}>{error.message}</p>
      </div>
    );
  }

  if (!pagesContext?.pageInfo) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>
          Waiting for page context... Please open a page in XM Cloud Pages.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Semantic Content Analyzer</h1>
          {appContext?.name && (
            <span style={styles.appBadge}>{appContext.name}</span>
          )}
        </div>
        <div style={styles.pageInfo}>
          <div style={styles.pageInfoItem}>
            <span style={styles.pageInfoLabel}>Page:</span>
            <span style={styles.pageInfoValue}>
              {pagesContext.pageInfo.name}
            </span>
          </div>
          <div style={styles.pageInfoItem}>
            <span style={styles.pageInfoLabel}>Language:</span>
            <span style={styles.pageInfoValue}>
              {pagesContext.pageInfo.language || "en"}
            </span>
          </div>
          <div style={styles.pageInfoItem}>
            <span style={styles.pageInfoLabel}>Items:</span>
            <span style={styles.pageInfoValue}>
              {filteredItems.length} / {semanticItems.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search and View Mode Toggle */}
      <div style={styles.searchContainer}>
        <SearchBox onSearch={handleSearch} />
        <div style={styles.viewModeToggle}>
          <button
            style={{
              ...styles.viewModeButton,
              ...(viewMode === 'semantic' ? styles.viewModeButtonActive : {}),
            }}
            onClick={() => setViewMode('semantic')}
          >
            📊 Semantic View
          </button>
          <button
            style={{
              ...styles.viewModeButton,
              ...(viewMode === 'all' ? styles.viewModeButtonActive : {}),
            }}
            onClick={() => setViewMode('all')}
          >
            📋 All Fields
          </button>
        </div>
      </div>

      {/* Main content area */}
      {isLoading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading page content...</p>
        </div>
      ) : loadError ? (
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Error Loading Content</h2>
          <p style={styles.errorMessage}>{loadError}</p>
        </div>
      ) : (
        <div style={styles.mainContent}>
          {/* Left panel: Component Tree */}
          <div style={styles.leftPanel}>
            <ComponentTree
              components={pageContent?.components || []}
              selectedComponentId={selectedComponentId}
              onSelectComponent={handleSelectComponent}
            />
          </div>

          {/* Right panel: Semantic List or Setup Instructions */}
          <div style={styles.rightPanel}>
            {semanticItems.length === 0 || 
             semanticItems.every(item => item.metadata.fieldName === 'DataSource') ? (
              <div style={styles.setupPrompt}>
                <h3 style={styles.setupTitle}>📋 Component Structure Loaded</h3>
                <p style={styles.setupText}>
                  The extension has successfully loaded the component structure from your page, 
                  but needs additional configuration to display field values.
                </p>
                
                <div style={styles.setupOptions}>
                  <div style={styles.setupOption}>
                    <h4 style={styles.setupOptionTitle}>Option 1: GraphQL API (Recommended)</h4>
                    <p style={styles.setupOptionText}>
                      Set up GraphQL API credentials to fetch exact field values with full metadata.
                    </p>
                    <ul style={styles.setupList}>
                      <li>✅ Exact field names and values</li>
                      <li>✅ All field types supported</li>
                      <li>✅ Reliable and accurate</li>
                    </ul>
                    <p style={styles.setupSteps}>
                      <strong>Quick Setup:</strong><br/>
                      1. Get API key from XM Cloud Deploy<br/>
                      2. Create <code>.env.local</code> file<br/>
                      3. Add credentials and restart server
                    </p>
                    <p style={styles.setupLink}>
                      📖 See <strong>GRAPHQL_SETUP.md</strong> for instructions
                    </p>
                  </div>
                  
                  <div style={styles.setupNote}>
                    <strong>Note:</strong> DOM extraction failed due to cross-origin restrictions. 
                    Your browser's security settings prevent reading content from the parent page.
                  </div>
                </div>
              </div>
            ) : (
              <SemanticList
                items={filteredItems}
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Create mock page content for demonstration
 * In production, this would come from the GraphQL API
 */
function createMockPageContent(pagesContext: PagesContext): PageContent {
  return {
    itemId: pagesContext.pageInfo?.id || "",
    name: pagesContext.pageInfo?.name || "Untitled Page",
    language: pagesContext.pageInfo?.language || "en",
    path: pagesContext.pageInfo?.path || "/",
    components: [
      {
        id: "hero-component",
        name: "Hero Banner",
        componentName: "Hero",
        type: "ContentBlock",
        datasourceId: "hero-datasource-123",
        placeholder: "main",
        fields: [
          {
            name: "Heading",
            value: "Welcome to XM Cloud",
            type: "Single-Line Text",
            category: "Heading",
          },
          {
            name: "Subheading",
            value:
              "Build amazing digital experiences with the power of Sitecore",
            type: "Single-Line Text",
            category: "Paragraph",
          },
          {
            name: "CtaText",
            value: "Get Started",
            type: "Single-Line Text",
            category: "Button",
          },
          {
            name: "CtaLink",
            value: "/get-started",
            type: "General Link",
            category: "Link",
          },
        ],
        children: [],
        path: ["Home", "Hero Banner"],
      },
      {
        id: "content-section",
        name: "Content Section",
        componentName: "RichTextSection",
        type: "ContentBlock",
        datasourceId: "content-datasource-456",
        placeholder: "main",
        fields: [
          {
            name: "Title",
            value: "About Our Platform",
            type: "Single-Line Text",
            category: "Heading",
          },
          {
            name: "Body",
            value:
              "<p>XM Cloud is Sitecore's cloud-native, composable digital experience platform (DXP) that enables brands to create and manage web content at scale.</p><p>With powerful features like AI-driven personalization, seamless integrations, and developer-friendly tools, you can deliver exceptional experiences across all channels.</p>",
            type: "Rich Text",
            category: "RichText",
          },
        ],
        children: [
          {
            id: "feature-list",
            name: "Feature List",
            componentName: "FeatureList",
            type: "ListComponent",
            datasourceId: "features-datasource-789",
            placeholder: "content",
            fields: [
              {
                name: "ListTitle",
                value: "Key Features",
                type: "Single-Line Text",
                category: "Heading",
              },
              {
                name: "Features",
                value:
                  "Composable Architecture|Cloud-Native Performance|Headless CMS|Visual Editing|Multi-site Management",
                type: "Multi-Line Text",
                category: "List",
              },
            ],
            children: [],
            path: ["Home", "Content Section", "Feature List"],
          },
        ],
        path: ["Home", "Content Section"],
      },
      {
        id: "footer-component",
        name: "Footer",
        componentName: "Footer",
        type: "Navigation",
        datasourceId: "footer-datasource-999",
        placeholder: "footer",
        fields: [
          {
            name: "Copyright",
            value: "© 2026 Sitecore. All rights reserved.",
            type: "Single-Line Text",
            category: "Label",
          },
          {
            name: "Links",
            value: "Privacy Policy|Terms of Service|Contact Us",
            type: "Multi-Line Text",
            category: "List",
          },
        ],
        children: [],
        path: ["Home", "Footer"],
      },
    ],
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: "#f9fafb",
  },
  header: {
    padding: "16px 24px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 600,
    color: "#111827",
  },
  appBadge: {
    padding: "4px 12px",
    backgroundColor: "#eff6ff",
    color: "#1e40af",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500,
  },
  pageInfo: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  pageInfoItem: {
    display: "flex",
    gap: "8px",
    fontSize: "13px",
  },
  pageInfoLabel: {
    color: "#6b7280",
    fontWeight: 500,
  },
  pageInfoValue: {
    color: "#111827",
  },
  searchContainer: {
    padding: "16px 24px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  viewModeToggle: {
    display: "flex",
    gap: "8px",
    marginLeft: "auto",
  },
  viewModeButton: {
    padding: "6px 12px",
    backgroundColor: "#f3f4f6",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  viewModeButtonActive: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderColor: "#3b82f6",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    gap: "16px",
    padding: "16px 24px",
    overflow: "hidden",
  },
  leftPanel: {
    width: "35%",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
  },
  rightPanel: {
    flex: 1,
    minWidth: "400px",
    display: "flex",
    flexDirection: "column",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
  },
  errorContainer: {
    padding: "48px 24px",
    textAlign: "center",
  },
  errorTitle: {
    color: "#dc2626",
    fontSize: "18px",
    marginBottom: "8px",
  },
  errorMessage: {
    color: "#6b7280",
    fontSize: "14px",
  },
  setupPrompt: {
    padding: "24px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  setupTitle: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
  },
  setupText: {
    margin: "0 0 24px 0",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#6b7280",
  },
  setupOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  setupOption: {
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  setupOptionTitle: {
    margin: "0 0 8px 0",
    fontSize: "15px",
    fontWeight: 600,
    color: "#111827",
  },
  setupOptionText: {
    margin: "0 0 12px 0",
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#6b7280",
  },
  setupList: {
    margin: "0 0 12px 0",
    paddingLeft: "20px",
    fontSize: "13px",
    color: "#374151",
  },
  setupSteps: {
    margin: "12px 0",
    padding: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#374151",
    border: "1px solid #e5e7eb",
  },
  setupLink: {
    margin: "12px 0 0 0",
    fontSize: "13px",
    color: "#3b82f6",
  },
  setupNote: {
    padding: "12px",
    backgroundColor: "#fef3c7",
    borderRadius: "6px",
    border: "1px solid #fde047",
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#92400e",
  },
};

// Add keyframes for spinner animation
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default PagesContextPanel;
