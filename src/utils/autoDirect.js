const DEFAULT_HOLD = 60;
const DEFAULT_PAN = 30;
const DEFAULT_ZOOM_CLOSE = 1.8;
const DEFAULT_ZOOM_WIDE = 0.5;
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 100;

function _getNodeW(node) {
    return node.measured?.width ?? node.width ?? node.initialWidth ?? node.style?.width ?? DEFAULT_NODE_W;
}
function _getNodeH(node) {
    return node.measured?.height ?? node.height ?? node.initialHeight ?? node.style?.height ?? DEFAULT_NODE_H;
}

/** Resolve absolute position (handles child nodes inside groups) */
function _getAbsPos(node, allNodes) {
    let x = node.position?.x ?? 0;
    let y = node.position?.y ?? 0;
    if (node.parentId) {
        const parent = allNodes.find((n) => n.id === node.parentId);
        if (parent) {
            const pp = _getAbsPos(parent, allNodes);
            x += pp.x;
            y += pp.y;
        }
    }
    return { x, y };
}

/** Center point of a node in absolute coords */
function _nodeCenter(node, allNodes) {
    const abs = _getAbsPos(node, allNodes);
    return { x: abs.x + _getNodeW(node) / 2, y: abs.y + _getNodeH(node) / 2 };
}

/** Euclidean distance between two nodes */
function _dist(a, b, allNodes) {
    const ca = _nodeCenter(a, allNodes);
    const cb = _nodeCenter(b, allNodes);
    return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
}

/** Bounding box that fits all given nodes */
function _fitAllBounds(nodes, allNodes) {
    if (!nodes.length) return { cx: 0, cy: 0, zoom: 0.5 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        const abs = _getAbsPos(n, allNodes);
        const w = _getNodeW(n);
        const h = _getNodeH(n);
        if (abs.x < minX) minX = abs.x;
        if (abs.y < minY) minY = abs.y;
        if (abs.x + w > maxX) maxX = abs.x + w;
        if (abs.y + h > maxY) maxY = abs.y + h;
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, spanX: maxX - minX, spanY: maxY - minY };
}

/** Calculate zoom that fits a bounding span into 1080x1920 with padding */
function _fitZoom(spanX, spanY, padding = 200) {
    const targetW = 1080 - padding * 2;
    const targetH = 1920 - padding * 2;
    const zx = spanX > 0 ? targetW / spanX : 2;
    const zy = spanY > 0 ? targetH / spanY : 2;
    return Math.min(zx, zy, 1.2); // cap at 1.2 to avoid over-zoom
}

