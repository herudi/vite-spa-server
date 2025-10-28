import type { ServerResponse, IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";

/**
 * Converts a Node.js IncomingMessage to a Web API Request object.
 * Handles protocol, headers, and body conversion between Node.js and Web APIs.
 *
 * Features:
 * - Converts Node.js headers to Web API Headers format
 * - Handles protocol detection with x-forwarded-proto support
 * - Processes both single and array header values
 * - Streams request body for non-GET/HEAD requests
 * - Maintains proper request method and URL structure
 *
 * @param {IncomingMessage} req - Node.js incoming request object to convert
 * @returns {Promise<Request>} Web API Request object
 *
 * @example
 * ```ts
 * // Convert Node.js request to Web API Request
 * const webRequest = await createRequestFromIncoming(nodeRequest);
 *
 * // Use with fetch API compatible handlers
 * const response = await handler(webRequest);
 * ```
 */
export const createRequestFromIncoming = async (
  req: IncomingMessage,
): Promise<Request> => {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost:3000";
  const url = `${protocol}://${host}${req.url || "/"}`;
  const init = {} as RequestInit;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((val) => headers.append(key, val));
      } else {
        headers.append(key, value);
      }
    }
  }
  init.headers = headers;
  init.method = req.method || "GET";
  if (!["GET", "HEAD"].includes(init.method)) {
    init.body = await new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }
  return new Request(url, init);
};

/**
 * Streams a Web API Response to a Node.js ServerResponse
 * Handles header conversion and body streaming between Web and Node.js APIs.
 *
 * @param {Response} resWeb - Web API Response object to stream from
 * @param {ServerResponse} res - Node.js ServerResponse object to stream to
 * @returns {Promise<void>}
 *
 * Features:
 * - Converts Web API headers to Node.js compatible format
 * - Handles single and multiple header values
 * - Streams response body in chunks
 * - Maintains proper response status codes
 *
 * @example
 * ```ts
 * const webResponse = new Response('Hello World', {
 *   status: 200,
 *   headers: { 'Content-Type': 'text/plain' }
 * });
 *
 * await sendStream(webResponse, nodeResponse);
 * ```
 */
export const sendStream = async (
  resWeb: Response,
  res: ServerResponse,
): Promise<void> => {
  const headers = {} as Record<string, string | string[]>;
  resWeb.headers.forEach((val, key) => {
    if (key in headers) {
      if (Array.isArray(headers[key])) {
        headers[key].push(val);
      } else {
        const prev = headers[key];
        headers[key] = [prev, val];
      }
    } else {
      headers[key] = val;
    }
  });
  res.writeHead(resWeb.status, headers);
  if (resWeb.body) {
    for await (const chunk of resWeb.body as any) res.write(chunk);
  }
  res.end();
};

export class StringBuilder {
  private _str: string = "";
  append(str: string) {
    this._str += `${str}\n`;
  }
  toString() {
    return this._str;
  }
}
