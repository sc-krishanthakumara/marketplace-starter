// GraphQL Service for fetching unpublished content from Experience Edge Preview

import { GraphQLClient } from 'graphql-request';
import type { ExperienceEdgeResponse, GraphQLItem } from '@/src/types';

export interface GraphQLConfig {
  endpoint: string;
  apiKey: string;
  siteName: string;
}

export class ExperienceEdgeService {
  private client: GraphQLClient;
  private siteName: string;

  constructor(config: GraphQLConfig) {
    this.client = new GraphQLClient(config.endpoint, {
      headers: {
        'sc_apikey': config.apiKey,
      },
    });
    this.siteName = config.siteName;
  }

  /**
   * Fetch page content including all components and fields
   * This queries the Experience Edge Preview GraphQL endpoint for unpublished content
   */
  async fetchPageContent(itemId: string, language: string): Promise<ExperienceEdgeResponse> {
    const query = `
      query GetPageContent($itemId: String!, $language: String!, $siteName: String!) {
        item(path: $itemId, language: $language) {
          id
          name
          path
          template {
            name
            id
          }
          fields {
            name
            value
            jsonValue
          }
          children {
            results {
              id
              name
              template {
                name
              }
              fields {
                name
                value
                jsonValue
              }
            }
          }
        }
        layout(site: $siteName, routePath: $itemId, language: $language) {
          item {
            rendered
          }
        }
      }
    `;

    try {
      const data = await this.client.request<ExperienceEdgeResponse>(query, {
        itemId,
        language,
        siteName: this.siteName,
      });
      return data;
    } catch (error) {
      console.error('Error fetching page content from Experience Edge:', error);
      throw error;
    }
  }

  /**
   * Fetch layout service data for a specific route
   * This provides the component tree structure
   */
  async fetchLayoutService(route: string, language: string): Promise<unknown> {
    const query = `
      query GetLayoutService($route: String!, $language: String!, $siteName: String!) {
        layout(site: $siteName, routePath: $route, language: $language) {
          item {
            rendered
          }
        }
      }
    `;

    try {
      const data = await this.client.request(query, {
        route,
        language,
        siteName: this.siteName,
      });
      return data;
    } catch (error) {
      console.error('Error fetching layout service data:', error);
      throw error;
    }
  }

  /**
   * Fetch a specific datasource item by ID
   */
  async fetchDatasourceItem(itemId: string, language: string): Promise<GraphQLItem | null> {
    const query = `
      query GetDatasourceItem($itemId: String!, $language: String!) {
        item(path: $itemId, language: $language) {
          id
          name
          template {
            name
            id
          }
          fields {
            name
            value
            jsonValue
          }
        }
      }
    `;

    try {
      const data = await this.client.request<{ item: GraphQLItem }>(query, {
        itemId,
        language,
      });
      return data.item || null;
    } catch (error) {
      console.error('Error fetching datasource item:', error);
      return null;
    }
  }

  /**
   * Update the client configuration (e.g., when switching sites or environments)
   */
  updateConfig(config: Partial<GraphQLConfig>): void {
    if (config.endpoint || config.apiKey) {
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['sc_apikey'] = config.apiKey;
      }
      
      this.client = new GraphQLClient(
        config.endpoint || this.client.url,
        { headers }
      );
    }
    
    if (config.siteName) {
      this.siteName = config.siteName;
    }
  }
}

/**
 * Create a mock service for development/testing
 */
export function createMockExperienceEdgeService(): ExperienceEdgeService {
  return new ExperienceEdgeService({
    endpoint: 'https://edge.sitecorecloud.io/api/graphql/v1',
    apiKey: 'mock-api-key',
    siteName: 'mock-site',
  });
}
