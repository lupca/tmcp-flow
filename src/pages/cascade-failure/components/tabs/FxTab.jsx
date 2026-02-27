import { COLORS } from '../../../../constants/cascadeConstants';

export default function FxTab() {
  return (
    <div className="section">
      <label className="section-label">✨ Visual Effects Info</label>

      <div className="cascade-info-card">
        <h4
          style={{ color: COLORS.CYAN_NEON, margin: '0 0 4px 0', fontSize: 12 }}
        >
          Node States
        </h4>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: COLORS.CYAN_NEON }}>● Normal</span> — Cyberpunk
            Cyan glow
          </div>
          <div>
            <span style={{ color: COLORS.YELLOW_WARNING }}>● Warning</span> —
            Flashing yellow border
          </div>
          <div>
            <span style={{ color: COLORS.RED_NEON }}>● Error</span> — Red neon
            glow + jitter
          </div>
          <div>
            <span style={{ color: COLORS.GREY_OFFLINE }}>● Offline</span> — Grey
            fade + fall-away
          </div>
        </div>
      </div>

      <div className="cascade-info-card" style={{ marginTop: 8 }}>
        <h4 style={{ color: '#f97316', margin: '0 0 4px 0', fontSize: 12 }}>
          Edge Variants
        </h4>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: COLORS.CYAN_NEON }}>● Normal</span> — Calm cyan
            data flow
          </div>
          <div>
            <span style={{ color: COLORS.RED_NEON }}>● Danger</span> — Red
            infection rush (3x speed)
          </div>
        </div>
      </div>

      <div className="cascade-info-card" style={{ marginTop: 8 }}>
        <h4 style={{ color: COLORS.RED_NEON, margin: '0 0 4px 0', fontSize: 12 }}>
          Global FX
        </h4>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          <div>🫨 Screen Shake — Physical vibration</div>
          <div>🌈 Glitch — Hue-rotate + contrast</div>
        </div>
      </div>
    </div>
  );
}
