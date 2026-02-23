import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/config.js';

/**
 * Initialize and configure the SQLite database
 * @returns {Database.Database} Database instance with prepared statements
 */
function initializeDatabase() {
    // Ensure database directory exists
    const dbDir = path.dirname(PATHS.DB);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(PATHS.DB);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize schema
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

    return db;
}

/**
 * Prepare all database statements
 * @param {Database.Database} db - Database instance
 * @returns {Object} Object containing all prepared statements
 */
function prepareDatabaseStatements(db) {
    return {
        // Flows
        listFlows: db.prepare(`
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
        `),
        insertFlow: db.prepare(
            'INSERT INTO flows (id, name, thumbnail, created_at) VALUES (?, ?, ?, ?)'
        ),
        updateFlowMeta: db.prepare(
            'UPDATE flows SET name = COALESCE(?, name), thumbnail = COALESCE(?, thumbnail) WHERE id = ?'
        ),
        findFlow: db.prepare('SELECT * FROM flows WHERE id = ?'),
        deleteFlow: db.prepare('DELETE FROM flows WHERE id = ?'),

        // Flow versions
        insertVersion: db.prepare(
            'INSERT INTO flow_versions (id, flow_id, nodes, edges, cameraSequence, version_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ),
        listVersions: db.prepare(
            'SELECT * FROM flow_versions WHERE flow_id = ? ORDER BY datetime(created_at) DESC'
        ),
        deleteVersions: db.prepare('DELETE FROM flow_versions WHERE flow_id = ?'),
    };
}

export { initializeDatabase, prepareDatabaseStatements };
