import React, { memo, useMemo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { spring } from 'remotion';
import { NODE_STATUS, COLORS } from '../constants/cascadeConstants';

/**
 * Default fallback dimensions — matches project convention
 */
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 100;

/**
 * CascadeNode — Cyberpunk node that reacts violently to failure status.
 *
 * Props:
 *  data.title       — display name
 *  data.subtitle    — secondary text
 *  data.icon        — emoji string (overridden on error/offline)
 *  data.status      — 'normal' | 'warning' | 'error' | 'offline'
 *  data.currentFrame — Remotion frame for inline animation
 *  data.statusFrame  — frame at which current status was applied
 *  data.isChildNode  — explicit child flag for Remotion context
 *  data.isRendering  — hides resize handles
 *
 * ALL styles are inline for Remotion compatibility.
 */
const CascadeNode = ({ data, selected, id }) => {
  // ── Detect child node ──────────────────────────────────────────────
  let isChildNode = false;
  try {
    const { getNode } = useReactFlow();
    const node = getNode(id);
    isChildNode = !!node?.parentId;
  } catch {
    isChildNode = !!data?.isChildNode;
  }

  const {
    title = 'Node',
    subtitle,
    icon,
    status = NODE_STATUS.NORMAL,
    currentFrame = 0,
    statusFrame = 0,
  } = data;

  const frame = currentFrame;
  const framesSinceStatus = Math.max(0, frame - statusFrame);

  // ── Spring-based transition progress (0→1) for status entry ────────
  const transitionProgress = useMemo(() => {
    if (framesSinceStatus <= 0) return 0;
    return spring({
      frame: framesSinceStatus,
      fps: 60,
      config: { damping: 18, mass: 0.8, stiffness: 120 },
    });
  }, [framesSinceStatus]);

  // ── Status-driven visual properties ────────────────────────────────
  const visuals = useMemo(() => {
    const t = transitionProgress;

    switch (status) {
      case NODE_STATUS.WARNING: {
        // Flashing yellow border — sine oscillation
        const flash = Math.sin(frame * 0.3) * 0.5 + 0.5;
        const borderOpacity = 0.4 + flash * 0.6;
        return {
          background: `linear-gradient(135deg, ${COLORS.SURFACE_DARK} 0%, ${COLORS.YELLOW_DIM} 100%)`,
          border: `2px solid rgba(255, 214, 0, ${borderOpacity * t})`,
          boxShadow: `0 0 ${12 * t}px rgba(255, 214, 0, ${0.3 * flash * t}), inset 0 0 ${8 * t}px rgba(255, 214, 0, ${0.1 * t})`,
          transform: '',
          filter: '',
          opacity: 1,
          displayIcon: icon || '⚡',
          titleColor: `rgba(255, 214, 0, ${0.7 + 0.3 * t})`,
          subtitleColor: 'rgba(255, 214, 0, 0.5)',
          iconBg: COLORS.YELLOW_DIM,
        };
      }

      case NODE_STATUS.ERROR: {
        // Jitter: high-frequency micro-shake
        const jitterX = Math.sin(frame * 2.1) * 3 * t;
        const jitterY = Math.cos(frame * 3.3) * 2 * t;
        // Pulsating glow
        const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
        return {
          background: `linear-gradient(135deg, ${COLORS.SURFACE_DARK} 0%, ${COLORS.RED_DIM} 100%)`,
          border: `2px solid rgba(255, 0, 60, ${0.8 * t})`,
          boxShadow: `0 0 ${30 * pulse * t}px ${COLORS.RED_GLOW}, 0 0 ${60 * pulse * t}px rgba(255, 0, 60, ${0.25 * t}), inset 0 0 ${15 * t}px rgba(255, 0, 60, ${0.15 * t})`,
          transform: `translate(${jitterX}px, ${jitterY}px)`,
          filter: '',
          opacity: 1,
          displayIcon: framesSinceStatus > 60 ? '💀' : '⚠️',
          titleColor: `rgba(255, 60, 80, ${0.8 + 0.2 * pulse})`,
          subtitleColor: 'rgba(255, 80, 100, 0.6)',
          iconBg: COLORS.RED_DIM,
        };
      }

      case NODE_STATUS.OFFLINE: {
        // Fall-away animation: translate down + rotate
        const fallProgress = Math.min(t, 1);
        const fallY = fallProgress * 80;
        const fallRotate = fallProgress * 8;
        const fadeOpacity = Math.max(0.15, 1 - fallProgress * 0.85);
        return {
          background: COLORS.GREY_OFFLINE,
          border: `2px solid ${COLORS.GREY_DIM}`,
          boxShadow: 'none',
          transform: `translateY(${fallY}px) rotate(${fallRotate}deg)`,
          filter: 'saturate(0) brightness(0.5)',
          opacity: fadeOpacity,
          displayIcon: '💀',
          titleColor: 'rgba(120, 120, 120, 0.7)',
          subtitleColor: 'rgba(100, 100, 100, 0.5)',
          iconBg: 'rgba(60, 60, 60, 0.4)',
        };
      }

      case NODE_STATUS.NORMAL:
      default: {
        return {
          background: `linear-gradient(135deg, ${COLORS.SURFACE_DARK} 0%, rgba(0, 255, 255, 0.03) 100%)`,
          border: `1px solid rgba(0, 255, 255, 0.15)`,
          boxShadow: `0 0 15px ${COLORS.CYAN_GLOW}, inset 0 0 8px rgba(0, 255, 255, 0.05)`,
          transform: '',
          filter: '',
          opacity: 1,
          displayIcon: icon || '🔷',
          titleColor: COLORS.CYAN_NEON,
          subtitleColor: 'rgba(0, 255, 255, 0.5)',
          iconBg: COLORS.CYAN_DIM,
        };
      }
    }
  }, [status, frame, transitionProgress, framesSinceStatus, icon]);

  // ── Scale for child nodes ──────────────────────────────────────────
  const scale = isChildNode ? 0.65 : 1;

  // ── Container style ────────────────────────────────────────────────
  const containerStyle = {
    width: '100%',
    height: '100%',
    minWidth: 'unset',
    minHeight: 'unset',
    maxWidth: 'unset',
    maxHeight: 'unset',
    background: visuals.background,
    border: visuals.border,
    boxShadow: visuals.boxShadow,
    borderRadius: 16 * scale,
    padding: `${12 * scale}px ${16 * scale}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4 * scale,
    fontFamily: "'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif",
    transform: visuals.transform || undefined,
    filter: visuals.filter || undefined,
    opacity: visuals.opacity,
    overflow: 'hidden',
    position: 'relative',
    // Subtle scanline overlay for cyberpunk feel
    backgroundImage: status === NODE_STATUS.NORMAL
      ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.02) 2px, rgba(0,255,255,0.02) 4px)'
      : status === NODE_STATUS.ERROR
        ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,60,0.03) 2px, rgba(255,0,60,0.03) 4px)'
        : undefined,
  };

  // ── Handle style ───────────────────────────────────────────────────
  const handleColor = status === NODE_STATUS.ERROR ? COLORS.RED_NEON
    : status === NODE_STATUS.WARNING ? COLORS.YELLOW_WARNING
    : status === NODE_STATUS.OFFLINE ? COLORS.GREY_OFFLINE
    : COLORS.CYAN_NEON;

  const handleStyle = {
    width: 8 * scale,
    height: 8 * scale,
    background: handleColor,
    border: `2px solid ${handleColor}`,
    borderRadius: '50%',
    opacity: status === NODE_STATUS.OFFLINE ? 0.3 : 0.8,
  };

  // ── Icon style ─────────────────────────────────────────────────────
  const iconStyle = {
    fontSize: 24 * scale,
    width: 40 * scale,
    height: 40 * scale,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10 * scale,
    background: visuals.iconBg,
    flexShrink: 0,
  };

  // ── Text styles ────────────────────────────────────────────────────
  const titleStyle = {
    fontSize: 14 * scale,
    fontWeight: 700,
    color: visuals.titleColor,
    textAlign: 'center',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  };

  const subtitleStyle = {
    fontSize: 11 * scale,
    fontWeight: 400,
    color: visuals.subtitleColor,
    textAlign: 'center',
    lineHeight: 1.3,
    letterSpacing: '0.01em',
  };

  // ── Error "pulse ring" overlay ─────────────────────────────────────
  const showPulseRing = status === NODE_STATUS.ERROR && transitionProgress > 0.5;
  const ringOpacity = showPulseRing ? (Math.sin(frame * 0.12) * 0.3 + 0.3) : 0;
  const ringScale = showPulseRing ? 1 + Math.sin(frame * 0.08) * 0.05 : 1;

  return (
    <div style={containerStyle}>
      {/* Error pulse ring overlay */}
      {showPulseRing && (
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: 20 * scale,
          border: `2px solid rgba(255, 0, 60, ${ringOpacity})`,
          transform: `scale(${ringScale})`,
          pointerEvents: 'none',
        }} />
      )}

      <Handle type="target" position={Position.Top} style={handleStyle} />

      <div style={iconStyle}>
        {visuals.displayIcon}
      </div>

      <div style={titleStyle}>
        {title}
      </div>

      {subtitle && (
        <div style={subtitleStyle}>
          {subtitle}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
};

export default memo(CascadeNode);
