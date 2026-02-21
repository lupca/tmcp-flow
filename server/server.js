import express from 'express';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use('/out', express.static('out'));

const SCENARIOS_PATH = path.join(process.cwd(), 'server/data/scenarios.json');
const OUT_DIR = path.join(process.cwd(), 'out');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let bundleLocation = null;
let isBundleReady = false;

async function preBundle() {
    console.log('Pre-bundling project...');
    try {
        bundleLocation = await bundle({ entryPoint: path.resolve('src/remotion/RemotionRoot.jsx') });
        isBundleReady = true;
        console.log(`Bundle created: ${bundleLocation}`);
    } catch (e) {
        console.error('Bundle failed:', e);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bundleReady: isBundleReady });
});

app.post('/api/render', async (req, res) => {
    if (!bundleLocation) return res.status(503).json({ error: 'Server is still bundling. Please wait and try again.' });

    const { nodes, edges, config } = req.body;
    const renderWidth = req.body.renderWidth || req.body.width || 1080;
    const renderHeight = req.body.renderHeight || req.body.height || 1920;
    const renderDuration = req.body.renderDuration || req.body.durationInFrames || 300;
    const renderFps = req.body.renderFps || 60;
    console.log(`[Render] Starting: ${renderWidth}x${renderHeight}, ${renderDuration} frames (${(renderDuration / renderFps).toFixed(1)}s @ ${renderFps}fps)`);

    try {
        const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
        const scenario = scenarios[0]; // Default to first scenario
        const outputFilename = `render-${Date.now()}.mp4`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        const inputProps = {
            nodes: nodes || scenario.nodes,
            edges: edges || scenario.edges,
            config: config || scenario.config,
            cameraSequence: req.body.cameraSequence ?? scenario.cameraSequence,
            renderWidth,
            renderHeight,
            renderDuration,
            renderFps,
        };

        console.log('[Render] Selecting composition...');
        const composition = await selectComposition({ serveUrl: bundleLocation, id: 'DynamicFlowScene', inputProps });

        console.log('[Render] Rendering media...');
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: outputPath,
            inputProps,
            onProgress: ({ progress }) => {
                if (Math.round(progress * 100) % 25 === 0) {
                    console.log(`[Render] Progress: ${Math.round(progress * 100)}%`);
                }
            },
        });

        console.log(`[Render] Complete: ${outputFilename}`);
        res.json({ success: true, videoUrl: `/out/${outputFilename}` });
    } catch (error) {
        console.error('[Render] Error:', error.message);
        res.status(500).json({ error: 'Render failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    preBundle();
});
