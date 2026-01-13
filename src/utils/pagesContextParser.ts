// Parser for extracting real content from Sitecore Pages Context

import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import type { PageContent, ComponentNode, FieldInfo } from "@/src/types";
import { classifyField } from "./semanticClassifier";
import type { AuthoringGraphQLService, DatasourceItem } from "@/src/services/authoringGraphql";
import { extractContentFromPage, type ExtractedContent } from "@/src/services/domContentExtractor";

/**
 * Extract real page content from the Pages context
 * The Pages context contains the actual layout and component data
 */
export function extractPageContentFromContext(
  pagesContext: PagesContext
): PageContent {
  const pageInfo = pagesContext.pageInfo;

  if (!pageInfo) {
    throw new Error("No page info available in context");
  }

  // Extract components from the layout data
  const components = extractComponentsFromLayout(pagesContext);

  return {
    itemId: pageInfo.id || "",
    name: pageInfo.name || "Untitled Page",
    language: pageInfo.language || "en",
    path: pageInfo.path || "/",
    components,
  };
}

/**
 * Enrich page content with DOM-extracted content
 * This reads content directly from the rendered page (no API calls needed!)
 */
export function enrichPageContentWithDOMContent(
  pageContent: PageContent
): PageContent {
  console.log('🎨 Attempting to extract content from rendered page...');
  
  const extractedContent = extractContentFromPage();
  
  if (extractedContent.length === 0) {
    console.warn('⚠️ Could not extract content from DOM');
    return pageContent;
  }

  console.log(`✅ Extracted ${extractedContent.length} content items from page`);

  // Try to match extracted content with components
  // This is a simple approach - match by index/position
  function enrichComponent(component: ComponentNode, contentIndex: { value: number }): ComponentNode {
    const enriched = { ...component };

    // Get some extracted content items for this component
    const componentContent = extractedContent.slice(contentIndex.value, contentIndex.value + 5);
    contentIndex.value += 5;

    if (componentContent.length > 0) {
      // Convert extracted content to fields
      const fields: FieldInfo[] = componentContent.map((content, idx) => ({
        name: content.fieldType.charAt(0).toUpperCase() + content.fieldType.slice(1),
        value: content.textContent,
        type: content.fieldType,
        category: mapDOMFieldTypeToCategory(content.fieldType),
      }));

      // Replace placeholder fields with extracted content
      if (fields.length > 0) {
        enriched.fields = fields;
      }
    }

    // Enrich children
    enriched.children = enriched.children.map(child => enrichComponent(child, contentIndex));

    return enriched;
  }

  const contentIndex = { value: 0 };
  const enrichedComponents = pageContent.components.map(comp => enrichComponent(comp, contentIndex));

  return {
    ...pageContent,
    components: enrichedComponents,
  };
}

function mapDOMFieldTypeToCategory(fieldType: string): any {
  const mapping: Record<string, string> = {
    'heading': 'Heading',
    'paragraph': 'Paragraph',
    'richtext': 'RichText',
    'label': 'Label',
    'link': 'Link',
    'button': 'Button',
    'other': 'Other',
  };
  return mapping[fieldType] || 'Other';
}

/**
 * Enrich page content with datasource field values (GraphQL approach)
 * This fetches the actual content from each datasource item
 */
