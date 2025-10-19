import { type PluginOption, build } from "vite";
import fs from "node:fs";
import fw from "./server/index.js";
import type { SPAServerOptions } from "./types.js";

const devServer = (opts: SPAServerOptions = {}): PluginOption => {
  return {
    name: "vite-spa-server",
    apply: "serve",
    config(self) {
      let port = opts.port;
      if (typeof port === "object") port = port.dev;
      return {
        ...self,
        server: { port },
      };
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const mod = await server.ssrLoadModule(opts.entry!);
        await fw[opts.serverType!].serve(mod.default, req, res, next);
      });
    },
  };
};

const buildServer = (opts: SPAServerOptions = {}): PluginOption => {
  let outDir: string;
  return {
    name: "vite-spa-server-build",
    apply: "build",
    config(self) {
      const build = self.build ?? {};
      outDir = build.outDir ?? "dist";
      build.outDir = `${outDir}/client`;
      build.emptyOutDir ??= true;
      return {
        ...self,
        build: build,
      };
    },
    async writeBundle() {
      let port = opts.port ?? 3000;
      if (typeof port === "object") port = port.prod ?? 3000;
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
      fs.writeFileSync(
        `${outDir}/index.js`,
        fw[opts.serverType!].inject({ ...opts, port }),
      );
      console.log(`Server builded to ${outDir}/index.js`);
    },
  };
};

export const spaServer = (opts: SPAServerOptions = {}): PluginOption => {
  opts.entry ??= "./src/server/index.ts";
  opts.serverType ??= "express";
  opts.runtime ??= "node";
  return [buildServer(opts), devServer(opts)];
};

export type { SPAServerOptions };

export default spaServer;
