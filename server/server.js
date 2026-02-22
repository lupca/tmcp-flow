import express from 'express';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// ── Performance: Quality Presets ──────────────────────────────────────
const cpuCount = os.cpus().length;
const QUALITY_PRESETS = {
    draft: {
        videoBitrate: '2M',
        jpegQuality: 70,
        concurrency: Math.max(2, Math.floor(cpuCount * 0.75)),
        codec: 'h264',
        label: 'Draft (fastest)',
    },
    standard: {
        videoBitrate: '8M',
        jpegQuality: 85,
        concurrency: Math.max(2, Math.floor(cpuCount / 2)),
        codec: 'h264',
        label: 'Standard',
    },
    high: {
        videoBitrate: '15M',
        jpegQuality: 95,
        concurrency: Math.max(2, Math.floor(cpuCount / 3)),
        codec: 'h264',
        label: 'High Quality',
    },
    prores: {
        videoBitrate: null,
        jpegQuality: null,
        concurrency: Math.max(2, Math.floor(cpuCount / 2)),
        codec: 'prores-hq',
        label: 'ProRes HQ (huge file)',
    },
};

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use('/out', express.static('out'));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

const SCENARIOS_PATH = path.join(process.cwd(), 'server/data/scenarios.json');
const OUT_DIR = path.join(process.cwd(), 'out');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DB_PATH = path.join(process.cwd(), 'server/data/flows.db');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
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

// ── Render helpers ───────────────────────────────────────────────────
function parseRenderParams(body) {
    const qualityKey = body.quality || 'standard';
    const preset = QUALITY_PRESETS[qualityKey] || QUALITY_PRESETS.standard;

    return {
        renderWidth: body.renderWidth || body.width || 1080,
        renderHeight: body.renderHeight || body.height || 1920,
        renderDuration: body.renderDuration || body.durationInFrames || 300,
        renderFps: body.renderFps || 60,
        edgeEffectType: body.edgeEffectType || 'neon_path',
        previewMode: body.previewMode ?? false,
        preset,
        qualityKey,
    };
}

function buildInputProps(body, params) {
    let scenario;
    try {
        const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
        scenario = scenarios[0];
    } catch { scenario = { nodes: [], edges: [], config: {}, cameraSequence: [] }; }

    return {
        nodes: body.nodes || scenario.nodes,
        edges: body.edges || scenario.edges,
        config: body.config || scenario.config,
        cameraSequence: body.cameraSequence ?? scenario.cameraSequence,
        renderWidth: params.renderWidth,
        renderHeight: params.renderHeight,
        renderDuration: params.renderDuration,
        renderFps: params.renderFps,
        edgeEffectType: params.edgeEffectType,
        previewMode: params.previewMode,
    };
}

function buildRenderOptions(composition, outputPath, inputProps, preset, onProgress) {
    const isProres = preset.codec.startsWith('prores');
    const ext = isProres ? '.mov' : '.mp4';
    const finalPath = outputPath.replace(/\.[^.]+$/, ext);

    const opts = {
        composition,
        serveUrl: bundleLocation,
        codec: preset.codec,
        outputLocation: finalPath,
        inputProps,
        concurrency: preset.concurrency,
        hardwareAcceleration: 'if-possible',
        chromiumOptions: { gl: 'angle' },
        onProgress,
    };

    // JPEG frames + bitrate only for non-ProRes
    if (!isProres) {
        opts.imageFormat = 'jpeg';
        opts.jpegQuality = preset.jpegQuality;
        opts.videoBitrate = preset.videoBitrate;
        opts.audioBitrate = '128k';
    }

    return { opts, finalPath };
}

// ── GET /api/render/presets — list available presets ─────────────────
app.get('/api/render/presets', (_req, res) => {
    const presets = Object.entries(QUALITY_PRESETS).map(([key, val]) => ({
        key,
        label: val.label,
        codec: val.codec,
        concurrency: val.concurrency,
    }));
    res.json({ presets, cpuCount });
});

// ── POST /api/render — optimised, returns JSON on complete ──────────
let activeRender = null;

