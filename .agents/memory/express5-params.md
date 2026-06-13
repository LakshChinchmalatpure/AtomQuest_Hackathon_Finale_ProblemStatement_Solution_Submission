---
name: Express 5 route params typing
description: Express 5 types req.params values as string | string[], which breaks drizzle-orm eq()
---

In Express 5 with @types/express ^5.x, `req.params` values are typed as `string | string[]`, not `string`. This causes TypeScript errors when passing them to drizzle-orm's `eq()`:

```
Argument of type 'string | string[]' is not assignable to parameter of type 'string | SQLWrapper'
```

**Fix:** Always coerce params before use:
```ts
const sessionId = String(req.params.sessionId);
// or
const { sessionId } = req.params as { sessionId: string };
```

**Why:** The type reflects that query strings can have multiple values, but route params are always single strings at runtime. Drizzle's eq() only accepts string | SQLWrapper.

**How to apply:** Any time you destructure from req.params and pass to drizzle eq() in Express 5.
