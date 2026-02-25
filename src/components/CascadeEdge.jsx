import React, { memo, useMemo } from 'react';
import { getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { useCurrentFrame, spring } from 'remotion';
import { EDGE_VARIANT, COLORS } from '../constants/cascadeConstants';

/**
 * CascadeEdge — Animated bezier edge that mutates from calm data-flow
 * to a violent "infection carrier" when variant switches to 'danger'.
 *
 * Props (injected by CascadeFailureScene):
 *  data.variant       — 'normal' | 'danger'
 *  data.variantFrame  — frame when variant changed to danger
 *  currentFrame       — Remotion frame (injected by scene wrapper)
 *
 * ALL styles are SVG inline — no CSS classes — for Remotion compat.
 */
const CascadeEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data = {},
  currentFrame,
}) => {
  // ── Bezier path computation ────────────────────────────────────────
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  // ── Frame source: prop > useCurrentFrame() > 0 ────────────────────
  let frame = 0;
  if (currentFrame !== undefined) {
    frame = currentFrame;
  } else {
    try {
      frame = useCurrentFrame();
    } catch {
      frame = 0;
    }
  }

  const variant = data.variant ?? EDGE_VARIANT.NORMAL;
  const variantFrame = data.variantFrame ?? 0;
  const isDanger = variant === EDGE_VARIANT.DANGER;

  // ── Spring activation for danger transition ────────────────────────
  const dangerProgress = useMemo(() => {
    if (!isDanger) return 0;
    const elapsed = Math.max(0, frame - variantFrame);
    return spring({
      frame: elapsed,
      fps: 60,
      config: { damping: 20, mass: 1, stiffness: 100 },
    });
  }, [isDanger, frame, variantFrame]);

  // ── Derived visual props ───────────────────────────────────────────
  const strokeColor = isDanger
    ? COLORS.RED_NEON
    : (style?.stroke || COLORS.CYAN_NEON);

  const strokeWidth = isDanger
    ? 2 + dangerProgress * 3   // ramps 2 → 5
    : 2;

  const bgStrokeWidth = isDanger
    ? 1 + dangerProgress * 1.5
    : 1;

  const glowStd = isDanger ? 4 + dangerProgress * 4 : 2;
  const glowOpacity = isDanger ? 0.6 + dangerProgress * 0.3 : 0.3;

  // Dash animation speed: normal = frame*-2, danger = frame*-8
  const dashSpeed = isDanger ? frame * -8 : frame * -2;
  const dashArray = isDanger ? '12 8' : '8 6';

  // Particle speed: normal = 3s, danger = 1s
  const particleDur = isDanger ? '1s' : '3s';
  const particleRadius = isDanger ? 5 + dangerProgress * 2 : 4;

  // Extra infection pulses for danger mode
  const showInfectionPulses = isDanger && dangerProgress > 0.5;

  // Filter ID — unique per edge
  const filterId = `cascade-glow-${id}`;

  return (
    <>
      {/* SVG Glow filter */}
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={glowStd} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
          <feDropShadow
            dx="0" dy="0"
            stdDeviation={glowStd}
            floodColor={strokeColor}
            floodOpacity={glowOpacity}
          />
        </filter>
      </defs>

      {/* Background dashed line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeOpacity={0.15 + (isDanger ? dangerProgress * 0.1 : 0)}
        strokeWidth={bgStrokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashSpeed}
      />

      {/* Foreground solid line with glow */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeOpacity={isDanger ? 0.6 + dangerProgress * 0.3 : 0.5}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        filter={`url(#${filterId})`}
        markerEnd={markerEnd}
      />

      {/* Danger: rapid dash overlay to simulate "rushing" packets */}
      {isDanger && (
        <path
          d={path}
          fill="none"
          stroke={COLORS.RED_NEON}
          strokeOpacity={0.4 * dangerProgress}
          strokeWidth={strokeWidth + 2}
          strokeDasharray="20 80"
          strokeDashoffset={frame * -12}
          strokeLinecap="round"
        />
      )}

      {/* Primary data particle */}
      <circle
        r={particleRadius}
        fill={strokeColor}
        opacity={isDanger ? 0.9 : 0.7}
        filter={isDanger ? `url(#${filterId})` : undefined}
      >
        <animateMotion dur={particleDur} repeatCount="indefinite" path={path} />
      </circle>

      {/* Danger: infection pulse particles (staggered) */}
      {showInfectionPulses && (
        <>
          <circle
            r={3}
            fill={COLORS.RED_NEON}
            opacity={0.7 * dangerProgress}
            filter={`url(#${filterId})`}
          >
            <animateMotion dur="0.7s" repeatCount="indefinite" path={path} begin="0.25s" />
          </circle>
          <circle
            r={3}
            fill={COLORS.RED_NEON}
            opacity={0.5 * dangerProgress}
            filter={`url(#${filterId})`}
          >
            <animateMotion dur="0.9s" repeatCount="indefinite" path={path} begin="0.5s" />
          </circle>
        </>
      )}

      {/* Danger: pulsating "alert ring" traveling the path */}
      {isDanger && dangerProgress > 0.3 && (
        <circle
          r={8}
          fill="none"
          stroke={COLORS.RED_NEON}
          strokeWidth={2}
          opacity={0.4 * dangerProgress}
        >
          <animateMotion dur="1.2s" repeatCount="indefinite" path={path} />
          <animate attributeName="r" values="8;14;8" dur="0.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values={`${0.4 * dangerProgress};0;${0.4 * dangerProgress}`} dur="0.6s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600,
              color: isDanger ? COLORS.RED_NEON : COLORS.CYAN_NEON,
              background: 'rgba(11, 15, 25, 0.8)',
              padding: '2px 8px',
              borderRadius: 6,
              border: `1px solid ${isDanger ? 'rgba(255,0,60,0.3)' : 'rgba(0,255,255,0.2)'}`,
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(CascadeEdge);
