# Product Overview

Hive Docs is a VS Code extension that provides centralized wiki-style documentation management. It allows developers to create, edit, search, and organize markdown documents within their development environment.

## Key Features

- **Document Management**: Create, edit, delete, and organize markdown documents
- **Search & Discovery**: Full-text search across all documents with tag support
- **VS Code Integration**: Native extension with webview interface and command palette integration
- **AI Agent Integration**: MCP (Model Context Protocol) server for AI assistant access
- **Import/Export**: Bulk import existing markdown files and export document collections
- **Database Storage**: SQLite-based local storage with automatic backup capabilities

## Target Users

Developers and teams who need to maintain documentation alongside their code, with seamless integration into their VS Code workflow and AI-assisted development processes.

## Architecture Philosophy

The project follows a development-first approach with dual deployment targets:
1. Standalone web application for rapid development and testing
2. VS Code extension integration via webviews for production use