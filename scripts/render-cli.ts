import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const SCENARIOS_PATH = path.join(process.cwd(), 'data/scenarios.json');
const OUT_DIR = path.join(process.cwd(), 'out');

// Define an interface for the scenarios if we were fully typing everything
// interface Scenario {
//   config: { title: string; duration: number };
//   nodes: any[];
//   edges: any[];
//   cameraSequence: any[];
// }

async function main() {
    console.log('Starting bulk build process...');

    // Ensure output directory exists
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    // Read scenarios
    if (!fs.existsSync(SCENARIOS_PATH)) {
        console.error(`Scenarios file not found at ${SCENARIOS_PATH}`);
        process.exit(1);
    }

    const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
    console.log(`Found ${scenarios.length} scenarios to render.`);

    // 1. Bundle the project
    console.log('Bundling project...');
    const bundleLocation = await bundle({
        entryPoint: path.resolve('src/RemotionRoot.jsx'),
        // Optional: webpack override or additional config if needed
        // webpackOverride: (config) => config,
    });
    console.log(`Bundle created at: ${bundleLocation}`);

    // 2. Loop through scenarios
    for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        const index = i + 1;
        const outputFilename = `video-${String(index).padStart(3, '0')}.mp4`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        console.log(`Rendering video ${index}/${scenarios.length}: ${outputFilename}...`);

        // Prepare input props
        const inputProps = {
            nodes: scenario.nodes,
            edges: scenario.edges,
            config: scenario.config,
            cameraSequence: scenario.cameraSequence,
        };

        // calculate durationInFrames based on input config or default
        const durationInFrames = scenario.config?.duration || 150;

        // Select composition to get detailed props (width, height, fps etc)
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: 'ArgoK3dFlow',
            inputProps,
        });

        // Render media
        await renderMedia({
            composition: {
                ...composition,
                durationInFrames, // Override duration from scenario config if needed
            },
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: outputPath,
            inputProps,
            onProgress: ({ progress }) => {
                // Optional: rudimentary progress logging
                // process.stdout.write(` Progress: ${(progress * 100).toFixed(0)}%\r`);
            },
        });

        console.log(`  -> Completed: ${outputPath}`);
    }

    console.log('All videos rendered successfully!');
}

main().catch((err) => {
    console.error('Error during bulk build:', err);
    process.exit(1);
});
