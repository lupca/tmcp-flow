import React, { memo } from 'react';
import { NodeResizer } from '@xyflow/react';

/**
 * GroupNode - Resizable container for child nodes
 * Supports mouse-based resizing via NodeResizer
 * Styles are applied via inline styles for Remotion compatibility
 */
const GroupNode = ({ data, selected }) => {
  const { label = 'Group' } = data;

  return (
    <>
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
    </>
  );
};

export default memo(GroupNode);
