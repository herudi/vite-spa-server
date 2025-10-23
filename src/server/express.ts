import type { ServerTypeFunc } from "../types";
import { StringBuilder } from "./util";

export const expressServer: ServerTypeFunc = {
  name: "express",
  script({ port, clientDir, routes }) {
    const sb = new StringBuilder();
    sb.append(`import app from "./app.js";`);
    sb.append(`import express from "express";`);
    sb.append(`import path from "node:path";`);
    sb.append(
      `const clientPath = new URL("./${clientDir}", import.meta.url).pathname;`,
    );
    sb.append(
      routes
        .map(({ path, index, isMain, dir }) => {
          const str = new StringBuilder();
          if (isMain && path !== "/") {
            str.append(`app.get("/", (_, res) => res.redirect("${path}"));`);
          }
          str.append(
            `app.use("${path}", express.static(clientPath + "${dir}", { index: "${index}" }));`,
          );
          str.append(`app.use((req, res, next) => {
  if (req.method === "GET" && req.path.startsWith("${path}")) {
    res.sendFile(path.join(clientPath, ".${dir}/${index}"));
  } else {
    next();
  }
});`);
          return str.toString();
        })
        .join(""),
    );
    sb.append(
      `app.listen(${port}, () => console.log("Running on port ${port}"));`,
    );
    return sb.toString();
  },
  async handle(app, req, res, next) {
    await app(req, res, next);
  },
};
