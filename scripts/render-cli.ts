import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SCENARIOS_PATH = path.join(process.cwd(), 'data/scenarios.json');
const OUT_DIR = path.join(process.cwd(), 'out');

// ── Performance config ──────────────────────────────────────────────
const cpuCount = os.cpus().length;
const QUALITY = {
    videoBitrate: '8M',
    jpegQuality: 85,
    concurrency: Math.max(2, Math.floor(cpuCount / 2)),
};

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m${s}s` : `${s}s`;
}

function progressBar(progress: number, width = 30): string {
    const filled = Math.round(progress * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(progress * 100)}%`;
}

async function main() {
    console.log('🚀 Starting optimised bulk render...');
    console.log(`   CPU cores: ${cpuCount} | Concurrency: ${QUALITY.concurrency} | HW Accel: if-possible | GL: angle`);

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(SCENARIOS_PATH)) {
        console.error(`Scenarios file not found at ${SCENARIOS_PATH}`);
        process.exit(1);
    }

    const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
    console.log(`📦 Found ${scenarios.length} scenarios to render.\n`);

    // 1. Bundle (one-time)
    console.log('📦 Bundling project...');
    const bundleStart = Date.now();
    const bundleLocation = await bundle({
        entryPoint: path.resolve('src/remotion/RemotionRoot.jsx'),
    });
    console.log(`   Bundle ready in ${formatTime((Date.now() - bundleStart) / 1000)}\n`);

    const totalStart = Date.now();

    // 2. Render each scenario
    for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        const index = i + 1;
        const outputFilename = `video-${String(index).padStart(3, '0')}.mp4`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        console.log(`\n🎬 Rendering ${index}/${scenarios.length}: ${outputFilename}`);
        const renderStart = Date.now();

        const inputProps = {
            nodes: scenario.nodes,
            edges: scenario.edges,
            config: scenario.config,
            cameraSequence: scenario.cameraSequence,
        };

        const durationInFrames = scenario.config?.duration || 150;

        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'DynamicFlowScene',
            inputProps,
        });

        await renderMedia({
            composition: {
                ...composition,
                durationInFrames,
            },
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: outputPath,
            inputProps,
            // ── Performance optimisations ──
            concurrency: QUALITY.concurrency,
            hardwareAcceleration: 'if-possible',
            chromiumOptions: { gl: 'angle' },
            imageFormat: 'jpeg',
            jpegQuality: QUALITY.jpegQuality,
            videoBitrate: QUALITY.videoBitrate,
            audioBitrate: '128k',
            onProgress: ({ progress }) => {
                const elapsed = (Date.now() - renderStart) / 1000;
                const eta = progress > 0.01 ? (elapsed / progress) * (1 - progress) : 0;
                process.stdout.write(`\r   ${progressBar(progress)} | ${formatTime(elapsed)} elapsed | ETA ${formatTime(eta)}  `);
            },
        });

        const elapsed = (Date.now() - renderStart) / 1000;
        console.log(`\n   ✅ Done in ${formatTime(elapsed)}: ${outputPath}`);
    }

    const totalElapsed = (Date.now() - totalStart) / 1000;
    console.log(`\n🎉 All ${scenarios.length} videos rendered in ${formatTime(totalElapsed)}!`);
}

main().catch((err) => {
    console.error('Error during bulk build:', err);
    process.exit(1);
});
