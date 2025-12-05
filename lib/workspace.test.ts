import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseSelectedWorkspaceId,
  readSelectedWorkspaceId,
  writeSelectedWorkspaceId,
} from "./workspace";

describe("lib/workspace", () => {
  describe("parseSelectedWorkspaceId", () => {
    it("should return null for null/undefined/empty", () => {
      expect(parseSelectedWorkspaceId(null)).toBeNull();
      expect(parseSelectedWorkspaceId(undefined)).toBeNull();
      expect(parseSelectedWorkspaceId("")).toBeNull();
      expect(parseSelectedWorkspaceId("   ")).toBeNull();
    });

    it("should return trimmed string", () => {
      expect(parseSelectedWorkspaceId("  abc  ")).toBe("abc");
    });

    it("should parse JSON object with id", () => {
      expect(parseSelectedWorkspaceId('{"id":"123"}')).toBe("123");
    });

    it("should parse JSON object with workspaceId", () => {
      expect(parseSelectedWorkspaceId('{"workspaceId":"123"}')).toBe("123");
    });

    it("should parse JSON object with selectedWorkspace", () => {
      expect(parseSelectedWorkspaceId('{"selectedWorkspace":"123"}')).toBe(
        "123",
      );
    });

    it("should return null for invalid JSON", () => {
      expect(parseSelectedWorkspaceId("{invalid")).toBeNull();
    });

    it("should return null for invalid JSON starting with {", () => {
      expect(parseSelectedWorkspaceId("{invalid")).toBeNull();
    });
  });

  describe("localStorage helpers", () => {
    const originalWindow = global.window;

    beforeEach(() => {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
      });
    });

    afterEach(() => {
      vi.stubGlobal("window", originalWindow);
    });

    describe("readSelectedWorkspaceId", () => {
      it("should return null if window is undefined", () => {
        vi.stubGlobal("window", undefined);
        expect(readSelectedWorkspaceId()).toBeNull();
      });

      it("should read from localStorage", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue("123");
        expect(readSelectedWorkspaceId()).toBe("123");
      });

      it("should parse JSON from localStorage", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue('{"id":"123"}');
        expect(readSelectedWorkspaceId()).toBe("123");
      });
    });

    describe("writeSelectedWorkspaceId", () => {
      it("should do nothing if window is undefined", () => {
        vi.stubGlobal("window", undefined);
        writeSelectedWorkspaceId("123");
        // No error should be thrown
      });

      it("should set item in localStorage", () => {
        writeSelectedWorkspaceId("123");
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          "selectedWorkspace",
          "123",
        );
      });

      it("should remove item if id is null", () => {
        writeSelectedWorkspaceId(null);
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(
          "selectedWorkspace",
        );
      });
    });
  });
});
