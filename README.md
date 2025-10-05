[![npm version](https://img.shields.io/npm/v/%40mubaraksoft%2Fevent-emitter.svg)](https://www.npmjs.com/package/@mubaraksoft/event-emitter)
[![npm downloads](https://img.shields.io/npm/dm/%40mubaraksoft%2Fevent-emitter.svg)](https://www.npmjs.com/package/@mubaraksoft/event-emitter)
[![bundle size](https://img.shields.io/bundlephobia/minzip/%40mubaraksoft%2Fevent-emitter?label=minzipped)](https://bundlephobia.com/package/@mubaraksoft/event-emitter)
[![build](https://img.shields.io/github/actions/workflow/status/your-org/event-emitter/release.yml?branch=main)](https://github.com/your-org/event-emitter/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

# Event Emitter

A tiny, strongly‑typed wrapper around the Web Platform’s [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) that gives you:

- **End‑to‑end TypeScript types** for event names and payloads
- **Namespaced listeners** with easy cleanup via `AbortController`
- A familiar **`dispatchEvent` / `addEventListener`** API
- Optional **per‑namespace subscriber** hook for observability/devtools

> Works in modern browsers and in Node.js (v16.8+ where `EventTarget` and `AbortController` are available; see [Compatibility](#compatibility)).

---

## Install

```bash
npm i @mubaraksoft/event-emitter
# or
pnpm add @mubaraksoft/event-emitter
# or
yarn add @mubaraksoft/event-emitter
```

No runtime dependencies.

---

## Quick Start

Define your event map once, get type‑safe emitters and listeners everywhere.

```ts
// 1) Define your event map (name -> payload)
export type AppEvents = {
  "user:login": { id: string; email: string };
  "toast:show": { message: string; level?: "info" | "warn" | "error" };
  "counter:changed": { value: number };
};

// 2) Create an emitter
const bus = new EventEmitter<AppEvents>();

// 3) Add a listener (fully typed)
const off = bus.addEventListener({
  name: "counter:changed",
  callback: (e) => {
    // e is CustomEvent<{ value: number } & { eventName?: "counter:changed" }>
    console.log("count is", e.detail.value, "from", e.detail.eventName);
  },
});

// 4) Dispatch an event (payload is validated by TS)
bus.dispatchEvent({ name: "counter:changed", payload: { value: 2 } });
```

---

## Why this package?

`EventTarget` is great but untyped. This library layers **type safety** and **ergonomics** without reinventing the wheel:

- You keep `CustomEvent` semantics, bubbling model, and browser performance.
- You gain compile‑time checking of **event names** and **payload shapes**.
- You get **namespaces** for grouping listeners and cleaning them up in one go.

---

## Namespaces & Cleanup

Group listeners by a string `namespace` and dispose them all at once.

```ts
const authNS = bus.namespace("auth"); // same underlying bus

const listeners = authNS.addEventsListener({
  names: ["user:login", "toast:show"],
  callback: (e) => {
    // typed as union of the selected events
  },
});

// Later: remove a single listener
authNS.removeEventListener(listeners[0]);

// Or nuke the whole namespace (uses AbortController under the hood)
authNS.removeAllListeners();
```

> `EventEmitter#removeAllListeners(namespace?)` aborts the internal `AbortController` for that namespace, detaching all listeners registered with it.

---

## Subscriber hook (observability)

Use a per‑namespace subscriber to observe **every dispatch** going through that namespaced emitter—great for logging or devtools.

```ts
const log = bus.namespace("log", (evt) => {
  // evt: { name: keyof AppEvents; payload?: AppEvents[keyof AppEvents] }
  console.debug("dispatched:", evt.name, evt.payload);
});

log.dispatchEvent({ name: "toast:show", payload: { message: "Saved" } });
```

> The subscriber runs **after** the event has been dispatched on the underlying `EventTarget`.

---

## Strong typing end‑to‑end

- `dispatchEvent` validates **name** and **payload**.
- Listener `callback` receives `CustomEvent<Payload & { eventName?: Name }>`
- `addEventsListener` infers a union of payloads when you listen to multiple names.

```ts
bus.addEventListener({
  name: "toast:show",
  callback: (e) => {
    // e.detail.level is "info" | "warn" | "error" | undefined
  },
});

// ❌ Type error – missing required payload property
bus.dispatchEvent({ name: "counter:changed", payload: {} });
```

---

## API

### Types

```ts
type EventMapBase = Record<string, unknown>;
type EmittedEventName<M> = keyof M & string;

type GenericEventCallback<M, N> = (
  event: CustomEvent<WithEventName<N, M[N]>>
) => void;

type EventListener<M, N = EmittedEventName<M>> = {
  name: N;
  namespace?: string; // default: "global"
  callback?: GenericEventCallback<M, N>;
};

type EventsListener<M> = Omit<EventListener<M>, "name"> & {
  names: EmittedEventName<M>[];
};

type EventDispatcher<M, N = EmittedEventName<M>> = {
  name: N;
  payload?: M[N];
};
```

### `class EventEmitter<M extends EventMapBase>`

- **`addEventListener(listener)`** ⇒ `EventListener<M, N>`

  - Registers a single listener. Optional `namespace` (default `"global"`).

- **`addEventsListener({ names, callback, namespace })`** ⇒ `EventListener<M>[]`

  - Register the same callback for multiple event names.

- **`dispatchEvent({ name, payload })`** ⇒ `void`

  - Dispatches a `CustomEvent(name, { detail })` where `detail` merges the payload with `{ eventName: name }`.

- **`removeEventListener(listener)`** ⇒ `void`

  - Removes a previously added listener.

- **`removeEventListeners(listeners)`** ⇒ `void`

  - Convenience to remove an array of listeners.

- **`removeAllListeners(namespace = "global")`** ⇒ `void`

  - Aborts the namespace’s controller to remove **all** listeners under it.

- **`namespace(name, subscriber?)`** ⇒ `EventEmitterNamespace<M>`

  - Returns a namespaced wrapper sharing the same underlying emitter.

### `class EventEmitterNamespace<M>` implements `IEventEmitter<M>`

A thin façade that automatically injects its `namespace` into calls and optionally invokes `subscriber` on each dispatch.

Methods mirror `EventEmitter`:

- `addEventListener`, `addEventsListener`, `removeEventListener`, `removeEventListeners`, `removeAllListeners`, `dispatchEvent`.

---

## Patterns & Recipes

### Component‑local bus

```ts
export type CounterEvents = { "counter:changed": { value: number } };

export function createCounterBus() {
  return new EventEmitter<CounterEvents>();
}
```

### Feature‑scoped namespaces

```ts
const bus = new EventEmitter<AppEvents>();
const auth = bus.namespace("auth");
const ui = bus.namespace("ui");

ui.addEventListener({ name: "toast:show", callback: showToast });

// teardown
ui.removeAllListeners();
```

### Register many, remove later

```ts
const ns = bus.namespace("page:settings");
const listeners = ns.addEventsListener({
  names: ["toast:show", "counter:changed"],
  callback: (e) => {
    /* ... */
  },
});

// On unmount
ns.removeEventListeners(listeners);
```

### Forward events between emitters

```ts
function forward<M extends EventMapBase>(
  from: EventEmitter<M>,
  to: EventEmitter<M>,
  names: (keyof M & string)[]
) {
  const ns = from.namespace("forward:" + names.join(","));
  ns.addEventsListener({
    names: names as any,
    callback: (e) =>
      to.dispatchEvent({ name: e.detail.eventName as any, payload: e.detail }),
  });
  return () => ns.removeAllListeners();
}
```

---

## Compatibility

- **Browsers:** Modern browsers supporting `EventTarget`, `CustomEvent`, and `AbortController`.
- **Node.js:** v16.8+ (global `EventTarget` & `AbortController`). For older versions, bring a polyfill/shim (e.g. `event-target-shim`) or run in a DOM‑like environment.

This package is framework‑agnostic and has zero deps.

---

## FAQ

**Why is `eventName` included in `detail`?**
It’s convenient in generic handlers and when forwarding/logging. It’s optional and typed as the concrete name that was dispatched.

**Does this support event bubbling or capture?**
It uses a single `EventTarget` without a DOM tree, so bubbling/capture semantics aren’t relevant. You can still build higher‑level patterns if you need them.

**How do I prevent memory leaks?**
Use namespaces and call `removeAllListeners(namespace)` during teardown (e.g., component unmount). Internally we use `AbortController` so all listeners under that namespace detach at once.

**Can I add multiple callbacks to the same name?**
Yes—just call `addEventListener` multiple times.

---

## Exported surface

```ts
export type {
  EventMapBase,
  EmittedEventName,
  GenericEventCallback,
  GenericEventListener as EventListener,
  GenericEventDispatcher as EventDispatcher,
  EventsListener,
  IEventEmitter,
};
export { EventEmitter, EventEmitterNamespace };
```

---

## License

MIT © mubaraksoft
