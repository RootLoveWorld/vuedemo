# Plugin System Usage Guide

## Quick Start

### Accessing the Plugin Marketplace

1. Log in to the AI Workflow Platform
2. Navigate to `/plugins` or click "Plugins" in the navigation menu
3. Browse available plugins in the marketplace

### Installing a Plugin

#### From Marketplace

1. **Browse Plugins**
   - View all available plugins in a grid layout
   - Each card shows plugin name, author, version, and description

2. **Search and Filter**
   - Use the search box to find plugins by name
   - Click category buttons to filter by type:
     - All Categories
     - Basic
     - AI
     - Logic
     - Data
     - Integration
     - Utility
     - Custom

3. **View Details**
   - Click "Details" button on any plugin card
   - Review plugin information:
     - Full description
     - Category
     - Statistics (downloads, rating)
     - Required permissions
     - Dependencies (Python and NPM packages)
     - Installation status

4. **Install**
   - Click "Install" button on the plugin card
   - Watch the installation progress bar
   - Plugin automatically activates after installation
   - Custom node appears in the Node Palette

#### Upload Custom Plugin

1. **Click "Upload Plugin"**
   - Button located in the top-right corner of the marketplace

2. **Select File**
   - Drag and drop a `.wfplugin` file
   - Or click to browse and select file
   - File must be under 50MB

3. **Validation**
   - System validates file format
   - Checks plugin manifest
   - Verifies permissions

4. **Installation**
   - Progress bar shows upload status
   - Installation steps displayed
   - Success notification on completion

### Managing Installed Plugins

#### View Installed Plugins

1. Check the "Show installed only" checkbox
2. View all your installed plugins
3. Status badges show:
   - ✓ Installed (green)
   - ● Active (blue)

#### Activate/Deactivate

1. Find the installed plugin
2. Click "Activate" or "Deactivate" button
3. Active plugins appear in the Node Palette
4. Inactive plugins are hidden but remain installed

#### Uninstall

1. Find the installed plugin
2. Click "Uninstall" button
3. Confirm the action
4. Plugin is removed from the system
5. Custom nodes are removed from Node Palette

### Using Custom Nodes

#### In Workflow Editor

1. Open or create a workflow
2. Look for custom nodes in the Node Palette
3. Plugin nodes have a "Plugin" badge
4. Drag and drop like any built-in node

#### Node Categories

Custom plugin nodes appear in their designated categories:

- Integration nodes (API calls, webhooks, etc.)
- AI nodes (custom models, processors)
- Data nodes (transformers, validators)
- Utility nodes (helpers, formatters)

#### Configuration

1. Select a custom node in the workflow
2. Configuration panel shows plugin-specific options
3. Fill in required fields
4. Save workflow

## Plugin Marketplace Features

### Search

- **Real-time search**: Results update as you type
- **Search scope**: Searches plugin names and descriptions
- **Clear search**: Click the X or clear the input

### Filters

- **Category filter**: Show only plugins in specific categories
- **Installed filter**: Toggle to show only installed plugins
- **Combined filters**: Use search + category + installed together

### Pagination

- Navigate through multiple pages of plugins
- Page numbers displayed at bottom
- Previous/Next buttons for easy navigation
- Shows current page and total pages

### Plugin Cards

Each plugin card displays:

- **Icon**: Visual identifier (emoji or custom icon)
- **Name**: Plugin title
- **Author**: Plugin creator
- **Version**: Current version number
- **Category**: Plugin category badge
- **Description**: Brief description (3 lines max)
- **Stats**: Downloads and rating (if available)
- **Status**: Installation and activation badges
- **Actions**: Install, Details, Activate/Deactivate, Uninstall

### Installation Progress

During installation, you'll see:

- Progress bar (0-100%)
- Status messages:
  - "Downloading..." - Fetching plugin files
  - "Extracting..." - Unpacking plugin
  - "Installing..." - Setting up components
  - "Completed" - Installation successful
  - "Failed" - Installation error (with message)

