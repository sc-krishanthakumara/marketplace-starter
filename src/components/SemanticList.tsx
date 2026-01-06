// SemanticList Component - Displays text content grouped by semantic category

'use client';

import { useState, useMemo } from 'react';
import type { SemanticTextItem, SemanticCategory } from '@/src/types';
import { groupByCategory } from '@/src/utils/semanticClassifier';

export interface SemanticListProps {
  items: SemanticTextItem[];
  selectedCategories: SemanticCategory[];
  onToggleCategory: (category: SemanticCategory) => void;
}

const CATEGORY_COLORS: Record<SemanticCategory, string> = {
  Heading: '#3b82f6',
  Paragraph: '#8b5cf6',
  RichText: '#ec4899',
  Label: '#14b8a6',
  Link: '#f59e0b',
  Button: '#10b981',
  Image: '#6366f1',
  List: '#06b6d4',
  Other: '#6b7280',
};

const CATEGORY_ICONS: Record<SemanticCategory, string> = {
  Heading: 'H',
  Paragraph: 'P',
  RichText: 'RT',
  Label: 'L',
  Link: '🔗',
  Button: 'BTN',
  Image: '🖼',
  List: '•',
  Other: '?',
};

export function SemanticList({
  items,
  selectedCategories,
  onToggleCategory,
}: SemanticListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<SemanticCategory>>(
    new Set(['Heading', 'Paragraph', 'RichText'])
  );

  const groupedItems = useMemo(() => groupByCategory(items), [items]);

  const toggleCategory = (category: SemanticCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categories: SemanticCategory[] = [
    'Heading',
    'Paragraph',
    'RichText',
    'Label',
    'Link',
    'Button',
    'Image',
    'List',
    'Other',
  ];

  const totalItems = items.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Semantic Content</h3>
        <div style={styles.stats}>
          <span style={styles.statLabel}>{totalItems} items</span>
        </div>
      </div>

      <div style={styles.categoryFilters}>
        {categories.map(category => {
          const count = groupedItems[category].length;
          if (count === 0) return null;

          const isSelected = selectedCategories.includes(category);
          const color = CATEGORY_COLORS[category];

          return (
            <button
              key={category}
              onClick={() => onToggleCategory(category)}
              style={{
                ...styles.filterChip,
                ...(isSelected ? { ...styles.filterChipActive, borderColor: color } : {}),
              }}
              type="button"
            >
              <span style={{ ...styles.filterIcon, color }}>{CATEGORY_ICONS[category]}</span>
              <span>{category}</span>
              <span style={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.list}>
        {categories.map(category => {
          const categoryItems = groupedItems[category];
          if (categoryItems.length === 0) return null;

          const isExpanded = expandedCategories.has(category);
          const color = CATEGORY_COLORS[category];

          return (
            <div key={category} style={styles.categorySection}>
              <button
                onClick={() => toggleCategory(category)}
                style={styles.categoryHeader}
                type="button"
              >
                <div style={styles.categoryHeaderLeft}>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    style={{
                      ...styles.expandIcon,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    <path
                      d="M4 2L8 6L4 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ ...styles.categoryBadge, backgroundColor: color }}>
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span style={styles.categoryName}>{category}</span>
                </div>
                <span style={styles.categoryCount}>{categoryItems.length}</span>
              </button>

              {isExpanded && (
                <div style={styles.categoryItems}>
                  {categoryItems.map(item => (
                    <SemanticTextItemCard
                      key={item.id}
                      item={item}
                      categoryColor={color}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SemanticTextItemCardProps {
  item: SemanticTextItem;
  categoryColor: string;
}

function SemanticTextItemCard({ item, categoryColor }: SemanticTextItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse structured content for Images and Links
  const parsedContent = useMemo(() => {
    if (item.category === 'Image') {
      // Parse: "Alt: xxx | Src: yyy"
      const altMatch = item.text.match(/Alt: ([^|]+)/);
      const srcMatch = item.text.match(/Src: (.+)$/);
      return {
        type: 'image' as const,
        alt: altMatch ? altMatch[1].trim() : '',
        src: srcMatch ? srcMatch[1].trim() : '',
      };
    } else if (item.category === 'Link') {
      // Parse: "text (title) [url]" or "text [url]" or just "text"
      // Handle multiple formats:
      // 1. "Learn more [http://example.com]"
      // 2. "Learn more (Title) [http://example.com]"
      // 3. "Learn more [http://#]" (placeholder URL)
      // 4. "Learn more" (text only, no URL)
      
      // First, try to extract URL (everything in brackets at the end)
      const urlMatch = item.text.match(/\[([^\]]+)\]$/);
      const url = urlMatch ? urlMatch[1].trim() : '';
      
      // Extract title (everything in parentheses)
      const titleMatch = item.text.match(/\(([^)]+)\)/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract text - everything before the first ( or [
      // Remove URL and title parts to get just the text
      let text = item.text;
      if (urlMatch) {
        text = text.replace(/\[([^\]]+)\]$/, '').trim();
      }
      if (titleMatch) {
        text = text.replace(/\(([^)]+)\)/, '').trim();
      }
      
      // If text is empty after removing URL/title, but we have a URL, the whole thing might be the URL
      if (!text && url) {
        text = '';
      }
      
      // If still no text and no URL, use the original text
      if (!text && !url) {
        text = item.text.trim();
      }
      
      return {
        type: 'link' as const,
        text: text,
        title: title,
        url: url,
      };
    }
    return { type: 'text' as const, content: item.text };
  }, [item.text, item.category]);
  
  const maxPreviewLength = 150;
  const needsTruncation = item.text.length > maxPreviewLength;

  const displayText = needsTruncation && !isExpanded
    ? item.text.substring(0, maxPreviewLength) + '...'
    : item.text;

  return (
    <div style={styles.itemCard}>
      <div style={{ ...styles.itemIndicator, backgroundColor: categoryColor }} />
      <div style={styles.itemContent}>
        {/* Rich display for Images */}
        {parsedContent.type === 'image' && parsedContent.src && (
          <div style={styles.richImageContent}>
            <img 
              src={parsedContent.src} 
              alt={parsedContent.alt || 'Image'} 
              style={styles.imageThumbnail}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div style={styles.imageDetails}>
              {parsedContent.alt && (
                <div style={styles.imageField}>
                  <span style={styles.imageFieldLabel}>Alt Text:</span>
                  <span style={styles.imageFieldValue}>{parsedContent.alt}</span>
                </div>
              )}
              <div style={styles.imageField}>
                <span style={styles.imageFieldLabel}>URL:</span>
                <a 
                  href={parsedContent.src} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.imageUrl}
                  title="Open image in new tab"
                >
                  {parsedContent.src.length > 60 
                    ? parsedContent.src.substring(0, 60) + '...' 
                    : parsedContent.src}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Rich display for Links */}
        {parsedContent.type === 'link' && (
          <div style={styles.richLinkContent}>
            <div style={styles.linkDetails}>
              {/* ALWAYS show link text if available - this is the most important part */}
              {parsedContent.text ? (
                <div style={styles.linkField}>
                  <span style={styles.linkFieldLabel}>Link Text:</span>
                  <span style={{ ...styles.linkFieldValue, fontWeight: 600, color: '#1e40af', fontSize: '14px' }}>
                    "{parsedContent.text}"
                  </span>
                </div>
              ) : (
                <div style={styles.linkField}>
                  <span style={styles.linkFieldLabel}>Link Text:</span>
                  <span style={{ ...styles.linkFieldValue, fontStyle: 'italic', color: '#9ca3af' }}>
                    (no text)
                  </span>
                </div>
              )}
              
              {parsedContent.title && (
                <div style={styles.linkField}>
                  <span style={styles.linkFieldLabel}>Title:</span>
                  <span style={styles.linkFieldValue}>{parsedContent.title}</span>
                </div>
              )}
              
              {/* Show URL - always display it, even if placeholder */}
              {parsedContent.url ? (
                <div style={styles.linkField}>
                  <span style={styles.linkFieldLabel}>URL:</span>
                  {parsedContent.url !== 'http://#' && parsedContent.url !== '#' ? (
                    <a 
                      href={parsedContent.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={styles.linkUrl}
                    >
                      {parsedContent.url}
                    </a>
                  ) : (
                    <span style={{ ...styles.linkFieldValue, fontStyle: 'italic', color: '#9ca3af' }}>
                      {parsedContent.url} <span style={{ fontSize: '11px' }}>(placeholder)</span>
                    </span>
                  )}
                </div>
              ) : (
                <div style={styles.linkField}>
                  <span style={styles.linkFieldLabel}>URL:</span>
                  <span style={{ ...styles.linkFieldValue, fontStyle: 'italic', color: '#9ca3af' }}>
                    (no URL)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Standard text display */}
        {parsedContent.type === 'text' && (
          <>
            <div style={styles.itemText}>{displayText}</div>
            {needsTruncation && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={styles.expandTextButton}
                type="button"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
        
        {/* Metadata */}
        <div style={styles.itemMetadata}>
          <div style={styles.metadataRow}>
            <span style={styles.metadataLabel}>Component:</span>
            <span style={styles.metadataValue}>{item.metadata.componentName}</span>
          </div>
          <div style={styles.metadataRow}>
            <span style={styles.metadataLabel}>Field:</span>
            <span style={styles.metadataValue}>{item.metadata.fieldName}</span>
          </div>
          {item.metadata.datasourceItemId && (
            <div style={styles.metadataRow}>
              <span style={styles.metadataLabel}>Datasource:</span>
              <span style={styles.metadataValue}>{item.metadata.datasourceItemId}</span>
            </div>
          )}
          {item.metadata.renderingPlaceholder && (
            <div style={styles.metadataRow}>
              <span style={styles.metadataLabel}>Placeholder:</span>
              <span style={styles.metadataValue}>{item.metadata.renderingPlaceholder}</span>
            </div>
          )}
          <div style={styles.metadataRow}>
            <span style={styles.metadataLabel}>Path:</span>
            <span style={styles.metadataValue}>{item.path.join(' › ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  stats: {
    display: 'flex',
    gap: '12px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  categoryFilters: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterChipActive: {
    backgroundColor: '#f0f9ff',
    borderWidth: '2px',
  },
  filterIcon: {
    fontWeight: 600,
    fontSize: '11px',
  },
  filterCount: {
    color: '#6b7280',
    fontSize: '11px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  categorySection: {
    marginBottom: '8px',
  },
  categoryHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    fontFamily: 'inherit',
  },
  categoryHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  expandIcon: {
    transition: 'transform 0.2s',
    color: '#6b7280',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600,
  },
  categoryName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
  },
  categoryCount: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
  },
  categoryItems: {
    paddingLeft: '24px',
    marginTop: '4px',
  },
  itemCard: {
    display: 'flex',
    marginBottom: '8px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  itemIndicator: {
    width: '4px',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    padding: '12px',
  },
  itemText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#374151',
    marginBottom: '8px',
    wordBreak: 'break-word',
  },
  expandTextButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
    marginBottom: '8px',
    fontFamily: 'inherit',
  },
  itemMetadata: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metadataRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
  },
  metadataLabel: {
    color: '#6b7280',
    fontWeight: 500,
    minWidth: '80px',
  },
  metadataValue: {
    color: '#374151',
    wordBreak: 'break-all',
  },
  // Rich image display styles
  richImageContent: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  imageThumbnail: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  imageDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  imageField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  imageFieldLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  imageFieldValue: {
    fontSize: '13px',
    color: '#374151',
  },
  imageUrl: {
    fontSize: '12px',
    color: '#3b82f6',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  // Rich link display styles
  richLinkContent: {
    marginBottom: '12px',
  },
  linkDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  linkField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  linkFieldLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  linkFieldValue: {
    fontSize: '13px',
    color: '#374151',
  },
  linkUrl: {
    fontSize: '12px',
    color: '#3b82f6',
    textDecoration: 'underline',
    wordBreak: 'break-all',
  },
};
