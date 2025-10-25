import { describe, it, expect, vi } from "vitest";
import { spaServer } from "../src/index.js";
import type { PluginOption, BuildOptions } from "vite";
import type { SPAServerOptions } from "../src/types.js";

describe("spaServer", () => {
  it("should create plugin with default options", () => {
    const plugins = spaServer() as any[];
    expect(plugins).toHaveLength(2);
    expect(plugins[0].name).toBe("vite-spa-server-build");
    expect(plugins[1].name).toBe("vite-spa-server");
  });

  it("should set default values when no options provided", () => {
    const plugins = spaServer() as PluginOption[];
    const buildPlugin = plugins[0] as { name: string; apply: string };
    expect(buildPlugin.apply).toBe("build");
  });

  it("should handle custom server type", () => {
    const customServer = {
      name: "custom",
      script: vi.fn(),
      handle: vi.fn(),
    };
    const plugins = spaServer({
      serverType: customServer,
    }) as PluginOption[];
    expect(plugins).toHaveLength(2);
  });

  it("should handle port configuration", () => {
    const devPort = 3000;
    const prodPort = 8080;
    const plugins = spaServer({
      port: {
        dev: devPort,
        prod: prodPort,
      },
    }) as PluginOption[];
    const devPlugin = plugins[1] as any;
    const config = devPlugin.config({});
    expect(config.server.port).toBe(devPort);
  });

  it("should handle area configuration", () => {
    const area = {
      "/": "index.html",
      "/about": "about.html",
    };
    const plugins = spaServer({
      area,
    }) as PluginOption[];
    const buildPlugin = plugins[0] as any;
    const config = buildPlugin.config({
      build: {} as BuildOptions,
    });
    expect(config.build.rollupOptions.input).toBeDefined();
  });

  it("should handle base URL configuration", () => {
    const base = "/app";
    const plugins = spaServer({
      base,
    }) as PluginOption[];
    const devPlugin = plugins[1] as any;
    const config = devPlugin.config({});
    expect(config.base).toBe(base);
  });

  it("should set default router type to browser", () => {
    const options: SPAServerOptions = {};
    spaServer(options);
    expect(options.routerType).toBe("browser");
  });

  it("should set default runtime to node", () => {
    const options: SPAServerOptions = {};
    spaServer(options);
    expect(options.runtime).toBe("node");
  });

  it("should handle custom entry point", () => {
    const entry = "./src/custom/server.ts";
    const options: SPAServerOptions = { entry };
    spaServer(options);
    expect(options.entry).toBe(entry);
  });
});
