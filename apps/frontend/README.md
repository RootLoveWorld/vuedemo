# AI Workflow Platform - Frontend

Vue3 frontend application for the AI Workflow Platform.

## Tech Stack

- **Framework**: Vue 3.5+ (Composition API)
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.x
- **State Management**: Pinia 2.x
- **Router**: Vue Router 4.x
- **Styling**: Tailwind CSS 3.x
- **UI Components**: Shadcn-vue (Radix Vue)
- **HTTP Client**: Ky
- **Validation**: Zod
- **Icons**: Lucide Icons
- **Utilities**: VueUse

## Project Structure

```
src/
├── api/              # API client and endpoints
├── assets/           # Static assets
├── components/       # Vue components
│   ├── ui/          # Shadcn-vue UI components
│   ├── flow/        # Flow editor components
│   ├── nodes/       # Custom node components
│   └── common/      # Common components
├── composables/      # Vue composables
├── lib/             # Utility libraries
├── router/          # Vue Router configuration
├── stores/          # Pinia stores
├── utils/           # Utility functions
├── views/           # Page views
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Type Check

```bash
pnpm type-check
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_BFF_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

## Features

- ✅ Vue 3 with Composition API
- ✅ TypeScript support
- ✅ Tailwind CSS 4 styling
- ✅ Pinia state management
- ✅ Vue Router navigation
- ✅ Shared types from monorepo packages
- ✅ API client with authentication
- ✅ WebSocket support ready
- 🚧 Flow editor (to be implemented)
- 🚧 Authentication UI (to be implemented)
- 🚧 Workflow management (to be implemented)

## Next Steps

1. Implement authentication UI (Task 4)
2. Integrate Vue Flow for workflow editor (Task 5)
3. Implement workflow management features (Task 6)
4. Add execution management UI (Task 7)
5. Implement plugin management (Task 8)
