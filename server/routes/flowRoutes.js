import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * Initialize flow routes
 * @param {Object} stmts - Database prepared statements
 * @param {Database.Database} db - Database instance
 */
function initializeFlowRoutes(stmts, db) {
    /**
     * GET /api/flows - List all flows
     */
    router.get('/api/flows', (_req, res) => {
        const rows = stmts.listFlows.all();
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

    /**
     * POST /api/flows - Create a new flow
     */
    router.post('/api/flows', (req, res) => {
        const { name, thumbnail } = req.body || {};
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Name is required.' });
        }

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        stmts.insertFlow.run(id, name.trim(), thumbnail || null, createdAt);

        res.status(201).json({
            id,
            name: name.trim(),
            thumbnail: thumbnail || null,
            createdAt,
        });
    });

    /**
     * POST /api/flows/:id/versions - Create a new version of a flow
     */
    router.post('/api/flows/:id/versions', (req, res) => {
        const { id } = req.params;
        const { nodes, edges, cameraSequence, versionNote, thumbnail, name } = req.body || {};

        const flow = stmts.findFlow.get(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found.' });
        }

        if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(cameraSequence)) {
            return res.status(400).json({ error: 'nodes, edges, cameraSequence must be arrays.' });
        }

        const versionId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        stmts.insertVersion.run(
            versionId,
            id,
            JSON.stringify(nodes),
            JSON.stringify(edges),
            JSON.stringify(cameraSequence),
            typeof versionNote === 'string' ? versionNote : null,
            createdAt
        );

        stmts.updateFlowMeta.run(
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

    /**
     * GET /api/flows/:id/versions - List all versions of a flow
     */
    router.get('/api/flows/:id/versions', (req, res) => {
        const { id } = req.params;
        const flow = stmts.findFlow.get(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found.' });
        }

        const versions = stmts.listVersions.all(id).map((row) => ({
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

    /**
     * DELETE /api/flows/:id - Delete a flow and all its versions
     */
    router.delete('/api/flows/:id', (req, res) => {
        const { id } = req.params;
        const flow = stmts.findFlow.get(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found.' });
        }

        const deleteTx = db.transaction(() => {
            stmts.deleteVersions.run(id);
            stmts.deleteFlow.run(id);
        });
        deleteTx();

        res.json({ success: true });
    });
}

export { router, initializeFlowRoutes };
