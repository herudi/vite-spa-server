import type { ServerTypeFunc } from "../types";

export default <ServerTypeFunc>{
  inject({ port }) {
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
  async serve(app, req, res, next) {
    await app(req, res, next);
  },
};
