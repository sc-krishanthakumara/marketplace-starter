// Semantic Text Classifier - Categorizes text fields by semantic meaning

import type { SemanticCategory, FieldInfo, ComponentMetadata, SemanticTextItem } from '@/src/types';

/**
 * Field name patterns for semantic classification
 */
const FIELD_PATTERNS: Record<SemanticCategory, RegExp[]> = {
  Heading: [
    /^(title|heading|header|h[1-6]|pageTitle|sectionTitle)$/i,
    /title$/i,
    /heading$/i,
  ],
  Paragraph: [
    /^(text|content|body|description|paragraph|copy|summary|intro)$/i,
    /text$/i,
    /description$/i,
    /content$/i,
  ],
  RichText: [
    /^(richText|html|markup|formattedText|wysiwyg|editor)$/i,
    /richtext$/i,
  ],
  Label: [
    /^(label|name|caption|tag|badge|category|type)$/i,
    /label$/i,
    /name$/i,
  ],
  Link: [
    /^(link|url|href|cta|action|navigation|anchor)$/i,
    /^link\d*$/i,  // Match Link1, Link2, etc.
    /link$/i,
    /url$/i,
  ],
  Button: [
    /^(button|cta|action|submit|call.*action)$/i,
    /^button\d*$/i,  // Match Button1, Button2, etc.
    /button$/i,
    /cta$/i,
  ],
  Image: [
    /^(image|img|picture|photo|thumbnail|banner|icon|media)$/i,
    /image$/i,
    /img$/i,
  ],
  List: [
    /^(list|items|collection|array|menu|options)$/i,
    /list$/i,
    /items$/i,
  ],
  Other: [],
};

/**
 * Content patterns for semantic classification (fallback when field name doesn't match)
 */
const CONTENT_PATTERNS: Record<SemanticCategory, RegExp[]> = {
  Heading: [
    /^<h[1-6][^>]*>.*<\/h[1-6]>$/i,
  ],
  RichText: [
    /<[^>]+>/,  // Contains HTML tags
    /(&nbsp;|&lt;|&gt;|&amp;)/,  // Contains HTML entities
  ],
  Link: [
    /^https?:\/\//i,
    /^\/[a-z0-9\-\/]+$/i,
    /\[https?:\/\/[^\]]+\]/i,  // Match [http://...] or [https://...]
    /\[[^\]]+\]/i,  // Match any [url] pattern
  ],
  Button: [
    /^(buy|learn more|read more|get started|sign up|subscribe|download|shop now|add to cart|checkout)(\s+\[.*\])?$/i,  // Button text with optional URL
  ],
  Image: [
    /\.(jpg|jpeg|png|gif|svg|webp|bmp)(\?.*)?$/i,
  ],
  Paragraph: [],
  Label: [],
  List: [],
  Other: [],
};

/**
 * Template patterns - Some Sitecore templates indicate semantic meaning
 */
const TEMPLATE_PATTERNS: Record<string, SemanticCategory> = {
  'Heading': 'Heading',
  'Text': 'Paragraph',
  'Rich Text': 'RichText',
  'Link': 'Link',
  'Image': 'Image',
  'Button': 'Button',
  'List': 'List',
};

/**
 * Classify a field name into a semantic category
 */
export function classifyFieldName(fieldName: string): SemanticCategory {
  for (const [category, patterns] of Object.entries(FIELD_PATTERNS)) {
    if (category === 'Other') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(fieldName)) {
        return category as SemanticCategory;
      }
    }
  }
  
  return 'Other';
}

/**
 * Classify field content to help refine categorization
 */
export function classifyContent(content: string): SemanticCategory | null {
  if (!content || content.trim().length === 0) {
    return null;
  }

  // Check Button patterns first (more specific)
  for (const pattern of CONTENT_PATTERNS.Button || []) {
    if (pattern.test(content)) {
      return 'Button';
    }
  }

  // Then check other patterns
  for (const [category, patterns] of Object.entries(CONTENT_PATTERNS)) {
    if (category === 'Other' || category === 'Paragraph' || category === 'Label' || category === 'Button') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return category as SemanticCategory;
      }
    }
  }
  
  return null;
}

/**
 * Determine if content is substantial enough to display
 */
