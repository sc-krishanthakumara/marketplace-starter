// Type definitions for the Pages Context Panel App

export type SemanticCategory = 
  | 'Heading'
  | 'Paragraph'
  | 'RichText'
  | 'Label'
  | 'Link'
  | 'Button'
  | 'Image'
  | 'List'
  | 'Other';

export interface ComponentMetadata {
  componentName: string;
  componentId: string;
  datasourceItemId?: string;
  fieldName: string;
  renderingPlaceholder?: string;
  params?: Record<string, unknown>;
}

export interface SemanticTextItem {
  id: string;
  text: string;
  category: SemanticCategory;
  metadata: ComponentMetadata;
  path: string[]; // Breadcrumb path to the component
}

export interface ComponentNode {
  id: string;
  name: string;
  componentName: string;
  type: string;
  datasourceId?: string;
  placeholder?: string;
  params?: Record<string, unknown>;
  fields: FieldInfo[];
  children: ComponentNode[];
  path: string[];
}

export interface FieldInfo {
  name: string;
  value: string;
  type: string;
  category: SemanticCategory;
}

export interface PageContent {
  itemId: string;
  name: string;
  language: string;
  path: string;
  route?: {
    name: string;
    placeholders: Record<string, unknown>;
  };
  components: ComponentNode[];
}

export interface FilterOptions {
  categories: SemanticCategory[];
  searchQuery: string;
  selectedComponent?: string;
}

export interface GraphQLField {
  name: string;
  value: string;
  jsonValue?: unknown;
  __typename?: string;
}

export interface GraphQLItem {
  id: string;
  name: string;
  template?: {
    name: string;
  };
  fields?: GraphQLField[];
  children?: {
    results?: GraphQLItem[];
  };
  [key: string]: unknown;
}

export interface ExperienceEdgeResponse {
  item?: GraphQLItem;
  layout?: {
    item?: {
      rendered?: {
        sitecore?: {
          route?: {
            name?: string;
            placeholders?: Record<string, unknown>;
          };
        };
      };
    };
  };
}
