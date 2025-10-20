import type { ServerTypeFunc } from "../types";

export const expressServer: ServerTypeFunc = {
  name: "express",
  script({ port }) {
    return `import app from "./app.js"; 
import express from "express"; 
import path from "node:path";
const clientPath = new URL("./client", import.meta.url).pathname;
app.use(express.static(clientPath));
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.sendFile(path.join(clientPath, "index.html"));
  } else {
    next();
  }
});
app.listen(${port}, () => console.log("Running on port ${port}"));`;
  },
  async handle(app, req, res, next) {
    await app(req, res, next);
  },
};
