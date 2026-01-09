// Preload script
// This runs in a sandboxed context with access to a limited Electron API.
// Use contextBridge to expose specific APIs to the renderer if needed.

// For now, this is intentionally minimal.
// Future: expose IPC methods via contextBridge.exposeInMainWorld()

console.log('Preload script loaded');
