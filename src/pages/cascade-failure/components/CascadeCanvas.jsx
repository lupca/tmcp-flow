import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import { COLORS, NODE_STATUS } from '../../../constants/cascadeConstants';

export default function CascadeCanvas({
  processedNodes,
  processedEdges,
  onNodesChange,
  onEdgesChange,
  nodeTypes,
  edgeTypes,
}) {
  return (
    <div className="cascade-canvas">
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" color="#1E293B" gap={24} size={2} />
        <Controls
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const info = processedNodes.find((n) => n.id === node.id);
            const s = info?.data?.status;
            if (s === NODE_STATUS.ERROR) return COLORS.RED_NEON;
            if (s === NODE_STATUS.WARNING) return COLORS.YELLOW_WARNING;
            if (s === NODE_STATUS.OFFLINE) return COLORS.GREY_OFFLINE;
            return COLORS.CYAN_NEON;
          }}
          style={{
            background: 'rgba(11, 15, 25, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </div>
  );
}
