import fs from 'fs';
import { QUALITY_PRESETS, PATHS, RENDER_CONFIG } from '../config/config.js';

/**
 * Parse render parameters from request body
 * @param {Object} body - Request body
 * @returns {Object} Parsed render parameters
 */
function parseRenderParams(body) {
    const qualityKey = body.quality || RENDER_CONFIG.DEFAULT_QUALITY;
    const preset = QUALITY_PRESETS[qualityKey] || QUALITY_PRESETS[RENDER_CONFIG.DEFAULT_QUALITY];

    return {
        renderWidth: body.renderWidth || body.width || RENDER_CONFIG.DEFAULT_WIDTH,
        renderHeight: body.renderHeight || body.height || RENDER_CONFIG.DEFAULT_HEIGHT,
        renderDuration: body.renderDuration || body.durationInFrames || RENDER_CONFIG.DEFAULT_DURATION,
        renderFps: body.renderFps || RENDER_CONFIG.DEFAULT_FPS,
        edgeEffectType: body.edgeEffectType || 'neon_path',
        nodeTheme: body.nodeTheme || 'vercel_glass',
        selectionEffect: body.selectionEffect || 'glow_scale',
        previewMode: body.previewMode ?? false,
        renderSelectionEffect: body.renderSelectionEffect ?? false,
        preset,
        qualityKey,
    };
}

/**
 * Build input properties for Remotion composition
 * @param {Object} body - Request body
 * @param {Object} params - Parsed render parameters
 * @returns {Object} Input props for composition
 */
function buildInputProps(body, params) {
    let scenario;
    try {
        const scenarios = JSON.parse(fs.readFileSync(PATHS.SCENARIOS, 'utf-8'));
        scenario = scenarios[0];
    } catch {
        scenario = { nodes: [], edges: [], config: {}, cameraSequence: [] };
    }

    const inputNodes = body.nodes || scenario.nodes;

    // Log node sizes for debugging
    console.log('📊 Node sizes being passed to Remotion:');
    inputNodes.forEach(node => {
        if (node.type !== 'group') {
            console.log(
                `  - ${node.id}: width=${node.width || 'undefined'}, height=${node.height || 'undefined'}, parentId=${node.parentId || 'none'}`
            );
        }
    });

    return {
        nodes: inputNodes,
        edges: body.edges || scenario.edges,
        config: body.config || scenario.config,
        cameraSequence: body.cameraSequence ?? scenario.cameraSequence,
        renderWidth: params.renderWidth,
        renderHeight: params.renderHeight,
        renderDuration: params.renderDuration,
        renderFps: params.renderFps,
        edgeEffectType: params.edgeEffectType,
        nodeTheme: params.nodeTheme,
        selectionEffect: params.selectionEffect,
        previewMode: params.previewMode,
        renderSelectionEffect: params.renderSelectionEffect,
    };
}

/**
 * Build Remotion render options
 * @param {Object} composition - Remotion composition
 * @param {string} outputPath - Output file path
 * @param {Object} inputProps - Input properties
 * @param {Object} preset - Quality preset
 * @param {Function} onProgress - Progress callback
 * @returns {Object} Render options and final path
 */
function buildRenderOptions(composition, outputPath, inputProps, preset, onProgress) {
    const isProres = preset.codec.startsWith('prores');
    const ext = isProres ? '.mov' : '.mp4';
    const finalPath = outputPath.replace(/\.[^.]+$/, ext);

    const opts = {
        composition,
        serveUrl: null, // Will be set by caller
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

export { parseRenderParams, buildInputProps, buildRenderOptions };
