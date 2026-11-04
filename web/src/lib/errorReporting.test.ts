import { describe, expect, it } from "vitest";
import { describeError, shouldReport } from "./errorReporting";

describe("shouldReport", () => {
  it("skips browser noise and network drops", () => {
    expect(shouldReport("Script error.", new Set())).toBe(false);
    expect(shouldReport("ResizeObserver loop completed with undelivered notifications.", new Set())).toBe(false);
    expect(shouldReport("TypeError: Failed to fetch", new Set())).toBe(false);
  });

  it("sends each error once and stops after five", () => {
    expect(shouldReport("TypeError: x is undefined", new Set())).toBe(true);
    expect(shouldReport("TypeError: x is undefined", new Set(["TypeError: x is undefined"]))).toBe(false);
    expect(shouldReport("TypeError: y", new Set(["a", "b", "c", "d", "e"]))).toBe(false);
  });
});

describe("describeError", () => {
  it("names the error class", () => {
    expect(describeError(new TypeError("x is undefined")).message).toBe("TypeError: x is undefined");
    expect(describeError("plain").message).toBe("plain");
  });
});
