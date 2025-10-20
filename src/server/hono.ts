import type { ServerTypeFunc } from "../types.js";
import { createRequestFromIncoming, sendStream } from "./util.js";

const withRuntime = (port: number) => {
  return {
    node: `import app from "./app.js";
import { serve } from "@hono/node-server";
import fs from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
const clientPath = new URL("./client", import.meta.url).pathname;
app.use("*", serveStatic({ root: clientPath }));
app.get("*", (c) => {
  const html = fs.readFileSync(clientPath + "/index.html", { encoding: "utf-8" });
  return c.html(html);
});
serve({
  fetch: app.fetch,
  port: ${port},
});
console.log("Running on port ${port}");`,
    bun: `import app from "./app.js";
import { serveStatic } from "hono/bun";
const clientPath = new URL("./client", import.meta.url).pathname;
app.use("*", serveStatic({ root: clientPath }));
app.get("*", async (c) => {
  const html = await Bun.file(clientPath + "/index.html").text();
  return c.html(html);
});
Bun.serve({
  fetch: app.fetch,
  port: ${port}
});
console.log("Running on port ${port}");`,
    deno: `import app from "./app.js";
import { serveStatic } from "hono/deno";
const clientPath = new URL("./client", import.meta.url).pathname;
app.use("*", serveStatic({ root: clientPath }));
app.get("*", async (c) => {
  const html = await Deno.readTextFile(clientPath + "/index.html");
  return c.html(html);
});
Deno.serve({
  port: ${port},
  onListen: () => console.log("Running on port ${port}")
}, app.fetch);`,
  };
};

export const honoServer: ServerTypeFunc = {
  name: "hono",
  script({ port, runtime }) {
    return withRuntime(port as number)[runtime!];
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
