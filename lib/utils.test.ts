import { describe, expect, it } from "vitest";
import {
  buildDocumentUrl,
  cn,
  fmtAbsolute,
  formatBytes,
  getHostSubdomain,
  resolveWorkspaceFromRequest,
  splitPathname,
  timeAgo,
} from "./utils";

describe("lib/utils", () => {
  describe("cn", () => {
    it("should merge classes correctly", () => {
      expect(cn("c1", "c2")).toBe("c1 c2");
      expect(cn("c1", { c2: true, c3: false })).toBe("c1 c2");
      expect(cn("p-4", "p-2")).toBe("p-2"); // tailwind-merge
    });
  });

  describe("timeAgo", () => {
    it("should return empty string for null/undefined", () => {
      expect(timeAgo(null)).toBe("");
      expect(timeAgo(undefined)).toBe("");
    });

    it("should format seconds ago", () => {
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10000).toISOString();
      expect(timeAgo(tenSecondsAgo)).toBe("10 seconds ago");
    });
  });

  describe("fmtAbsolute", () => {
    it("should return empty string for null/undefined", () => {
      expect(fmtAbsolute(null)).toBe("");
    });

    it("should format date string", () => {
      const date = "2023-01-01T00:00:00.000Z";
      expect(typeof fmtAbsolute(date)).toBe("string");
      expect(fmtAbsolute(date)).not.toBe(date);
    });
  });

  describe("getHostSubdomain", () => {
    it("should return null for localhost", () => {
      expect(getHostSubdomain("localhost")).toBeNull();
    });

    it("should return null for IP addresses", () => {
      expect(getHostSubdomain("127.0.0.1")).toBeNull();
    });

    it("should return subdomain", () => {
      expect(getHostSubdomain("sub.example.com")).toBe("sub");
    });

    it("should return null if no subdomain", () => {
      expect(getHostSubdomain("example.com")).toBeNull();
    });
  });

  describe("splitPathname", () => {
    it("should split pathname", () => {
      expect(splitPathname("/a/b/c")).toEqual(["a", "b", "c"]);
    });

    it("should handle empty pathname", () => {
      expect(splitPathname("")).toEqual([]);
      expect(splitPathname("/")).toEqual([]);
    });
  });

  describe("resolveWorkspaceFromRequest", () => {
    it("should resolve subdomain mode", () => {
      const result = resolveWorkspaceFromRequest({
        hostname: "ws.example.com",
        pathname: "/doc",
        workspaceSlug: "ws",
      });
      expect(result).toEqual({
        mode: "subdomain",
        workspaceSlug: "ws",
        documentSlug: "doc",
      });
    });

    it("should resolve path mode", () => {
      const result = resolveWorkspaceFromRequest({
        hostname: "example.com",
        pathname: "/ws/doc",
        workspaceSlug: "ws",
      });
      expect(result).toEqual({
        mode: "path",
        workspaceSlug: "ws",
        documentSlug: "doc",
      });
    });

    it("should resolve none mode", () => {
      const result = resolveWorkspaceFromRequest({
        hostname: "example.com",
        pathname: "/doc",
        workspaceSlug: null,
      });
      expect(result).toEqual({
        mode: "none",
        workspaceSlug: null,
        documentSlug: "doc",
      });
    });
  });

  describe("buildDocumentUrl", () => {
    it("should build path-based url", () => {
      expect(
        buildDocumentUrl({ workspaceSlug: "ws", documentSlug: "doc" }),
      ).toBe("/ws/doc");
    });

    it("should build subdomain url", () => {
      expect(
        buildDocumentUrl({
          workspaceSlug: "ws",
          documentSlug: "doc",
          useSubdomain: true,
          origin: "https://app.example.com",
        }),
      ).toBe("https://ws.example.com/doc");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1234)).toBe("1.21 KB");
    });
  });
});
