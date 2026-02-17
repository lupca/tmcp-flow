import { useState } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import ArgoK3dFlow from './components/ArgoK3dFlow';
import './styles/App.css';
import './styles/index.css';

const defaultNodes = [
  { id: 'source-code', type: 'custom', data: { label: 'Source Code', sublabel: 'Commit & Push', platform: 'git', icon: '📝' }, position: { x: 50, y: 50 } },
  { id: 'ci-pipeline', type: 'custom', data: { label: 'CI Pipeline', sublabel: 'Build & Test', platform: 'server', icon: '⚙️' }, position: { x: 50, y: 200 } },
  { id: 'docker-registry', type: 'custom', data: { label: 'Docker Registry', sublabel: 'Store Image', platform: 'server', icon: '📦' }, position: { x: 300, y: 200 } },
  { id: 'gitops-repo', type: 'custom', data: { label: 'GitOps Repo', sublabel: 'Manifests', platform: 'git', icon: '📜' }, position: { x: 550, y: 200 } },
  { id: 'argocd', type: 'custom', data: { label: 'Argo CD', sublabel: 'Sync Controller', platform: 'argo', icon: '🐙' }, position: { x: 550, y: 350 } },
  { id: 'k3d-cluster', type: 'group', data: { label: 'K3d Cluster' }, position: { x: 250, y: 450 }, style: { width: 400, height: 220, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '16px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', padding: '10px' } },
  { id: 'deployment', type: 'custom', data: { label: 'Deployment', sublabel: 'Pods', platform: 'k3d', icon: '🚀' }, position: { x: 30, y: 60 }, parentId: 'k3d-cluster', extent: 'parent' },
  { id: 'service', type: 'custom', data: { label: 'Service', sublabel: 'LoadBalancer', platform: 'k3d', icon: '🌐' }, position: { x: 220, y: 60 }, parentId: 'k3d-cluster', extent: 'parent' },
  { id: 'user', type: 'custom', data: { label: 'End User', platform: 'user', icon: '👤' }, position: { x: 390, y: 750 } },
];

