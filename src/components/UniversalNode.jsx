import React, { memo } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import { getThemeConfig, getChildNodeTheme, SELECTION_EFFECTS } from '../constants/flowConstants';

/**
 * UniversalNode — Premium Modern SaaS design with configurable themes
 * Fully inline-styled so it renders identically in the browser Studio
 * AND inside Remotion's headless renderer.
 * 
 * Themes: Vercel Glass, Linear Luxury, Slate Premium, Neon Dark, 
 * Minimal Elite, Gradient Burst
 * 
 * Supports resizing via mouse drag (NodeResizer) and scales down
 * automatically when used as child inside group nodes.
 */
const UniversalNode = ({ data, selected, id }) => {
  // Safely check if this is a child node
  let isChildNode = false;
  try {
    const { getNode } = useReactFlow();
    const node = getNode(id);
    isChildNode = !!node?.parentId;
  } catch (e) {
    // In some contexts (like Remotion), useReactFlow might not be available
    // Fall back to checking if node data has explicit child flag
    isChildNode = !!data?.isChildNode;
  }
  
  const { 
    title = 'Node', 
    subtitle, 
    icon,
    themeKey = 'vercel_glass',
    selectionEffect = 'glow_scale',
  } = data;

  // Get theme configuration - use scaled down theme for child nodes
  const theme = isChildNode ? getChildNodeTheme(themeKey) : getThemeConfig(themeKey);
  const selectionConfig = SELECTION_EFFECTS[selectionEffect] || SELECTION_EFFECTS.glow_scale;

  // Build container style with dynamic width/height
  // Extract minWidth from theme to avoid overriding explicit dimensions
  const { minWidth, ...baseStyleWithoutMinWidth } = theme.containerBase;
  
  const containerStyle = {
    ...baseStyleWithoutMinWidth,
    fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    // Use 100% to fill the node's dimensions (set by ReactFlow width/height props)
    width: '100%',
    height: '100%',
    // Remove constraints that would prevent resizing
    minWidth: 'unset',
    minHeight: 'unset',
    maxWidth: 'unset',
    maxHeight: 'unset',
    ...(selected ? selectionConfig.getStyles(theme) : {}),
  };

  // Icon rendering - supports both emoji strings and potential future icon components
  const renderIcon = () => {
    if (!icon) return null;
    
    // Check if icon is a string (emoji)
    if (typeof icon === 'string') {
      return (
        <div style={theme.iconWrapper}>
          {icon}
        </div>
      );
    }
    
    // Future: Support icon components (e.g., from react-icons)
    // if (React.isValidElement(icon)) {
    //   return <div style={theme.iconWrapper}>{icon}</div>;
    // }
    
    return null;
  };

  return (
    <div style={containerStyle}>
      {/* NodeResizer - allows dragging corners/edges to resize */}
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineStyle={{
          borderWidth: 2,
          borderColor: theme.handleStyle?.border?.includes('cyan') ? '#06b6d4' :
                      theme.handleStyle?.border?.includes('purple') ? '#8b5cf6' :
                      theme.handleStyle?.border?.includes('pink') ? '#ec4899' :
                      'rgba(255, 255, 255, 0.4)',
        }}
        handleStyle={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: theme.handleStyle?.background || 'rgba(255, 255, 255, 0.6)',
        }}
      />
      {/* Top Handle (Target) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          ...theme.handleStyle,
          borderRadius: '50%',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Icon */}
      {renderIcon()}

      {/* Title */}
      <div style={theme.titleStyle}>
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={theme.subtitleStyle}>
          {subtitle}
        </div>
      )}

      {/* Bottom Handle (Source) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          ...theme.handleStyle,
          borderRadius: '50%',
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  );
};

export default memo(UniversalNode);
