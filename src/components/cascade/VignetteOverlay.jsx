/**
 * VignetteOverlay — Crisis atmosphere overlays.
 *
 * Renders:
 *   - Radial vignette that darkens when any node enters error/offline
 *   - Red scan-line overlay during active glitch FX
 *
 * All styles are inline for Remotion compatibility.
 *
 * @module VignetteOverlay
 */

import React from 'react';

/**
 * @param {Object}  props
 * @param {number}  props.vignetteOpacity - 0–1 opacity for vignette gradient
 * @param {boolean} props.showGlitch      - Whether to render glitch scan-lines
 */
export default function VignetteOverlay({ vignetteOpacity, showGlitch }) {
  return (
    <>
      {/* Vignette — darkened edges during crisis */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          transition: 'background 0.5s',
        }}
      />

      {/* Red scan-line overlay during glitch */}
      {showGlitch && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,0,60,0.03) 3px, rgba(255,0,60,0.03) 6px)',
            opacity: 0.7,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </>
  );
}
