import type { ServerTypeFunc } from "../types";
import { StringBuilder } from "./util";

/**
 * Express.js server implementation for SPA server.
 * Provides static file serving and SPA routing capabilities.
 *
 * Features:
 * - Static file serving for client assets
 * - SPA route handling with HTML5 history support
 * - Area-based routing configuration
 * - Main path redirection
 * - Wildcard route support
 *
 * @example
 * ```ts
 * import { spaServer, expressServer } from 'vite-spa-server'
 *
 * export default {
 *   plugins: [
 *     spaServer({
 *       serverType: expressServer,
 *       port: 3000
 *     })
 *   ]
 * }
 * ```
 */
export const expressServer: ServerTypeFunc = {
  name: "express",
  script({ port, clientDir, areas, startServer }) {
    const sb = new StringBuilder();
    sb.append(`import app from "./app.js";`);
    sb.append(`import express from "express";`);
    sb.append(`import path from "node:path";`);
    sb.append(
      `const clientPath = new URL("./${clientDir}", import.meta.url).pathname;`,
    );
    sb.append(
      areas
        .map(({ path, index, isMain, dir, wildcard }) => {
          const str = new StringBuilder();
          if (isMain && path !== "/") {
            str.append(`app.get("/", (_, res) => res.redirect("${path}"));`);
          }
          str.append(
            `app.use("${path}", express.static(clientPath + "${dir}", { index: "${index}" }));`,
          );
          const check = wildcard
            ? `req.path.startsWith("${path}")`
            : `req.path === "${path}"`;
          str.append(`app.use((req, res, next) => {
  if (req.method === "GET" && ${check}) {
    res.sendFile(path.join(clientPath, ".${dir}/${index}"));
  } else {
    next();
  }
});`);
          return str.toString();
        })
        .join(""),
    );
    if (startServer) {
      sb.append(
        `app.listen(${port}, () => console.log("Running on port ${port}"));`,
      );
    } else {
      sb.append(`export default app;`);
    }
    return sb.toString();
  },
  async handle(app, req, res, next) {
    await app(req, res, next);
  },
};
