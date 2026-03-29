import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from '../database/connection.js';
import { SchemaManager } from '../database/schema.js';
import { DocumentManager } from './manager.js';
import { CreateDocumentRequest, UpdateDocumentRequest } from './types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DocumentManager', () => {
  let connection: DatabaseConnection;
  let schema: SchemaManager;
  let documentManager: DocumentManager;
  let testDbPath: string;

  beforeEach(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-docs-doc-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    
    connection = new DatabaseConnection({
      path: testDbPath,
      enableWAL: true
    });
    
    await connection.connect();
    schema = new SchemaManager(connection);
    await schema.initialize();
    
    documentManager = new DocumentManager(connection);
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

  describe('CRUD Operations', () => {
    it('should create a document successfully', async () => {
      const request: CreateDocumentRequest = {
        title: 'Test Document',
        content: 'This is test content',
        tags: ['test', 'example'],
        metadata: { author: 'test-user' }
      };

      const document = await documentManager.createDocument(request);

      expect(document.id).toBeDefined();
      expect(document.title).toBe(request.title);
      expect(document.content).toBe(request.content);
      expect(document.tags).toEqual(request.tags);
      expect(document.metadata).toEqual(request.metadata);
      expect(document.createdAt).toBeInstanceOf(Date);
      expect(document.updatedAt).toBeInstanceOf(Date);
    });

    it('should retrieve a document by id', async () => {
      const request: CreateDocumentRequest = {
        title: 'Test Document',
        content: 'This is test content'
      };

      const created = await documentManager.createDocument(request);
      const retrieved = await documentManager.getDocumentById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe(created.title);
      expect(retrieved!.content).toBe(created.content);
    });

    it('should return null for non-existent document', async () => {
      const result = await documentManager.getDocumentById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should update a document successfully', async () => {
      const createRequest: CreateDocumentRequest = {
        title: 'Original Title',
        content: 'Original content',
        tags: ['original']
      };

      const created = await documentManager.createDocument(createRequest);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateRequest: UpdateDocumentRequest = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'modified']
      };

      const updated = await documentManager.updateDocument(created.id, updateRequest);

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe(updateRequest.title);
      expect(updated.content).toBe(updateRequest.content);
      expect(updated.tags).toEqual(updateRequest.tags);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should update only specified fields', async () => {
      const createRequest: CreateDocumentRequest = {
        title: 'Original Title',
        content: 'Original content',
        tags: ['original']
      };

      const created = await documentManager.createDocument(createRequest);
      
      const updateRequest: UpdateDocumentRequest = {
        title: 'Updated Title'
        // Only updating title, not content or tags
      };

      const updated = await documentManager.updateDocument(created.id, updateRequest);

      expect(updated.title).toBe(updateRequest.title);
      expect(updated.content).toBe(created.content); // Should remain unchanged
      expect(updated.tags).toEqual(created.tags); // Should remain unchanged
    });

    it('should throw error when updating non-existent document', async () => {
      const updateRequest: UpdateDocumentRequest = {
        title: 'Updated Title'
      };

      await expect(
        documentManager.updateDocument('non-existent-id', updateRequest)
      ).rejects.toThrow('Document with id non-existent-id not found');
    });

    it('should delete a document successfully', async () => {
      const request: CreateDocumentRequest = {
        title: 'Test Document',
        content: 'This is test content'
      };

      const created = await documentManager.createDocument(request);
      
      await documentManager.deleteDocument(created.id);
      
      const retrieved = await documentManager.getDocumentById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error when deleting non-existent document', async () => {
      await expect(
        documentManager.deleteDocument('non-existent-id')
      ).rejects.toThrow('Document with id non-existent-id not found');
    });
  });

  describe('Listing and Filtering', () => {
    beforeEach(async () => {
      // Create test documents
      const docs = [
        { title: 'First Doc', content: 'First content', tags: ['tag1', 'common'] },
        { title: 'Second Doc', content: 'Second content', tags: ['tag2', 'common'] },
        { title: 'Third Doc', content: 'Third content', tags: ['tag3'] }
      ];

      for (const doc of docs) {
        await documentManager.createDocument(doc);
      }
    });

    it('should list all documents', async () => {
      const documents = await documentManager.listDocuments();
      expect(documents).toHaveLength(3);
    });

    it('should respect limit and offset', async () => {
      const page1 = await documentManager.listDocuments({ limit: 2, offset: 0 });
      const page2 = await documentManager.listDocuments({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should sort documents correctly', async () => {
      const byTitle = await documentManager.listDocuments({ 
        sortBy: 'title', 
        sortOrder: 'asc' 
      });

      expect(byTitle[0].title).toBe('First Doc');
      expect(byTitle[1].title).toBe('Second Doc');
      expect(byTitle[2].title).toBe('Third Doc');
    });

    it('should get document count', async () => {
      const count = await documentManager.getDocumentCount();
      expect(count).toBe(3);
    });

    it('should get recent documents', async () => {
      const recent = await documentManager.getRecentDocuments(2);
      expect(recent).toHaveLength(2);
      // Should be sorted by updated_at DESC
      expect(recent[0].updatedAt.getTime()).toBeGreaterThanOrEqual(recent[1].updatedAt.getTime());
    });
  });

  describe('Full-Text Search', () => {
    beforeEach(async () => {
      const docs = [
        { title: 'JavaScript Guide', content: 'Learn JavaScript programming with examples' },
        { title: 'Python Tutorial', content: 'Python is a great programming language' },
        { title: 'Database Design', content: 'How to design efficient databases' }
      ];

      for (const doc of docs) {
        await documentManager.createDocument(doc);
      }
    });

    it('should search documents by content', async () => {
      const result = await documentManager.searchDocuments({ query: 'programming' });
      
      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      
      const titles = result.documents.map(d => d.title);
      expect(titles).toContain('JavaScript Guide');
      expect(titles).toContain('Python Tutorial');
    });

    it('should search documents by title', async () => {
      const result = await documentManager.searchDocuments({ query: 'JavaScript' });
      
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].title).toBe('JavaScript Guide');
    });

    it('should handle search with no results', async () => {
      const result = await documentManager.searchDocuments({ query: 'nonexistent' });
      
      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should respect search limit and pagination', async () => {
      const result = await documentManager.searchDocuments({ 
        query: 'design OR programming', 
        limit: 1 
      });
      
      expect(result.documents).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should truncate content when includeContent is false', async () => {
      const result = await documentManager.searchDocuments({ 
        query: 'programming',
        includeContent: false
      });
      
      expect(result.documents).toHaveLength(2);
      result.documents.forEach(doc => {
        expect(doc.content.length).toBeLessThanOrEqual(203); // 200 + "..."
      });
    });
  });

  describe('Tag Operations', () => {
    beforeEach(async () => {
      const docs = [
        { title: 'Doc 1', content: 'Content 1', tags: ['javascript', 'frontend'] },
        { title: 'Doc 2', content: 'Content 2', tags: ['python', 'backend'] },
        { title: 'Doc 3', content: 'Content 3', tags: ['javascript', 'backend'] }
      ];

      for (const doc of docs) {
        await documentManager.createDocument(doc);
      }
    });

    it('should get documents by tag', async () => {
      const jsDocuments = await documentManager.getDocumentsByTag('javascript');
      expect(jsDocuments).toHaveLength(2);
      
      const backendDocuments = await documentManager.getDocumentsByTag('backend');
      expect(backendDocuments).toHaveLength(2);
      
      const frontendDocuments = await documentManager.getDocumentsByTag('frontend');
      expect(frontendDocuments).toHaveLength(1);
    });

    it('should get all unique tags', async () => {
      const tags = await documentManager.getAllTags();
      expect(tags).toHaveLength(4);
      expect(tags).toContain('javascript');
      expect(tags).toContain('python');
      expect(tags).toContain('frontend');
      expect(tags).toContain('backend');
      
      // Should be sorted
      expect(tags).toEqual(['backend', 'frontend', 'javascript', 'python']);
    });

    it('should handle documents without tags', async () => {
      await documentManager.createDocument({
        title: 'No Tags Doc',
        content: 'This document has no tags'
      });

      const tags = await documentManager.getAllTags();
      expect(tags).toHaveLength(4); // Should still be 4, no new tags added
    });
  });
});