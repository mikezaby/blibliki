import { describe, it, expect } from "vitest";
import {
  normalizeDeviceName,
  extractCoreTokens,
  calculateSimilarity,
  findBestMatch,
} from "@/core/midi/deviceMatcher";

describe("deviceMatcher", () => {
  describe("normalizeDeviceName", () => {
    it("should normalize device names by converting to lowercase", () => {
      expect(normalizeDeviceName("Launchkey Mini MK3")).toBe(
        "launchkey mini mk3",
      );
    });

    it("should remove ALSA port numbers", () => {
      expect(
        normalizeDeviceName(
          "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0",
        ),
      ).toBe("launchkey mini mk3");
    });

    it("should handle colon-separated duplicates by taking longest part", () => {
      expect(normalizeDeviceName("Device:Device Port Name")).toBe("port name");
    });

    it("should remove common port descriptors", () => {
      expect(normalizeDeviceName("My Device MIDI 1")).toBe("my device");
      expect(normalizeDeviceName("My Device Input 2")).toBe("my device");
    });

    it("should remove 'device' prefix", () => {
      expect(normalizeDeviceName("Device My Controller")).toBe("my controller");
    });

    it("should remove multiple spaces", () => {
      expect(normalizeDeviceName("Device   With    Spaces")).toBe(
        "with spaces",
      );
    });
  });

  describe("extractCoreTokens", () => {
    it("should extract meaningful tokens", () => {
      const tokens = extractCoreTokens("Launchkey Mini MK3 MIDI 1");
      expect(tokens).toContain("launchkey");
      expect(tokens).toContain("mini");
      expect(tokens).toContain("mk3");
      expect(tokens).not.toContain("midi");
    });

    it("should filter out generic words", () => {
      const tokens = extractCoreTokens("MIDI Input Device Port");
      expect(tokens).not.toContain("midi");
      expect(tokens).not.toContain("input");
      expect(tokens).not.toContain("device");
      expect(tokens).not.toContain("port");
    });

    it("should filter out very short tokens", () => {
      const tokens = extractCoreTokens("A B Controller XYZ");
      expect(tokens).not.toContain("a");
      expect(tokens).not.toContain("b");
      expect(tokens).toContain("controller");
      expect(tokens).toContain("xyz");
    });
  });

  describe("calculateSimilarity", () => {
    it("should return 1.0 for identical names", () => {
      const score = calculateSimilarity(
        "Launchkey Mini MK3",
        "Launchkey Mini MK3",
      );
      expect(score).toBe(1.0);
    });

    it("should return 1.0 for names that normalize to the same", () => {
      const score = calculateSimilarity(
        "Launchkey Mini MK3 MIDI 1",
        "LAUNCHKEY MINI MK3 MIDI 1",
      );
      expect(score).toBe(1.0);
    });

    it("should return high score for browser vs Node.js format", () => {
      const browserName = "Launchkey Mini MK3 MIDI 1";
      const nodeName = "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0";
      const score = calculateSimilarity(browserName, nodeName);
      expect(score).toBeGreaterThan(0.7);
    });

    it("should return low score for completely different devices", () => {
      const score = calculateSimilarity(
        "Launchkey Mini MK3",
        "Arturia KeyStep",
      );
      expect(score).toBeLessThan(0.5);
    });

    it("should return moderate score for similar but different models", () => {
      const score = calculateSimilarity(
        "Launchkey Mini MK3",
        "Launchkey Mini MK2",
      );
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.9);
    });

    it("should handle substring matches", () => {
      const score = calculateSimilarity("Controller", "My Controller Device");
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe("findBestMatch", () => {
    const candidates = [
      "Launchkey Mini MK3 MIDI 1",
      "Arturia KeyStep MIDI 1",
      "Yamaha P-45 MIDI 1",
    ];

    it("should find exact match", () => {
      const result = findBestMatch("Launchkey Mini MK3 MIDI 1", candidates);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Launchkey Mini MK3 MIDI 1");
      expect(result?.score).toBe(1.0);
    });

    it("should find best fuzzy match", () => {
      const nodeName = "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0";
      const result = findBestMatch(nodeName, candidates);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Launchkey Mini MK3 MIDI 1");
      expect(result?.score).toBeGreaterThan(0.6);
    });

    it("should return null when no match above threshold", () => {
      const result = findBestMatch("NonExistent Device", candidates, 0.8);
      expect(result).toBeNull();
    });

    it("should respect custom threshold", () => {
      const result = findBestMatch("Launchkey MK3", candidates, 0.9);
      // This should match but might be below 0.9 threshold
      if (result) {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      }
    });

    it("should find best match among multiple candidates", () => {
      const allCandidates = [
        ...candidates,
        "Launchkey Mini MK2 MIDI 1",
        "Launchkey MK3 MIDI 1",
      ];
      const result = findBestMatch(
        "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0",
        allCandidates,
      );
      expect(result).not.toBeNull();
      // Should match the MK3 version, not MK2
      expect(result?.name).toContain("MK3");
    });
  });

  describe("cross-platform compatibility", () => {
    it("should match common browser/Node.js name variations", () => {
      const testCases = [
        {
          browser: "Launchkey Mini MK3 MIDI 1",
          node: "Launchkey Mini MK3:Launchkey Mini MK3 MIDI 1 20:0",
        },
        {
          browser: "Arturia KeyStep 32",
          node: "Arturia KeyStep 32:Arturia KeyStep 32 MIDI 1 24:0",
        },
        {
          browser: "MPK Mini Plus",
          node: "MPK Mini Plus:MPK Mini Plus MIDI 1 28:0",
        },
      ];

      testCases.forEach(({ browser, node }) => {
        const score = calculateSimilarity(browser, node);
        expect(
          score,
          `Failed to match ${browser} with ${node}, score: ${score}`,
        ).toBeGreaterThan(0.6);
      });
    });
  });
});
