import { describe, it, expect } from "vitest";
import { resolveEdition } from "./edition";

describe("edition", () => {
  describe("resolveEdition", () => {
    it("should resolve valid editions", () => {
      expect(resolveEdition("cloud")).toBe("cloud");
      expect(resolveEdition("LOCAL")).toBe("local");
      expect(resolveEdition("  demo  ")).toBe("demo");
    });

    it("should fall back to local for invalid editions", () => {
      expect(resolveEdition("enterprise")).toBe("local");
      expect(resolveEdition("")).toBe("local");
      expect(resolveEdition(undefined)).toBe("local");
    });
  });
});
