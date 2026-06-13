---
name: AtomQuest Vite Polyfills
description: How to make simple-peer and socket.io-client work in Vite without global/events/util errors
---

simple-peer is a legacy CJS package that references `global`, `Buffer`, `process`, `events.EventEmitter`, and `util.debuglog`. In a Vite browser context these are undefined.

**Fix:** Install `vite-plugin-node-polyfills` and configure it in vite.config.ts:

```ts
import { nodePolyfills } from "vite-plugin-node-polyfills";

// In plugins array:
nodePolyfills({
  globals: { global: true, Buffer: true, process: true },
  include: ["events", "util", "buffer", "stream", "path"]
})
```

Also add `define: { global: "globalThis" }` to the vite config for belt-and-suspenders.

**Why:** `global: "globalThis"` alone fixes the initial `global is not defined` crash but socket.io-client still throws console warnings about `events.EventEmitter` and `util.debuglog`. The module-level polyfills fix those too.

**How to apply:** Whenever adding simple-peer, socket.io-client, or other legacy Node.js packages to a Vite frontend.
