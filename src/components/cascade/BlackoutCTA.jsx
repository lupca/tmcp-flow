/**
 * BlackoutCTA — Full-screen "SERVER DOWN" punchline overlay.
 *
 * Renders a fade-to-black overlay with animated title + subtitle.
 * All styles are inline for Remotion compatibility.
 *
 * @module BlackoutCTA
 */

import React from 'react';
import { interpolate } from 'remotion';

const FADE_DURATION = 40;
const TEXT_APPEAR_START = 20;
const TEXT_APPEAR_END = 60;
const SUBTITLE_START = 40;
const SUBTITLE_END = 80;
const SCALE_KEYFRAMES = [0, 15, 25];
const SCALE_VALUES = [0.8, 1.05, 1];

/**
 * @param {Object} props
 * @param {number} props.elapsed - Frames since blackout_cta event fired
 */
export default function BlackoutCTA({ elapsed }) {
  const fadeIn = Math.min(1, elapsed / FADE_DURATION);

  const textScale = interpolate(elapsed, SCALE_KEYFRAMES, SCALE_VALUES, {
    extrapolateRight: 'clamp',
  });

  const textOpacity = interpolate(
    elapsed,
    [TEXT_APPEAR_START, TEXT_APPEAR_END],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const subtitleOpacity = interpolate(
    elapsed,
    [SUBTITLE_START, SUBTITLE_END],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 999,
        background: `rgba(0, 0, 0, ${fadeIn})`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity: textOpacity,
          transform: `scale(${textScale})`,
          textAlign: 'center',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: "'Inter', 'SF Pro Display', sans-serif",
            fontSize: 72,
            fontWeight: 900,
            color: '#FF003C',
            textShadow:
              '0 0 40px rgba(255, 0, 60, 0.8), 0 0 80px rgba(255, 0, 60, 0.4)',
            letterSpacing: '-2px',
            marginBottom: 24,
          }}
        >
          SERVER DOWN
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: "'Inter', 'SF Pro Display', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.7)',
            opacity: subtitleOpacity,
          }}
        >
          The CTO is calling...
        </div>
      </div>
    </div>
  );
}
