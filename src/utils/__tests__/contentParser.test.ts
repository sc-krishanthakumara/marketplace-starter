// Unit tests for content parser utilities

import {
  parsePageContent,
  extractSemanticItems,
  flattenComponentTree,
  findComponentById,
  getComponentBreadcrumb,
} from '../contentParser';
import type {
  ExperienceEdgeResponse,
  ComponentNode,
  PageContent,
} from '@/src/types';

describe('contentParser', () => {
  describe('parsePageContent', () => {
    it('should parse basic page content from GraphQL response', () => {
      const mockResponse: ExperienceEdgeResponse = {
        item: {
          id: 'page-123',
          name: 'Home',
          path: '/',
          template: { name: 'Page' },
          fields: [
            { name: 'Title', value: 'Welcome' },
            { name: 'Content', value: 'Page content' },
          ],
        },
      };

      const result = parsePageContent(mockResponse);

      expect(result).not.toBeNull();
      expect(result?.itemId).toBe('page-123');
      expect(result?.name).toBe('Home');
      expect(result?.path).toBe('/');
    });

    it('should return null when item is missing', () => {
      const mockResponse: ExperienceEdgeResponse = {};

      const result = parsePageContent(mockResponse);

      expect(result).toBeNull();
    });

    it('should parse components from layout data', () => {
      const mockResponse: ExperienceEdgeResponse = {
        item: {
          id: 'page-123',
          name: 'Home',
        },
        layout: {
          item: {
            rendered: {
              sitecore: {
                route: {
                  name: 'Home',
                  placeholders: {
                    main: [
                      {
                        componentName: 'Hero',
                        uid: 'hero-1',
                        fields: {
                          Title: 'Welcome',
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const result = parsePageContent(mockResponse);

      expect(result).not.toBeNull();
      expect(result?.components).toHaveLength(1);
      expect(result?.components[0].componentName).toBe('Hero');
    });

    it('should parse nested components from placeholders', () => {
      const mockResponse: ExperienceEdgeResponse = {
        item: {
          id: 'page-123',
          name: 'Home',
        },
        layout: {
          item: {
            rendered: {
              sitecore: {
                route: {
                  placeholders: {
                    main: [
                      {
                        componentName: 'Container',
                        uid: 'container-1',
                        fields: {},
                        placeholders: {
                          content: [
                            {
                              componentName: 'Text',
                              uid: 'text-1',
                              fields: { Text: 'Content' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const result = parsePageContent(mockResponse);

      expect(result).not.toBeNull();
      expect(result?.components).toHaveLength(1);
      expect(result?.components[0].children).toHaveLength(1);
      expect(result?.components[0].children[0].componentName).toBe('Text');
    });
  });

  describe('extractSemanticItems', () => {
    it('should extract semantic items from page content', () => {
      const mockPageContent: PageContent = {
        itemId: 'page-123',
        name: 'Home',
        language: 'en',
        path: '/',
        components: [
          {
            id: 'hero-1',
            name: 'Hero',
            componentName: 'Hero',
            type: 'Component',
            fields: [
              {
                name: 'Title',
                value: 'Welcome',
                type: 'Single-Line Text',
                category: 'Heading',
              },
              {
                name: 'Text',
                value: 'Description',
                type: 'Multi-Line Text',
                category: 'Paragraph',
              },
            ],
            children: [],
            path: ['Home', 'Hero'],
          },
        ],
      };

      const items = extractSemanticItems(mockPageContent);

      expect(items).toHaveLength(2);
      expect(items[0].category).toBe('Heading');
      expect(items[0].text).toBe('Welcome');
      expect(items[1].category).toBe('Paragraph');
      expect(items[1].text).toBe('Description');
    });

    it('should extract items from nested components', () => {
      const mockPageContent: PageContent = {
        itemId: 'page-123',
        name: 'Home',
        language: 'en',
        path: '/',
        components: [
          {
            id: 'container-1',
            name: 'Container',
            componentName: 'Container',
            type: 'Component',
            fields: [],
            children: [
              {
                id: 'text-1',
                name: 'Text',
                componentName: 'Text',
                type: 'Component',
                fields: [
                  {
                    name: 'Content',
                    value: 'Nested text',
                    type: 'Multi-Line Text',
                    category: 'Paragraph',
                  },
                ],
                children: [],
                path: ['Home', 'Container', 'Text'],
              },
            ],
            path: ['Home', 'Container'],
          },
        ],
      };

      const items = extractSemanticItems(mockPageContent);

      expect(items).toHaveLength(1);
      expect(items[0].path).toEqual(['Home', 'Container', 'Text']);
    });

    it('should include component metadata in semantic items', () => {
      const mockPageContent: PageContent = {
        itemId: 'page-123',
        name: 'Home',
        language: 'en',
        path: '/',
        components: [
          {
            id: 'hero-1',
            name: 'Hero',
            componentName: 'Hero',
            type: 'Component',
            datasourceId: 'ds-123',
            placeholder: 'main',
            params: { variant: 'primary' },
            fields: [
              {
                name: 'Title',
                value: 'Welcome',
                type: 'Single-Line Text',
                category: 'Heading',
              },
            ],
            children: [],
            path: ['Home', 'Hero'],
          },
        ],
      };

      const items = extractSemanticItems(mockPageContent);

      expect(items[0].metadata.componentName).toBe('Hero');
      expect(items[0].metadata.componentId).toBe('hero-1');
      expect(items[0].metadata.datasourceItemId).toBe('ds-123');
      expect(items[0].metadata.fieldName).toBe('Title');
      expect(items[0].metadata.renderingPlaceholder).toBe('main');
      expect(items[0].metadata.params).toEqual({ variant: 'primary' });
    });

    it('should handle empty component list', () => {
      const mockPageContent: PageContent = {
        itemId: 'page-123',
        name: 'Home',
        language: 'en',
        path: '/',
        components: [],
      };

      const items = extractSemanticItems(mockPageContent);

      expect(items).toHaveLength(0);
    });
  });

  describe('flattenComponentTree', () => {
    it('should flatten a simple component tree', () => {
      const components: ComponentNode[] = [
        {
          id: '1',
          name: 'Component 1',
          componentName: 'Comp1',
          type: 'Component',
          fields: [],
          children: [],
          path: [],
        },
        {
          id: '2',
          name: 'Component 2',
          componentName: 'Comp2',
          type: 'Component',
          fields: [],
          children: [],
          path: [],
        },
      ];

      const flat = flattenComponentTree(components);

      expect(flat).toHaveLength(2);
      expect(flat[0].id).toBe('1');
      expect(flat[1].id).toBe('2');
    });

    it('should flatten nested component tree', () => {
      const components: ComponentNode[] = [
        {
          id: '1',
          name: 'Parent',
          componentName: 'Parent',
          type: 'Component',
          fields: [],
          children: [
            {
              id: '2',
              name: 'Child 1',
              componentName: 'Child1',
              type: 'Component',
              fields: [],
              children: [
                {
                  id: '3',
                  name: 'Grandchild',
                  componentName: 'Grandchild',
                  type: 'Component',
                  fields: [],
                  children: [],
                  path: [],
                },
              ],
              path: [],
            },
            {
              id: '4',
              name: 'Child 2',
              componentName: 'Child2',
              type: 'Component',
              fields: [],
              children: [],
              path: [],
            },
          ],
          path: [],
        },
      ];

      const flat = flattenComponentTree(components);

      expect(flat).toHaveLength(4);
      expect(flat.map(c => c.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should handle empty component array', () => {
      const flat = flattenComponentTree([]);

      expect(flat).toHaveLength(0);
    });
  });

  describe('findComponentById', () => {
    const mockComponents: ComponentNode[] = [
      {
        id: '1',
        name: 'Component 1',
        componentName: 'Comp1',
        type: 'Component',
        fields: [],
        children: [
          {
            id: '2',
            name: 'Component 2',
            componentName: 'Comp2',
            type: 'Component',
            fields: [],
            children: [],
            path: [],
          },
        ],
        path: [],
      },
      {
        id: '3',
        name: 'Component 3',
        componentName: 'Comp3',
        type: 'Component',
        fields: [],
        children: [],
        path: [],
      },
    ];

    it('should find component by ID at root level', () => {
      const component = findComponentById(mockComponents, '1');

      expect(component).not.toBeNull();
      expect(component?.name).toBe('Component 1');
    });

    it('should find component by ID in nested structure', () => {
      const component = findComponentById(mockComponents, '2');

      expect(component).not.toBeNull();
      expect(component?.name).toBe('Component 2');
    });

    it('should return null when component is not found', () => {
      const component = findComponentById(mockComponents, 'nonexistent');

      expect(component).toBeNull();
    });
  });

  describe('getComponentBreadcrumb', () => {
    it('should generate breadcrumb from component path', () => {
      const component: ComponentNode = {
        id: '1',
        name: 'Component',
        componentName: 'Comp',
        type: 'Component',
        fields: [],
        children: [],
        path: ['Home', 'Section', 'Component'],
      };

      const breadcrumb = getComponentBreadcrumb(component);

      expect(breadcrumb).toBe('Home > Section > Component');
    });

    it('should handle single-level path', () => {
      const component: ComponentNode = {
        id: '1',
        name: 'Component',
        componentName: 'Comp',
        type: 'Component',
        fields: [],
        children: [],
        path: ['Home'],
      };

      const breadcrumb = getComponentBreadcrumb(component);

      expect(breadcrumb).toBe('Home');
    });

    it('should handle empty path', () => {
      const component: ComponentNode = {
        id: '1',
        name: 'Component',
        componentName: 'Comp',
        type: 'Component',
        fields: [],
        children: [],
        path: [],
      };

      const breadcrumb = getComponentBreadcrumb(component);

      expect(breadcrumb).toBe('');
    });
  });
});
