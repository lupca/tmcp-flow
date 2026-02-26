/**
 * AudioDirector — Manages all Remotion `<Audio>` and `<Sequence>` layers.
 *
 * Handles:
 *   - Background music (BGM) with volume ducking on blackout
 *   - SFX alarm triggered at screen_shake frame
 *   - SFX error triggered at screen_shake frame
 *   - Optional voiceover / intro audio
 *
 * All audio uses `staticFile()` for Remotion-compatible asset resolution.
 *
 * @module AudioDirector
 */

import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

const BGM_VOLUME = 0.3;
const BGM_FADE_FRAMES = 20;
const ALARM_VOLUME = 0.6;
const ERROR_VOLUME = 0.5;

/**
 * @param {Object}      props
 * @param {boolean}     props.isRemotion    - Only render audio in Remotion context
 * @param {string|null} props.introAudioUrl - Optional voiceover URL
 * @param {number|null} props.blackoutFrame - Frame of blackout_cta event (for ducking)
 * @param {number|null} props.shakeFrame    - Frame of screen_shake event (SFX trigger)
 */
export default function AudioDirector({
  isRemotion,
  introAudioUrl,
  blackoutFrame,
  shakeFrame,
}) {
  return (
    <>
      {/* Voiceover (works in both browser & Remotion) */}
      {introAudioUrl && <Audio src={introAudioUrl} />}

      {/* BGM with blackout ducking */}
      {isRemotion && (
        <Audio
          src={staticFile('bgm-calm.mp3')}
          volume={(f) => {
            if (blackoutFrame !== null && f >= blackoutFrame) {
              const elapsed = f - blackoutFrame;
              return Math.max(0, BGM_VOLUME * (1 - elapsed / BGM_FADE_FRAMES));
            }
            return BGM_VOLUME;
          }}
        />
      )}

      {/* Alarm SFX at screen_shake */}
      {isRemotion && shakeFrame !== null && (
        <Sequence from={shakeFrame}>
          <Audio src={staticFile('sfx-alarm.mp3')} volume={ALARM_VOLUME} />
        </Sequence>
      )}

      {/* Error SFX at screen_shake */}
      {isRemotion && shakeFrame !== null && (
        <Sequence from={shakeFrame}>
          <Audio src={staticFile('sfx-error.mp3')} volume={ERROR_VOLUME} />
        </Sequence>
      )}
    </>
  );
}
