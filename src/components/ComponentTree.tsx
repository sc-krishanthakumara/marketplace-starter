// ComponentTree Component - Displays hierarchical component structure

'use client';

import { useState, useCallback } from 'react';
import type { ComponentNode } from '@/src/types';

export interface ComponentTreeProps {
  components: ComponentNode[];
  selectedComponentId?: string;
  onSelectComponent: (componentId: string) => void;
}

export function ComponentTree({
  components,
  selectedComponentId,
  onSelectComponent,
}: ComponentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectComponent(id);
    },
    [onSelectComponent]
  );

  if (components.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No components found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Component Tree</h3>
      </div>
      <div style={styles.tree}>
        {components.map(component => (
          <ComponentTreeNode
            key={component.id}
            component={component}
            level={0}
            isExpanded={expandedIds.has(component.id)}
            isSelected={component.id === selectedComponentId}
            onToggleExpanded={toggleExpanded}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface ComponentTreeNodeProps {
  component: ComponentNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpanded: (id: string) => void;
  onSelect: (id: string) => void;
}

function ComponentTreeNode({
  component,
  level,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onSelect,
}: ComponentTreeNodeProps) {
  const hasChildren = component.children && component.children.length > 0;
  const fieldCount = component.fields.length;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggleExpanded(component.id);
      }
    },
    [hasChildren, onToggleExpanded, component.id]
  );

  const handleClick = useCallback(() => {
    onSelect(component.id);
  }, [onSelect, component.id]);

  return (
    <div style={styles.nodeContainer}>
      <div
        style={{
          ...styles.node,
          ...(isSelected ? styles.nodeSelected : {}),
          paddingLeft: `${level * 20 + 8}px`,
        }}
        onClick={handleClick}
      >
        <button
          onClick={handleToggle}
          style={{
            ...styles.expandButton,
            ...(hasChildren ? {} : styles.expandButtonHidden),
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          type="button"
        >
          {hasChildren && (
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
          )}
        </button>
        <div style={styles.nodeContent}>
          <div style={styles.nodeName}>{component.name}</div>
          <div style={styles.nodeInfo}>
            <span style={styles.componentType}>{component.componentName}</span>
            {fieldCount > 0 && (
              <span style={styles.fieldCount}>{fieldCount} fields</span>
            )}
          </div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {component.children.map(child => (
            <ComponentTreeNode
              key={child.id}
              component={child}
              level={level + 1}
              isExpanded={false}
              isSelected={child.id === onSelect.toString()}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
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
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  tree: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  },
  empty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#6b7280',
  },
  nodeContainer: {
    marginBottom: '2px',
  },
  node: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    userSelect: 'none',
  },
  nodeSelected: {
    backgroundColor: '#eff6ff',
    borderLeft: '3px solid #3b82f6',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '4px',
    color: '#6b7280',
    minWidth: '20px',
  },
  expandButtonHidden: {
    visibility: 'hidden',
  },
  expandIcon: {
    transition: 'transform 0.2s',
  },
  nodeContent: {
    flex: 1,
    minWidth: 0,
  },
  nodeName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nodeInfo: {
    display: 'flex',
    gap: '8px',
    marginTop: '2px',
  },
  componentType: {
    fontSize: '11px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fieldCount: {
    fontSize: '11px',
    color: '#9ca3af',
  },
};
