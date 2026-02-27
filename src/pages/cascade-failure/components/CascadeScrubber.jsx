import { COLORS } from '../../../constants/cascadeConstants';

export default function CascadeScrubber({
  previewFrame,
  setPreviewFrame,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  totalFrames,
  timelineEvents,
  eventBadge,
}) {
  return (
    <div className="cascade-scrubber">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
        <button
          className="btn btn-sm"
          onClick={() => {
            setPreviewFrame(0);
            setIsPlaying(false);
          }}
          title="Reset"
        >
          ⏮
        </button>
        <button className="btn btn-sm" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: 4,
            padding: '2px 4px',
            fontSize: 11,
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>

        <input
          type="range"
          min={0}
          max={totalFrames}
          value={previewFrame}
          onChange={(e) => {
            setPreviewFrame(Number(e.target.value));
            setIsPlaying(false);
          }}
          style={{ flex: 1, accentColor: COLORS.CYAN_NEON }}
        />

        <span
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            minWidth: 90,
            textAlign: 'right',
          }}
        >
          {Math.round(previewFrame)} / {totalFrames}f
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: 20,
          margin: '0 16px',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {timelineEvents.map((evt, i) => {
          const badge = eventBadge(evt.type);
          const left = totalFrames > 0 ? (evt.frame / totalFrames) * 100 : 0;
          return (
            <div
              key={i}
              title={`${evt.type} @ F${evt.frame}`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: 2,
                width: 3,
                height: 16,
                background: badge.color,
                borderRadius: 2,
                opacity: 0.6,
                cursor: 'pointer',
              }}
              onClick={() => {
                setPreviewFrame(evt.frame);
                setIsPlaying(false);
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: totalFrames > 0 ? `${(previewFrame / totalFrames) * 100}%` : '0%',
            top: 0,
            width: 2,
            height: 20,
            background: '#fff',
            borderRadius: 1,
            boxShadow: '0 0 6px rgba(255,255,255,0.5)',
            transition: isPlaying ? 'none' : 'left 0.1s',
          }}
        />
      </div>
    </div>
  );
}
