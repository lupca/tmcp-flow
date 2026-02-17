import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomNode = ({ data, selected }) => {
    const getPlatformStyle = (type) => {
        switch (type) {
            case 'local': return { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#60a5fa' };
            case 'git': return { bg: 'linear-gradient(135deg, #f97316, #ea580c)', border: '#fdba74' };
            case 'server': return { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#c4b5fd' };
            case 'k3d': return { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#6ee7b7' };
            case 'argo': return { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: '#67e8f9' };
            case 'user': return { bg: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#f9a8d4' };
            default: return { bg: '#333', border: '#555' };
        }
    };

    const style = getPlatformStyle(data.platform);

    return (
        <div className="glass-panel" style={{
            background: style.bg,
            borderColor: `${style.border}80`,
            boxShadow: selected ? `0 0 15px 2px ${style.border}` : 'none',
            borderRadius: 12, minWidth: 150
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
            <div className="custom-node-content">
                {data.icon && <div className="custom-node-icon">{data.icon}</div>}
                <div className="custom-node-label">{data.label}</div>
                {data.sublabel && <div className="custom-node-sublabel">{data.sublabel}</div>}
            </div>
            {data.platform && (
                <div className="platform-label" style={{ background: style.border, color: '#000' }}>
                    {data.platform}
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
        </div>
    );
};

export default memo(CustomNode);

