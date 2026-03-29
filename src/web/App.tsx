import React, { useState, useEffect, useCallback } from 'react';
import { Document } from '../shared/types.js';
import { WikiInterface } from './components/index.js';

// Mock document manager for development
// This will be replaced with actual database integration in later tasks
class MockDocumentManager {
  private documents: Document[] = [
    {
      id: '1',
      title: 'Welcome to Hive Docs',
      content: '# Welcome to Hive Docs\n\nThis is your centralized documentation system. You can:\n\n- Create and edit documents\n- Search through your content\n- Organize with tags\n- Access via AI agents through MCP\n\nStart by creating a new document or editing this one!',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      tags: ['welcome', 'getting-started']
    },
    {
      id: '2',
      title: 'Project Setup Guide',
      content: '# Project Setup\n\n## Prerequisites\n\n- Node.js 18+\n- VS Code\n- Git\n\n## Installation\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Configuration\n\nEdit the `.env` file with your settings.',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      tags: ['setup', 'development']
    }
  ];

  async getAllDocuments(): Promise<Document[]> {
    return [...this.documents];
  }

  async createDocument(title: string, content: string): Promise<Document> {
    const newDoc: Document = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };
    this.documents.unshift(newDoc);
    return newDoc;
  }

  async updateDocument(id: string, title: string, content: string, tags?: string[]): Promise<Document> {
    const docIndex = this.documents.findIndex(d => d.id === id);
    if (docIndex === -1) throw new Error('Document not found');
    
    this.documents[docIndex] = {
      ...this.documents[docIndex],
      title,
      content,
      tags: tags || this.documents[docIndex].tags,
      updatedAt: new Date()
    };
    return this.documents[docIndex];
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== id);
  }

  async searchDocuments(query: string): Promise<Document[]> {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return this.documents.filter(doc => 
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [documentManager] = useState(() => new MockDocumentManager());

  // Load documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await documentManager.getAllDocuments();
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocument(docs[0]);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };

    loadDocuments();
  }, [documentManager]);

  const handleDocumentSelect = useCallback((document: Document) => {
    setSelectedDocument(document);
  }, []);

  const handleDocumentCreate = useCallback(async (title: string, content: string) => {
    try {
      const newDoc = await documentManager.createDocument(title, content);
      const updatedDocs = await documentManager.getAllDocuments();
      setDocuments(updatedDocs);
      setSelectedDocument(newDoc);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  }, [documentManager]);

  const handleDocumentUpdate = useCallback(async (id: string, title: string, content: string, tags?: string[]) => {
    try {
      const updatedDoc = await documentManager.updateDocument(id, title, content, tags);
      const updatedDocs = await documentManager.getAllDocuments();
      setDocuments(updatedDocs);
      setSelectedDocument(updatedDoc);
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  }, [documentManager]);

  const handleDocumentDelete = useCallback(async (id: string) => {
    try {
      await documentManager.deleteDocument(id);
      const updatedDocs = await documentManager.getAllDocuments();
      setDocuments(updatedDocs);
      
      if (selectedDocument?.id === id) {
        setSelectedDocument(updatedDocs.length > 0 ? updatedDocs[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }, [documentManager, selectedDocument]);

  const handleSearch = useCallback(async (query: string) => {
    try {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const results = await documentManager.searchDocuments(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search documents:', error);
      setSearchResults([]);
    }
  }, [documentManager]);

  return (
    <div className="app">
      <WikiInterface
        documents={documents}
        selectedDocument={selectedDocument}
        onDocumentSelect={handleDocumentSelect}
        onDocumentCreate={handleDocumentCreate}
        onDocumentUpdate={handleDocumentUpdate}
        onDocumentDelete={handleDocumentDelete}
        onSearch={handleSearch}
        searchResults={searchResults}
        isSearching={isSearching}
      />
    </div>
  );
}

export default App;