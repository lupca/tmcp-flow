import express from 'express';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use('/out', express.static('out'));

const SCENARIOS_PATH = path.join(process.cwd(), 'server/data/scenarios.json');
const OUT_DIR = path.join(process.cwd(), 'out');
const DB_PATH = path.join(process.cwd(), 'server/data/flows.db');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
    CREATE TABLE IF NOT EXISTS flows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        thumbnail TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flow_versions (
        id TEXT PRIMARY KEY,
        flow_id TEXT NOT NULL,
        nodes TEXT NOT NULL,
        edges TEXT NOT NULL,
        cameraSequence TEXT NOT NULL,
        version_note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
    );
`);

const listFlowsStmt = db.prepare(`
    SELECT
        f.id,
        f.name,
        f.thumbnail,
        f.created_at,
        v.id AS version_id,
        v.version_note AS version_note,
        v.created_at AS version_created_at
    FROM flows f
    LEFT JOIN flow_versions v
        ON v.id = (
            SELECT v2.id FROM flow_versions v2
            WHERE v2.flow_id = f.id
            ORDER BY datetime(v2.created_at) DESC
            LIMIT 1
        )
    ORDER BY datetime(COALESCE(v.created_at, f.created_at)) DESC
`);

const insertFlowStmt = db.prepare(
    'INSERT INTO flows (id, name, thumbnail, created_at) VALUES (?, ?, ?, ?)'
);
const updateFlowMetaStmt = db.prepare(
    'UPDATE flows SET name = COALESCE(?, name), thumbnail = COALESCE(?, thumbnail) WHERE id = ?'
);
const findFlowStmt = db.prepare('SELECT * FROM flows WHERE id = ?');
const insertVersionStmt = db.prepare(
    'INSERT INTO flow_versions (id, flow_id, nodes, edges, cameraSequence, version_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const listVersionsStmt = db.prepare(
    'SELECT * FROM flow_versions WHERE flow_id = ? ORDER BY datetime(created_at) DESC'
);
const deleteVersionsStmt = db.prepare('DELETE FROM flow_versions WHERE flow_id = ?');
const deleteFlowStmt = db.prepare('DELETE FROM flows WHERE id = ?');

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

app.get('/api/flows', (_req, res) => {
    const rows = listFlowsStmt.all();
    const flows = rows.map((row) => ({
        id: row.id,
        name: row.name,
        thumbnail: row.thumbnail,
        createdAt: row.created_at,
        updatedAt: row.version_created_at || row.created_at,
        latestVersion: row.version_id
            ? {
                id: row.version_id,
                versionNote: row.version_note,
                createdAt: row.version_created_at,
            }
            : null,
    }));
    res.json({ flows });
});

app.post('/api/flows', (req, res) => {
    const { name, thumbnail } = req.body || {};
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required.' });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    insertFlowStmt.run(id, name.trim(), thumbnail || null, createdAt);

    res.status(201).json({
        id,
        name: name.trim(),
        thumbnail: thumbnail || null,
        createdAt,
    });
});

app.post('/api/flows/:id/versions', (req, res) => {
    const { id } = req.params;
    const { nodes, edges, cameraSequence, versionNote, thumbnail, name } = req.body || {};

    const flow = findFlowStmt.get(id);
    if (!flow) {
        return res.status(404).json({ error: 'Flow not found.' });
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(cameraSequence)) {
        return res.status(400).json({ error: 'nodes, edges, cameraSequence must be arrays.' });
    }

    const versionId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    insertVersionStmt.run(
        versionId,
        id,
        JSON.stringify(nodes),
        JSON.stringify(edges),
        JSON.stringify(cameraSequence),
        typeof versionNote === 'string' ? versionNote : null,
        createdAt
    );

    updateFlowMetaStmt.run(
        typeof name === 'string' ? name.trim() : null,
        thumbnail || null,
        id
    );

    res.status(201).json({
        id: versionId,
        flowId: id,
        versionNote: typeof versionNote === 'string' ? versionNote : null,
        createdAt,
    });
});

app.get('/api/flows/:id/versions', (req, res) => {
    const { id } = req.params;
    const flow = findFlowStmt.get(id);
    if (!flow) {
        return res.status(404).json({ error: 'Flow not found.' });
    }

    const versions = listVersionsStmt.all(id).map((row) => ({
        id: row.id,
        flowId: row.flow_id,
        nodes: JSON.parse(row.nodes),
        edges: JSON.parse(row.edges),
        cameraSequence: JSON.parse(row.cameraSequence),
        versionNote: row.version_note,
        createdAt: row.created_at,
    }));

    res.json({
        flow: {
            id: flow.id,
            name: flow.name,
            thumbnail: flow.thumbnail,
            createdAt: flow.created_at,
        },
        versions,
    });
});

app.delete('/api/flows/:id', (req, res) => {
    const { id } = req.params;
    const flow = findFlowStmt.get(id);
    if (!flow) {
        return res.status(404).json({ error: 'Flow not found.' });
    }

    const deleteTx = db.transaction(() => {
        deleteVersionsStmt.run(id);
        deleteFlowStmt.run(id);
    });
    deleteTx();

    res.json({ success: true });
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
