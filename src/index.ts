import { type PluginOption, build } from "vite";
import fs from "node:fs";
import fw from "./server/index.js";
import type { SPAServerOptions } from "./types.js";
import path from "node:path";

const devServer = (opts: SPAServerOptions = {}): PluginOption => {
  const area = normArea(opts.area);
  return {
    name: "vite-spa-server",
    apply: "serve",
    config(self) {
      self.server ??= {};
      const port = opts.port;
      if (port != null) {
        self.server.port = typeof port === "object" ? port.dev : port;
      }
      if (area && !(opts.base in area)) {
        opts.base = findBase(area) ?? opts.base;
      }
      if (opts.base) self.base = opts.base;
      return self;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (area) {
          const isAsset = (reqPath: string) => {
            return reqPath.includes("@") || path.extname(reqPath);
          };
          const url = req.url;
          const reqPath = normUrl(url);
          const pathFile = area[reqPath];
          const send = async (url: string, pathFile: string) => {
            const file = fs.readFileSync(pathFile, { encoding: "utf-8" });
            const result = await server.transformIndexHtml(url, file);
            return res.setHeader("Content-Type", "text/html").end(result);
          };
          if (pathFile) {
            return await send(reqPath, pathFile);
          } else if (!isAsset(reqPath)) {
            const find = Object.keys(area).find((p) => reqPath.startsWith(p));
            if (find) return await send(reqPath, area[find]);
          }
        }
        const mod = await server.ssrLoadModule(opts.entry!);
        await opts.serverTypeFunc.handle(mod.default, req, res, next);
      });
    },
  };
};

const buildServer = (opts: SPAServerOptions = {}): PluginOption => {
  let outDir: string, base: string, root: string;
  opts.clientDir ??= "client";
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
        self.build.rollupOptions.input = mutateArea(normArea(opts.area));
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
      const areas = [],
        wildcard = opts.routerType === "browser";
      let home: Record<string, any>;
      if (opts.area) {
        const area = normArea(opts.area);
        if (!(opts.base in area)) {
          opts.base = findBase(area) ?? opts.base;
        }
        for (const k in opts.area) {
          let val = opts.area[k];
          if (!path.isAbsolute(val)) val = path.join(root, val);
          if (!fs.existsSync(val)) {
            throw new Error(`file '${val}' not found`);
          }
          const dir = path.dirname(val).replace(root, "");
          const index = path.basename(val);
          const isWild = k.endsWith("*");
          const p = isWild ? k.slice(0, k === "/*" ? -1 : -2) : k;
          const isMain = p === opts.base;
          const data = {
            path: p,
            index,
            isMain,
            dir,
            wildcard: wildcard || isWild,
          };
          if (isMain) home = data;
          else areas.push(data);
        }
        if (home) areas.push(home);
      } else {
        areas.push({
          path: opts.base,
          index: "index.html",
          isMain: true,
          dir: "",
          wildcard,
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

export const spaServer = (opts: SPAServerOptions = {}): PluginOption => {
  opts.entry ??= "./src/server/index.ts";
  const typ = (opts.serverType ??= "express");
  opts.runtime ??= "node";
  opts.serverTypeFunc ??= typeof typ === "string" ? fw[typ] : typ;
  opts.routerType ??= "browser";
  return [buildServer(opts), devServer(opts)];
};

const normUrl = (url: string) => {
  if (url.includes("?")) url = url.split("?")[0];
  if (url !== "/" && url.endsWith("/")) url = url.slice(0, -1);
  return url;
};

const findBase = (area: Record<string, string>) => {
  const keys = Object.keys(area);
  return keys.find((el) => el === "/") || keys[0];
};

const normArea = (area: Record<string, string>) => {
  if (!area) return null;
  const out = {};
  for (const k in area) {
    const isWild = k.endsWith("*");
    const p = isWild ? k.slice(0, k === "/*" ? -1 : -2) : k;
    out[p] = area[k];
  }
  return out;
};

const mutateArea = (area: Record<string, string>) => {
  const out = {} as Record<string, string>;
  for (const k in area) {
    const val = area[k];
    if (k === "/") {
      out.index = val;
    } else if (k.includes("/")) {
      out[k.replaceAll("/", "")] = val;
    } else {
      out[k] = val;
    }
  }
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
