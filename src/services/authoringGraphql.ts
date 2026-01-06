// GraphQL Service for Sitecore XM Cloud
// Works with both Preview API (Edge Preview) and Authoring API

import { GraphQLClient } from 'graphql-request';

export interface AuthoringGraphQLConfig {
  endpoint: string;
  apiKey: string;
}

export interface DatasourceFieldValue {
  name: string;
  value: string;
  type?: string;
  jsonValue?: any;
}

export interface DatasourceItem {
  id: string;
  name: string;
  path: string;
  fields: DatasourceFieldValue[];
  children?: DatasourceItem[];
}

export class AuthoringGraphQLService {
  private client: GraphQLClient | null = null;
  private endpoint: string;
  private apiKey: string;
  private useProxy: boolean;

  constructor(config: AuthoringGraphQLConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    
    // Check if we're in a browser environment
    // If so, use the Next.js API proxy to avoid CORS issues
    this.useProxy = typeof window !== 'undefined';
    
    if (this.endpoint && this.apiKey) {
      // If using proxy, construct full URL using window.location.origin
      const clientEndpoint = this.useProxy 
        ? `${window.location.origin}/api/graphql`
        : this.endpoint;
      
      this.client = new GraphQLClient(clientEndpoint, {
        headers: this.useProxy ? {} : {
          'sc_apikey': this.apiKey,
        },
      });
    }
  }

  isConfigured(): boolean {
    return !!(this.client && this.endpoint && this.apiKey);
  }

  /**
   * Fetch a datasource item by path
   */
  async fetchDatasourceByPath(
    datasourcePath: string,
    language: string = 'en',
    currentPagePath?: string
  ): Promise<DatasourceItem | null> {
    if (!this.client) {
      console.warn('AuthoringGraphQLService not configured');
      return null;
    }

    // Remove "local:" prefix if present
    let cleanPath = datasourcePath.replace(/^local:/, '');
    
    // Construct full Sitecore path
    let fullPath: string;
    
    if (cleanPath.startsWith('/sitecore/')) {
      // Already a full path
      fullPath = cleanPath;
    } else {
      // Relative path - need to resolve it
      // Sitecore datasources are typically stored under /Data/ relative to site root
      // But Pages context might provide them relative to current page
      
      // Normalize the path
      if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
      }
      
      // Check if path starts with /Data/ - these are typically relative to page context
      if (cleanPath.startsWith('/Data/')) {
        // Datasources under /Data/ are stored relative to the page (e.g., /Home/Data/...)
        // First try: under current page
        if (currentPagePath) {
          // Extract the page path without /sitecore/content/sync/sync prefix
          let pageBase = currentPagePath;
          if (pageBase.startsWith('/sitecore/content/sync/sync')) {
            pageBase = pageBase.replace('/sitecore/content/sync/sync', '');
          }
          pageBase = pageBase.replace(/\/$/, '');
          
          // Construct path: /sitecore/content/sync/sync/[Page]/Data/...
          fullPath = `/sitecore/content/sync/sync${pageBase}${cleanPath}`;
        } else {
          // Fallback: Under Home page
          fullPath = `/sitecore/content/sync/sync/Home${cleanPath}`;
        }
      } else if (currentPagePath) {
        // Try to resolve relative to current page
        // Extract the page path without /sitecore/content/sync/sync prefix
        let pageBase = currentPagePath;
        if (pageBase.startsWith('/sitecore/content/sync/sync')) {
          pageBase = pageBase.replace('/sitecore/content/sync/sync', '');
        }
        
        // Remove any trailing slashes
        pageBase = pageBase.replace(/\/$/, '');
        
        // Construct path: current page + datasource path
        // But avoid double paths (e.g., /Home/Home/Data/...)
        if (cleanPath.startsWith(pageBase)) {
          // Path already includes page base, just add sitecore prefix
          fullPath = `/sitecore/content/sync/sync${cleanPath}`;
        } else {
          // Append datasource to page path
          fullPath = `/sitecore/content/sync/sync${pageBase}${cleanPath}`;
        }
      } else {
        // Fallback: assume relative to Home
        fullPath = `/sitecore/content/sync/sync/Home${cleanPath}`;
      }
    }
    
    // Clean up any double slashes or double path segments
    fullPath = fullPath.replace(/\/+/g, '/');
    