const defaultEdges = [
  { id: 'e1', source: 'source-code', target: 'ci-pipeline', type: 'viral', label: 'Push Code', style: { stroke: '#f97316' } },
  { id: 'e2', source: 'ci-pipeline', target: 'docker-registry', type: 'viral', label: 'Push Image', style: { stroke: '#8b5cf6' } },
  { id: 'e3', source: 'ci-pipeline', target: 'gitops-repo', type: 'viral', label: 'Update Tag', style: { stroke: '#8b5cf6' } },
  { id: 'e4', source: 'gitops-repo', target: 'argocd', type: 'viral', label: 'Watch', style: { stroke: '#f97316' } },
  { id: 'e5', source: 'argocd', target: 'deployment', type: 'viral', label: 'Sync', style: { stroke: '#06b6d4' } },
  { id: 'e6', source: 'docker-registry', target: 'deployment', type: 'viral', label: 'Pull Image', style: { stroke: '#a855f7' } },
  { id: 'e7', source: 'deployment', target: 'service', type: 'viral', style: { stroke: '#10b981' } },
  { id: 'e8', source: 'service', target: 'user', type: 'viral', label: 'Access', style: { stroke: '#ec4899' } },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const [format, setFormat] = useState('landscape');
  const [durationSec, setDurationSec] = useState(5);
  const [cameraSequence, setCameraSequence] = useState([]);
  const [kfFrame, setKfFrame] = useState(0);
  const [kfZoom, setKfZoom] = useState(1);
  const [kfTargetNodeId, setKfTargetNodeId] = useState('');
  const [kfX, setKfX] = useState(0);
  const [kfY, setKfY] = useState(0);

  const handleRender = async () => {
    setLoading(true);
    setVideoUrl(null);

    const width = format === 'landscape' ? 1280 : 720;
    const height = format === 'landscape' ? 720 : 1280;
    const durationInFrames = durationSec * 60;

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes, edges, width, height, durationInFrames,
          config: { title: 'GitOps Flow', duration: durationInFrames },
          cameraSequence
        })
      });
      if (!response.ok) {
        const text = await response.text();
        let detail;
        try { detail = JSON.parse(text); } catch { detail = { error: text }; }
        alert('Render failed: ' + (detail.error || response.statusText));
        return;
      }
      const data = await response.json();
      if (data.success) setVideoUrl(data.videoUrl);
      else alert('Render failed: ' + (data.error || 'Unknown error'));
    } catch (err) {
      console.error('Error:', err);
      alert('Backend server is not running. Start it with: npm run dev:full');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="control-panel glass-panel">
        <h3 style={{ margin: 0 }}>Video Settings</h3>

        <div className="setting-group">
          <label className="setting-label">Format</label>
          <select className="setting-select" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="landscape">Landscape (16:9)</option>
            <option value="tiktok">TikTok (9:16)</option>
          </select>
        </div>

        <div className="setting-group">
          <label className="setting-label">Duration: {durationSec}s</label>
          <input className="setting-input" type="range" min="2" max="15" value={durationSec} onChange={(e) => setDurationSec(parseInt(e.target.value))} />
        </div>

        <div className="setting-group camera-section">
          <label className="setting-label">Camera keyframes</label>

          <div style={{ display: 'flex', gap: 8 }}>
            <input className="setting-input" type="number" min={0} max={durationSec * 60} value={kfFrame} onChange={(e) => setKfFrame(parseInt(e.target.value || 0))} style={{ width: 80 }} />
            <input className="setting-input" type="number" step="0.1" min={0.1} max={5} value={kfZoom} onChange={(e) => setKfZoom(parseFloat(e.target.value || 1))} style={{ width: 100 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <select className="setting-select" value={kfTargetNodeId} onChange={(e) => setKfTargetNodeId(e.target.value)}>
              <option value="">-- target node (optional) --</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>)}
            </select>
          </div>

          <div style={{ display: kfTargetNodeId ? 'none' : 'flex', gap: 8, marginTop: 8 }}>
            <input className="setting-input" type="number" value={kfX} onChange={(e) => setKfX(parseInt(e.target.value || 0))} placeholder="x" style={{ width: 80 }} />
            <input className="setting-input" type="number" value={kfY} onChange={(e) => setKfY(parseInt(e.target.value || 0))} placeholder="y" style={{ width: 80 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="render-button" style={{ padding: '8px 10px', fontSize: 13 }} onClick={() => {
              const kf = kfTargetNodeId ? { frame: Math.max(0, kfFrame), targetNodeId: kfTargetNodeId, zoom: kfZoom } : { frame: Math.max(0, kfFrame), x: kfX, y: kfY, zoom: kfZoom };
              setCameraSequence(s => [...s, kf].sort((a, b) => a.frame - b.frame));
            }}>Add keyframe</button>
            <button className="render-button" style={{ background: '#374151', boxShadow: 'none', padding: '8px 10px', fontSize: 13 }} onClick={() => { setCameraSequence([]); }}>Clear</button>
          </div>

          {cameraSequence.length > 0 && (
            <div className="keyframe-list" style={{ marginTop: 10 }}>
              {cameraSequence.map((kf, idx) => (
                <div key={idx} className="keyframe-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, marginTop: 6 }}>
                  <div style={{ fontSize: 13, color: '#ddd' }}>{kf.frame}f — {kf.targetNodeId ? `node:${kf.targetNodeId}` : `x:${kf.x},y:${kf.y}`} — zoom:{kf.zoom}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="download-link" onClick={() => { setCameraSequence(s => s.filter((_, i) => i !== idx)); }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="render-button" onClick={handleRender} disabled={loading}>
          {loading ? '🎬 Rendering...' : '🚀 Export MP4'}
        </button>

        {videoUrl && (
          <div className="video-preview">
            <div className="success-message">✨ Render Complete!</div>
            <video src={videoUrl} controls width="100%" autoPlay style={{ borderRadius: 4 }} />
            <a href={videoUrl} download className="download-link">📥 Download</a>
          </div>
        )}
      </div>

      <ArgoK3dFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        cameraSequence={cameraSequence}
      />
    </div>
  );
}

export default App;

