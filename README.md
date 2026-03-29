# Hive Docs

A VS Code extension for centralized wiki-style documentation management.

## Development Setup

This project is structured to support both standalone web development and VS Code extension integration.

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

#### Standalone Web App Development
```bash
npm run dev:web
```
This starts the Vite development server at http://localhost:3000 for developing the core UI.

#### Extension Development
```bash
npm run dev:extension
```
This builds the extension in watch mode.

#### Full Development (Both)
```bash
npm run dev
```
This runs both the web app and extension builds concurrently.

### Building

#### Build Web App
```bash
npm run build:web
```

#### Build Extension
```bash
npm run build:extension
```

#### Build Both
```bash
npm run build
```

### Testing

```bash
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

### Linting

```bash
npm run lint      # Check for linting errors
npm run lint:fix  # Fix linting errors
```

### VS Code Extension Development

1. Open this project in VS Code
2. Run `npm run build` to build both web app and extension
3. Press F5 to launch a new Extension Development Host window
4. Test the extension functionality

## Project Structure

```
src/
├── shared/          # Shared code between web app and extension
│   ├── types.ts     # TypeScript interfaces and types
│   └── constants.ts # Shared constants
├── web/            # Standalone web application
│   ├── index.html  # Web app entry point
│   ├── main.tsx    # React app bootstrap
│   └── App.tsx     # Main React component
└── extension/      # VS Code extension code
    └── extension.ts # Extension entry point
```

## Architecture

The project follows a development-first approach:

1. **Phase 1**: Develop core functionality as a standalone web app
2. **Phase 2**: Integrate the web app into VS Code via webviews

This approach allows for faster development cycles and easier testing of the core functionality.