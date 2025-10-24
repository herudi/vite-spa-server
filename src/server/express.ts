import type { ServerTypeFunc } from "../types";
import { StringBuilder } from "./util";

export const expressServer: ServerTypeFunc = {
  name: "express",
  script({ port, clientDir, areas }) {
    const sb = new StringBuilder();
    sb.append(`import app from "./app.js";`);
    sb.append(`import express from "express";`);
    sb.append(`import path from "node:path";`);
    sb.append(
      `const clientPath = new URL("./${clientDir}", import.meta.url).pathname;`,
    );
    sb.append(
      areas
        .map(({ path, index, isMain, dir, wildcard }) => {
          const str = new StringBuilder();
          if (isMain && path !== "/") {
            str.append(`app.get("/", (_, res) => res.redirect("${path}"));`);
          }
          str.append(
            `app.use("${path}", express.static(clientPath + "${dir}", { index: "${index}" }));`,
          );
          const check = wildcard
            ? `req.path.startsWith("${path}")`
            : `req.path === "${path}"`;
          str.append(`app.use((req, res, next) => {
  if (req.method === "GET" && ${check}) {
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
