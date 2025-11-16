# Plugin System Documentation

## Overview

The AI Workflow Platform includes a comprehensive plugin system that allows users to extend the platform with custom node types and functionality. This document describes the architecture, usage, and development of plugins.

## Architecture

### Components

The plugin system consists of several key components:

1. **Plugin Loader** (`plugins/plugin-loader.ts`)
   - Dynamically loads plugin code at runtime
   - Manages plugin lifecycle (load, unload, reload)
   - Handles async component loading

2. **Plugin Registry** (`plugins/plugin-registry.ts`)
   - Registers custom node types from plugins
   - Provides lookup for node components and config panels
   - Manages node type metadata

3. **Plugin Manager** (`composables/usePluginManager.ts`)
   - Unified interface for plugin management
   - Initializes plugin system on app startup
   - Coordinates between loader and registry

4. **Plugin Store** (`stores/plugin.ts`)
   - Manages plugin state (installed, active, etc.)
   - Handles plugin installation and activation
   - Provides search and filtering capabilities

5. **Plugin API Client** (`api/plugins.ts`)
   - Communicates with BFF for plugin operations
   - Handles file uploads and downloads
   - Manages installation progress

### Data Flow

```
User Action (Install Plugin)
    ↓
Plugin Store (uploadPlugin)
    ↓
Plugin API Client (POST /plugins/upload)
    ↓
BFF (validates and stores plugin)
    ↓
Plugin Loader (loads plugin code)
    ↓
Plugin Registry (registers node type)
    ↓
Node Palette (displays custom node)
```

## Plugin Structure

### Plugin Package Format

Plugins are distributed as `.wfplugin` files (tar.gz archives) with the following structure:

```
my-plugin.wfplugin
├── manifest.json          # Plugin metadata
├── frontend/
│   ├── NodeComponent.vue  # Node UI component
│   ├── ConfigPanel.vue    # Configuration panel
│   └── index.js           # Compiled frontend code
├── backend/
│   ├── executor.py        # Node executor
│   └── requirements.txt   # Python dependencies
└── README.md
```

### Plugin Manifest

The `manifest.json` file contains plugin metadata:

```json
{
  "id": "custom-http-request",
  "name": "HTTP Request Node",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Make HTTP requests in workflows",
  "category": "integration",
  "icon": "🌐",
  "frontend": {
    "component": "./frontend/NodeComponent.vue",
    "configPanel": "./frontend/ConfigPanel.vue"
  },
  "backend": {
    "executor": "./backend/executor.py",
    "entrypoint": "HttpRequestExecutor"
  },
  "config": {
    "schema": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE"] }
      },
      "required": ["url", "method"]
    }
  },
  "permissions": ["network.http"],
  "dependencies": {
    "python": ["httpx>=0.25.0"],
    "npm": ["axios@^1.6.0"]
  }
}
```

## Using the Plugin System

### For End Users

#### Installing a Plugin

1. Navigate to the Plugins page (`/plugins`)
2. Browse available plugins or search by name/category
3. Click "Install" on the desired plugin
4. Wait for installation to complete
5. The plugin will be automatically activated

#### Uploading a Custom Plugin

1. Click "Upload Plugin" button
2. Select a `.wfplugin` file
3. The system will validate and install the plugin
4. Custom nodes will appear in the Node Palette

#### Managing Plugins

- **Activate/Deactivate**: Toggle plugin without uninstalling
- **Uninstall**: Remove plugin completely
- **View Details**: See plugin information, permissions, and dependencies

### For Developers

#### Initializing the Plugin System

The plugin system is automatically initialized when the app starts:

```typescript
// main.ts
import { usePluginManager } from './composables/usePluginManager'

const pluginManager = usePluginManager()
await pluginManager.initialize()
```

#### Using Custom Nodes

Custom nodes are automatically added to the Node Palette:

```typescript
// NodePalette.vue
import { usePluginManager } from '@/composables/usePluginManager'

const pluginManager = usePluginManager()
const customNodes = pluginManager.getCustomNodeTypes()
```

#### Checking if a Node is a Plugin

```typescript
import { usePluginManager } from '@/composables/usePluginManager'

const pluginManager = usePluginManager()
const isCustom = pluginManager.isCustomNodeType('my-plugin-id')
```

#### Getting Plugin Components

```typescript
const NodeComponent = pluginManager.getNodeComponent('my-plugin-id')
const ConfigPanel = pluginManager.getConfigPanel('my-plugin-id')
```