export async function enrichPageContentWithDatasources(
  pageContent: PageContent,
  graphqlService: AuthoringGraphQLService
): Promise<PageContent> {
  if (!graphqlService.isConfigured()) {
    console.warn('⚠️ GraphQL service not configured, skipping datasource fetch');
    return pageContent;
  }

  // Collect all unique datasource paths
  const datasourcePaths = new Set<string>();
  
  function collectDatasources(component: ComponentNode) {
    if (component.datasourceId && component.datasourceId.startsWith('local:')) {
      datasourcePaths.add(component.datasourceId);
    }
    component.children.forEach(collectDatasources);
  }
  
  pageContent.components.forEach(collectDatasources);

  if (datasourcePaths.size === 0) {
    console.log('ℹ️ No datasources to fetch');
    return pageContent;
  }

  // Fetch all datasources
  // Use the page path to resolve relative datasource paths correctly
  const currentPagePath = pageContent.path || pageContent.itemId;
  const datasourceItems = await graphqlService.fetchMultipleDatasources(
    Array.from(datasourcePaths),
    pageContent.language,
    currentPagePath
  );

  // Enrich components with datasource fields
  function enrichComponent(component: ComponentNode): ComponentNode {
    const enriched = { ...component };

    if (enriched.datasourceId) {
      const datasource = datasourceItems.get(enriched.datasourceId);
      
      if (datasource) {
        console.log(`🔗 Enriching ${enriched.name} (${enriched.componentName}) with datasource fields from: ${datasource.path}`);
        console.log(`   Found ${datasource.fields.length} fields in datasource`);
        
        // Convert datasource fields to component fields
        const datasourceFields = datasource.fields
          .map(field => {
            const converted = convertDatasourceFieldToComponentField(field);
            if (converted) {
              console.log(`   ✅ Field "${field.name}": ${converted.category} - ${converted.value.substring(0, 50)}...`);
            } else {
              console.log(`   ⚠️ Field "${field.name}" was filtered out (empty or system field)`);
            }
            return converted;
          })
          .filter((f): f is FieldInfo => f !== null);

        console.log(`   ✅ Added ${datasourceFields.length} fields to component`);
        
        // Replace the placeholder "DataSource" field with real fields
        enriched.fields = datasourceFields;
        
        // If datasource has child items (e.g., MultiPromo with nested promo items),
        // add them as nested components
        if (datasource.children && datasource.children.length > 0) {
          console.log(`📦 Adding ${datasource.children.length} child items from datasource`);
          
          const childComponents: ComponentNode[] = datasource.children.map((childItem, idx) => {
            const childFields = childItem.fields
              .map(field => convertDatasourceFieldToComponentField(field))
              .filter((f): f is FieldInfo => f !== null);
            
            return {
              id: `${component.id}-child-${idx}`,
              name: childItem.name,
              componentName: childItem.name,
              type: 'DatasourceChild',
              datasourceId: childItem.path,
              fields: childFields,
              children: [],
              path: [...component.path, childItem.name],
            };
          });
          
          // Add child components to existing children
          enriched.children = [...enriched.children, ...childComponents];
        }
      }
    }

    // Enrich children recursively
    enriched.children = enriched.children.map(enrichComponent);

    return enriched;
  }

  const enrichedComponents = pageContent.components.map(enrichComponent);

  return {
    ...pageContent,
    components: enrichedComponents,
  };
}

/**
 * Parse Sitecore link XML format: <Link text="..." url="..." />
 * Returns object with text and url, or null if not a link XML
 */
function parseSitecoreLinkXML(xmlString: string): { text: string; url: string; title?: string } | null {
  if (!xmlString || typeof xmlString !== 'string') {
    return null;
  }

  // Match Sitecore link XML format: <Link text="..." url="..." />
  const linkMatch = xmlString.match(/<Link\s+([^>]+)\s*\/?>/i);
  if (!linkMatch) {
    return null;
  }

  const attributes = linkMatch[1];
  
  // Extract text attribute
  const textMatch = attributes.match(/text=["']([^"']+)["']/i);
  const text = textMatch ? textMatch[1] : '';
  
  // Extract url attribute
  const urlMatch = attributes.match(/url=["']([^"']+)["']/i);
  const url = urlMatch ? urlMatch[1] : '';
  
  // Extract title attribute (optional)
  const titleMatch = attributes.match(/title=["']([^"']+)["']/i);
  const title = titleMatch ? titleMatch[1] : undefined;

  if (!text && !url) {
    return null;
  }

  return { text, url, title };
}

/**
 * Convert a datasource field to a component field
 */
