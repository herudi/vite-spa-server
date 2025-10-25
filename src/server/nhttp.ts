import type { ServerTypeFunc } from "../types.js";
import {
  createRequestFromIncoming,
  sendStream,
  StringBuilder,
} from "./util.js";

/**
 * nhttp web server implementation for SPA server.
 * Lightweight HTTP server with static file serving and routing capabilities.
 *
 *
 * Features:
 * - Static file serving with ETag support
 * - SPA routing with HTML5 history
 * - Area-based routing configuration
 * - Main path redirection
 * - Automatic server initialization
 * - Optimized file sending with sendFile utility
 *
 * @example
 * ```ts
 * import { spaServer, nhttpServer } from 'vite-spa-server'
 *
 * export default {
 *   plugins: [
 *     spaServer({
 *       serverType: nhttpServer,
 *       port: 3000
 *     })
 *   ]
 * }
 * ```
 */
export const nhttpServer: ServerTypeFunc = {
  name: "nhttp",
  script({ port, clientDir, areas, startServer }) {
    const sb = new StringBuilder();
    sb.append(`import app from "./app.js";`);
    sb.append(`import path from "node:path";`);
    sb.append(
      `import { serveStatic, sendFile } from "@nhttp/nhttp/serve-static";`,
    );
    sb.append(
      `const clientPath = new URL("./${clientDir}", import.meta.url).pathname;`,
    );
    sb.append(
      areas
        .map(({ path, index, isMain, dir, wildcard }) => {
          const str = new StringBuilder();
          if (isMain && path !== "/") {
            str.append(
              `app.get("/", (rev) => rev.response.redirect("${path}"));`,
            );
          }
          str.append(
            `app.use(serveStatic(clientPath + "${dir}", { index: "${index}", etag: true, prefix: "${path}" }));`,
          );
          const wild = wildcard ? "*" : "";
          const routePath = path + (path === "/" ? "" : "/") + wild;
          str.append(`app.get("${routePath}", async (rev) => {
  const pathfile = path.join(clientPath, ".${dir}/${index}");
  return await sendFile(rev, pathfile, { etag: true });
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
    const resWeb = (await app.handleRequest(
      await createRequestFromIncoming(req),
    )) as Response;
    if (resWeb.status === 404) {
      const SPAServer = resWeb.headers.get("spa-server");
      if (!(SPAServer && SPAServer === "false")) {
        return next();
      }
    }
    await sendStream(resWeb, res);
  },
};
