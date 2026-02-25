import React, { memo } from 'react';
import { NodeResizer, Handle, Position } from '@xyflow/react';

/**
 * GroupNode - Resizable container for child nodes
 * Supports mouse-based resizing via NodeResizer
 * Styles are applied via inline styles for Remotion compatibility
 */
const GroupNode = ({ data, selected }) => {
  const { label = 'Group' } = data;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: 'transparent',
          border: 'none',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{
          width: 8,
          height: 8,
          background: 'transparent',
          border: 'none',
        }}
      />

      {/* NodeResizer - allows dragging corners/edges to resize group */}
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={150}
        lineStyle={{
          borderWidth: 2,
          borderColor: selected ? 'rgba(99, 102, 241, 0.6)' : 'rgba(148, 163, 184, 0.3)',
          borderStyle: 'dashed',
        }}
        handleStyle={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          border: '2px solid rgba(148, 163, 184, 0.4)',
        }}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        {label}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: 'transparent',
          border: 'none',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{
          width: 8,
          height: 8,
          background: 'transparent',
          border: 'none',
        }}
      />
    </>
  );
};

export default memo(GroupNode);
