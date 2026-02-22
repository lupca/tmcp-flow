import React, { memo, useMemo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { useCurrentFrame, spring, interpolate } from 'remotion';

// Effect type renderers
const EdgeEffects = {
  neon_path: NeonPathEffect,
  particle_blast: ParticleBlastEffect,
  stepped_circuit: SteppedCircuitEffect,
  ghost_echo: GhostEchoEffect,
  electric_bolt: ElectricBoltEffect,
  data_packets: DataPacketsEffect,
  liquid_gradient: LiquidGradientEffect,
  pulse_glow: PulseGlowEffect,
};

// 1. Neon Path (Original beautiful effect)
function NeonPathEffect({ path, strokeColor, strokeOpacity, glowIntensity, isActive, filterId, markerEnd, particleStyle }) {
  return (
    <>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={3 * glowIntensity} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
          <feDropShadow
            dx="0" dy="0"
            stdDeviation={4 * glowIntensity}
            floodColor={strokeColor}
            floodOpacity={0.6 * glowIntensity}
          />
        </filter>
      </defs>
      <BaseEdge path={path} markerEnd={markerEnd} style={{ stroke: strokeColor, strokeOpacity: 0.2, strokeWidth: 2, strokeDasharray: '8 6', fill: 'none' }} />
      <BaseEdge path={path} className="animated-edge-path" style={{ stroke: strokeColor, strokeOpacity, strokeWidth: 3, fill: 'none', filter: isActive ? `url(#${filterId})` : 'none' }} />
      {isActive && (
        <circle r="4" style={particleStyle}>
          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  );
}

// 2. Particle Blast (Multiple fast particles)
function ParticleBlastEffect({ path, strokeColor, strokeOpacity, glowIntensity, isActive, filterId, id }) {
  const particles = [0, 0.2, 0.4, 0.6, 0.8];
  return (
    <>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={strokeColor} floodOpacity="0.8" />
        </filter>
      </defs>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.15, strokeWidth: 1, strokeDasharray: '4 4', fill: 'none' }} />
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: strokeOpacity * 0.6, strokeWidth: 2, fill: 'none', filter: `url(#${filterId})` }} />
      {isActive && particles.map((delay, i) => (
        <circle key={i} r="3" fill={strokeColor} opacity={strokeOpacity} filter={`url(#${filterId})`}>
          <animateMotion dur="0.8s" repeatCount="indefinite" path={path} begin={`${delay}s`} />
        </circle>
      ))}
    </>
  );
}

// 3. Stepped Circuit (Technical segmented look)
function SteppedCircuitEffect({ path, strokeColor, strokeOpacity, isActive, frame }) {
  const dashOffset = frame % 20;
  return (
    <>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.1, strokeWidth: 1, fill: 'none' }} />
      <BaseEdge path={path} style={{
        stroke: strokeColor,
        strokeOpacity,
        strokeWidth: 2,
        strokeDasharray: '10 10',
        strokeDashoffset: -dashOffset,
        fill: 'none',
        strokeLinecap: 'square'
      }} />
      {isActive && (
        <circle r="5" fill="none" stroke={strokeColor} strokeWidth="2" opacity={strokeOpacity * 0.8}>
          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  );
}

// 4. Ghost Echo (Smooth trailing effect)
function GhostEchoEffect({ path, strokeColor, strokeOpacity, isActive, filterId }) {
  return (
    <>
      <defs>
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.05, strokeWidth: 6, fill: 'none', filter: `url(#${filterId})` }} />
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.15, strokeWidth: 4, fill: 'none', filter: `url(#${filterId})` }} />
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: strokeOpacity * 0.8, strokeWidth: 2, fill: 'none' }} />
      {isActive && (
        <circle r="6" fill={strokeColor} opacity={strokeOpacity * 0.4} filter={`url(#${filterId})`}>
          <animateMotion dur="3s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </>
  );
}

// 5. Electric Bolt (Fast lightning strike)
function ElectricBoltEffect({ path, strokeColor, strokeOpacity, isActive, filterId, frame }) {
  const boltOffset = (frame * 5) % 100;
  return (
    <>
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation="1" />
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={strokeColor} floodOpacity="1" />
        </filter>
      </defs>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.2, strokeWidth: 1, fill: 'none' }} />
      {isActive && (
        <>
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeOpacity={strokeOpacity * 1.2}
            strokeWidth={2}
            strokeDasharray="15 85"
            strokeDashoffset={-boltOffset}
            filter={`url(#${filterId})`}
          >
            <animate attributeName="stroke-dashoffset" values="0;-100" dur="0.4s" repeatCount="indefinite" />
          </path>
          {[0, 0.15, 0.35].map((delay, i) => (
            <circle key={i} r="3" fill={strokeColor} opacity={strokeOpacity} filter={`url(#${filterId})`}>
              <animateMotion dur="0.5s" repeatCount="indefinite" path={path} begin={`${delay}s`} />
            </circle>
          ))}
        </>
      )}
    </>
  );
}

// 6. Data Packets (Small rectangles flowing)
function DataPacketsEffect({ path, strokeColor, strokeOpacity, isActive, id }) {
  const packets = [0, 0.3, 0.6];
  return (
    <>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.15, strokeWidth: 1, strokeDasharray: '2 4', fill: 'none' }} />
      {isActive && packets.map((delay, i) => (
        <g key={i}>
          <rect
            x="-4" y="-4" width="8" height="8"
            fill={strokeColor}
            opacity={strokeOpacity}
            rx="1"
          >
            <animateMotion dur="1.2s" repeatCount="indefinite" path={path} begin={`${delay}s`} />
          </rect>
        </g>
      ))}
    </>
  );
}

