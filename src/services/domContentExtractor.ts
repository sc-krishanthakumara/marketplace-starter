// DOM Content Extractor - Extract content from the rendered page
// This reads the actual rendered content from the parent window (Pages editor)

export interface ExtractedContent {
  componentId: string;
  selector: string;
  textContent: string;
  fieldType: 'heading' | 'paragraph' | 'richtext' | 'label' | 'link' | 'button' | 'other';
}

/**
 * Extract content from the rendered page in the parent window
 * This works because the extension runs in an iframe within the Pages editor
 */
export class DOMContentExtractor {
  private parentDocument: Document | null = null;

  constructor() {
    try {
      // Try to access the parent window's document
      // This only works if we're in the same origin or have proper permissions
      if (window.parent && window.parent !== window) {
        this.parentDocument = window.parent.document;
        console.log('✅ Successfully accessed parent document');
      }
    } catch (error) {
      console.warn('⚠️ Cannot access parent document (cross-origin restriction)');
      this.parentDocument = null;
    }
  }

  isAvailable(): boolean {
    return this.parentDocument !== null;
  }

  /**
   * Extract all text content from the rendered page
   */
  extractPageContent(): ExtractedContent[] {
    if (!this.parentDocument) {
      console.warn('Parent document not accessible');
      return [];
    }

    const extracted: ExtractedContent[] = [];

    try {
      // Find the main content area (adjust selector based on your site structure)
      const mainContent = this.parentDocument.querySelector('main, [role="main"], .main-content, body');
      
      if (!mainContent) {
        console.warn('Could not find main content area');
        return [];
      }

      console.log('🔍 Scanning page content...');

      // Extract headings
      mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        if (text) {
          extracted.push({
            componentId: `heading-${idx}`,
            selector: this.getElementSelector(el),
            textContent: text,
            fieldType: 'heading',
          });
        }
      });

      // Extract paragraphs
      mainContent.querySelectorAll('p').forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        if (text && text.length > 10) { // Skip very short paragraphs
          extracted.push({
            componentId: `paragraph-${idx}`,
            selector: this.getElementSelector(el),
            textContent: text,
            fieldType: 'paragraph',
          });
        }
      });

      // Extract buttons
      mainContent.querySelectorAll('button, [role="button"], .btn, a.button').forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        if (text) {
          extracted.push({
            componentId: `button-${idx}`,
            selector: this.getElementSelector(el),
            textContent: text,
            fieldType: 'button',
          });
        }
      });

      // Extract links
      mainContent.querySelectorAll('a').forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        const href = el.getAttribute('href');
        if (text && href) {
          extracted.push({
            componentId: `link-${idx}`,
            selector: this.getElementSelector(el),
            textContent: text,
            fieldType: 'link',
          });
        }
      });

      // Extract labels and spans
      mainContent.querySelectorAll('label, span.label, .tag, .badge').forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        if (text && text.length < 50) { // Labels are typically short
          extracted.push({
            componentId: `label-${idx}`,
            selector: this.getElementSelector(el),
            textContent: text,
            fieldType: 'label',
          });
        }
      });

      console.log(`✅ Extracted ${extracted.length} content items from page`);

      return extracted;
    } catch (error) {
      console.error('Error extracting page content:', error);
      return [];
    }
  }

  /**
   * Extract content with Sitecore-specific attributes
   * Sitecore adds data attributes to editable fields
   */
  extractSitecoreEditableContent(): ExtractedContent[] {
    if (!this.parentDocument) {
      return [];
    }

    const extracted: ExtractedContent[] = [];

    try {
      // Look for Sitecore editable fields (they have specific attributes)
      const editableFields = this.parentDocument.querySelectorAll(
        '[data-field-id], [data-field-name], .scEnabledChrome, [contenteditable="true"]'
      );

      console.log(`🔍 Found ${editableFields.length} Sitecore editable fields`);

      editableFields.forEach((el, idx) => {
        const text = this.cleanText(el.textContent || '');
        if (!text) return;

        const fieldId = el.getAttribute('data-field-id') || el.getAttribute('data-field-name');
        const fieldType = this.detectFieldType(el);

        extracted.push({
          componentId: fieldId || `field-${idx}`,
          selector: this.getElementSelector(el),
          textContent: text,
          fieldType,
        });
      });

      console.log(`✅ Extracted ${extracted.length} Sitecore fields`);

      return extracted;
    } catch (error) {
      console.error('Error extracting Sitecore content:', error);
      return [];
    }
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, ' ') // Remove newlines
      .substring(0, 1000); // Limit length
  }

  /**
   * Generate a CSS selector for an element
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== this.parentDocument?.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = current.className.trim().split(/\s+/).slice(0, 2); // First 2 classes
        selector += '.' + classes.join('.');
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.slice(-3).join(' > '); // Last 3 levels
  }

  /**
   * Detect field type based on element
   */
  private detectFieldType(element: Element): ExtractedContent['fieldType'] {
    const tagName = element.tagName.toLowerCase();
    
    if (/^h[1-6]$/.test(tagName)) return 'heading';
    if (tagName === 'p') return 'paragraph';
    if (tagName === 'button' || element.getAttribute('role') === 'button') return 'button';
    if (tagName === 'a') return 'link';
    if (tagName === 'label' || element.classList.contains('label')) return 'label';
    
    // Check for rich text indicators
    if (element.querySelector('strong, em, br, ul, ol')) return 'richtext';
    
    return 'other';
  }
}

/**
 * Try to extract content using multiple strategies
 */
export function extractContentFromPage(): ExtractedContent[] {
  const extractor = new DOMContentExtractor();

  if (!extractor.isAvailable()) {
    console.warn('⚠️ DOM extraction not available (cross-origin or not in iframe)');
    return [];
  }

  // Try Sitecore-specific extraction first
  let content = extractor.extractSitecoreEditableContent();

  // Fall back to generic extraction if needed
  if (content.length === 0) {
    console.log('Falling back to generic DOM extraction...');
    content = extractor.extractPageContent();
  }

  return content;
}
