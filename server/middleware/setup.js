import express from 'express';
import path from 'path';
import fs from 'fs';
import { PATHS, SERVER_CONFIG } from '../config/config.js';

/**
 * Setup Express middleware and static routes
 * @param {express.Application} app - Express app instance
 */
function setupMiddleware(app) {
    // Body parsing
    app.use(express.json({ limit: SERVER_CONFIG.JSON_LIMIT }));

    // Static routes
    app.use('/out', express.static(PATHS.OUT_DIR));
    app.use('/public', express.static(PATHS.PUBLIC_DIR));

    // Ensure required directories exist
    if (!fs.existsSync(PATHS.OUT_DIR)) {
        fs.mkdirSync(PATHS.OUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(PATHS.PUBLIC_DIR)) {
        fs.mkdirSync(PATHS.PUBLIC_DIR, { recursive: true });
    }
}

/**
 * Setup health check endpoint
 * @param {express.Application} app - Express app instance
 * @param {Object} bundleState - Bundle state object { location, ready }
 */
function setupHealthEndpoint(app, bundleState) {
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', bundleReady: bundleState.ready, bundleLocation: bundleState.location ? 'set' : 'not-set' });
    });
}

export { setupMiddleware, setupHealthEndpoint };
