import TimelineTab from './tabs/TimelineTab';
import AutoTab from './tabs/AutoTab';
import FxTab from './tabs/FxTab';
import RenderTab from './tabs/RenderTab';

export default function CascadeSidebar({
  activeTab,
  setActiveTab,
  onBack,
  timelineProps,
  autoProps,
  renderProps,
}) {
  return (
    <div className="cascade-sidebar-left glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 18,
            padding: '4px 8px',
          }}
          title="Back to Studio"
        >
          ←
        </button>
        <h2 className="sidebar-title" style={{ margin: 0 }}>
          💥 Cascade Failure
        </h2>
      </div>

      <div className="tab-nav">
        {[
          { key: 'timeline', label: '📋 Timeline' },
          { key: 'auto', label: '🤖 Auto' },
          { key: 'fx', label: '✨ FX' },
          { key: 'render', label: '🎬 Render' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {activeTab === 'timeline' && <TimelineTab {...timelineProps} />}
        {activeTab === 'auto' && <AutoTab {...autoProps} />}
        {activeTab === 'fx' && <FxTab />}
        {activeTab === 'render' && <RenderTab {...renderProps} />}
      </div>
    </div>
  );
}
