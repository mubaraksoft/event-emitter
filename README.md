[![npm version](https://img.shields.io/npm/v/%40mubaraksoft%2Fevent-emitter.svg)](https://www.npmjs.com/package/@mubaraksoft/event-emitter)
[![npm downloads](https://img.shields.io/npm/dm/%40mubaraksoft%2Fevent-emitter.svg)](https://www.npmjs.com/package/@mubaraksoft/event-emitter)
[![bundle size](https://img.shields.io/bundlephobia/minzip/%40mubaraksoft%2Fevent-emitter?label=minzipped)](https://bundlephobia.com/package/@mubaraksoft/event-emitter)
[![build](https://img.shields.io/github/actions/workflow/status/your-org/event-emitter/release.yml?branch=main)](https://github.com/your-org/event-emitter/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

A tiny, zero-dependency, **strongly typed** event emitter built on `EventTarget`, with
**namespaces** and **user-supplied event maps** for end-to-end type safety.

- ✨ Generic: bring your own `EventMap` (`Record<EventName, Payload>`).
- 🔒 Type-safe listeners & dispatchers (payloads matched to event name).
- 🧩 Namespaces via `AbortController` for scoped add/remove.
- 📦 ESM + CJS + types, bundled with **tsdown**.
- 🚀 Auto versioning & releases via **semantic-release**.

---

## Install

```bash
npm i @mubaraksoft/event-emitter
# or
pnpm add @mubaraksoft/event-emitter
# or
yarn add @mubaraksoft/event-emitter
```
