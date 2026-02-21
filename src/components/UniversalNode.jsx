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
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${selected ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255, 255, 255, 0.15)'}`,
        borderRadius: 16,
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minWidth: 220,
        boxShadow: selected
          ? '0 0 24px 6px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: 'rgba(248, 250, 252, 0.8)',
          border: '2px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '50%',
        }}
      />

      {icon && (
        <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#F8FAFC',
          marginBottom: 4,
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 12,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: 'rgba(248, 250, 252, 0.8)',
          border: '2px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
};

export default memo(UniversalNode);
