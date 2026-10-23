import { describe, expect, it } from "vitest";
import { amharicStyle } from "./styleUrl";

describe("amharicStyle", () => {
  it("points at the -am twin of a style", () => {
    expect(amharicStyle("https://map.example.com/style-light.json")).toBe("https://map.example.com/style-light-am.json");
    expect(amharicStyle("https://pub-1.r2.dev/style-dark.json?v=2")).toBe("https://pub-1.r2.dev/style-dark-am.json?v=2");
  });
});
