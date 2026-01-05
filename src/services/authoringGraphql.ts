// Authoring & Management GraphQL Service
// Fetches datasource items from Sitecore XM Cloud

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

  constructor(config: AuthoringGraphQLConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    
    if (this.endpoint && this.apiKey) {
      this.client = new GraphQLClient(this.endpoint, {
        headers: {
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
      console.log(`📡 Fetching datasource: ${cleanPath}`);
      
      const data: any = await this.client.request(query, {
        path: cleanPath,
        language,
      });

      if (!data.item) {
        console.warn(`No item found at path: ${cleanPath}`);
        return null;
      }

      console.log(`✅ Fetched datasource: ${data.item.name}`, data.item);

      return {
        id: data.item.id,
        name: data.item.name,
        path: data.item.path,
        fields: data.item.fields || [],
      };
    } catch (error) {
      console.error(`❌ Error fetching datasource ${cleanPath}:`, error);
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

  if (!endpoint || !apiKey) {
    console.warn('⚠️ Authoring GraphQL not configured. Set NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT and NEXT_PUBLIC_AUTHORING_API_KEY');
    return null;
  }

  return new AuthoringGraphQLService({ endpoint, apiKey });
}
