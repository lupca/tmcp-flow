import { NODE_THEMES, SELECTION_EFFECTS } from '../../../../constants/flowConstants';

export default function FxTab({
  edgeEffectType,
  setEdgeEffectType,
  nodeTheme,
  setNodeTheme,
  selectionEffect,
  setSelectionEffect,
  renderSelectionEffect,
  setRenderSelectionEffect,
}) {
  return (
    <div className="tab-content">
      <div className="section">
        <label className="section-label">✨ Edge Visual Effects</label>

        <div className="form-field">
          <label className="field-label">Effect Type</label>
          <select
            className="field-input"
            value={edgeEffectType}
            onChange={(e) => setEdgeEffectType(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#fff',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '6px',
            }}
          >
            <option value="neon_path">⚡ Neon Path (Microservices)</option>
            <option value="particle_blast">💥 Particle Blast (CI/CD)</option>
            <option value="stepped_circuit">🔧 Stepped Circuit (Kubernetes)</option>
            <option value="ghost_echo">👻 Ghost Echo (Monitoring)</option>
            <option value="electric_bolt">⚡ Electric Bolt (Lightning)</option>
            <option value="data_packets">📦 Data Packets (Streaming)</option>
            <option value="liquid_gradient">🌊 Liquid Gradient (Flow)</option>
            <option value="pulse_glow">💓 Pulse Glow (Energy)</option>
          </select>
        </div>

        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              marginBottom: '6px',
              color: '#60a5fa',
            }}
          >
            💡 Effect Suggestions
          </div>
          <table style={{ width: '100%', fontSize: '10px', lineHeight: '1.4' }}>
            <thead>
              <tr
                style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}
              >
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Effect
                </th>
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Feel
                </th>
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Best For
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>⚡ Neon Path</td>
                <td style={{ padding: '3px 0' }}>Modern</td>
                <td style={{ padding: '3px 0' }}>API Calls</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>💥 Particle Blast</td>
                <td style={{ padding: '3px 0' }}>Powerful</td>
                <td style={{ padding: '3px 0' }}>CI/CD Success</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>🔧 Stepped Circuit</td>
                <td style={{ padding: '3px 0' }}>Precise</td>
                <td style={{ padding: '3px 0' }}>Kubernetes</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>👻 Ghost Echo</td>
                <td style={{ padding: '3px 0' }}>Smooth</td>
                <td style={{ padding: '3px 0' }}>Monitoring</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section" style={{ marginTop: '24px' }}>
        <label className="section-label">🎨 Node Visual Themes</label>

        <div className="form-field">
          <label className="field-label">Theme Preset</label>
          <select
            className="field-input"
            value={nodeTheme}
            onChange={(e) => setNodeTheme(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#fff',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '6px',
            }}
          >
            {Object.entries(NODE_THEMES).map(([key, theme]) => (
              <option key={key} value={key}>
                {theme.emoji} {theme.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ marginTop: '12px' }}>
          <label className="field-label">Selection Effect</label>
          <select
            className="field-input"
            value={selectionEffect}
            onChange={(e) => setSelectionEffect(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#fff',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '6px',
            }}
          >
            {Object.entries(SELECTION_EFFECTS).map(([key, effect]) => (
              <option key={key} value={key}>
                {effect.emoji} {effect.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row" style={{ marginTop: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={renderSelectionEffect}
              onChange={(e) => setRenderSelectionEffect(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>🎯 Camera Focus Selection</span>
          </label>
        </div>

        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              marginBottom: '6px',
              color: '#a78bfa',
            }}
          >
            💎 Theme Guide
          </div>
          <table style={{ width: '100%', fontSize: '10px', lineHeight: '1.4' }}>
            <thead>
              <tr
                style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}
              >
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Theme
                </th>
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Style
                </th>
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>
                  Best For
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>⚫ Vercel</td>
                <td style={{ padding: '3px 0' }}>Ultra-modern</td>
                <td style={{ padding: '3px 0' }}>SaaS/Tech</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>🟣 Linear</td>
                <td style={{ padding: '3px 0' }}>Luxury Purple</td>
                <td style={{ padding: '3px 0' }}>Premium</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>🌑 Slate</td>
                <td style={{ padding: '3px 0' }}>Professional</td>
                <td style={{ padding: '3px 0' }}>Corporate</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>⚡ Neon</td>
                <td style={{ padding: '3px 0' }}>Cyberpunk</td>
                <td style={{ padding: '3px 0' }}>Gaming/Viral</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>⚪ Minimal</td>
                <td style={{ padding: '3px 0' }}>Clean Apple</td>
                <td style={{ padding: '3px 0' }}>Elegant</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>🌈 Gradient</td>
                <td style={{ padding: '3px 0' }}>Multi-color</td>
                <td style={{ padding: '3px 0' }}>Creative</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
