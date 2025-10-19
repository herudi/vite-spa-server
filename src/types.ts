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

export type SPAServerOptions = {
  entry?: string;
  port?:
    | number
    | {
        dev?: number;
        prod?: number;
      };
  serverType?: "express" | "hono" | "nhttp";
  external?: ExternalOption;
  build?: BuildEnvironment;
  runtime?: "node" | "deno" | "bun";
  buildServer?: boolean;
};
export type NextFunction = (err?: any) => any;
export type ServerTypeFunc = {
  inject(opts: SPAServerOptions): string | Promise<string>;
  serve(
    app: any,
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ): void | Promise<void>;
};