app.post('/api/render', async (req, res) => {
    if (!bundleLocation) return res.status(503).json({ error: 'Server is still bundling. Please wait and try again.' });
    if (activeRender) return res.status(409).json({ error: 'A render is already in progress.' });

    const params = parseRenderParams(req.body);
    const { preset, qualityKey, renderWidth, renderHeight, renderDuration, renderFps } = params;

    console.log(`[Render] Starting: ${renderWidth}x${renderHeight}, ${renderDuration} frames (${(renderDuration / renderFps).toFixed(1)}s @ ${renderFps}fps)`);
    console.log(`[Render] Quality: ${qualityKey} | Concurrency: ${preset.concurrency} | HW Accel: if-possible | GL: angle`);

    const startTime = Date.now();
    activeRender = { startTime, aborted: false };

    try {
        const inputProps = buildInputProps(req.body, params);

        // Handle TTS Intro Generation
        if (req.body.introText && typeof req.body.introText === 'string') {
            try {
                const tts = new MsEdgeTTS();
                await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

                const audioDirName = `intro-${Date.now()}`;
                const audioDirPath = path.join(PUBLIC_DIR, audioDirName);

                fs.mkdirSync(audioDirPath, { recursive: true });

                console.log(`[TTS] Generating intro voiceover in: ${audioDirName}`);
                await tts.toFile(audioDirPath, req.body.introText);

                inputProps.introAudioUrl = `http://localhost:${port}/public/${audioDirName}/audio.mp3`;
                console.log(`[TTS] Voiceover ready at ${inputProps.introAudioUrl}`);
            } catch (ttsError) {
                console.error('[TTS] Error generating voiceover:', ttsError.message);
                // Continue without audio if TTS fails
            }
        }

        const outputFilename = `render-${Date.now()}.${preset.codec.startsWith('prores') ? 'mov' : 'mp4'}`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        const composition = await selectComposition({ serveUrl: bundleLocation, id: 'DynamicFlowScene', inputProps });

        const { opts, finalPath } = buildRenderOptions(composition, outputPath, inputProps, preset, ({ progress }) => {
            const pct = Math.round(progress * 100);
            if (pct % 10 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const eta = progress > 0 ? ((elapsed / progress) * (1 - progress)).toFixed(1) : '...';
                console.log(`[Render] ${pct}% — elapsed ${elapsed.toFixed(1)}s — ETA ${eta}s`);
            }
        });

        await renderMedia(opts);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const finalFilename = path.basename(finalPath);
        console.log(`[Render] ✅ Complete in ${elapsed}s: ${finalFilename}`);
        res.json({ success: true, videoUrl: `/out/${finalFilename}`, elapsed: Number(elapsed), quality: qualityKey });
    } catch (error) {
        console.error('[Render] Error:', error.message);
        res.status(500).json({ error: 'Render failed', details: error.message });
    } finally {
        activeRender = null;
    }
});

// ── POST /api/render-stream — SSE real-time progress ────────────────
app.post('/api/render-stream', async (req, res) => {
    if (!bundleLocation) {
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
    const { preset, qualityKey, renderWidth, renderHeight, renderDuration, renderFps } = params;

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
            try {
                const tts = new MsEdgeTTS();
                await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

                const audioDirName = `intro-${Date.now()}`;
                const audioDirPath = path.join(PUBLIC_DIR, audioDirName);

                fs.mkdirSync(audioDirPath, { recursive: true });

                await tts.toFile(audioDirPath, req.body.introText);
                inputProps.introAudioUrl = `http://localhost:${port}/public/${audioDirName}/audio.mp3`;
            } catch (ttsError) {
                console.error('[TTS] Error generating voiceover:', ttsError.message);
                // Continue without audio if TTS fails
            }
        }

        const outputFilename = `render-${Date.now()}.${preset.codec.startsWith('prores') ? 'mov' : 'mp4'}`;
        const outputPath = path.join(OUT_DIR, outputFilename);

        send({ type: 'status', message: 'Selecting composition...' });
        const composition = await selectComposition({ serveUrl: bundleLocation, id: 'DynamicFlowScene', inputProps });

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

// ── POST /api/render/cancel ─────────────────────────────────────────
app.post('/api/render/cancel', (_req, res) => {
    if (activeRender) {
        activeRender.aborted = true;
        activeRender = null;
        res.json({ success: true, message: 'Render cancelled.' });
    } else {
        res.json({ success: false, message: 'No active render to cancel.' });
    }
});

app.listen(port, () => {
    console.log(`Server: http://localhost:${port}`);
    console.log(`[Perf] CPU cores: ${cpuCount} | Default concurrency: ${QUALITY_PRESETS.standard.concurrency}`);
    preBundle();
});