## Developing Plugins

### Frontend Component

Create a Vue component for your custom node:

```vue
<!-- NodeComponent.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: {
    label: string
    config: Record<string, any>
  }
}

const props = defineProps<Props>()
</script>

<template>
  <div class="custom-node">
    <div class="node-header">
      <span>{{ data.label }}</span>
    </div>
    <div class="node-body">
      <p>{{ data.config.url }}</p>
    </div>
  </div>
</template>
```

### Configuration Panel

Create a configuration panel for node settings:

```vue
<!-- ConfigPanel.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  config: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits(['update:config'])

const url = ref(props.config.url || '')
const method = ref(props.config.method || 'GET')

function updateConfig() {
  emit('update:config', { url: url.value, method: method.value })
}
</script>

<template>
  <div class="config-panel">
    <div class="form-group">
      <label>URL</label>
      <input v-model="url" @change="updateConfig" />
    </div>
    <div class="form-group">
      <label>Method</label>
      <select v-model="method" @change="updateConfig">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
      </select>
    </div>
  </div>
</template>
```

### Backend Executor

Create a Python executor for your node:

```python
# executor.py
from app.engine.nodes.base import NodeExecutor, NodeResult, ExecutionContext
import httpx

class HttpRequestExecutor(NodeExecutor):
    """HTTP Request Node Executor"""

    async def execute(
        self,
        node_config: dict,
        context: ExecutionContext
    ) -> NodeResult:
        url = node_config['url']
        method = node_config['method']

        async with httpx.AsyncClient() as client:
            response = await client.request(method, url)

        return NodeResult(
            output={
                'status': response.status_code,
                'body': response.text
            },
            status='success'
        )

    def validate_config(self, config: dict) -> bool:
        return 'url' in config and 'method' in config
```

### Building and Packaging

1. Create your plugin directory structure
2. Write your manifest.json
3. Implement frontend and backend components
4. Package as .wfplugin:

```bash
tar -czf my-plugin.wfplugin manifest.json frontend/ backend/ README.md
```

## API Reference

### Plugin Store

```typescript
const pluginStore = usePluginStore()

// Fetch plugins
await pluginStore.fetchPlugins({ category: 'integration' })

// Install plugin
await pluginStore.installPlugin('plugin-id')

// Uninstall plugin
await pluginStore.uninstallPlugin('plugin-id')

// Activate/Deactivate
await pluginStore.activatePlugin('plugin-id')
await pluginStore.deactivatePlugin('plugin-id')

// Upload custom plugin
await pluginStore.uploadPlugin(file)
```

### Plugin Manager

```typescript
const pluginManager = usePluginManager()

// Initialize
await pluginManager.initialize()

// Load specific plugin
await pluginManager.loadPlugin('plugin-id')

// Get custom nodes
const nodes = pluginManager.getCustomNodeTypes()

// Check if custom node
const isCustom = pluginManager.isCustomNodeType('node-type')

// Get components
const component = pluginManager.getNodeComponent('plugin-id')
const panel = pluginManager.getConfigPanel('plugin-id')
```

## Security Considerations

1. **Plugin Validation**: All plugins are validated before installation
2. **Permissions**: Plugins declare required permissions in manifest
3. **Sandboxing**: Plugin code runs in isolated context
4. **Code Review**: Review plugin code before installation
5. **Digital Signatures**: Verify plugin authenticity (future feature)

## Troubleshooting

### Plugin Won't Load

- Check browser console for errors
- Verify plugin manifest is valid JSON
- Ensure all required files are present
- Check network requests for 404 errors

### Custom Node Not Appearing

- Verify plugin is installed and active
- Check plugin manager initialization
- Refresh the page
- Check console for registration errors

### Installation Fails

- Verify file is valid .wfplugin format
- Check file size (max 50MB)
- Ensure manifest is valid
- Check server logs for backend errors

## Future Enhancements

- [ ] Plugin marketplace with ratings and reviews
- [ ] Automatic plugin updates
- [ ] Plugin dependencies management
- [ ] Hot reload for plugin development
- [ ] Plugin sandboxing and security improvements
- [ ] Digital signature verification
- [ ] Plugin analytics and usage tracking

## Contributing

To contribute to the plugin system:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests
5. Submit a pull request

## License

The plugin system is part of the AI Workflow Platform and follows the same license.
