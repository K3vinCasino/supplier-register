import { describe, expect, it } from "vitest";
import { decideAuthRoute, isPublicPath, safeRedirectPath } from "@/lib/auth-paths";

describe("authentication boundary (proxy decisions)", () => {
  const protectedPaths = ["/", "/suppliers", "/suppliers/12", "/rfqs/new", "/rfqs/3/quotes/new", "/prices"];

  it.each(protectedPaths)("redirects a logged-out visitor away from %s", (path) => {
    const d = decideAuthRoute(path, "", false);
    expect(d.action).toBe("redirect");
    if (d.action === "redirect") expect(d.to.startsWith("/login")).toBe(true);
  });

  it.each(protectedPaths)("allows a logged-in user to open %s", (path) => {
    expect(decideAuthRoute(path, "", true)).toEqual({ action: "allow" });
  });

  it("remembers where the user was going", () => {
    expect(decideAuthRoute("/prices", "?q=aggregate", false)).toEqual({
      action: "redirect",
      to: "/login?next=%2Fprices%3Fq%3Daggregate",
    });
  });

  it("lets logged-out visitors see the login page", () => {
    expect(decideAuthRoute("/login", "", false)).toEqual({ action: "allow" });
  });

  it("sends logged-in users from /login to the dashboard", () => {
    expect(decideAuthRoute("/login", "", true)).toEqual({ action: "redirect", to: "/" });
  });

  it("does not treat look-alike paths as public", () => {
    expect(isPublicPath("/login-admin")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/login")).toBe(true);
  });
});

describe("safeRedirectPath", () => {
  it("allows internal paths", () => {
    expect(safeRedirectPath("/rfqs/5")).toBe("/rfqs/5");
  });

  it("blocks open redirects to other sites", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
  });

  it("falls back to the dashboard", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
    expect(safeRedirectPath("/login")).toBe("/");
  });
});
