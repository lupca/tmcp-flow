import express from 'express';
import { bundle } from '@remotion/bundler';
import { cpuCount, SERVER_CONFIG, PATHS, QUALITY_PRESETS } from './config/config.js';
import { initializeDatabase, prepareDatabaseStatements } from './database/database.js';
import { setupMiddleware, setupHealthEndpoint } from './middleware/setup.js';
import { router as flowRouter, initializeFlowRoutes } from './routes/flowRoutes.js';
import { router as renderRouter, initializeRenderRoutes } from './routes/renderRoutes.js';

const app = express();
const port = SERVER_CONFIG.PORT;

// ── Bundle State ──────────────────────────────────────────────────────
let bundleLocation = null;
let isBundleReady = false;

/**
 * Pre-bundle the Remotion composition
 */
async function preBundle() {
    console.log('Pre-bundling project...');
    try {
        bundleLocation = await bundle({ entryPoint: PATHS.REMOTION_ENTRY });
        isBundleReady = true;
        console.log(`Bundle created: ${bundleLocation}`);
    } catch (e) {
        console.error('Bundle failed:', e);
    }
}

/**
 * Initialize the server
 */
async function initializeServer() {
    // Setup middleware and static routes
    setupMiddleware(app);

    // Setup health check endpoint
    setupHealthEndpoint(app, isBundleReady);

    // Initialize database
    const db = initializeDatabase();
    const stmts = prepareDatabaseStatements(db);

    // Initialize routes
    initializeFlowRoutes(stmts, db);
    app.use(flowRouter);

    initializeRenderRoutes(bundleLocation, port);
    app.use(renderRouter);

    // Start server
    app.listen(port, () => {
        console.log(`Server: http://localhost:${port}`);
        console.log(`[Perf] CPU cores: ${cpuCount} | Default concurrency: ${QUALITY_PRESETS.standard.concurrency}`);
        preBundle();
    });
}

// Start the server
initializeServer().catch((error) => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
});
