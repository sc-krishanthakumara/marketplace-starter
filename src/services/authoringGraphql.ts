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
    language: string = 'en'
  ): Promise<DatasourceItem | null> {
    if (!this.client) {
      console.warn('AuthoringGraphQLService not configured');
      return null;
    }

    // Remove "local:" prefix if present
    const cleanPath = datasourcePath.replace(/^local:/, '');
    
    // Construct full Sitecore path
    const fullPath = cleanPath.startsWith('/sitecore/')
      ? cleanPath
      : `/sitecore/content/sync/sync/Home${cleanPath}`;

    // Use Experience Edge / Preview API schema (simple and well-documented)
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
        }
      }
    `;

    try {
      console.log(`📡 Fetching datasource: ${fullPath} (lang: ${language})`);
      
      const data: any = await this.client.request(query, {
        path: fullPath,
        language,
      });

      if (!data.item) {
        console.warn(`No item found at path: ${fullPath}`);
        return null;
      }

      const item = data.item;
      
      // Fields are directly on the item (Preview/Edge schema)
      const fields: DatasourceFieldValue[] = item.fields || [];

      console.log(`✅ Fetched datasource: ${item.name} with ${fields.length} fields`);

      return {
        id: item.id,
        name: item.name,
        path: item.path,
        fields,
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
    language: string = 'en'
  ): Promise<Map<string, DatasourceItem>> {
    const results = new Map<string, DatasourceItem>();

    if (!this.isConfigured()) {
      console.warn('AuthoringGraphQLService not configured, skipping datasource fetch');
      return results;
    }

    console.log(`📦 Fetching ${datasourcePaths.length} datasource items...`);

    // Fetch all datasources in parallel
    const promises = datasourcePaths.map(path =>
      this.fetchDatasourceByPath(path, language)
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
