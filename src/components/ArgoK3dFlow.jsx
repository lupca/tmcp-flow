import React, { useMemo } from 'react';
import { ReactFlow, MiniMap, Controls, Background } from '@xyflow/react';
import { interpolate, Easing } from 'remotion';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import ViralEdge from './ViralEdge';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { viral: ViralEdge };

/**
 * ArgoK3dFlow: A pure presentation component for the GitOps flow.
 * Works in both browser (interactive) and Remotion (rendered) contexts.
 */
export default function ArgoK3dFlow({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  cameraSequence = [],
  config = {},
  frame = 0,
  width = 1280,
  height = 720,
  isRemotion = false
}) {

  // Calculate camera viewport based on sequence keyframes
  const processedKeyframes = useMemo(() => {
    if (!cameraSequence?.length) {
      return [{ frame: 0, x: 0, y: 0, zoom: width < height ? 0.4 : 0.8 }];
    }

    return cameraSequence.map(kf => {
      if (kf.targetNodeId) {
        const node = nodes.find(n => n.id === kf.targetNodeId);
        if (node) {
          const nodeW = node.style?.width || 150;
          const nodeH = node.style?.height || 50;
          const centerX = node.position.x + nodeW / 2;
          const centerY = node.position.y + nodeH / 2;
          return {
            frame: kf.frame,
            zoom: kf.zoom,
            x: (width / 2) - (centerX * kf.zoom),
            y: (height / 2) - (centerY * kf.zoom)
          };
        }
        // Node not found: fallback to center with default values
        return { frame: kf.frame, zoom: kf.zoom || 1, x: 0, y: 0 };
      }
      // Ensure x and y always have numeric values
      return { frame: kf.frame, zoom: kf.zoom || 1, x: kf.x ?? 0, y: kf.y ?? 0 };
    }).sort((a, b) => a.frame - b.frame);
  }, [cameraSequence, nodes, width, height]);

  // Viewport interpolation (only used when cameraSequence is provided or in Remotion)
  const { viewportX, viewportY, viewportZoom } = useMemo(() => {
    if (processedKeyframes.length >= 2) {
      const inputFrames = processedKeyframes.map(k => k.frame);
      const options = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease) };
      return {
        viewportX: interpolate(frame, inputFrames, processedKeyframes.map(k => k.x), options),
        viewportY: interpolate(frame, inputFrames, processedKeyframes.map(k => k.y), options),
        viewportZoom: interpolate(frame, inputFrames, processedKeyframes.map(k => k.zoom), options),
      };
    }
    const kf = processedKeyframes[0];
    return { viewportX: kf.x, viewportY: kf.y, viewportZoom: kf.zoom };
  }, [frame, processedKeyframes]);

  const isInteractive = !isRemotion;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        viewport={(isRemotion || cameraSequence.length > 0) ? { x: viewportX, y: viewportY, zoom: viewportZoom } : undefined}
        fitView={isInteractive && !cameraSequence.length}
        nodesDraggable={isInteractive}
        nodesConnectable={isInteractive}
        elementsSelectable={isInteractive}
        zoomOnScroll={isInteractive}
        panOnScroll={isInteractive}
        panOnDrag={isInteractive}
        zoomOnDoubleClick={isInteractive}
        zoomOnPinch={isInteractive}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={20} size={1} />
        {isInteractive && <Controls style={{ background: '#1a1a1a', border: '1px solid #333' }} />}
        {isInteractive && <MiniMap nodeColor="#333" style={{ background: '#0a0a0a', border: '1px solid #333' }} />}

        {config?.title && (
          <div style={{
            position: 'absolute', top: 40, left: 40,
            fontFamily: 'inherit', fontSize: width < height ? 30 : 40,
            fontWeight: 800, color: 'white', zIndex: 10, pointerEvents: 'none',
            opacity: 0.8
          }}>
            {config.title}
          </div>
        )}
      </ReactFlow>
    </div>
  );
}