## Common Workflows

### Workflow 1: Install and Use a Plugin

```
1. Navigate to Plugins page
2. Search for "HTTP Request"
3. Click "Install" on HTTP Request plugin
4. Wait for installation to complete
5. Go to Workflow Editor
6. Find "HTTP Request" node in Node Palette
7. Drag node to canvas
8. Configure URL and method
9. Connect to other nodes
10. Save and execute workflow
```

### Workflow 2: Upload Custom Plugin

```
1. Navigate to Plugins page
2. Click "Upload Plugin" button
3. Drag your .wfplugin file to upload area
4. Wait for validation and upload
5. Plugin appears in marketplace
6. Automatically installed and activated
7. Custom node available in editor
```

### Workflow 3: Manage Plugin Lifecycle

```
1. Install plugin from marketplace
2. Use in workflows
3. Deactivate when not needed (keeps installed)
4. Reactivate when needed again
5. Uninstall to remove completely
```

## Tips and Best Practices

### For Users

1. **Review Permissions**: Always check required permissions before installing
2. **Check Dependencies**: Ensure you understand what packages will be installed
3. **Read Descriptions**: Understand what the plugin does before installing
4. **Test First**: Try plugins in a test workflow before production use
5. **Keep Updated**: Check for plugin updates regularly (future feature)

### For Workflow Designers

1. **Document Plugin Usage**: Note which plugins your workflows depend on
2. **Version Awareness**: Be aware of plugin versions in production workflows
3. **Fallback Plans**: Have alternatives if a plugin becomes unavailable
4. **Test Thoroughly**: Test workflows with plugins before deployment

### For Administrators

1. **Review Plugins**: Review and approve plugins before team installation
2. **Monitor Usage**: Track which plugins are being used
3. **Security**: Regularly audit installed plugins
4. **Backup**: Backup plugin configurations and settings

## Troubleshooting

### Plugin Won't Install

**Problem**: Installation fails or gets stuck

**Solutions**:

1. Check file format (must be .wfplugin)
2. Verify file size (under 50MB)
3. Check internet connection
4. Review error message in alert
5. Try uploading again
6. Contact plugin author if issue persists

### Custom Node Not Appearing

**Problem**: Installed plugin node doesn't show in Node Palette

**Solutions**:

1. Verify plugin is activated (not just installed)
2. Refresh the page
3. Check browser console for errors
4. Deactivate and reactivate plugin
5. Uninstall and reinstall plugin

### Installation Progress Stuck

**Problem**: Progress bar stops moving

**Solutions**:

1. Wait up to 60 seconds (timeout period)
2. Check network connection
3. Refresh page and check plugin status
4. Try installing again
5. Check server logs if you're an admin

### Search Not Working

**Problem**: Search doesn't return expected results

**Solutions**:

1. Clear search box and try again
2. Check spelling
3. Try different keywords
4. Remove category filters
5. Refresh the page

## Keyboard Shortcuts

Currently, the plugin system uses standard browser shortcuts:

- `Ctrl/Cmd + F`: Focus search box (browser default)
- `Tab`: Navigate between elements
- `Enter`: Confirm actions in dialogs
- `Esc`: Close dialogs

## Accessibility

The plugin system is designed with accessibility in mind:

- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators
- ARIA labels on interactive elements

## Support

For help with plugins:

1. Check this documentation
2. Review plugin-specific README
3. Contact plugin author
4. Report issues on GitHub
5. Ask in community forums

## Next Steps

- Explore the [Plugin Development Guide](./PLUGIN_SYSTEM.md#developing-plugins)
- Learn about [Plugin Architecture](./PLUGIN_SYSTEM.md#architecture)
- Review [API Reference](./PLUGIN_SYSTEM.md#api-reference)
- Check [Security Considerations](./PLUGIN_SYSTEM.md#security-considerations)
