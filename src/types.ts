import type { IncomingMessage, ServerResponse } from "node:http";
import type { BuildEnvironment } from "vite";

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
export interface SPAServerOptions {
  entry?: string;
  port?:
    | number
    | {
        dev?: number;
        prod?: number;
      };
  serverType?: ServerType | ServerTypeFunc;
  serverTypeFunc?: ServerTypeFunc;
  external?: ExternalOption;
  build?: BuildEnvironment;
  runtime?: "node" | "deno" | "bun";
  buildServer?: boolean;
  area?: Record<string, string>;
  base?: string;
  clientDir?: string;
}
export interface ServerScriptOptions extends SPAServerOptions {
  routes: any[];
}
export type NextFunction = (err?: any) => any;
export type ServerTypeFunc = {
  name: string;
  script(opts: ServerScriptOptions): string | Promise<string>;
  handle(
    app: any,
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ): void | Promise<void>;
};
