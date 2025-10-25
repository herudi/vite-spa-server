import { describe, it, expect, vi } from "vitest";
import { createRequestFromIncoming, sendStream } from "../src/server/util";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

describe("createRequestFromIncoming", () => {
  const createMockRequest = (
    options: Partial<IncomingMessage> = {},
  ): IncomingMessage => {
    const mockRequest = Object.assign(new Readable(), {
      headers: options.headers || {},
      method: options.method || "GET",
      url: options.url || "/",
      _read: () => {},
    });
    return mockRequest as unknown as IncomingMessage;
  };

  it("should create basic GET request", async () => {
    const mockReq = createMockRequest({
      headers: { host: "example.com" },
      method: "GET",
      url: "/test",
    });

    const request = await createRequestFromIncoming(mockReq);

    expect(request.method).toBe("GET");
    expect(request.url).toBe("http://example.com/test");
  });

  it("should handle x-forwarded-proto header", async () => {
    const mockReq = createMockRequest({
      headers: {
        host: "example.com",
        "x-forwarded-proto": "https",
      },
    });

    const request = await createRequestFromIncoming(mockReq);

    expect(request.url).toBe("https://example.com/");
  });

  it("should handle array headers", async () => {
    const mockReq = createMockRequest({
      headers: {
        host: "example.com",
        "set-cookie": ["cookie1=value1", "cookie2=value2"],
      },
    });

    const request = await createRequestFromIncoming(mockReq);
    const cookies: string[] = [];
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        cookies.push(value);
      }
    });

    expect(cookies).toHaveLength(2);
    expect(cookies).toContain("cookie1=value1");
    expect(cookies).toContain("cookie2=value2");
  });

  it("should handle POST request with body", async () => {
    const mockReq = createMockRequest({
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
      },
    });

    const payload = JSON.stringify({ test: "data" });
    mockReq.push(payload);
    mockReq.push(null);

    const request = await createRequestFromIncoming(mockReq);
    const body = await request.text();

    expect(request.method).toBe("POST");
    expect(body).toBe(payload);
  });

  it("should use default values when headers are missing", async () => {
    const mockReq = createMockRequest({
      headers: {},
    });

    const request = await createRequestFromIncoming(mockReq);

    expect(request.url).toBe("http://localhost:3000/");
    expect(request.method).toBe("GET");
  });

  it("should handle request errors", async () => {
    const mockReq = createMockRequest({
      method: "POST",
    });

    setTimeout(() => {
      mockReq.emit("error", new Error("Test error"));
    }, 0);

    await expect(createRequestFromIncoming(mockReq)).rejects.toThrow(
      "Test error",
    );
  });
});

describe("sendStream", () => {
  const createMockServerResponse = () => {
    return {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
  };

  it("should stream basic response", async () => {
    const webResponse = new Response("Hello World", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    const mockRes = createMockServerResponse();

    await sendStream(webResponse, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "content-type": "text/plain",
    });
    expect(mockRes.write).toHaveBeenCalled();
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("should handle empty response body", async () => {
    const webResponse = new Response(null, { status: 204 });
    const mockRes = createMockServerResponse();

    await sendStream(webResponse, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(204, {});
    expect(mockRes.write).not.toHaveBeenCalled();
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("should stream binary data", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const webResponse = new Response(data, {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
    const mockRes = createMockServerResponse();

    await sendStream(webResponse, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "content-type": "application/octet-stream",
    });
    expect(mockRes.write).toHaveBeenCalled();
  });

  it("should handle error status codes", async () => {
    const webResponse = new Response("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
    const mockRes = createMockServerResponse();

    await sendStream(webResponse, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(404, {
      "content-type": "text/plain",
    });
  });
});
