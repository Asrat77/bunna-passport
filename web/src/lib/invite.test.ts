import { describe, expect, it } from "vitest";
import { inviteTokenFrom, launchLinkFrom } from "./invite";

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

describe("launchLinkFrom", () => {
  it("reads a café sticker's start parameter", () => {
    expect(launchLinkFrom("shop_12__src_qr-12", "")).toEqual({ invite: null, shopId: 12, shopSlug: null });
  });

  it("reads an invite tagged with a source", () => {
    expect(launchLinkFrom("invite_AbC123xyz9__src_card", "")).toEqual({ invite: "AbC123xyz9", shopId: null, shopSlug: null });
  });

  it("reads ?shop= on the plain website", () => {
    expect(launchLinkFrom(undefined, "?shop=7&src=qr-7")).toEqual({ invite: null, shopId: 7, shopSlug: null });
  });

  it("reads a café QR stand's bare slug", () => {
    expect(launchLinkFrom("tomoca-bole", "")).toEqual({ invite: null, shopId: null, shopSlug: "tomoca-bole" });
    expect(launchLinkFrom("Not_A_Slug!", "")).toEqual({ invite: null, shopId: null, shopSlug: null });
  });

  it("ignores a source-only link and malformed ids", () => {
    expect(launchLinkFrom("src_ig-addiscoffee", "")).toEqual({ invite: null, shopId: null, shopSlug: null });
    expect(launchLinkFrom("shop_0", "")).toEqual({ invite: null, shopId: null, shopSlug: null });
    expect(launchLinkFrom("shop_12abc", "")).toEqual({ invite: null, shopId: null, shopSlug: null });
  });
});