// 7. Liquid Gradient (Flowing gradient)
function LiquidGradientEffect({ path, strokeColor, strokeOpacity, isActive, id, frame }) {
  const filterId = `liquid-glow-${id}`;
  const dashOffset = (frame * 3) % 200;

  return (
    <>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.6" />
        </filter>
      </defs>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.1, strokeWidth: 2, fill: 'none' }} />
      {isActive && (
        <>
          {/* Flowing dash segment with glow */}
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeOpacity={strokeOpacity * 0.9}
            strokeWidth={4}
            strokeDasharray="40 160"
            strokeDashoffset={-dashOffset}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
          >
            <animate attributeName="stroke-dashoffset" values="0;-200" dur="2s" repeatCount="indefinite" />
          </path>
          {/* Flowing particle trail */}
          {[0, 0.7, 1.4].map((delay, i) => (
            <circle key={i} r="5" fill={strokeColor} opacity={strokeOpacity * 0.5} filter={`url(#${filterId})`}>
              <animateMotion dur="2.5s" repeatCount="indefinite" path={path} begin={`${delay}s`} />
              <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite" />
            </circle>
          ))}
        </>
      )}
    </>
  );
}

// 8. Pulse Glow (Breathing energy ring)
function PulseGlowEffect({ path, strokeColor, strokeOpacity, isActive, filterId, frame, startFrame }) {
  const pulsePhase = Math.sin((frame - startFrame) * 0.1) * 0.5 + 0.5;
  const breatheWidth = 2 + pulsePhase * 2;
  const breatheOpacity = strokeOpacity * (0.6 + pulsePhase * 0.4);

  return (
    <>
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation={2 + pulsePhase * 3} />
          <feDropShadow dx="0" dy="0" stdDeviation={6} floodColor={strokeColor} floodOpacity={pulsePhase} />
        </filter>
      </defs>
      <BaseEdge path={path} style={{ stroke: strokeColor, strokeOpacity: 0.2, strokeWidth: 1, fill: 'none' }} />
      <BaseEdge path={path} style={{
        stroke: strokeColor,
        strokeOpacity: breatheOpacity,
        strokeWidth: breatheWidth,
        fill: 'none',
        filter: `url(#${filterId})`
      }} />
      {isActive && (
        <circle r="8" fill="none" stroke={strokeColor} strokeWidth="3" opacity={breatheOpacity}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
          <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values={`${breatheOpacity};0;${breatheOpacity}`} dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </>
  );
}

const ViralEdge = ({
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
  currentFrame // Injected by DynamicFlowScene
}) => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  // Get current frame - only use useCurrentFrame() in Remotion context
  let frame = 0;
  let isInEditor = false;

  if (currentFrame !== undefined) {
    // Frame prop provided by DynamicFlowScene (Remotion rendering)
    frame = currentFrame;
  } else {
    // Studio editor context - try to use useCurrentFrame, but catch if not in composition
    try {
      frame = useCurrentFrame();
    } catch (e) {
      // Not in Remotion composition - we're in the Studio editor
      isInEditor = true;
      frame = 0;
    }
  }

  // Extract activation timing, preview mode, and effect type from edge data
  const startFrame = data.startFrame ?? 0;
  const previewMode = data.previewMode ?? false;
  const effectType = data.effectType ?? 'neon_path';

  // Determine if edge should be active
  // Preview Mode OFF: edges always active (no camera sync) - for continuous animation
  // Preview Mode ON: edges sync with camera (activate when camera reaches source node)
  // This applies to both editor and Remotion rendering
  const isActive = !previewMode ? true : (frame >= startFrame);

  // Spring animation for smooth activation transition (15 frames = ~250ms at 60fps)
  const activationProgress = useMemo(() => {
    if (!isActive) return 0;
    // No camera sync — show immediately at full strength (both editor and Remotion)
    if (!previewMode) return 1;

    const framesSinceStart = frame - startFrame;
    return spring({
      frame: framesSinceStart,
      fps: 60,
      config: {
        damping: 20,
        mass: 1,
        stiffness: 100,
      },
    });
  }, [isActive, frame, startFrame, isInEditor, previewMode]);

  // Color and opacity based on state
  const vibrantColor = style?.stroke || '#f97316';
  const strokeColor = isActive ? vibrantColor : '#9ca3af';
  const strokeOpacity = isActive ? activationProgress : 0.3;
  const glowIntensity = isActive ? activationProgress : 0;

  // Unique filter ID for this edge
  const filterId = `glow-${id}`;

  // Particle style for effects that need it
  const particleStyle = {
    fill: strokeColor,
    opacity: strokeOpacity,
  };

  // Get the effect renderer
  const EffectRenderer = EdgeEffects[effectType] || EdgeEffects.neon_path;

  return (
    <>
      {/* Render the selected effect */}
      <EffectRenderer
        path={path}
        strokeColor={strokeColor}
        strokeOpacity={strokeOpacity}
        glowIntensity={glowIntensity}
        isActive={isActive}
        filterId={filterId}
        markerEnd={markerEnd}
        particleStyle={particleStyle}
        id={id}
        frame={frame}
        startFrame={startFrame}
      />

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(ViralEdge);

