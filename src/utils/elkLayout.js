/**
 * ELK.js auto-layout for React Flow nodes (supports compound/group nodes).
 *
 * Takes flat React Flow nodes + edges, builds an ELK hierarchical graph,
 * runs the layout engine, and maps computed positions back.
 */

import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

// Default node dimensions (must match UniversalNode rendered size)
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;

/**
 * Layout React Flow nodes using ELK's layered algorithm.
 *
 * @param {Array} nodes — React Flow nodes (type: 'universal' | 'group')
 * @param {Array} edges — React Flow edges
 * @param {object} [options]
 * @param {'DOWN'|'RIGHT'|'UP'|'LEFT'} [options.direction='DOWN']
 * @returns {Promise<Array>} — nodes with computed positions (and group styles)
 */
export async function layoutWithElk(nodes, edges, options = {}) {
  const { direction = 'DOWN' } = options;

  // ── Pre-process: dissolve single-child groups ──
  // Groups with only 1 child are pointless — free the child and remove the group
  const groupChildCount = {};
  for (const n of nodes) {
    if (n.type === 'group') groupChildCount[n.id] = 0;
  }
  for (const n of nodes) {
    if (n.parentId && groupChildCount[n.parentId] !== undefined) {
      groupChildCount[n.parentId]++;
    }
  }
  const singleChildGroups = new Set(
    Object.entries(groupChildCount)
      .filter(([, count]) => count < 2)
      .map(([id]) => id)
  );
  // Free children from single-child groups and remove those groups
  const processedNodes = nodes
    .map((n) => {
      if (n.parentId && singleChildGroups.has(n.parentId)) {
        const { parentId, extent, ...rest } = n;
        return rest;
      }
      return n;
    })
    .filter((n) => !(n.type === 'group' && singleChildGroups.has(n.id)));

  // Classify nodes
  const groupNodes = processedNodes.filter((n) => n.type === 'group');
  const childNodes = processedNodes.filter((n) => n.parentId);
  const topLevelNodes = processedNodes.filter(
    (n) => n.type !== 'group' && !n.parentId
  );

  // Build ELK children for groups (compound nodes)
  // Use generous padding so children never overflow the group container
  const elkGroups = groupNodes.map((g) => ({
    id: g.id,
    layoutOptions: {
      'elk.padding': '[top=60,left=50,bottom=50,right=50]',
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
    },
    children: childNodes
      .filter((c) => c.parentId === g.id)
      .map((c) => ({
        id: c.id,
        // Add safety margin (+20) to prevent node border/padding overflow
        width: (c.measured?.width ?? c.width ?? DEFAULT_WIDTH) + 20,
        height: (c.measured?.height ?? c.height ?? DEFAULT_HEIGHT) + 10,
      })),
    // We don't set width/height — ELK computes it from children + padding
  }));

  // Build the top-level ELK graph
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: [
      ...topLevelNodes.map((n) => ({
        id: n.id,
        width: n.measured?.width ?? n.width ?? DEFAULT_WIDTH,
        height: n.measured?.height ?? n.height ?? DEFAULT_HEIGHT,
      })),
      ...elkGroups,
    ],
    // Filter edges to only include nodes that still exist after dissolving groups
    edges: edges
      .filter((e) => {
        const allNodeIds = new Set(processedNodes.map((n) => n.id));
        return allNodeIds.has(e.source) && allNodeIds.has(e.target);
      })
      .map((e) => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
  };

  // Run ELK layout
  const result = await elk.layout(elkGraph);

  // Build position map from result
  const positionMap = new Map();

  for (const child of result.children ?? []) {
    positionMap.set(child.id, {
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
    });
    // Nested children (inside groups) — positions are relative to parent
    if (child.children) {
      for (const grandchild of child.children) {
        positionMap.set(grandchild.id, {
          x: grandchild.x,
          y: grandchild.y,
        });
      }
    }
  }

  // Map back to React Flow nodes (use processedNodes which has dissolved single-child groups)
  return processedNodes.map((n) => {
    const pos = positionMap.get(n.id);
    if (!pos) return n;

    const updated = {
      ...n,
      position: { x: pos.x ?? 0, y: pos.y ?? 0 },
    };

    // For group nodes: update inline style with computed dimensions
    // Add extra safety margin to computed width/height so children visually fit
    if (n.type === 'group' && pos.width && pos.height) {
      updated.style = {
        ...(n.style ?? {}),
        width: pos.width + 20,
        height: pos.height + 20,
        backgroundColor: n.style?.backgroundColor ?? 'rgba(30, 41, 59, 0.35)',
        border: n.style?.border ?? '1px dashed rgba(148, 163, 184, 0.25)',
        borderRadius: n.style?.borderRadius ?? '20px',
        color: n.style?.color ?? 'rgba(248, 250, 252, 0.6)',
        fontWeight: n.style?.fontWeight ?? 'bold',
        padding: n.style?.padding ?? '16px',
        backdropFilter: n.style?.backdropFilter ?? 'blur(8px)',
        WebkitBackdropFilter: n.style?.WebkitBackdropFilter ?? 'blur(8px)',
        boxShadow: n.style?.boxShadow ?? '0 4px 24px rgba(0, 0, 0, 0.3)',
      };
    }

    return updated;
  });
}
