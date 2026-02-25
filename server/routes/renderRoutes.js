import express from 'express';
import { selectComposition, renderMedia } from '@remotion/renderer';
import path from 'path';
import { QUALITY_PRESETS, PATHS, RENDER_CONFIG, SERVER_CONFIG } from '../config/config.js';
import { parseRenderParams, buildInputProps, buildCascadeInputProps, buildRenderOptions } from '../services/renderService.js';
import { generateIntroAudio } from '../services/ttsService.js';

const router = express.Router();

let activeRender = null;

/**
 * Initialize render routes with bundleState
 * @param {Object} bundleState - Bundle state object { location, ready }
 * @param {number} port - Server port
 */
function initializeRenderRoutes(bundleState, port) {
    /**
     * GET /api/render/presets - List available quality presets
     */
    router.get('/api/render/presets', (_req, res) => {
        const presets = Object.entries(QUALITY_PRESETS).map(([key, val]) => ({
            key,
            label: val.label,
            codec: val.codec,
            concurrency: val.concurrency,
        }));
        res.json({ presets, cpuCount: require('os').cpus().length });
    });

    /**
     * POST /api/render - Render video and return JSON result
     */
    router.post('/api/render', async (req, res) => {
        if (!bundleState.location) {
            return res.status(503).json({ error: 'Server is still bundling. Please wait and try again.' });
        }
        if (activeRender) {
            return res.status(409).json({ error: 'A render is already in progress.' });
        }

        const params = parseRenderParams(req.body);
        const { preset, qualityKey, renderWidth, renderHeight, renderDuration, renderFps } = params;

        console.log(
            `[Render] Starting: ${renderWidth}x${renderHeight}, ${renderDuration} frames (${(renderDuration / renderFps).toFixed(1)}s @ ${renderFps}fps)`
        );
        console.log(
            `[Render] Quality: ${qualityKey} | Concurrency: ${preset.concurrency} | HW Accel: if-possible | GL: angle`
        );

        const startTime = Date.now();
        activeRender = { startTime, aborted: false };

        try {
            const inputProps = buildInputProps(req.body, params);

            // Handle TTS Intro Generation
            if (req.body.introText && typeof req.body.introText === 'string') {
                const audioUrl = await generateIntroAudio(req.body.introText, port);
                if (audioUrl) {
                    inputProps.introAudioUrl = audioUrl;
                }
            }

            const outputFilename = `render-${Date.now()}.${preset.codec.startsWith('prores') ? 'mov' : 'mp4'}`;
            const outputPath = path.join(PATHS.OUT_DIR, outputFilename);

            const composition = await selectComposition({
                serveUrl: bundleState.location,
                id: RENDER_CONFIG.COMPOSITION_ID,
                inputProps,
            });

            const { opts, finalPath } = buildRenderOptions(composition, outputPath, inputProps, preset, ({ progress }) => {
                const pct = Math.round(progress * 100);
                if (pct % 10 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const eta = progress > 0 ? ((elapsed / progress) * (1 - progress)).toFixed(1) : '...';
                    console.log(`[Render] ${pct}% — elapsed ${elapsed.toFixed(1)}s — ETA ${eta}s`);
                }
            });

            opts.serveUrl = bundleState.location;
            await renderMedia(opts);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const finalFilename = path.basename(finalPath);
            console.log(`[Render] ✅ Complete in ${elapsed}s: ${finalFilename}`);
            res.json({
                success: true,
                videoUrl: `/out/${finalFilename}`,
                elapsed: Number(elapsed),
                quality: qualityKey,
            });
        } catch (error) {
            console.error('[Render] Error:', error.message);
            res.status(500).json({ error: 'Render failed', details: error.message });
        } finally {
            activeRender = null;
        }
    });

    /**
     * POST /api/render-stream - Real-time render progress via SSE
     */
    router.post('/api/render-stream', async (req, res) => {
        if (!bundleState.location) {
            res.status(503).json({ error: 'Server is still bundling.' });
            return;
        }
        if (activeRender) {
            res.status(409).json({ error: 'A render is already in progress.' });
            return;
        }

        // Setup SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        const params = parseRenderParams(req.body);
        const { preset, qualityKey } = params;

        send({ type: 'status', message: `Starting render — ${qualityKey} quality, ${preset.concurrency} threads` });

        const startTime = Date.now();
        activeRender = { startTime, aborted: false };
        let lastPct = -1;

        // Handle client disconnect
        req.on('close', () => {
            activeRender && (activeRender.aborted = true);
        });

        try {
            const inputProps = buildInputProps(req.body, params);

            // Handle TTS Intro Generation
            if (req.body.introText && typeof req.body.introText === 'string') {
                send({ type: 'status', message: 'Generating AI voiceover...' });
                const audioUrl = await generateIntroAudio(req.body.introText, port);
                if (audioUrl) {
                    inputProps.introAudioUrl = audioUrl;
                }
            }

            const outputFilename = `render-${Date.now()}.${preset.codec.startsWith('prores') ? 'mov' : 'mp4'}`;
            const outputPath = path.join(PATHS.OUT_DIR, outputFilename);

            send({ type: 'status', message: 'Selecting composition...' });
            const composition = await selectComposition({
                serveUrl: bundleState.location,
                id: RENDER_CONFIG.COMPOSITION_ID,
                inputProps,
            });

            send({ type: 'status', message: 'Rendering frames...' });
            const { opts, finalPath } = buildRenderOptions(composition, outputPath, inputProps, preset, ({ progress }) => {
                const pct = Math.round(progress * 100);
                if (pct > lastPct) {
                    lastPct = pct;
                    const elapsed = (Date.now() - startTime) / 1000;
                    const eta = progress > 0.01 ? Math.round((elapsed / progress) * (1 - progress)) : null;
                    send({ type: 'progress', progress: pct, elapsed: Math.round(elapsed), eta });
                }
            });

            opts.serveUrl = bundleState.location;
            await renderMedia(opts);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const finalFilename = path.basename(finalPath);
            send({ type: 'complete', videoUrl: `/out/${finalFilename}`, elapsed: Number(elapsed), quality: qualityKey });
        } catch (error) {
            send({ type: 'error', message: error.message });
        } finally {
            activeRender = null;
            res.end();
        }
    });

    /**
     * POST /api/render-cascade - Render Cascade Failure video via SSE
     */
    router.post('/api/render-cascade', async (req, res) => {
        if (!bundleState.location) {
            res.status(503).json({ error: 'Server is still bundling.' });
            return;
        }
        if (activeRender) {
            res.status(409).json({ error: 'A render is already in progress.' });
            return;
        }

        // Setup SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        const params = parseRenderParams(req.body);
        const { preset, qualityKey } = params;

        send({ type: 'status', message: `Starting cascade render — ${qualityKey} quality, ${preset.concurrency} threads` });

        const startTime = Date.now();
        activeRender = { startTime, aborted: false };
        let lastPct = -1;

        // Handle client disconnect
        req.on('close', () => {
            activeRender && (activeRender.aborted = true);
        });

        try {
            const inputProps = buildCascadeInputProps(req.body, params);

            const outputFilename = `cascade-${Date.now()}.${preset.codec.startsWith('prores') ? 'mov' : 'mp4'}`;
            const outputPath = path.join(PATHS.OUT_DIR, outputFilename);

            send({ type: 'status', message: 'Selecting CascadeFailureScene composition...' });
            const composition = await selectComposition({
                serveUrl: bundleState.location,
                id: RENDER_CONFIG.CASCADE_COMPOSITION_ID,
                inputProps,
            });

            send({ type: 'status', message: 'Rendering cascade frames...' });
            const { opts, finalPath } = buildRenderOptions(composition, outputPath, inputProps, preset, ({ progress }) => {
                const pct = Math.round(progress * 100);
                if (pct > lastPct) {
                    lastPct = pct;
                    const elapsed = (Date.now() - startTime) / 1000;
                    const eta = progress > 0.01 ? Math.round((elapsed / progress) * (1 - progress)) : null;
                    send({ type: 'progress', progress: pct, elapsed: Math.round(elapsed), eta });
                }
            });

            opts.serveUrl = bundleState.location;
            await renderMedia(opts);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const finalFilename = path.basename(finalPath);
            send({ type: 'complete', videoUrl: `/out/${finalFilename}`, elapsed: Number(elapsed), quality: qualityKey });
        } catch (error) {
            send({ type: 'error', message: error.message });
        } finally {
            activeRender = null;
            res.end();
        }
    });

    /**
     * POST /api/render/cancel - Cancel active render
     */
    router.post('/api/render/cancel', (_req, res) => {
        if (activeRender) {
            activeRender.aborted = true;
            activeRender = null;
            res.json({ success: true, message: 'Render cancelled.' });
        } else {
            res.json({ success: false, message: 'No active render to cancel.' });
        }
    });
}

/**
 * Check if a render is currently active
 * @returns {boolean}
 */
function isRenderActive() {
    return activeRender !== null;
}

export { router, initializeRenderRoutes, isRenderActive };
