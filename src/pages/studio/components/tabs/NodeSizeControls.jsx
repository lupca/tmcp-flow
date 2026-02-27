export default function NodeSizeControls({ selectedNodeId, nodes, setNodes }) {
  if (!selectedNodeId) return null;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  if (!selectedNode) return null;

  const isGroup = selectedNode.type === 'group';
  const currentWidth =
    selectedNode.width || selectedNode.style?.width || (isGroup ? 520 : 280);
  const currentHeight =
    selectedNode.height || selectedNode.style?.height || (isGroup ? 260 : 'auto');

  const updateNodeSize = (widthDelta, heightDelta) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const minWidth = isGroup ? 200 : 120;
        const minHeight = isGroup ? 150 : 80;
        const defaultHeight = isGroup ? 260 : 200;

        const newWidth = Math.max(
          minWidth,
          (node.width || (isGroup ? 520 : 280)) + widthDelta
        );
        const newHeight = heightDelta
          ? Math.max(
              minHeight,
              (node.height || (isGroup ? 260 : defaultHeight)) + heightDelta
            )
          : isGroup
          ? node.height || 260
          : undefined;

        return {
          ...node,
          width: newWidth,
          height: newHeight,
          style: {
            ...node.style,
            width: newWidth,
            height: newHeight,
          },
        };
      })
    );
  };

  return (
    <div className="section">
      <label className="section-label">
        📏 {isGroup ? 'Group' : 'Node'} Size
      </label>
      <div
        style={{
          marginBottom: '12px',
          padding: '10px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#94a3b8',
        }}
      >
        <div>
          Width:{' '}
          <strong style={{ color: '#f8fafc' }}>
            {Math.round(currentWidth)}px
          </strong>
        </div>
        <div>
          Height:{' '}
          <strong style={{ color: '#f8fafc' }}>
            {currentHeight === 'auto' ? 'Auto' : `${Math.round(currentHeight)}px`}
          </strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => updateNodeSize(-20, 0)}
          style={{ flex: 1, fontSize: '18px', padding: '8px' }}
          title="Decrease width"
        >
          ◀️ Narrow
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => updateNodeSize(20, 0)}
          style={{ flex: 1, fontSize: '18px', padding: '8px' }}
          title="Increase width"
        >
          Wide ▶️
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => updateNodeSize(0, -20)}
          style={{ flex: 1, fontSize: '18px', padding: '8px' }}
          title="Decrease height"
        >
          🔽 Short
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => updateNodeSize(0, 20)}
          style={{ flex: 1, fontSize: '18px', padding: '8px' }}
          title="Increase height"
        >
          Tall 🔼
        </button>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id !== selectedNodeId) return node;
              const defaultWidth = isGroup ? 520 : 280;
              const defaultHeight = isGroup ? 260 : undefined;
              return {
                ...node,
                width: defaultWidth,
                height: defaultHeight,
                style: {
                  ...node.style,
                  width: defaultWidth,
                  height: defaultHeight,
                },
              };
            })
          );
        }}
        style={{ width: '100%', fontSize: '12px' }}
      >
        🔄 Reset to Default
      </button>

      <div
        style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.7)',
        }}
      >
        💡 Tip: Click node + drag corners to resize with mouse
      </div>
    </div>
  );
}
