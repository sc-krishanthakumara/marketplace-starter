// Content Parser - Extracts and normalizes component data from GraphQL responses

import type {
  ComponentNode,
  FieldInfo,
  PageContent,
  ExperienceEdgeResponse,
  GraphQLField,
  GraphQLItem,
  SemanticTextItem,
} from '@/src/types';
import { classifyField, isSubstantialContent, createSemanticTextItem } from './semanticClassifier';

/**
 * Parse Experience Edge GraphQL response into structured page content
 */
export function parsePageContent(response: ExperienceEdgeResponse): PageContent | null {
  if (!response.item) {
    return null;
  }

  const item = response.item;
  const components = parseLayoutComponents(response);

  return {
    itemId: item.id,
    name: item.name,
    language: 'en', // Default, should come from context
    path: (item as any).path || '/',
    route: response.layout?.item?.rendered?.sitecore?.route
      ? {
          name: response.layout.item.rendered.sitecore.route.name || '',
          placeholders: response.layout.item.rendered.sitecore.route.placeholders || {},
        }
      : undefined,
    components,
  };
}

/**
 * Parse layout components from the GraphQL response
 */
function parseLayoutComponents(response: ExperienceEdgeResponse): ComponentNode[] {
  const components: ComponentNode[] = [];

  // Try to extract from layout service
  if (response.layout?.item?.rendered) {
    const rendered = (response.layout.item.rendered as any).sitecore;
    if (rendered?.route?.placeholders) {
      const placeholders = rendered.route.placeholders;
      
      for (const [placeholderKey, placeholderValue] of Object.entries(placeholders)) {
        if (Array.isArray(placeholderValue)) {
          const placeholderComponents = parsePlaceholder(
            placeholderValue,
            placeholderKey,
            []
          );
          components.push(...placeholderComponents);
        }
      }
    }
  }

  // Fall back to parsing item fields if no layout data
  if (components.length === 0 && response.item) {
    components.push(parseItemAsComponent(response.item, []));
  }

  return components;
}

/**
 * Parse a placeholder's components
 */
function parsePlaceholder(
  components: any[],
  placeholderKey: string,
  parentPath: string[]
): ComponentNode[] {
  return components.map((component, index) => {
    const componentName = component.componentName || component.name || 'Unknown';
    const componentId = component.uid || component.id || `${placeholderKey}-${index}`;
    const path = [...parentPath, componentName];

    // Parse fields
    const fields = parseFields(component.fields || {}, component);

    // Parse nested placeholders
    const children: ComponentNode[] = [];
    if (component.placeholders) {
      for (const [nestedPlaceholder, nestedComponents] of Object.entries(
        component.placeholders
      )) {
        if (Array.isArray(nestedComponents)) {
          children.push(
            ...parsePlaceholder(nestedComponents, nestedPlaceholder, path)
          );
        }
      }
    }

    return {
      id: componentId,
      name: component.displayName || componentName,
      componentName,
      type: component.componentName || 'Component',
      datasourceId: component.dataSource || component.datasourceId,
      placeholder: placeholderKey,
      params: component.params,
      fields,
      children,
      path,
    };
  });
}

/**
 * Parse an item as a component (fallback when no layout data)
 */
function parseItemAsComponent(item: GraphQLItem, parentPath: string[]): ComponentNode {
  const componentName = item.template?.name || 'Item';
  const path = [...parentPath, item.name];

  const fieldsObject: Record<string, any> = {};
  if (item.fields) {
    for (const field of item.fields) {
      fieldsObject[field.name] = field.value || field.jsonValue;
    }
  }

  const fields = parseFields(fieldsObject, item);

  // Parse child items
  const children: ComponentNode[] = [];
  if (item.children?.results) {
    children.push(
      ...item.children.results.map(child => parseItemAsComponent(child, path))
    );
  }

  return {
    id: item.id,
    name: item.name,
    componentName,
    type: item.template?.name || 'Item',
    datasourceId: item.id,
    fields,
    children,
    path,
  };
}

/**
 * Parse component fields into structured field info
 */
function parseFields(fieldsObject: Record<string, any>, context?: any): FieldInfo[] {
  const fields: FieldInfo[] = [];

  for (const [fieldName, fieldValue] of Object.entries(fieldsObject)) {
    // Skip system fields
    if (isSystemField(fieldName)) {
      continue;
    }

    let value: string;
    let type = 'unknown';

    // Handle different field value formats
    if (typeof fieldValue === 'string') {
      value = fieldValue;
    } else if (fieldValue && typeof fieldValue === 'object') {
      // Handle Sitecore field objects
      if (fieldValue.value) {
        value = String(fieldValue.value);
        type = fieldValue.type || type;
      } else if (fieldValue.src) {
        // Image field
        value = fieldValue.src;
        type = 'Image';
      } else if (fieldValue.href) {
        // Link field
        value = fieldValue.href;
        type = 'Link';
      } else {
        value = JSON.stringify(fieldValue);
      }
    } else {
      value = String(fieldValue);
    }

    // Skip empty values
    if (!isSubstantialContent(value)) {
      continue;
    }

    // Classify the field
    const category = classifyField(
      fieldName,
      value,
      type,
      context?.template?.name
    );

    fields.push({
      name: fieldName,
      value,
      type,
      category,
    });
  }

  return fields;
}

/**
 * Check if a field name is a system field (should be excluded)
 */
function isSystemField(fieldName: string): boolean {
  const systemFields = [
    '__typename',
    'id',
    'name',
    'displayName',
    'template',
    'path',
    'url',
    'children',
    'parent',
    'created',
    'updated',
    'revision',
    'version',
  ];

  return systemFields.includes(fieldName.toLowerCase());
}

/**
 * Extract all semantic text items from page content
 */
export function extractSemanticItems(pageContent: PageContent): SemanticTextItem[] {
  const items: SemanticTextItem[] = [];

  function processComponent(component: ComponentNode, path: string[]): void {
    const componentPath = [...path, component.name];

    // Process all fields
    for (const field of component.fields) {
      const item = createSemanticTextItem(
        field,
        {
          componentName: component.componentName,
          componentId: component.id,
          datasourceItemId: component.datasourceId,
          fieldName: field.name,
          renderingPlaceholder: component.placeholder,
          params: component.params,
        },
        componentPath
      );

      items.push(item);
    }

    // Process children recursively
    for (const child of component.children) {
      processComponent(child, componentPath);
    }
  }

  // Process all root components
  for (const component of pageContent.components) {
    processComponent(component, [pageContent.name]);
  }

  return items;
}

/**
 * Build a flat list of all components for the component tree view
 */
export function flattenComponentTree(components: ComponentNode[]): ComponentNode[] {
  const flat: ComponentNode[] = [];

  function traverse(component: ComponentNode): void {
    flat.push(component);
    for (const child of component.children) {
      traverse(child);
    }
  }

  for (const component of components) {
    traverse(component);
  }

  return flat;
}

/**
 * Find a component by ID in the component tree
 */
export function findComponentById(
  components: ComponentNode[],
  id: string
): ComponentNode | null {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }
    
    const found = findComponentById(component.children, id);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Get breadcrumb path for a component
 */
export function getComponentBreadcrumb(component: ComponentNode): string {
  return component.path.join(' > ');
}
