import type { ServerTypeFunc } from "../types.js";
import { createRequestFromIncoming, sendStream } from "./util.js";

export default <ServerTypeFunc>{
  inject({ port }) {
    return `import app from "./app.js";
import serveStatic from "@nhttp/nhttp/serve-static";
const clientPath = new URL("./client", import.meta.url).pathname;
app.use(serveStatic(clientPath, { spa: true, etag: true }));
app.listen(${port}, () => console.log("Running on port ${port}"));`;
  },
  async serve(app, req, res, next) {
    const resWeb = (await app.handleRequest(
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
