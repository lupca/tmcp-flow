import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { TTS_CONFIG, PATHS, SERVER_CONFIG } from '../config/config.js';

/**
 * Generate TTS audio for intro text
 * @param {string} introText - Text to convert to speech
 * @param {number} port - Server port for URL generation
 * @returns {Promise<string>} Public URL to the audio file
 */
async function generateIntroAudio(introText, port) {
    if (!introText || typeof introText !== 'string') {
        return null;
    }

    try {
        const tts = new MsEdgeTTS();

        // Convert config name to OUTPUT_FORMAT enum
        const formatKey = TTS_CONFIG.OUTPUT_FORMAT;
        const format = OUTPUT_FORMAT[formatKey];

        if (!format) {
            console.warn(`⚠️  TTS format not found: ${formatKey}`);
            return null;
        }

        await tts.setMetadata(TTS_CONFIG.VOICE, format);

        const audioDirName = `intro-${Date.now()}`;
        const audioDirPath = path.join(PATHS.PUBLIC_DIR, audioDirName);

        fs.mkdirSync(audioDirPath, { recursive: true });

        console.log(`[TTS] Generating intro voiceover in: ${audioDirName}`);
        await tts.toFile(audioDirPath, introText);

        const audioUrl = `http://localhost:${port}/public/${audioDirName}/audio.mp3`;
        console.log(`[TTS] Voiceover ready at ${audioUrl}`);

        return audioUrl;
    } catch (error) {
        console.error('[TTS] Error generating voiceover:', error.message);
        return null;
    }
}

export { generateIntroAudio };
