import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * UniversalNode — fully inline-styled so it renders identically
 * in the browser Studio AND inside Remotion's headless renderer.
 */
const UniversalNode = ({ data, selected }) => {
  const { title = 'Node', subtitle, icon } = data;

  return (
    <div
      style={{
        background: 'rgba(20, 20, 30, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${selected ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: 14,
        padding: '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: 140,
        boxShadow: selected
          ? '0 0 20px 4px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: 'rgba(255, 255, 255, 0.7)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
        }}
      />

      {icon && (
        <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.45)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {subtitle}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: 'rgba(255, 255, 255, 0.7)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

export default memo(UniversalNode);
