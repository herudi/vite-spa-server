import type { ServerResponse, IncomingMessage } from "node:http";

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

export const sendStream = async (resWeb: Response, res: ServerResponse) => {
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
