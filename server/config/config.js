import path from 'path';
import os from 'os';

const cpuCount = os.cpus().length;

// ── Performance: Quality Presets ──────────────────────────────────────
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

// ── Paths ─────────────────────────────────────────────────────────────
const PATHS = {
    SCENARIOS: path.join(process.cwd(), 'server/data/scenarios.json'),
    OUT_DIR: path.join(process.cwd(), 'out'),
    PUBLIC_DIR: path.join(process.cwd(), 'public'),
    DB: path.join(process.cwd(), 'server/data/flows.db'),
    REMOTION_ENTRY: path.resolve('src/remotion/RemotionRoot.jsx'),
};

// ── Server Config ──────────────────────────────────────────────────────
const SERVER_CONFIG = {
    PORT: 3000,
    JSON_LIMIT: '50mb',
};

// ── Render Config ───────────────────────────────────────────────────────
const RENDER_CONFIG = {
    COMPOSITION_ID: 'DynamicFlowScene',
    CASCADE_COMPOSITION_ID: 'CascadeFailureScene',
    DEFAULT_WIDTH: 1080,
    DEFAULT_HEIGHT: 1920,
    DEFAULT_DURATION: 300,
    DEFAULT_FPS: 60,
    DEFAULT_QUALITY: 'standard',
};

// ── TTS Config ──────────────────────────────────────────────────────────
const TTS_CONFIG = {
    VOICE: 'en-US-AriaNeural',
    OUTPUT_FORMAT: 'AUDIO_24KHZ_48KBITRATE_MONO_MP3',
};

export {
    cpuCount,
    QUALITY_PRESETS,
    PATHS,
    SERVER_CONFIG,
    RENDER_CONFIG,
    TTS_CONFIG,
};
