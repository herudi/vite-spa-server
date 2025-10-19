# Vite SPA Server

Vite plugin SPA Server with <i>Single-Port</i> beetwen Backend and Frontend.

> Design for Single Fighter Developer who want to build Fullstack Application with ease.

## Features

- <i>Single-Port</i> for Backend and Frontend.
- Sharing `types` between Backend and Frontend.
- Supports multiple backend frameworks (Express, Hono, etc.).
- Hot Module Replacement (HMR) for Frontend during development.
- Easy integration with existing Vite projects (React, Vue, Svelte, etc.).
- Simple configuration.

## Why use Vite SPA Server?

When developing a Single Page Application (SPA) with a backend API, managing separate ports for the frontend and backend can be cumbersome. Vite SPA Server simplifies this by allowing both to run on a single port, streamlining development and reducing configuration overhead.

## Usage

Create vite project (example react).

```bash
npm create vite@latest my-app -- --template react

cd my-app

npm install

npm install vite-spa-server --save-dev
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

then, create minimal server entry point file at `src/server/index.ts`:

```javascript
import express from "express";

const app = express();

// you can call this route in the frontend with same port.
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
- `serverType`: The type of backend server to use (e.g., `express`, `hono`, etc.).
- `entry`: The entry point file for your backend server (default: `src/server/index.ts`).
- `runtime`: The runtime environment for the server (default: `node`).
- `build`: Build options for the server.

## Handle 404 API

```ts
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    res.header("spa-server", "false").status(404);
    return res.send({ error: "API endpoint not found" });
  }
  next();
});
```

## License

[MIT](LICENSE)
