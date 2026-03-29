import { MCPTool, MCPToolContext } from '../types.js';

export const readDocumentTool: MCPTool = {
  definition: {
    name: 'readDocument',
    description: 'Read a document by its ID and return the full content with metadata',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique identifier of the document to read'
        }
      },
      required: ['id']
    }
  },
  handler: async (args: { id: string }, context: MCPToolContext) => {
    const { id } = args;
    
    if (!id || typeof id !== 'string') {
      throw new Error('Document ID is required and must be a string');
    }

    try {
      const document = await context.documentManager.getDocumentById(id);
      
      if (!document) {
        throw new Error(`Document with ID '${id}' not found`);
      }

      return {
        success: true,
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
      throw new Error(`Failed to read document: ${errorMessage}`);
    }
  }
};