function convertDatasourceFieldToComponentField(
  datasourceField: any
): FieldInfo | null {
  const { name, value, jsonValue } = datasourceField;

  // Skip system fields (start with __)
  if (name.startsWith('__')) {
    return null;
  }

  // Skip empty fields
  if (!value && !jsonValue) {
    return null;
  }

  let fieldValue = '';
  let fieldType = 'unknown';

  // Debug: Log the field structure for Image/Link/Description fields
  if ((name.includes('Image') || name.includes('Link') || name.includes('Description') || name.includes('Desc')) && (jsonValue || value)) {
    console.log(`🔍 Field "${name}" structure:`, { jsonValue, value, name });
  }

  // ALWAYS check value string first for Sitecore link XML format (even if jsonValue exists)
  // This is important because jsonValue might be a parsed object that loses the text
  let parsedLinkFromValue: { text: string; url: string; title?: string } | null = null;
  if (value && typeof value === 'string' && value.trim().startsWith('<Link')) {
    parsedLinkFromValue = parseSitecoreLinkXML(value);
    if (parsedLinkFromValue) {
      console.log(`✅ Parsed link XML from value for "${name}":`, parsedLinkFromValue);
    }
  }

  // Handle different field types
  if (jsonValue && typeof jsonValue === 'object') {
    // Handle nested value object (common in Sitecore Edge API)
    const actualValue = jsonValue.value || jsonValue;
    
    // PRIORITY: Check for Link fields FIRST (before Image) if field name suggests Link
    // This prevents Link1, Link2 fields from being misclassified as Image
    const isLinkFieldByName = /^link\d*$/i.test(name) || name.toLowerCase().includes('link');
    
    // Link field - extract href and text
    // Check if it's a link field by structure (has href/url property) OR by field name
    if (isLinkFieldByName || actualValue?.href !== undefined || actualValue?.url !== undefined || parsedLinkFromValue) {
      const parts: string[] = [];
      
      // PRIORITY: Use parsed link from XML value if available (most reliable)
      // Otherwise, try to extract from jsonValue object
      let linkText = '';
      let linkUrl = '';
      let linkTitle = '';
      
      if (parsedLinkFromValue) {
        // Use parsed XML data (most reliable source for text)
        linkText = parsedLinkFromValue.text || '';
        linkUrl = parsedLinkFromValue.url || '';
        linkTitle = parsedLinkFromValue.title || '';
        console.log(`📎 Using parsed XML link data for "${name}": text="${linkText}", url="${linkUrl}"`);
      } else {
        // Fallback: Extract from jsonValue object
        linkText = actualValue.text || actualValue.textValue || actualValue.linkText || '';
        linkUrl = actualValue.href || actualValue.url || actualValue.linkUrl || '';
        linkTitle = actualValue.title || '';
      }
      
      // Always include text if available
      if (linkText) {
        parts.push(linkText);
      }
      
      // Include title if available
      if (linkTitle) {
        parts.push(`(${linkTitle})`);
      }
      
      // Include URL even if it's a placeholder (so user knows it exists)
      if (linkUrl && linkUrl.trim().length > 0) {
        parts.push(`[${linkUrl}]`);
      }
      
      // Always create a link field if we have either text or URL
      // This ensures Link1, Link2 fields are always shown, even with placeholder URLs
      if (linkText || linkUrl) {
        fieldValue = parts.length > 0 ? parts.join(' ') : (linkText || linkUrl);
        fieldType = 'Link';
        console.log(`✅ Classified "${name}" as Link field: text="${linkText}", url="${linkUrl}"`);
        
        // Return early to prevent it from being classified as Image
        const category = classifyField(name, fieldValue, fieldType);
        return {
          name,
          value: fieldValue,
          type: fieldType,
          category,
        };
      }
    }
    
    // Image field - check multiple possible structures
    // Structure 1: { src: "...", alt: "..." }
    // Structure 2: { value: { src: "...", alt: "..." } }
    // Structure 3: Field name contains "Image" and has src property
    const imageSrc = actualValue?.src || 
                     (typeof actualValue === 'object' && actualValue !== null && 'src' in actualValue ? (actualValue as any).src : null);
    
    // Only classify as Image if field name suggests Image (not Link)
    if ((imageSrc || name.toLowerCase().includes('image')) && !isLinkFieldByName && actualValue && typeof actualValue === 'object') {
      const parts: string[] = [];
      const alt = actualValue?.alt || actualValue?.altText || '';
      const src = imageSrc || '';
      
      if (alt) parts.push(`Alt: ${alt}`);
      if (src) parts.push(`Src: ${src}`);
      
      // Even if empty, include image field if field name suggests it's an image
      if (parts.length > 0) {
        fieldValue = parts.join(' | ');
      } else if (name.toLowerCase().includes('image')) {
        // Field name suggests image but no src found - log for debugging
        console.log(`🔍 Image field "${name}" has no src:`, jsonValue);
        fieldValue = `[Image field - no src]`;
      } else {
        return null;
      }
      fieldType = 'Image';
    }
    // Rich text or simple string value
    else if (typeof actualValue === 'string') {
      fieldValue = actualValue;
      fieldType = jsonValue.type || 'Rich Text';
    }
    // Fallback: stringify the object
    else {
      console.warn(`⚠️ Unknown field structure for "${name}":`, jsonValue);
      fieldValue = JSON.stringify(actualValue);
      fieldType = 'JSON';
    }
  } else if (value) {
    // Check if value is a Sitecore link XML string
    if (typeof value === 'string' && value.trim().startsWith('<Link')) {
      const parsedLink = parseSitecoreLinkXML(value);
      if (parsedLink) {
        const parts: string[] = [];
        // Always include text if available
        if (parsedLink.text) parts.push(parsedLink.text);
        if (parsedLink.title) parts.push(`(${parsedLink.title})`);
        // Include URL even if placeholder (so it's visible)
        if (parsedLink.url && parsedLink.url.trim().length > 0) {
          parts.push(`[${parsedLink.url}]`);
        }
        // Ensure we have something to display
        fieldValue = parts.length > 0 ? parts.join(' ') : parsedLink.text || parsedLink.url || '';
        fieldType = 'Link';
      } else {
        // Not a valid link XML, treat as regular string
        fieldValue = value;
        fieldType = 'Single-Line Text';
      }
    } else {
      fieldValue = typeof value === 'string' ? value : JSON.stringify(value);
      fieldType = 'Single-Line Text';
    }
  }

  // Convert to string if needed
  if (typeof fieldValue !== 'string') {
    console.warn(`⚠️ Field "${name}" is not a string:`, typeof fieldValue, fieldValue);
    fieldValue = String(fieldValue);
  }
  
  // Skip if empty after conversion, EXCEPT for:
  // 1. Description fields (should show even if empty)
  // 2. Image fields (already handled above)
  // 3. Link fields with text but no URL (still valid)
  // 4. Fields that are explicitly set but empty (to show structure)
  const isDescriptionField = /description|desc|text|content|body/i.test(name);
  const isEmpty = !fieldValue || fieldValue.trim().length === 0;
  
  if (isEmpty && !isDescriptionField && fieldType !== 'Image' && fieldType !== 'Link') {
    return null;
  }
  
  // For empty description fields, show placeholder
  if (isEmpty && isDescriptionField) {
    fieldValue = '[Empty]';
  }
  
  // For link fields, ensure we show the text even if URL is placeholder
  if (fieldType === 'Link' && isEmpty) {
    return null; // Only skip if completely empty
  }

  // Classify the field
  const category = classifyField(name, fieldValue, fieldType);

  return {
    name,
    value: fieldValue,
    type: fieldType,
    category,
  };
}

