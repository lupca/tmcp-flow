import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';

export default function StudioCanvas({
  nodes,
  edges,
  previewMode,
  edgeEffectType,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  nodeTypes,
  edgeTypes,
  canvasRef,
}) {
  return (
    <div className="studio-canvas" ref={canvasRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges.map((edge) => ({
          ...edge,
          data: { ...edge.data, previewMode, effectType: edgeEffectType },
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" color="#1E293B" gap={24} size={2} />
        <Controls
          style={{
            background: '#0F172A',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        />
        <MiniMap
          nodeColor="#334155"
          style={{
            background: '#0B0F19',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        />
      </ReactFlow>
    </div>
  );
}
