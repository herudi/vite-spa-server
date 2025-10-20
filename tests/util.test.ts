import { describe, expect, it } from "vitest";
import { createRequestFromIncoming } from "../src";

describe("Request from Incoming", () => {
  it("create Request API from Incoming", async () => {
    const req = await createRequestFromIncoming({
      method: "GET",
      url: "/hello",
      headers: {
        host: "localhost:3000",
        foo: "bar",
      },
    } as any);
    expect(req.method).toBe("GET");
    expect(req.url).toBe("http://localhost:3000/hello");
    expect(req.headers.get("foo")).toBe("bar");
  });
});
