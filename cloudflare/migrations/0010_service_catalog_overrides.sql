-- Persistent owner-managed service edits and removal tombstones.
CREATE TABLE IF NOT EXISTS service_catalog_overrides (
  service_id TEXT PRIMARY KEY,
  service_json TEXT NOT NULL DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
