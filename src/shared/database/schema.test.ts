import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from './connection.js';
import { SchemaManager } from './schema.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SchemaManager', () => {
  let connection: DatabaseConnection;
  let schema: SchemaManager;
  let testDbPath: string;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-docs-schema-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    
    connection = new DatabaseConnection({
      path: testDbPath,
      enableWAL: true
    });
    
    await connection.connect();
    schema = new SchemaManager(connection);
  });

  afterEach(async () => {
    if (connection) {
      await connection.disconnect();
    }
    
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      const walPath = testDbPath + '-wal';
      const shmPath = testDbPath + '-shm';
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      
      const tempDir = path.dirname(testDbPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  it('should initialize schema successfully', async () => {
    await schema.initialize();
    
    // Check that migrations table exists
    const tables = await connection.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    );
    expect(tables).toHaveLength(1);
  });

  it('should create all required tables and indexes', async () => {
    await schema.initialize();
    
    // Check that all required tables exist
    const tables = await connection.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('documents', 'documents_fts', 'schema_migrations')"
    );
    expect(tables).toHaveLength(3);
    
    // Check that indexes exist
    const indexes = await connection.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_documents_%'"
    );
    expect(indexes.length).toBeGreaterThan(0);
  });

  it('should track migration versions correctly', async () => {
    const initialVersion = await schema.getCurrentVersion();
    expect(initialVersion).toBe(0);
    
    await schema.initialize();
    
    const currentVersion = await schema.getCurrentVersion();
    expect(currentVersion).toBeGreaterThan(0);
    
    const appliedMigrations = await schema.getAppliedMigrations();
    expect(appliedMigrations.length).toBeGreaterThan(0);
    expect(appliedMigrations[0].version).toBe(1);
    expect(appliedMigrations[0].name).toBe('initial_schema');
  });

  it('should validate schema correctly', async () => {
    await schema.initialize();
    
    const isValid = await schema.validateSchema();
    expect(isValid).toBe(true);
  });

  it('should handle FTS index operations', async () => {
    await schema.initialize();
    
    // Insert a test document
    await connection.run(
      'INSERT INTO documents (id, title, content) VALUES (?, ?, ?)',
      ['test-1', 'Test Document', 'This is test content']
    );
    
    // Test FTS search
    const results = await connection.all<{ title: string }>(
      "SELECT title FROM documents_fts WHERE documents_fts MATCH 'test'"
    );
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Document');
    
    // Test FTS rebuild
    await schema.rebuildFTSIndex();
    
    // Search should still work after rebuild
    const resultsAfterRebuild = await connection.all<{ title: string }>(
      "SELECT title FROM documents_fts WHERE documents_fts MATCH 'content'"
    );
    expect(resultsAfterRebuild).toHaveLength(1);
  });

  it('should not run migrations twice', async () => {
    await schema.initialize();
    const version1 = await schema.getCurrentVersion();
    
    // Run initialize again
    await schema.initialize();
    const version2 = await schema.getCurrentVersion();
    
    expect(version1).toBe(version2);
    
    // Check that migration wasn't duplicated
    const migrations = await schema.getAppliedMigrations();
    const initialMigrations = migrations.filter(m => m.name === 'initial_schema');
    expect(initialMigrations).toHaveLength(1);
  });
});