# Vite SPA Server

Vite plugin <i>Single-Port</i> between Backend and Frontend.

> Design for Single Fighter Developer who want to build Fullstack Application with ease.

[![ci](https://img.shields.io/github/actions/workflow/status/herudi/vite-spa-server/ci.yml?branch=master)](https://github.com/herudi/vite-spa-server)
[![npm version](https://img.shields.io/badge/npm-0.0.7-blue.svg)](https://npmjs.org/package/vite-spa-server)
[![License](https://img.shields.io/:license-mit-blue.svg)](http://badges.mit-license.org)
[![download-url](https://img.shields.io/npm/dm/vite-spa-server.svg)](https://npmjs.org/package/vite-spa-server)

## Features

- <i>Single-Port</i> for Backend and Frontend.
- Sharing `types` between Backend and Frontend.
- Supports backend frameworks (Express, Hono, NHttp, etc.).
- Hot Module Replacement (HMR) for Frontend during development.
- Easy integration with existing Vite projects (React, Vue, Svelte, etc.).
- Simple configuration.
- Multiple apps using config `area`.

## Why use Vite SPA Server?

When developing a Single Page Application (SPA) with a backend API, managing separate ports for the frontend and backend can be cumbersome. Vite SPA Server simplifies this by allowing both to run on a single port, streamlining development and reducing configuration overhead.

## Usage

Create vite project.

> Example: React as frontend and Express as backend.

```bash
npm create vite@latest my-app -- --template react

cd my-app

npm install
```

then, install `vite-spa-server` and `express`

```bash
npm install vite-spa-server --save-dev

npm install express
```

In your `vite.config.ts` file, import and use the plugin:

```javascript
import { defineConfig } from "vite";
import spaServer from "vite-spa-server";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    spaServer({
      port: 3000,
      serverType: "express",
    }),
  ],
});
```

then, create minimal server at `src/server/index.ts`:

```javascript
import express from "express";

const app = express();

// you can call this route in the frontend with same port like fetch("/api/user").
app.get("/api/user", (req, res) => {
  res.json({
    name: "John",
    message: "Hello from the backend!",
  });
});

export default app;
```

now, you can run your Vite development server:

```bash
npm run dev
```

build for production:

```bash
npm run build
```

run production server:

```bash
node dist
```

## Configuration Options

- `port`: The port number on which the server will run.
- `serverType`: The type of backend server to use (e.g., `express`, `hono`, `nhttp`, etc.).
- `entry`: The entry point file for your backend server (default: `./src/server/index.ts`).
- `runtime`: The runtime environment for the server (default: `node`).
- `build`: Build options for the server.
- `area`: Map path to html for multiple apps.
- `routerType`: Router Type between Backend and Frontend (e.g., `browser`, `hash`, `none`).
- `startServer`: When true, the server will start immediately after initialization. when false, just export your app.

## Handle 404 for API

```ts
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    res.header("spa-server", "false").status(404);
    return res.send({ error: "API endpoint not found" });
  }
  next();
});
```

## Multiple Apps using area

```ts
export default defineConfig({
  plugins: [
    react(),
    spaServer({
      port: 3000,
      serverType: "express",
      area: {
        "/": "./index.html",
        "/admin": "./admin.html",
        "/sign": "./sign.html",
        // more...
      },
    }),
  ],
});
```

## License

[MIT](LICENSE)
