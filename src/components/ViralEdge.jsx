import React, { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';

const ViralEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label }) => {
    const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} style={{ ...style, strokeOpacity: 0.2, strokeWidth: 2 }} />
            <BaseEdge path={path} className="animated-edge-path" style={{ ...style, strokeWidth: 3, stroke: style.stroke || '#fff' }} />

            {label && (
                <EdgeLabelRenderer>
                    <div className="edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}

            <circle r="4" className="edge-particle">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
            </circle>
        </>
    );
};

export default memo(ViralEdge);

