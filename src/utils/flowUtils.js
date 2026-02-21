import { layoutWithElk } from './elkLayout';
import { groupDefaultStyle } from '../constants/flowConstants';

export function normalizeNodes(nodes) {
    const mapped = nodes.map((n) => ({
        ...n,
        type: n.type || 'universal',
        data: n.data || { title: n.id },
        ...(n.type === 'group'
            ? { style: { ...groupDefaultStyle, ...(n.style || {}) } }
            : {}),
    }));

    return [
        ...mapped.filter((n) => n.type === 'group'),
        ...mapped.filter((n) => n.type !== 'group'),
    ];
}

export function shouldRelayout(nodes) {
    return nodes.some(
        (node) =>
            !node.position ||
            typeof node.position.x !== 'number' ||
            typeof node.position.y !== 'number'
    );
}

export async function ensureLayout(nodes, edges) {
    const normalized = normalizeNodes(nodes);
    if (normalized.length === 0) return normalized;
    if (!shouldRelayout(normalized)) return normalized;
    return layoutWithElk(normalized, edges);
}