    // Fix double "Home" issue: /Home/Home/... -> /Home/...
    fullPath = fullPath.replace(/\/Home\/Home\//g, '/Home/');

    // Use Experience Edge / Preview API schema (simple and well-documented)
    // Also fetch children for components like MultiPromo that may have nested items
    const query = `
      query GetDatasourceItem($path: String!, $language: String!) {
        item(path: $path, language: $language) {
          id
          name
          path
          fields {
            name
            value
            jsonValue
          }
          children {
            results {
              id
              name
              path
              fields {
                name
                value
                jsonValue
              }
            }
          }
        }
      }
    `;

    try {
      console.log(`📡 Fetching datasource: ${fullPath} (lang: ${language})`);
      if (currentPagePath) {
        console.log(`   Original path: ${datasourcePath}, Current page: ${currentPagePath}`);
      }
      
      let data: any;
      try {
        data = await this.client.request(query, {
          path: fullPath,
          language,
        });
      } catch (queryError: any) {
        // If query fails, try alternative path resolutions
        if (cleanPath.startsWith('/Data/')) {
          // For /Data/ paths, try multiple strategies
          const alternatives: string[] = [];
          
          if (currentPagePath) {
            let pageBase = currentPagePath.replace('/sitecore/content/sync/sync', '');
            pageBase = pageBase.replace(/\/$/, '');
            
            // Strategy 1: Under Home page (common fallback)
            if (pageBase !== '/Home') {
              alternatives.push(`/sitecore/content/sync/sync/Home${cleanPath}`);
            }
            
            // Strategy 2: Directly under site root (less common but possible)
            alternatives.push(`/sitecore/content/sync/sync${cleanPath}`);
          } else {
            // Try site root
            alternatives.push(`/sitecore/content/sync/sync${cleanPath}`);
          }
          
          // Try each alternative path
          let found = false;
          for (const altPath of alternatives) {
            console.log(`   ⚠️ First path failed, trying alternative: ${altPath}`);
            try {
              const altData = await this.client.request(query, {
                path: altPath,
                language,
              });
              if (altData.item) {
                data = altData;
                fullPath = altPath;
                console.log(`   ✅ Found item at alternative path: ${altPath}`);
                found = true;
                break; // Success, exit loop
              }
            } catch (altError) {
              // Continue to next alternative
              continue;
            }
          }
          
          // If all alternatives failed, re-throw original error
          if (!found) {
            throw queryError;
          }
        } else {
          throw queryError; // Re-throw if not a /Data/ path
        }
      }

      if (!data.item) {
        console.warn(`⚠️ No item found at path: ${fullPath}`);
        console.warn(`   Original datasource path: ${datasourcePath}`);
        if (currentPagePath) {
          console.warn(`   Current page path: ${currentPagePath}`);
        }
        return null;
      }

      const item = data.item;
      
      // Fields are directly on the item (Preview/Edge schema)
      const fields: DatasourceFieldValue[] = item.fields || [];
      
      // Check for child items (e.g., MultiPromo might have nested promo items)
      const childItems = item.children?.results || [];
      
      if (childItems.length > 0) {
        console.log(`📦 Datasource "${item.name}" has ${childItems.length} child items`);
      }

      console.log(`✅ Fetched datasource: ${item.name} with ${fields.length} fields`);

      return {
        id: item.id,
        name: item.name,
        path: item.path,
        fields,
        children: childItems.map((child: any) => ({
          id: child.id,
          name: child.name,
          path: child.path,
          fields: child.fields || [],
        })),
      };
    } catch (error) {
      console.error(`❌ Error fetching datasource ${fullPath}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple datasource items in parallel
   */
  async fetchMultipleDatasources(
    datasourcePaths: string[],
    language: string = 'en',
    currentPagePath?: string
  ): Promise<Map<string, DatasourceItem>> {
    const results = new Map<string, DatasourceItem>();

    if (!this.isConfigured()) {
      console.warn('AuthoringGraphQLService not configured, skipping datasource fetch');
      return results;
    }

    console.log(`📦 Fetching ${datasourcePaths.length} datasource items...`);
    if (currentPagePath) {
      console.log(`📍 Using current page path as base: ${currentPagePath}`);
    }

    // Fetch all datasources in parallel
    const promises = datasourcePaths.map(path =>
      this.fetchDatasourceByPath(path, language, currentPagePath)
        .then(item => ({ path, item }))
        .catch(err => {
          console.error(`Failed to fetch ${path}:`, err);
          return { path, item: null };
        })
    );

    const responses = await Promise.all(promises);

    // Map results by datasource path
    for (const { path, item } of responses) {
      if (item) {
        results.set(path, item);
      }
    }

    console.log(`✅ Successfully fetched ${results.size} of ${datasourcePaths.length} datasources`);

    return results;
  }

  /**
   * Try to use the Marketplace SDK to get credentials automatically
   */
  static async fromMarketplaceContext(client: any): Promise<AuthoringGraphQLService | null> {
    try {
      // Try to get the context which might contain API endpoints
      const context = await client.query('application.context');
      
      // The context might have the GraphQL endpoint and credentials
      // This is environment-specific, so we'll provide fallbacks
      const endpoint = context.data?.graphqlEndpoint || 
                      process.env.NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT ||
                      '';
      
      const apiKey = context.data?.apiKey || 
                     process.env.NEXT_PUBLIC_AUTHORING_API_KEY ||
                     '';

      if (!endpoint || !apiKey) {
        console.warn('⚠️ No GraphQL credentials found in context or environment');
        return null;
      }

      console.log('✅ Created AuthoringGraphQLService from context');
      return new AuthoringGraphQLService({ endpoint, apiKey });
    } catch (error) {
      console.error('Failed to create AuthoringGraphQLService from context:', error);
      return null;
    }
  }
}

/**
 * Create service from environment variables
 */
export function createAuthoringGraphQLService(): AuthoringGraphQLService | null {
  const endpoint = process.env.NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT || '';
  const apiKey = process.env.NEXT_PUBLIC_AUTHORING_API_KEY || '';
  const bearerToken = process.env.NEXT_PUBLIC_AUTHORING_BEARER_TOKEN || '';

  if (!endpoint) {
    console.warn('⚠️ GraphQL endpoint not configured. Set NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT');
    return null;
  }

  if (!bearerToken && !apiKey) {
    console.warn('⚠️ No authentication configured. Set either NEXT_PUBLIC_AUTHORING_BEARER_TOKEN or NEXT_PUBLIC_AUTHORING_API_KEY');
    return null;
  }

  // Pass either bearer token or api key (proxy will handle it)
  return new AuthoringGraphQLService({ 
    endpoint, 
    apiKey: bearerToken || apiKey  // Use bearer token if available, otherwise API key
  });
}
