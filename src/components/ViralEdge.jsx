import React, { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';

const ViralEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label }) => {
    const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

    return (
        <>
                        {/* Dashed background edge */}
                        <BaseEdge path={path} markerEnd={markerEnd} style={{ ...style, strokeOpacity: 0.2, strokeWidth: 2, strokeDasharray: '8 6' }} />
                        {/* Solid foreground edge for animation */}
                        <BaseEdge path={path} className="animated-edge-path" style={{ ...style, strokeWidth: 3, stroke: style.stroke || '#fff' }} />

                        {/* Animated particle with correct color (Remotion-compatible) */}
                        <circle r="4" fill={style.stroke || '#fff'}>
                            <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                        </circle>

            {label && (
                <EdgeLabelRenderer>
                    <div className="edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Remove duplicate particle, only render one */}
        </>
    );
};

export default memo(ViralEdge);

