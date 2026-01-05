// Unit tests for semantic classifier utilities

import {
  classifyFieldName,
  classifyContent,
  classifyField,
  isSubstantialContent,
  extractPlainText,
  filterBySearch,
  groupByCategory,
  createSemanticTextItem,
} from '../semanticClassifier';
import type { SemanticTextItem, FieldInfo, ComponentMetadata } from '@/src/types';

describe('semanticClassifier', () => {
  describe('classifyFieldName', () => {
    it('should classify heading field names', () => {
      expect(classifyFieldName('Title')).toBe('Heading');
      expect(classifyFieldName('Heading')).toBe('Heading');
      expect(classifyFieldName('PageTitle')).toBe('Heading');
      expect(classifyFieldName('H1')).toBe('Heading');
    });

    it('should classify paragraph field names', () => {
      expect(classifyFieldName('Text')).toBe('Paragraph');
      expect(classifyFieldName('Content')).toBe('Paragraph');
      expect(classifyFieldName('Description')).toBe('Paragraph');
      expect(classifyFieldName('Body')).toBe('Paragraph');
    });

    it('should classify rich text field names', () => {
      expect(classifyFieldName('RichText')).toBe('RichText');
      expect(classifyFieldName('HTML')).toBe('RichText');
      expect(classifyFieldName('FormattedText')).toBe('RichText');
    });

    it('should classify label field names', () => {
      expect(classifyFieldName('Label')).toBe('Label');
      expect(classifyFieldName('Name')).toBe('Label');
      expect(classifyFieldName('Caption')).toBe('Label');
      expect(classifyFieldName('Tag')).toBe('Label');
    });

    it('should classify link field names', () => {
      expect(classifyFieldName('Link')).toBe('Link');
      expect(classifyFieldName('URL')).toBe('Link');
      expect(classifyFieldName('CTA')).toBe('Link');
    });

    it('should classify button field names', () => {
      expect(classifyFieldName('Button')).toBe('Button');
      expect(classifyFieldName('CtaButton')).toBe('Button');
    });

    it('should classify image field names', () => {
      expect(classifyFieldName('Image')).toBe('Image');
      expect(classifyFieldName('Picture')).toBe('Image');
      expect(classifyFieldName('Thumbnail')).toBe('Image');
    });

    it('should classify list field names', () => {
      expect(classifyFieldName('List')).toBe('List');
      expect(classifyFieldName('Items')).toBe('List');
      expect(classifyFieldName('Menu')).toBe('List');
    });

    it('should return Other for unrecognized field names', () => {
      expect(classifyFieldName('UnknownField')).toBe('Other');
      expect(classifyFieldName('CustomData')).toBe('Other');
    });
  });

  describe('classifyContent', () => {
    it('should classify HTML heading tags', () => {
      expect(classifyContent('<h1>Heading</h1>')).toBe('Heading');
      expect(classifyContent('<h2>Subheading</h2>')).toBe('Heading');
    });

    it('should classify rich text content with HTML', () => {
      expect(classifyContent('<p>Some <strong>formatted</strong> text</p>')).toBe('RichText');
      expect(classifyContent('Text with &nbsp; entities')).toBe('RichText');
    });

    it('should classify URLs', () => {
      expect(classifyContent('https://example.com')).toBe('Link');
      expect(classifyContent('http://test.com')).toBe('Link');
      expect(classifyContent('/relative/path')).toBe('Link');
    });

    it('should classify image URLs', () => {
      expect(classifyContent('image.jpg')).toBe('Image');
      expect(classifyContent('photo.png')).toBe('Image');
      expect(classifyContent('graphic.svg')).toBe('Image');
    });

    it('should return null for plain text', () => {
      expect(classifyContent('Just plain text')).toBe(null);
      expect(classifyContent('Simple content')).toBe(null);
    });

    it('should return null for empty content', () => {
      expect(classifyContent('')).toBe(null);
      expect(classifyContent('   ')).toBe(null);
    });
  });

  describe('classifyField', () => {
    it('should prioritize field type over field name', () => {
      const result = classifyField('CustomField', 'Some text', 'Rich Text');
      expect(result).toBe('RichText');
    });

    it('should use field name when type is not available', () => {
      const result = classifyField('Title', 'Some heading text');
      expect(result).toBe('Heading');
    });

    it('should detect rich text from content patterns', () => {
      const result = classifyField('SomeField', '<p>HTML content</p>');
      expect(result).toBe('RichText');
    });

    it('should use content length heuristics as fallback', () => {
      const longText = 'a'.repeat(250);
      const result = classifyField('UnknownField', longText);
      expect(result).toBe('Paragraph');
    });

    it('should default to Label for short unknown content', () => {
      const result = classifyField('UnknownField', 'Short text');
      expect(result).toBe('Label');
    });
  });

  describe('isSubstantialContent', () => {
    it('should return true for non-empty content', () => {
      expect(isSubstantialContent('Some text')).toBe(true);
      expect(isSubstantialContent('<p>HTML</p>')).toBe(true);
    });

    it('should return false for empty or whitespace-only content', () => {
      expect(isSubstantialContent('')).toBe(false);
      expect(isSubstantialContent('   ')).toBe(false);
      expect(isSubstantialContent('<p></p>')).toBe(false);
    });

    it('should return true for content with only HTML tags but some text', () => {
      expect(isSubstantialContent('<p>A</p>')).toBe(true);
    });
  });

  describe('extractPlainText', () => {
    it('should remove HTML tags', () => {
      expect(extractPlainText('<p>Hello</p>')).toBe('Hello');
      expect(extractPlainText('<div><span>Text</span></div>')).toBe('Text');
    });

    it('should remove script and style tags', () => {
      expect(extractPlainText('<script>alert("hi")</script>Text')).toBe('Text');
      expect(extractPlainText('<style>.class{}</style>Content')).toBe('Content');
    });

    it('should decode HTML entities', () => {
      expect(extractPlainText('Hello&nbsp;World')).toBe('Hello World');
      expect(extractPlainText('&lt;tag&gt;')).toBe('<tag>');
      expect(extractPlainText('&amp;')).toBe('&');
    });

    it('should convert <br> and </p> to newlines', () => {
      expect(extractPlainText('Line1<br>Line2')).toContain('Line1');
      expect(extractPlainText('<p>Para1</p><p>Para2</p>')).toContain('Para1');
    });

    it('should normalize whitespace', () => {
      expect(extractPlainText('Multiple   spaces')).toBe('Multiple spaces');
      expect(extractPlainText('  Trimmed  ')).toBe('Trimmed');
    });

    it('should handle empty input', () => {
      expect(extractPlainText('')).toBe('');
      expect(extractPlainText(null as any)).toBe('');
    });
  });

  describe('createSemanticTextItem', () => {
    it('should create a semantic text item with correct structure', () => {
      const field: FieldInfo = {
        name: 'Title',
        value: 'Test Title',
        type: 'Single-Line Text',
        category: 'Heading',
      };

      const metadata: ComponentMetadata = {
        componentName: 'Hero',
        componentId: 'hero-1',
        datasourceItemId: 'ds-123',
        fieldName: 'Title',
        renderingPlaceholder: 'main',
      };

      const path = ['Home', 'Hero'];

      const item = createSemanticTextItem(field, metadata, path);

      expect(item.id).toBe('hero-1-Title');
      expect(item.text).toBe('Test Title');
      expect(item.category).toBe('Heading');
      expect(item.metadata).toEqual(metadata);
      expect(item.path).toEqual(path);
    });

    it('should extract plain text from HTML content', () => {
      const field: FieldInfo = {
        name: 'RichText',
        value: '<p>Formatted <strong>content</strong></p>',
        type: 'Rich Text',
        category: 'RichText',
      };

      const metadata: ComponentMetadata = {
        componentName: 'Content',
        componentId: 'content-1',
        fieldName: 'RichText',
      };

      const item = createSemanticTextItem(field, metadata, []);

      expect(item.text).toBe('Formatted content');
    });
  });

  describe('filterBySearch', () => {
    const mockItems: SemanticTextItem[] = [
      {
        id: '1',
        text: 'Welcome to our platform',
        category: 'Heading',
        metadata: {
          componentName: 'Hero',
          componentId: 'hero-1',
          fieldName: 'Title',
        },
        path: ['Home', 'Hero'],
      },
      {
        id: '2',
        text: 'Learn more about our features',
        category: 'Paragraph',
        metadata: {
          componentName: 'Content',
          componentId: 'content-1',
          fieldName: 'Text',
        },
        path: ['Home', 'Content'],
      },
      {
        id: '3',
        text: 'Contact us today',
        category: 'Button',
        metadata: {
          componentName: 'CTA',
          componentId: 'cta-1',
          fieldName: 'ButtonText',
        },
        path: ['Home', 'CTA'],
      },
    ];

    it('should return all items when query is empty', () => {
      expect(filterBySearch(mockItems, '')).toEqual(mockItems);
      expect(filterBySearch(mockItems, '   ')).toEqual(mockItems);
    });

    it('should filter by text content', () => {
      const result = filterBySearch(mockItems, 'platform');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by component name', () => {
      const result = filterBySearch(mockItems, 'Hero');
      expect(result).toHaveLength(1);
      expect(result[0].metadata.componentName).toBe('Hero');
    });

    it('should filter by field name', () => {
      const result = filterBySearch(mockItems, 'ButtonText');
      expect(result).toHaveLength(1);
      expect(result[0].metadata.fieldName).toBe('ButtonText');
    });

    it('should filter by category', () => {
      const result = filterBySearch(mockItems, 'button');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Button');
    });

    it('should be case insensitive', () => {
      const result = filterBySearch(mockItems, 'WELCOME');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should return empty array when no matches', () => {
      const result = filterBySearch(mockItems, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('groupByCategory', () => {
    const mockItems: SemanticTextItem[] = [
      {
        id: '1',
        text: 'Heading 1',
        category: 'Heading',
        metadata: { componentName: 'A', componentId: '1', fieldName: 'Title' },
        path: [],
      },
      {
        id: '2',
        text: 'Heading 2',
        category: 'Heading',
        metadata: { componentName: 'B', componentId: '2', fieldName: 'Title' },
        path: [],
      },
      {
        id: '3',
        text: 'Paragraph text',
        category: 'Paragraph',
        metadata: { componentName: 'C', componentId: '3', fieldName: 'Text' },
        path: [],
      },
      {
        id: '4',
        text: 'Button text',
        category: 'Button',
        metadata: { componentName: 'D', componentId: '4', fieldName: 'CTA' },
        path: [],
      },
    ];

    it('should group items by category', () => {
      const grouped = groupByCategory(mockItems);

      expect(grouped.Heading).toHaveLength(2);
      expect(grouped.Paragraph).toHaveLength(1);
      expect(grouped.Button).toHaveLength(1);
      expect(grouped.RichText).toHaveLength(0);
      expect(grouped.Label).toHaveLength(0);
    });

    it('should include all categories even if empty', () => {
      const grouped = groupByCategory(mockItems);

      expect(grouped).toHaveProperty('Heading');
      expect(grouped).toHaveProperty('Paragraph');
      expect(grouped).toHaveProperty('RichText');
      expect(grouped).toHaveProperty('Label');
      expect(grouped).toHaveProperty('Link');
      expect(grouped).toHaveProperty('Button');
      expect(grouped).toHaveProperty('Image');
      expect(grouped).toHaveProperty('List');
      expect(grouped).toHaveProperty('Other');
    });

    it('should handle empty array', () => {
      const grouped = groupByCategory([]);

      expect(grouped.Heading).toHaveLength(0);
      expect(grouped.Paragraph).toHaveLength(0);
    });
  });
});