/**
 * Extract components from the Pages context layout
 */
function extractComponentsFromLayout(
  pagesContext: PagesContext
): ComponentNode[] {
  const components: ComponentNode[] = [];
  const pageInfo = pagesContext.pageInfo as any;

  // Option 1: Check presentationDetails (most common in XM Cloud Pages)
  if (pageInfo?.presentationDetails) {
    console.log("✅ Found presentationDetails!");
    
    try {
      // presentationDetails is a JSON string, parse it
      const presentationData = typeof pageInfo.presentationDetails === 'string'
        ? JSON.parse(pageInfo.presentationDetails)
        : pageInfo.presentationDetails;
      
      console.log("📦 Parsed presentation data:", presentationData);

      // Extract renderings from devices
      if (presentationData.devices && Array.isArray(presentationData.devices)) {
        for (const device of presentationData.devices) {
          if (device.renderings && Array.isArray(device.renderings)) {
            console.log(`📱 Found ${device.renderings.length} renderings in device`);
            
            const renderings = device.renderings.map((rendering: any, idx: number) => 
              parseRenderingFromPresentationDetails(
                rendering,
                idx,
                [pagesContext.pageInfo?.name || "Page"]
              )
            );
            components.push(...renderings);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error parsing presentationDetails:", err);
    }
  }

  // Option 2: Check if there's a layout object with rendered data
  if (components.length === 0 && (pagesContext as any).layout?.rendered) {
    const rendered = (pagesContext as any).layout.rendered;
    console.log("Found rendered layout:", rendered);

    if (rendered.sitecore?.route?.placeholders) {
      const placeholders = rendered.sitecore.route.placeholders;
      for (const [placeholderKey, placeholderValue] of Object.entries(
        placeholders
      )) {
        if (Array.isArray(placeholderValue)) {
          const placeholderComponents = parsePlaceholderComponents(
            placeholderValue,
            placeholderKey,
            [pagesContext.pageInfo?.name || "Page"]
          );
          components.push(...placeholderComponents);
        }
      }
    }
  }

  // Option 3: Check for components directly in context
  if (components.length === 0 && (pagesContext as any).components) {
    const contextComponents = (pagesContext as any).components;
    console.log("Found components in context:", contextComponents);
    
    if (Array.isArray(contextComponents)) {
      const parsed = contextComponents.map((comp, idx) =>
        parseComponent(comp, [pagesContext.pageInfo?.name || "Page"], idx)
      );
      components.push(...parsed);
    }
  }

  console.log(`✅ Extracted ${components.length} components from context`);

  return components;
}

/**
 * Parse a rendering from presentationDetails format
 */
function parseRenderingFromPresentationDetails(
  rendering: any,
  index: number,
  parentPath: string[]
): ComponentNode {
  // Extract component information
  const componentId = rendering.instanceId || rendering.id || `rendering-${index}`;
  const placeholderKey = rendering.placeholderKey || "main";
  const datasourcePath = rendering.dataSource || "";
  
  // Extract component name from datasource or use a default
  const componentName = extractComponentNameFromDatasource(datasourcePath) || 
                       rendering.renderingName || 
                       `Component ${index + 1}`;

  const path = [...parentPath, componentName];

  // Parse parameters
  const params = rendering.parameters || {};

  // For now, we'll create a component with metadata
  // In a full implementation, you would fetch the datasource item to get field values
  const fields: FieldInfo[] = [];
  
  // Add datasource info as a pseudo-field for visibility
  if (datasourcePath) {
    fields.push({
      name: "DataSource",
      value: datasourcePath,
      type: "Reference",
      category: "Label",
    });
  }

  return {
    id: componentId,
    name: componentName,
    componentName: componentName,
    type: "Rendering",
    datasourceId: datasourcePath,
    placeholder: placeholderKey,
    params,
    fields,
    children: [],
    path,
  };
}

/**
 * Extract component name from datasource path
 * e.g., "local:/Data/HeroST/HeroST 1" -> "HeroST 1"
 */
function extractComponentNameFromDatasource(datasourcePath: string): string {
  if (!datasourcePath) return "";
  
  // Remove the "local:" prefix if present
  const cleanPath = datasourcePath.replace(/^local:/, "");
  
  // Get the last segment after the last slash
  const segments = cleanPath.split("/");
  return segments[segments.length - 1] || "";
}

/**
 * Parse components from a placeholder
 */
function parsePlaceholderComponents(
  components: any[],
  placeholderKey: string,
  parentPath: string[]
): ComponentNode[] {
  return components
    .map((component, index) => {
      try {
        return parseComponent(component, parentPath, index, placeholderKey);
      } catch (err) {
        console.warn("Failed to parse component:", err, component);
        return null;
      }
    })
    .filter((c): c is ComponentNode => c !== null);
}

/**
 * Parse a single component
 */
function parseComponent(
  component: any,
  parentPath: string[],
  index: number,
  placeholderKey?: string
): ComponentNode {
  const componentName =
    component.componentName ||
    component.name ||
    component.displayName ||
    `Component-${index}`;

  const componentId =
    component.uid ||
    component.id ||
    component.key ||
    `${placeholderKey || "comp"}-${index}`;

  const path = [...parentPath, componentName];

  // Extract fields from the component
  const fields = extractFieldsFromComponent(component);

  // Extract nested components (children)
  const children: ComponentNode[] = [];

  // Check for nested placeholders
  if (component.placeholders) {
    for (const [nestedPlaceholderKey, nestedComponents] of Object.entries(
      component.placeholders
    )) {
      if (Array.isArray(nestedComponents)) {
        const nestedParsed = parsePlaceholderComponents(
          nestedComponents,
          nestedPlaceholderKey,
          path
        );
        children.push(...nestedParsed);
      }
    }
  }

  // Check for children array directly
  if (Array.isArray(component.children)) {
    const childrenParsed = component.children
      .map((child: any, idx: number) => {
        try {
          return parseComponent(child, path, idx);
        } catch (err) {
          console.warn("Failed to parse child component:", err);
          return null;
        }
      })
      .filter((c: any): c is ComponentNode => c !== null);
    children.push(...childrenParsed);
  }

  return {
    id: componentId,
    name: component.displayName || componentName,
    componentName,
    type: component.componentName || "Component",
    datasourceId: component.dataSource || component.datasourceId,
    placeholder: placeholderKey,
    params: component.params || component.parameters,
    fields,
    children,
    path,
  };
}

/**
 * Extract fields from a component
 */
function extractFieldsFromComponent(component: any): FieldInfo[] {
  const fields: FieldInfo[] = [];

  // Fields can be in different locations
  const fieldsObject = component.fields || {};

  for (const [fieldName, fieldValue] of Object.entries(fieldsObject)) {
    try {
      // Skip system fields
      if (isSystemField(fieldName)) {
        continue;
      }

      let value: string = "";
      let type = "unknown";

      // Handle different field value formats
      if (typeof fieldValue === "string") {
        value = fieldValue;
      } else if (fieldValue && typeof fieldValue === "object") {
        const fieldObj = fieldValue as any;

        // Sitecore field object with value property
        if (fieldObj.value !== undefined) {
          value = String(fieldObj.value);
          type = fieldObj.type || type;
        }
        // Image field
        else if (fieldObj.src) {
          value = fieldObj.src;
          type = "Image";
        }
        // Link field
        else if (fieldObj.href) {
          value = fieldObj.href;
          type = "Link";
        }
        // RichText field
        else if (fieldObj.editable) {
          value = fieldObj.editable;
          type = "RichText";
        }
        // JSON value
        else if (fieldObj.jsonValue) {
          value = JSON.stringify(fieldObj.jsonValue);
        }
        // Fallback
        else {
          value = JSON.stringify(fieldObj);
        }
      } else if (fieldValue !== null && fieldValue !== undefined) {
        value = String(fieldValue);
      }

      // Skip empty values
      if (!value || value.trim().length === 0) {
        continue;
      }

      // Classify the field
      const category = classifyField(fieldName, value, type);

      fields.push({
        name: fieldName,
        value,
        type,
        category,
      });
    } catch (err) {
      console.warn(`Failed to parse field ${fieldName}:`, err);
    }
  }

  return fields;
}

/**
 * Check if a field is a system field that should be excluded
 */
function isSystemField(fieldName: string): boolean {
  const systemFields = [
    "__typename",
    "id",
    "uid",
    "key",
    "name",
    "displayName",
    "componentName",
    "dataSource",
    "datasourceId",
    "params",
    "parameters",
    "placeholders",
    "children",
  ];

  return systemFields.includes(fieldName);
}

/**
 * Log the full Pages context for debugging
 */
export function debugPagesContext(pagesContext: PagesContext): void {
  console.group("🔍 Pages Context Debug");
  console.log("Full context:", pagesContext);
  console.log("Page Info:", pagesContext.pageInfo);
  console.log("Layout:", (pagesContext as any).layout);
  console.log("Layout Data:", (pagesContext as any).layoutData);
  console.log("Components:", (pagesContext as any).components);
  console.log("All keys:", Object.keys(pagesContext));
  console.groupEnd();
}
