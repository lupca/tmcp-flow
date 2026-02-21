import { toPng } from 'html-to-image';

export async function captureThumbnail(containerRef) {
    const target = containerRef.current?.querySelector('.react-flow');
    if (!target) return null;

    try {
        return await toPng(target, {
            cacheBust: true,
            backgroundColor: '#0B0F19',
            pixelRatio: 0.6,
        });
    } catch (error) {
        console.warn('Thumbnail capture failed:', error);
        return null;
    }
}

export function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
