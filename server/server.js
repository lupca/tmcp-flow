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

async function preBundle() {
    console.log('Pre-bundling project...');
    try {
        bundleLocation = await bundle({ entryPoint: path.resolve('src/remotion/RemotionRoot.jsx') });
        console.log(`Bundle created: ${bundleLocation}`);
    } catch (e) {
        console.error('Bundle failed:', e);
    }
}

app.post('/api/render', async (req, res) => {
    if (!bundleLocation) return res.status(503).json({ error: 'Bundling...' });

    const { nodes, edges, width, height, durationInFrames, config } = req.body;

    try {
        const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
        const scenario = scenarios[0]; // Default to first scenario
        const outputFilename = `render-${Date.now()}.mp4`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        const inputProps = {
            nodes: nodes || scenario.nodes,
            edges: edges || scenario.edges,
            config: config || scenario.config,
            cameraSequence: scenario.cameraSequence,
            renderWidth: width || 1280,
            renderHeight: height || 720,
            renderDuration: durationInFrames || 300,
            renderFps: 60,
        };

        const composition = await selectComposition({ serveUrl: bundleLocation, id: 'ArgoK3dFlow', inputProps });

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: outputPath,
            inputProps,
        });

        res.json({ success: true, videoUrl: `/out/${outputFilename}` });
    } catch (error) {
        res.status(500).json({ error: 'Render failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    preBundle();
});

