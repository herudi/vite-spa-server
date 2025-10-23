import type { ServerTypeFunc, ServerScriptOptions } from "../types.js";
import {
  createRequestFromIncoming,
  sendStream,
  StringBuilder,
} from "./util.js";

const createStatic = ({ clientDir, routes }: ServerScriptOptions) => {
  const init = new StringBuilder();
  init.append(`import { etag } from "hono/etag";`);
  init.append(`import fs from "node:fs";`);
  init.append(`import path from "node:path";`);
  init.append(
    `const clientPath = new URL("./${clientDir}", import.meta.url).pathname;`,
  );
  init.append(
    routes
      .map(({ path, index, isMain, dir }, i) => {
        const str = new StringBuilder();
        if (isMain && path !== "/") {
          str.append(`app.get("/", (c) => c.redirect("${path}"));`);
        }
        str.append(`const setServeStatic${i} = (serveStatic) => {
  app.use(
    "${path === "/" ? "" : path}/*",
    etag(),
    serveStatic({
      root: clientPath + "${dir}",
      index: "${index}",
      rewriteRequestPath: (path) => path.replace("${path}", "/")
    })
  );
  app.get("${path === "/" ? "" : path}/*", etag(), (c) => {
    const pathfile = path.join(clientPath, ".${dir}/${index}");
    const html = fs.readFileSync(pathfile, { encoding: "utf-8" });
    return c.html(html);
  });
}`);
        str.append(`setServeStatic${i}(serveStatic);`);
        return str.toString();
      })
      .join(""),
  );
  return init.toString();
};

const withRuntime = ({ port, clientDir, routes }: ServerScriptOptions) => {
  return {
    node: () => {
      const sb = new StringBuilder();
      sb.append(`import app from "./app.js";`);
      sb.append(`import { serve } from "@hono/node-server";`);
      sb.append(
        `import { serveStatic } from "@hono/node-server/serve-static";`,
      );
      sb.append(createStatic({ clientDir, routes }));
      sb.append(`serve({ fetch: app.fetch, port: ${port} });`);
      sb.append(`console.log("Running on port ${port}");`);
      return sb.toString();
    },
    bun: () => {
      const sb = new StringBuilder();
      sb.append(`import app from "./app.js";`);
      sb.append(`import { serveStatic } from "hono/bun";`);
      sb.append(createStatic({ clientDir, routes }));
      sb.append(`Bun.serve({ fetch: app.fetch, port: ${port} });`);
      sb.append(`console.log("Running on port ${port}");`);
      return sb.toString();
    },
    deno: () => {
      const sb = new StringBuilder();
      sb.append(`import app from "./app.js";`);
      sb.append(`import { serveStatic } from "hono/deno";`);
      sb.append(createStatic({ clientDir, routes }));
      sb.append(
        `Deno.serve({ onListen: () => console.log("Running on port ${port}"), port: ${port} }, app.fetch);`,
      );
      return sb.toString();
    },
  };
};

export const honoServer: ServerTypeFunc = {
  name: "hono",
  script(opts) {
    return withRuntime(opts)[opts.runtime!]?.() ?? "";
  },
  async handle(app, req, res, next) {
    const resWeb = (await app.fetch(
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
