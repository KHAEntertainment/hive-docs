# Requirements Document

## Introduction

Hive Docs is a VS Code extension that provides a centralized wiki-style documentation management system for development projects. The extension helps developers organize project documentation by moving markdown files from the workspace into a structured database, while providing both human and AI agent access through a simple interface and MCP server integration. This system aims to reduce workspace clutter while making documentation more accessible and useful for both developers and coding agents.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to manage project documentation through a centralized wiki interface within VS Code, so that I can keep my workspace clean while maintaining easy access to all project documentation.

#### Acceptance Criteria

1. WHEN the extension is activated THEN the system SHALL provide a wiki-style interface accessible through VS Code's sidebar
2. WHEN a user creates a new document THEN the system SHALL store it in a SQLite database with metadata (title, content, created date, modified date)
3. WHEN a user edits an existing document THEN the system SHALL update the document in the database and track modification timestamps
4. WHEN a user searches for documentation THEN the system SHALL provide real-time search results across all stored documents
5. WHEN a user deletes a document THEN the system SHALL remove it from the database with confirmation

### Requirement 2

**User Story:** As a developer, I want to import existing markdown files from my project workspace, so that I can consolidate scattered documentation into the centralized system.

#### Acceptance Criteria

1. WHEN the extension scans the workspace THEN the system SHALL identify all markdown files and present them in an import interface
2. WHEN a user initiates import THEN the system SHALL provide checkboxes to select/deselect individual files for import
3. WHEN importing files THEN the system SHALL respect ignore rules that exclude specific files (like README.md in root directory)
4. WHEN a file is imported THEN the system SHALL convert the markdown content and store it in the database with original file path metadata
5. WHEN import is complete THEN the system SHALL optionally offer to remove imported files from the workspace
6. IF a file matches ignore rules THEN the system SHALL exclude it from the import list by default

### Requirement 3

**User Story:** As a developer, I want to configure which markdown files should be ignored during import, so that I can keep essential files like README.md in the workspace while importing others.

#### Acceptance Criteria

1. WHEN configuring ignore rules THEN the system SHALL provide a settings interface for defining file patterns
2. WHEN ignore rules are defined THEN the system SHALL support glob patterns (*.md, **/docs/*.md, README.md)
3. WHEN scanning for imports THEN the system SHALL automatically exclude files matching ignore patterns
4. WHEN ignore rules change THEN the system SHALL update the import scan results accordingly
5. IF no ignore rules are set THEN the system SHALL use default rules that exclude root README.md files

### Requirement 4

**User Story:** As a coding agent, I want to read and write documentation through an MCP server interface, so that I can access and update project documentation programmatically.

#### Acceptance Criteria

1. WHEN the MCP server starts THEN the system SHALL expose tools for reading, writing, and searching documentation
2. WHEN an agent requests document content THEN the system SHALL return the document with metadata in a structured format
3. WHEN an agent creates a document THEN the system SHALL store it in the database with agent attribution
4. WHEN an agent updates a document THEN the system SHALL track the modification with agent metadata
5. WHEN an agent searches documents THEN the system SHALL return relevant results with document summaries
6. IF the database is locked or unavailable THEN the system SHALL return appropriate error messages to the agent

### Requirement 5

**User Story:** As a developer using various coding agents, I want easy setup instructions for connecting different AI tools to the MCP server, so that I can quickly integrate Hive Docs with my preferred coding assistant.

#### Acceptance Criteria

1. WHEN setting up MCP integration THEN the system SHALL provide a tabbed interface with setup instructions for popular coding agents
2. WHEN using Cursor THEN the system SHALL attempt automatic MCP configuration or provide one-click setup
3. WHEN using other agents (Claude Desktop, Gemini CLI, Augment, Kilo-Code) THEN the system SHALL provide copy-paste configuration snippets
4. WHEN viewing setup instructions THEN the system SHALL include agent-specific JSON configuration examples
5. WHEN MCP server details change THEN the system SHALL update all configuration examples accordingly
6. IF automatic setup fails THEN the system SHALL fall back to manual configuration instructions

### Requirement 6

**User Story:** As a developer, I want the documentation system to use SQLite for reliable local storage, so that my documentation is always available offline and doesn't depend on external services.

#### Acceptance Criteria

1. WHEN the extension initializes THEN the system SHALL create or connect to a SQLite database in the workspace
2. WHEN storing documents THEN the system SHALL use proper database schemas with indexes for performance
3. WHEN the database doesn't exist THEN the system SHALL create it with the required tables and indexes
4. WHEN multiple processes access the database THEN the system SHALL handle concurrent access safely
5. IF database corruption occurs THEN the system SHALL provide error handling and recovery options

### Requirement 7

**User Story:** As a developer, I want to control whether my documentation database files are tracked in git, so that I can choose whether to share my notes and documentation with my team or keep them private.

#### Acceptance Criteria

1. WHEN the extension creates database files THEN the system SHALL provide a toggle setting for git ignore management
2. WHEN git ignore is enabled THEN the system SHALL automatically add .sqlite and .sqlite-vec files to .gitignore
3. WHEN git ignore is disabled THEN the system SHALL remove database file patterns from .gitignore (if they were added by the extension)
4. WHEN the setting changes THEN the system SHALL update .gitignore accordingly and notify the user of the change
5. WHEN .gitignore doesn't exist THEN the system SHALL create it if git ignore is enabled
6. IF .gitignore modifications fail THEN the system SHALL notify the user and provide manual instructions

### Requirement 8

**User Story:** As a developer, I want the extension to integrate seamlessly with VS Code's interface, so that documentation management feels native to my development workflow.

#### Acceptance Criteria

1. WHEN the extension loads THEN the system SHALL add a dedicated sidebar panel for documentation management
2. WHEN viewing documents THEN the system SHALL provide markdown rendering with syntax highlighting
3. WHEN editing documents THEN the system SHALL provide a rich text editor with markdown preview
4. WHEN managing documents THEN the system SHALL integrate with VS Code's command palette for quick actions
5. WHEN working with documents THEN the system SHALL support VS Code themes and follow UI conventions