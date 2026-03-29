# Project Structure

## Root Directory Organization

```
├── src/                    # All source code
├── dist/                   # Build outputs
├── assets/                 # Static assets (icons, images)
├── public/                 # Public web assets
├── .kiro/                  # Kiro configuration and specs
├── node_modules/           # Dependencies
└── package.json            # Project configuration
```

## Source Code Architecture (`src/`)

### Three-Layer Architecture

```
src/
├── shared/                 # Cross-platform shared code
├── web/                    # React web application
└── extension/              # VS Code extension code
```

### Shared Layer (`src/shared/`)

Contains platform-agnostic business logic and utilities:

- **`types.ts`**: Core TypeScript interfaces and types
- **`constants.ts`**: Shared constants and configuration
- **`config/`**: Configuration management
- **`database/`**: SQLite database layer with connection, schema, recovery
- **`documents/`**: Document management business logic
- **`git/`**: Git integration utilities
- **`import/`**: File import and scanning logic
- **`mcp/`**: Model Context Protocol server implementation

### Web Layer (`src/web/`)

React-based user interface:

- **`main.tsx`**: React application entry point
- **`App.tsx`**: Root React component with mock data manager
- **`components/`**: Reusable UI components
- **`index.html`**: Web application HTML template
- **`index.css`**: Global styles

### Extension Layer (`src/extension/`)

VS Code extension integration:

- **`extension.ts`**: Main extension entry point and activation
- **`webview-provider.ts`**: Webview integration for VS Code panels
- **`mcp-server-manager.ts`**: MCP server lifecycle management
- **`configuration-manager.ts`**: VS Code settings integration
- **`test/`**: Extension-specific tests

## Key Architectural Patterns

### Path Aliases
- `@/*` → `src/*`
- `@/shared/*` → `src/shared/*`
- `@/web/*` → `src/web/*`
- `@/extension/*` → `src/extension/*`

### Dual Build Targets
- **Web**: Vite builds to `dist/web/` for standalone development
- **Extension**: Webpack builds to `dist/extension.js` for VS Code

### Database Location
- **Workspace**: `.hive-docs/documents.db` in workspace root
- **Global**: Extension global storage as fallback

### Configuration Files
- **`tsconfig.json`**: Main TypeScript configuration
- **`tsconfig.extension.json`**: Extension-specific TypeScript config
- **`vite.config.web.ts`**: Web application build configuration
- **`webpack.extension.js`**: Extension build configuration
- **`vitest.config.ts`**: Test configuration