/** Count neighbor connections of a node */
function _neighborCount(nodeId, edges) {
    return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

/** Count descendants reachable from nodeId (for DFS branch prioritization) */
function _countDescendants(nodeId, outgoing, visited) {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    let count = 1;
    for (const child of (outgoing[nodeId] || [])) {
        count += _countDescendants(child, outgoing, visited);
    }
    return count;
}

/** Adaptive pan frames: scale linearly with distance, clamped to [18, 72] */
function _clampPan(distance, basePan) {
    // Base reference: 300px distance maps to basePan frames
    const scaled = Math.round(basePan * (distance / 300));
    return Math.max(18, Math.min(72, scaled));
}

/**
 * Cinematic Auto Direct — generates a professional camera sequence.
 *
 * Structure:
 *   1. Establishing shot (fit-all overview)
 *   2. DFS traversal following edge flow (source→target)
 *      - Group cluster overview when entering a new group
 *      - Dynamic zoom based on neighbor density
 *      - Adaptive pan timing based on Euclidean distance
 *   3. Outro shot (zoom back out to fit-all)
 */
export function generateAutoSequence(currentNodes, currentEdges) {
    const holdFrames = DEFAULT_HOLD;
    const panFrames = DEFAULT_PAN;
    const zoomClose = DEFAULT_ZOOM_CLOSE;
    const zoomWide = DEFAULT_ZOOM_WIDE;

    const allNodes = currentNodes;
    const nonGroupNodes = allNodes.filter((n) => n.type !== 'group');
    const groupNodes = allNodes.filter((n) => n.type === 'group');
    if (nonGroupNodes.length === 0) return [];

    // ── Build adjacency (outgoing edges per node) ──
    const outgoing = {};
    for (const e of currentEdges) {
        if (!outgoing[e.source]) outgoing[e.source] = [];
        outgoing[e.source].push(e.target);
    }

    // ── Find root nodes (no incoming edges) ──
    const targetIds = new Set(currentEdges.map((e) => e.target));
    let roots = nonGroupNodes.filter((n) => !targetIds.has(n.id));
    if (roots.length === 0) roots = [nonGroupNodes[0]];

    // ── DFS traversal following edge flow ──
    // Prioritize longest-path branches first for dramatic storytelling
    const visited = new Set();
    const ordered = [];

    function dfs(nodeId) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = allNodes.find((n) => n.id === nodeId);
        if (node && node.type !== 'group') ordered.push(node);
        // Sort children: nodes with more descendants first (longest path priority)
        const children = (outgoing[nodeId] || []).filter((id) => !visited.has(id));
        // Simple heuristic: sort by sub-graph size (deeper branches first)
        children.sort((a, b) => {
            const depthA = _countDescendants(a, outgoing, new Set([...visited]));
            const depthB = _countDescendants(b, outgoing, new Set([...visited]));
            return depthB - depthA;
        });
        for (const childId of children) {
            dfs(childId);
        }
    }

    for (const root of roots) dfs(root.id);

    // Add any unvisited nodes
    for (const n of nonGroupNodes) {
        if (!visited.has(n.id)) ordered.push(n);
    }

    if (ordered.length === 0) return [];

    // ── Generate cinematic keyframe sequence ──
    const sequence = [];
    let frame = 0;

    // ── 1. ESTABLISHING SHOT — fit-all overview ──
    const bounds = _fitAllBounds(nonGroupNodes, allNodes);
    const fitZoom = _fitZoom(bounds.spanX, bounds.spanY);
    // Use manual x/y coords for fit-all (center of all nodes)
    const estX = (1080 / 2) - (bounds.cx * fitZoom);
    const estY = (1920 / 2) - (bounds.cy * fitZoom);
    sequence.push({ frame, x: estX, y: estY, zoom: Math.max(fitZoom, 0.25), easing: 'smooth' });
    frame += Math.round(holdFrames * 2); // Hold establishing shot longer (2x)

    // ── 2. NODE-BY-NODE TRAVERSAL ──
    const visitedGroups = new Set();
    let prevNode = null;

    for (let i = 0; i < ordered.length; i++) {
        const node = ordered[i];

        // ─ Group cluster overview when entering a new group ─
        if (node.parentId && !visitedGroups.has(node.parentId)) {
            visitedGroups.add(node.parentId);
            const groupNode = groupNodes.find((g) => g.id === node.parentId);
            if (groupNode) {
                const groupChildren = nonGroupNodes.filter((n) => n.parentId === node.parentId);
                if (groupChildren.length > 1) {
                    // Adaptive pan to group
                    if (prevNode) {
                        const distToGroup = _dist(prevNode, groupChildren[0], allNodes);
                        const adaptivePan = _clampPan(distToGroup, panFrames);
                        frame += adaptivePan;
                    }
                    // Cluster overview: fit all children within the group
                    const gBounds = _fitAllBounds(groupChildren, allNodes);
                    const gZoom = _fitZoom(gBounds.spanX, gBounds.spanY, 160);
                    const gx = (1080 / 2) - (gBounds.cx * gZoom);
                    const gy = (1920 / 2) - (gBounds.cy * gZoom);
                    sequence.push({ frame, x: gx, y: gy, zoom: Math.min(gZoom, 1.4), easing: 'slow' });
                    frame += Math.round(holdFrames * 1.2); // Hold cluster shot slightly longer
                }
            }
        }

        // ─ Adaptive pan timing based on distance ─
        if (prevNode) {
            const d = _dist(prevNode, node, allNodes);
            const adaptivePan = _clampPan(d, panFrames);
            frame += adaptivePan;
        }

        // ─ Dynamic zoom based on neighbor density ─
        const neighbors = _neighborCount(node.id, currentEdges);
        let nodeZoom;
        if (neighbors <= 1) {
            // Isolated leaf → zoom deeper for emphasis
            nodeZoom = Math.min(zoomClose * 1.2, 2.5);
        } else if (neighbors >= 4) {
            // Hub node with many connections → zoom out to show context
            nodeZoom = Math.max(zoomClose * 0.75, 1.2);
        } else {
            nodeZoom = zoomClose;
        }

        sequence.push({ frame, targetNodeId: node.id, zoom: nodeZoom, easing: 'smooth' });
        frame += holdFrames;
        prevNode = node;
    }

    // ── 3. OUTRO SHOT — zoom back out to overview ──
    frame += Math.round(panFrames * 1.5);
    sequence.push({ frame, x: estX, y: estY, zoom: Math.max(fitZoom, 0.25), easing: 'slow' });
    frame += Math.round(holdFrames * 1.5);

    return sequence;
}

/**
 * Annotate edges with activation timing based on camera sequence.
 * Each edge activates when the camera focuses on its source node.
 */
export function annotateEdgesWithTiming(cameraSequence, edges, nodes) {
    if (!cameraSequence || cameraSequence.length === 0) {
        // No sequence — all edges active from start
        return edges.map(edge => ({
            ...edge,
            data: { ...edge.data, startFrame: 0 }
        }));
    }

    return edges.map(edge => {
        // Find the keyframe where camera focuses on this edge's source node
        const sourceKeyframe = cameraSequence.find(kf => kf.targetNodeId === edge.source);
        const startFrame = sourceKeyframe ? sourceKeyframe.frame : 0;

        return {
            ...edge,
            data: { ...edge.data, startFrame }
        };
    });
}
