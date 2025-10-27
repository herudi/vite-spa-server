import { type PluginOption, build } from "vite";
import fs from "node:fs";
import fw from "./server/index.js";
import type { SPAServerOptions } from "./types.js";
import path from "node:path";

const devServer = (opts: SPAServerOptions = {}): PluginOption => {
  const areas = opts["_areas"];
  return {
    name: "vite-spa-server",
    apply: "serve",
    config(self) {
      self.server ??= {};
      const port = opts.port;
      if (port != null) {
        self.server.port = typeof port === "object" ? port.dev : port;
      }
      opts.base = self.base = findBase(areas) ?? opts.base;
      return self;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (areas) {
          const isAsset = (reqPath: string) =>
            reqPath.includes("@") || path.extname(reqPath);
          const url = req.url;
          const reqPath = normUrl(url);
          const area = areas.find(({ path, wildcard }) => {
            return (
              reqPath === path ||
              (path !== "/" && wildcard && reqPath.startsWith(path))
            );
          });
          if (area && !isAsset(reqPath)) {
            const file = fs.readFileSync(area.index, { encoding: "utf-8" });
            const result = await server.transformIndexHtml(url, file);
            return res.setHeader("Content-Type", "text/html").end(result);
          }
        }
        const mod = await server.ssrLoadModule(opts.entry!);
        const app = mod.default;
        app.viteDevServer = server;
        await opts.serverTypeFunc.handle(app, req, res, next);
      });
    },
  };
};

const buildServer = (opts: SPAServerOptions = {}): PluginOption => {
  let outDir: string, base: string, root: string;
  opts.clientDir ??= "client";
  opts.startServer ??= true;
  const _areas = opts["_areas"] as Record<string, any>[];
  return {
    name: "vite-spa-server-build",
    apply: "build",
    configResolved(config) {
      base = normUrl(config.base || "/");
      root = config.root;
    },
    config(self) {
      self.build ??= {};
      outDir = self.build.outDir ?? "dist";
      self.build.outDir = `${outDir}/${opts.clientDir}`;
      self.build.emptyOutDir = true;
      if (opts.area) {
        self.build ??= {};
        self.build.rollupOptions ??= {};
        self.build.rollupOptions.input = mutateArea(_areas);
      }
      if (opts.base) self.base = opts.base;
      return self;
    },
    async writeBundle() {
      let port = opts.port ?? 3000;
      if (typeof port === "object") port = port.prod ?? 3000;
      opts.base ??= base;
      await build({
        configFile: false,
        build: {
          outDir: outDir,
          ssr: true,
          emptyOutDir: false,
          rollupOptions: {
            input: {
              app: opts.entry!,
            },
            external: opts.external,
          },
          copyPublicDir: false,
          ...(opts.build ?? {}),
        },
      });
      if (opts.buildServer === false) return;
      const wildcard = opts.routerType === "browser";
      let areas = [
        {
          route: opts.base,
          path: opts.base,
          index: "index.html",
          isMain: true,
          dir: "",
          wildcard,
        },
      ] as any[];
      if (_areas) {
        opts.base = findBase(_areas) ?? opts.base;
        areas = _areas.map((el) => {
          let val = el.index;
          if (!path.isAbsolute(val)) val = path.join(root, val);
          if (!fs.existsSync(val)) {
            throw new Error(`file '${val}' not found`);
          }
          const dir = path.dirname(val).replace(root, "");
          const index = path.basename(val);
          const isMain = el.path === opts.base;
          return { ...el, isMain, dir, index };
        });
      }
      fs.writeFileSync(
        `${outDir}/index.js`,
        await opts.serverTypeFunc.script({ ...opts, port, areas }),
      );
      console.log(`Server builded to ${outDir}/index.js`);
    },
  };
};

/**
 * Creates a Vite plugin for Single Page Application (SPA) server setup.
 * Handles both development and production server configurations.
 *
 * @param {SPAServerOptions} opts - Configuration options for the SPA server
 * @returns {PluginOption} Array of Vite plugins for build and dev server
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { spaServer } from 'vite-spa-server'
 *
 * export default defineConfig({
 *   plugins: [
 *     spaServer({
 *       entry: './src/server/index.ts',
 *       port: 3000,
 *       serverType: 'express'
 *     })
 *   ]
 * })
 * ```
 *
 * Features:
 * - Supports multiple server types (express, hono, nhttp)
 * - Handles both dev and production builds
 * - Configurable routing types (hash, browser)
 * - Area-based configuration for multi-page setups
 * - Automatic server initialization
 * - Custom server type implementation support
 */
export const spaServer = (opts: SPAServerOptions = {}): PluginOption => {
  opts.entry ??= "./src/server/index.ts";
  const typ = (opts.serverType ??= "express");
  opts.runtime ??= "node";
  opts.serverTypeFunc ??= typeof typ === "string" ? fw[typ] : typ;
  opts.routerType ??= "browser";
  if (opts.area) {
    const area = opts.area;
    opts["_areas"] = Object.keys(area)
      .sort((a, b) => b.length - a.length)
      .sort((a, b) => b.split("/").length - a.split("/").length)
      .map((el) => {
        const isWild = el.endsWith("*");
        return {
          path: isWild ? el.slice(0, el === "/*" ? -1 : -2) : el,
          route: el,
          index: area[el],
          wildcard: opts.routerType === "browser" || isWild,
        };
      });
  }
  return [buildServer(opts), devServer(opts)];
};

const normUrl = (url: string) => {
  if (url.includes("?")) url = url.split("?")[0];
  if (url !== "/" && url.endsWith("/")) url = url.slice(0, -1);
  return url;
};

const findBase = (areas?: Record<string, string>[]) => {
  if (areas) {
    const base = areas.find(({ path }) => path === "/");
    return base?.path ?? areas[0]?.path;
  }
  return null;
};

const mutateArea = (areas: Record<string, any>[]) => {
  const out = {} as Record<string, string>;
  areas.forEach((el) => {
    const k = el.path;
    if (k === "/") {
      out.index = el.index;
    } else if (k.includes("/")) {
      out[k.replaceAll("/", "")] = el.index;
    } else {
      out[k] = el.index;
    }
  });
  return out;
};

export type {
  SPAServerOptions,
  ExternalOption,
  NextFunction,
  ServerTypeFunc,
  ServerScriptOptions,
} from "./types.js";

export { createRequestFromIncoming, sendStream } from "./server/util.js";
export { honoServer } from "./server/hono.js";
export { expressServer } from "./server/express.js";
export { nhttpServer } from "./server/nhttp.js";

export default spaServer;
