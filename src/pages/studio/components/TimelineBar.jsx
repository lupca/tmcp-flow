export default function TimelineBar({
  cameraSequence,
  setCameraSequence,
  removeKeyframe,
  updateKeyframe,
  selectableNodes,
}) {
  return (
    <div className="timeline-bottom-bar">
      <div className="timeline-header">
        <label className="timeline-title">
          🎬 Timeline ({cameraSequence.length} keyframes)
        </label>
        {cameraSequence.length > 0 && (
          <button
            className="btn btn-clear-timeline"
            onClick={() => setCameraSequence([])}
          >
            Clear All
          </button>
        )}
      </div>

      {cameraSequence.length === 0 ? (
        <div className="timeline-empty">
          <p className="timeline-empty-hint">
            Use Auto Direct or add keyframes manually from the Directing tab
          </p>
        </div>
      ) : (
        <div className="timeline-track">
          {cameraSequence.map((kf, idx) => (
            <div key={idx} className="timeline-keyframe-item">
              <div className="timeline-kf-header">
                <div className="timeline-kf-label">KF {idx + 1}</div>
                <button
                  className="timeline-kf-remove"
                  onClick={() => removeKeyframe(idx)}
                  title="Remove keyframe"
                >
                  ✕
                </button>
              </div>

              <div className="timeline-kf-row">
                <span className="timeline-kf-field-label">Frame</span>
                <input
                  className="timeline-kf-input timeline-kf-frame"
                  type="number"
                  min={0}
                  value={kf.frame}
                  onChange={(e) =>
                    updateKeyframe(
                      idx,
                      'frame',
                      Math.max(0, parseInt(e.target.value || '0', 10))
                    )
                  }
                  title="Frame"
                />
              </div>

              <div className="timeline-kf-row">
                <span className="timeline-kf-field-label">Target</span>
                <select
                  className="timeline-kf-input timeline-kf-target"
                  value={kf.targetNodeId || ''}
                  onChange={(e) =>
                    updateKeyframe(
                      idx,
                      'targetNodeId',
                      e.target.value || undefined
                    )
                  }
                  title="Target Node"
                >
                  <option value="">manual</option>
                  {selectableNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data?.title || n.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="timeline-kf-row">
                <span className="timeline-kf-field-label">Zoom</span>
                <input
                  className="timeline-kf-input timeline-kf-zoom"
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={5}
                  value={kf.zoom}
                  onChange={(e) =>
                    updateKeyframe(
                      idx,
                      'zoom',
                      parseFloat(e.target.value || '1')
                    )
                  }
                  title="Zoom"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
