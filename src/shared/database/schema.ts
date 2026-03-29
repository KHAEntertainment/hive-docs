import { DatabaseConnection } from './connection.js';

export interface Migration {
  version: number;
  name: string;
  up: string[];
  down?: string[];
}

export class SchemaManager {
  private connection: DatabaseConnection;
  private migrations: Migration[] = [
    {
      version: 1,
      name: 'initial_schema',
      up: [
        `CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          tags TEXT,
          metadata TEXT
        )`,
        
        `CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)`,
        `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at)`,
        `CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at)`,
        
        // Create full-text search virtual table
        `CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
          title, content, tags,
          content='documents',
          content_rowid='rowid'
        )`,
        
        // Triggers to maintain FTS index
        `CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
          INSERT INTO documents_fts(rowid, title, content, tags) 
          VALUES (new.rowid, new.title, new.content, new.tags);
        END`,
        
        `CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
          INSERT INTO documents_fts(documents_fts, rowid, title, content, tags) 
          VALUES('delete', old.rowid, old.title, old.content, old.tags);
        END`,
        
        `CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
          INSERT INTO documents_fts(documents_fts, rowid, title, content, tags) 
          VALUES('delete', old.rowid, old.title, old.content, old.tags);
          INSERT INTO documents_fts(rowid, title, content, tags) 
          VALUES (new.rowid, new.title, new.content, new.tags);
        END`
      ]
    }
  ];

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async initialize(): Promise<void> {
    await this.ensureMigrationsTable();
    await this.runPendingMigrations();
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.connection.get<{ version: number }>(
        'SELECT MAX(version) as version FROM schema_migrations'
      );
      return result?.version || 0;
    } catch (error) {
      // If table doesn't exist yet, return 0
      return 0;
    }
  }

  async runPendingMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
  }

  private async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration ${migration.version}: ${migration.name}`);
    
    try {
      await this.connection.beginTransaction();

      // Execute all migration statements
      for (const statement of migration.up) {
        await this.connection.run(statement);
      }

      // Record migration as applied
      await this.connection.run(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );

      await this.connection.commit();
      console.log(`Migration ${migration.version} completed successfully`);
    } catch (error) {
      await this.connection.rollback();
      throw new Error(`Migration ${migration.version} failed: ${error}`);
    }
  }

  async rollbackMigration(version: number): Promise<void> {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration || !migration.down) {
      throw new Error(`Cannot rollback migration ${version}: no rollback statements defined`);
    }

    const currentVersion = await this.getCurrentVersion();
    if (version > currentVersion) {
      throw new Error(`Cannot rollback migration ${version}: not applied`);
    }

    try {
      await this.connection.beginTransaction();

      // Execute rollback statements
      for (const statement of migration.down) {
        await this.connection.run(statement);
      }

      // Remove migration record
      await this.connection.run(
        'DELETE FROM schema_migrations WHERE version = ?',
        [version]
      );

      await this.connection.commit();
      console.log(`Migration ${version} rolled back successfully`);
    } catch (error) {
      await this.connection.rollback();
      throw new Error(`Rollback of migration ${version} failed: ${error}`);
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      // Check if required tables exist
      const tables = await this.connection.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('documents', 'documents_fts', 'schema_migrations')"
      );

      const requiredTables = ['documents', 'documents_fts', 'schema_migrations'];
      const existingTables = tables.map(t => t.name);
      
      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          console.error(`Required table '${table}' is missing`);
          return false;
        }
      }

      // Check if FTS index is working
      await this.connection.run("INSERT OR IGNORE INTO documents_fts(documents_fts) VALUES('rebuild')");
      
      return true;
    } catch (error) {
      console.error('Schema validation failed:', error);
      return false;
    }
  }

  async getAppliedMigrations(): Promise<{ version: number; name: string; applied_at: string }[]> {
    return await this.connection.all(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
    );
  }

  async rebuildFTSIndex(): Promise<void> {
    console.log('Rebuilding full-text search index...');
    await this.connection.run("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')");
    console.log('FTS index rebuilt successfully');
  }
}