export function isSubstantialContent(content: string): boolean {
  if (!content) return false;
  
  // Remove HTML tags
  const textOnly = content.replace(/<[^>]+>/g, '').trim();
  
  // Must have at least 1 character
  return textOnly.length > 0;
}

/**
 * Extract plain text from HTML content
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace <br> and </p> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Classify a field based on multiple signals
 */
export function classifyField(
  fieldName: string,
  fieldValue: string,
  fieldType?: string,
  templateName?: string
): SemanticCategory {
  // Check template name first (highest confidence)
  if (templateName && TEMPLATE_PATTERNS[templateName]) {
    return TEMPLATE_PATTERNS[templateName];
  }

  // Check field type (Sitecore field types OR our semantic categories)
  if (fieldType) {
    // If fieldType is already a semantic category (Link, Image, etc.), use it directly
    const semanticCategories: SemanticCategory[] = ['Heading', 'Paragraph', 'RichText', 'Label', 'Link', 'Button', 'Image', 'List', 'Other'];
    if (semanticCategories.includes(fieldType as SemanticCategory)) {
      return fieldType as SemanticCategory;
    }
    
    // Otherwise, map Sitecore field type to category
    const typeCategory = mapFieldTypeToCategory(fieldType);
    if (typeCategory !== 'Other') {
      return typeCategory;
    }
  }

  // Check field name pattern
  const nameCategory = classifyFieldName(fieldName);
  
  // Check content patterns
  const contentCategory = classifyContent(fieldValue);
  
  if (nameCategory !== 'Other') {
    // If field name suggests Link or Button, prioritize that
    if (nameCategory === 'Link' || nameCategory === 'Button') {
      return nameCategory;
    }
    // Content pattern can override for RichText
    if (contentCategory === 'RichText') {
      return 'RichText';
    }
    return nameCategory;
  }
  
  // If no field name match, check content patterns
  // Prioritize Link/Button detection from content
  if (contentCategory === 'Link' || contentCategory === 'Button') {
    return contentCategory;
  }

  // Fall back to content analysis (already computed above)
  if (contentCategory) {
    return contentCategory;
  }

  // Default heuristics based on content length
  if (fieldValue.length > 200) {
    return 'Paragraph';
  } else if (fieldValue.length > 50) {
    return 'Paragraph';
  } else {
    return 'Label';
  }
}

/**
 * Map Sitecore field types to semantic categories
 */
function mapFieldTypeToCategory(fieldType: string): SemanticCategory {
  const typeMap: Record<string, SemanticCategory> = {
    'Single-Line Text': 'Label',
    'Multi-Line Text': 'Paragraph',
    'Rich Text': 'RichText',
    'General Link': 'Link',
    'Image': 'Image',
    'Droplink': 'Label',
    'Droptree': 'Label',
    'Checklist': 'List',
    'Multilist': 'List',
    'Treelist': 'List',
  };

  return typeMap[fieldType] || 'Other';
}

/**
 * Create a semantic text item from field info
 */
export function createSemanticTextItem(
  field: FieldInfo,
  metadata: ComponentMetadata,
  path: string[]
): SemanticTextItem {
  const plainText = extractPlainText(field.value);
  
  return {
    id: `${metadata.componentId}-${field.name}`,
    text: plainText || field.value,
    category: field.category,
    metadata,
    path,
  };
}

/**
 * Filter semantic items by search query
 */
export function filterBySearch(
  items: SemanticTextItem[],
  query: string
): SemanticTextItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }

  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => {
    // Search in text content
    if (item.text.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in component name
    if (item.metadata.componentName.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in field name
    if (item.metadata.fieldName.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in category
    if (item.category.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Group semantic items by category
 */
export function groupByCategory(
  items: SemanticTextItem[]
): Record<SemanticCategory, SemanticTextItem[]> {
  const grouped: Record<string, SemanticTextItem[]> = {
    Heading: [],
    Paragraph: [],
    RichText: [],
    Label: [],
    Link: [],
    Button: [],
    Image: [],
    List: [],
    Other: [],
  };

  for (const item of items) {
    grouped[item.category].push(item);
  }

  return grouped as Record<SemanticCategory, SemanticTextItem[]>;
}
