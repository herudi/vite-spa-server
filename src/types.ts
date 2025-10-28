import type { IncomingMessage, ServerResponse } from "node:http";
import type { BuildEnvironment } from "vite";

/**
 * Function to determine if a module should be treated as external
 * @callback ExternalOptionFunction
 * @param {string} source - The import source string
 * @param {string|undefined} importer - The importer file path
 * @param {boolean} isResolved - Whether the import has been resolved
 * @returns {boolean|any} - Return true to treat as external
 */
export type ExternalOption =
  | (string | RegExp)[]
  | string
  | RegExp
  | ((
      source: string,
      importer: string | undefined,
      isResolved: boolean,
    ) => boolean | any);

type ServerType = "express" | "hono" | "nhttp";
/**
 * Configuration options for setting up a Single Page Application (SPA) server.
 * @interface SPAServerOptions
 */
export interface SPAServerOptions {
  /**
   * Entry point file path for the main server.
   * This is typically your main server file.
   * @default
   * "./src/server.ts"
   * or
   * "./src/server.js"
   */
  entry?: string;

  /**
   * Server port configuration.
   * Can be a single port number or separate ports for dev/prod environments
   * @example
   * ```ts
   * port: 3000 // single port
   * port: { dev: 3000, prod: 8080 } // separate ports
   * ```
   */
  port?:
    | number
    | {
        dev?: number;
        prod?: number;
      };

  /**
   * Type of server to use.
   * Built-in options include 'express', 'hono', or 'nhttp',
   * or you can provide a custom server implementation
   * @default
   * "express"
   */
  serverType?: ServerType | ServerTypeFunc;

  /**
   * Custom server type implementation.
   * Use this to define your own server handling logic
   */
  serverTypeFunc?: ServerTypeFunc;

  /**
   * Configuration for external dependencies.
   * Determines which dependencies should be treated as external during bundling
   */
  external?: ExternalOption;

  /**
   * Vite build environment configuration (server only)
   */
  build?: BuildEnvironment;

  /**
   * Runtime environment for the server.
   * Supports 'node', 'deno', or 'bun'
   * @default
   * "node"
   */
  runtime?: "node" | "deno" | "bun";

  /**
   * Whether to build the server script.
   * When true, the server code will be included in the build process
   */
  buildServer?: boolean;

  /**
   * Key-value pairs for area configuration.
   * Used to define different areas/sections of your application
   */
  area?: Record<string, string>;

  /**
   * Base URL path for the application.
   * @example
   * ```ts
   * base: '/app' // Application will be served under /app
   * ```
   */
  base?: string;

  /**
   * Directory containing client-side code.
   * Specifies where your client application files are located
   */
  clientDir?: string;

  /**
   * Type of routing to use in the application.
   * - 'hash': Uses hash-based routing (#/route)
   * - 'browser': Uses HTML5 History API
   * - 'none': No routing
   * @default
   * "browser"
   */
  routerType?: "hash" | "browser" | "none";

  /**
   * Whether to automatically start the server.
   * When true, the server will start immediately after initialization
   * @default
   * true
   */
  startServer?: boolean;
}
export interface ServerScriptOptions extends SPAServerOptions {
  areas: any[];
}
export type NextFunction = (err?: any) => any;
/**
 * Custom server type implementation interface.
 * Used to define server handling logic and script generation.
 * @interface ServerTypeFunc
 */
export type ServerTypeFunc = {
  /**
   * Name identifier for the server type implementation
   */
  name: string;

  /**
   * Generates server script content based on provided options
   * @param {ServerScriptOptions} opts - Server configuration options including areas
   * @returns {string | Promise<string>} Generated server script content
   */
  script(opts: ServerScriptOptions): string | Promise<string>;

  /**
   * HTTP request handler function
   * @param {unknown} app - Server application instance
   * @param {IncomingMessage} req - Node.js HTTP request object
   * @param {ServerResponse} res - Node.js HTTP response object
   * @param {NextFunction} next - Function to pass control to next middleware
   * @returns {void | Promise<void>}
   */
  handle(
    app: unknown,
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ): void | Promise<void>;
};
