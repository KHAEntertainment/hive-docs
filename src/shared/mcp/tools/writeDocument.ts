import { MCPTool, MCPToolContext } from '../types.js';

export const writeDocumentTool: MCPTool = {
  definition: {
    name: 'writeDocument',
    description: 'Create a new document or update an existing one with the provided content',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the document to update (optional for creating new documents)'
        },
        title: {
          type: 'string',
          description: 'The title of the document'
        },
        content: {
          type: 'string',
          description: 'The markdown content of the document'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional array of tags for the document'
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata object for the document'
        }
      },
      required: ['title', 'content']
    }
  },
  handler: async (args: {
    id?: string;
    title: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }, context: MCPToolContext) => {
    const { id, title, content, tags, metadata } = args;
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      throw new Error('Document title is required and must be a string');
    }
    
    if (!content || typeof content !== 'string') {
      throw new Error('Document content is required and must be a string');
    }

    // Validate optional fields
    if (tags && !Array.isArray(tags)) {
      throw new Error('Tags must be an array of strings');
    }

    if (metadata && typeof metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }

    try {
      let document;
      
      if (id) {
        // Update existing document
        document = await context.documentManager.updateDocument(id, {
          title,
          content,
          tags,
          metadata: metadata ? { ...metadata, updatedBy: 'mcp-agent' } : { updatedBy: 'mcp-agent' }
        });
      } else {
        // Create new document
        document = await context.documentManager.createDocument({
          title,
          content,
          tags,
          metadata: metadata ? { ...metadata, createdBy: 'mcp-agent' } : { createdBy: 'mcp-agent' }
        });
      }

      return {
        success: true,
        action: id ? 'updated' : 'created',
        document: {
          id: document.id,
          title: document.title,
          content: document.content,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
          tags: document.tags || [],
          metadata: document.metadata || {}
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to write document: ${errorMessage}`);
    }
  }
};