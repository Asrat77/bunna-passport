import { describe, expect, it } from "vitest";
import { inviteTokenFrom } from "./invite";

describe("inviteTokenFrom", () => {
  it("reads Telegram's start parameter", () => {
    expect(inviteTokenFrom("invite_AbC123xyz9", "")).toBe("AbC123xyz9");
  });

  it("reads ?invite= on the plain website", () => {
    expect(inviteTokenFrom(undefined, "?invite=AbC123xyz9&x=1")).toBe("AbC123xyz9");
  });

  it("ignores other start parameters and malformed tokens", () => {
    expect(inviteTokenFrom("shop_12", "")).toBeNull();
    expect(inviteTokenFrom("invite_../../x", "")).toBeNull();
    expect(inviteTokenFrom(undefined, "?invite=short")).toBeNull();
    expect(inviteTokenFrom(null, "")).toBeNull();
  });
});
