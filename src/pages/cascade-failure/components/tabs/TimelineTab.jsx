import { EVENT_TYPE, NODE_STATUS, EDGE_VARIANT, GLOBAL_FX, COLORS } from '../../../../constants/cascadeConstants';

export default function TimelineTab({
  handleLoadDemo,
  handleImportJson,
  handleExportJson,
  handleClearTimeline,
  newEventType,
  setNewEventType,
  newEventFrame,
  setNewEventFrame,
  newEventTarget,
  setNewEventTarget,
  newEventStatus,
  setNewEventStatus,
  newEventVariant,
  setNewEventVariant,
  newEventEffect,
  setNewEventEffect,
  selectableNodes,
  edges,
  handleAddEvent,
  timelineEvents,
  eventBadge,
  statusColor,
  previewFrame,
  handleRemoveEvent,
}) {
  return (
    <div className="section">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={handleLoadDemo}>
          📦 Demo
        </button>
        <button className="btn btn-sm" onClick={handleImportJson}>
          📂 Import
        </button>
        <button className="btn btn-sm" onClick={handleExportJson}>
          💾 Export
        </button>
        <button className="btn btn-sm btn-danger" onClick={handleClearTimeline}>
          🗑️
        </button>
      </div>

      <label className="section-label">Add Event</label>

      <select
        className="field-input"
        value={newEventType}
        onChange={(e) => setNewEventType(e.target.value)}
      >
        <option value={EVENT_TYPE.NODE_STATE}>NODE_STATE</option>
        <option value={EVENT_TYPE.EDGE_FLOW}>EDGE_FLOW</option>
        <option value={EVENT_TYPE.GLOBAL_FX}>GLOBAL_FX</option>
      </select>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
        <label
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            minWidth: 40,
          }}
        >
          Frame
        </label>
        <input
          type="number"
          className="field-input"
          value={newEventFrame}
          onChange={(e) => setNewEventFrame(Number(e.target.value))}
          min={0}
          style={{ flex: 1 }}
        />
      </div>

      {newEventType !== EVENT_TYPE.GLOBAL_FX && (
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Target
          </label>
          <select
            className="field-input"
            value={newEventTarget}
            onChange={(e) => setNewEventTarget(e.target.value)}
          >
            <option value="">-- Select --</option>
            {newEventType === EVENT_TYPE.NODE_STATE
              ? selectableNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.data?.icon || '🔷'} {n.data?.title || n.id}
                  </option>
                ))
              : edges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.source} → {e.target}
                  </option>
                ))}
          </select>
        </div>
      )}

      {newEventType === EVENT_TYPE.NODE_STATE && (
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Status
          </label>
          <select
            className="field-input"
            value={newEventStatus}
            onChange={(e) => setNewEventStatus(e.target.value)}
          >
            {Object.values(NODE_STATUS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {newEventType === EVENT_TYPE.EDGE_FLOW && (
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Variant
          </label>
          <select
            className="field-input"
            value={newEventVariant}
            onChange={(e) => setNewEventVariant(e.target.value)}
          >
            {Object.values(EDGE_VARIANT).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}

      {newEventType === EVENT_TYPE.GLOBAL_FX && (
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Effect
          </label>
          <select
            className="field-input"
            value={newEventEffect}
            onChange={(e) => setNewEventEffect(e.target.value)}
          >
            {Object.values(GLOBAL_FX).map((fx) => (
              <option key={fx} value={fx}>
                {fx}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        className="btn btn-auto"
        onClick={handleAddEvent}
        style={{ marginTop: 8, width: '100%' }}
      >
        ➕ Add Event
      </button>

      <label className="section-label" style={{ marginTop: 16 }}>
        Events ({timelineEvents.length})
      </label>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {timelineEvents.map((evt, i) => {
          const badge = eventBadge(evt.type);
          return (
            <div
              key={i}
              className="cascade-event-card"
              style={{
                borderLeft: `3px solid ${badge.color}`,
                opacity: evt.frame <= previewFrame ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: badge.color,
                    background: `${badge.color}15`,
                    padding: '1px 6px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {badge.label}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                  F{evt.frame}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {evt.type === EVENT_TYPE.NODE_STATE && (
                  <span>
                    {evt.targetId}{' '}
                    <span
                      style={{
                        color: statusColor(evt.status),
                        fontWeight: 600,
                      }}
                    >
                      → {evt.status}
                    </span>
                  </span>
                )}
                {evt.type === EVENT_TYPE.EDGE_FLOW && (
                  <span>
                    {evt.targetId}{' '}
                    <span
                      style={{
                        color:
                          evt.variant === 'danger'
                            ? COLORS.RED_NEON
                            : COLORS.CYAN_NEON,
                        fontWeight: 600,
                      }}
                    >
                      → {evt.variant}
                    </span>
                  </span>
                )}
                {evt.type === EVENT_TYPE.GLOBAL_FX && (
                  <span style={{ color: COLORS.RED_NEON, fontWeight: 600 }}>
                    {evt.effect}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemoveEvent(i)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
