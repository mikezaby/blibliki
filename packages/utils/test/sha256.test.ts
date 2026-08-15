import { describe, expect, it } from "vitest";
import { deterministicId } from "../src/deterministicId";
import { sha256hex } from "../src/sha256";

describe("sha256hex", () => {
  it("matches FIPS 180-4 known vectors", () => {
    expect(sha256hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  // Locked from crypto-js output (the previous implementation) so IDs never drift.
  it("reproduces the previous crypto-js output byte-for-byte", () => {
    expect(sha256hex("foo:bar")).toBe(
      "a765a8beaa9d561d4c5cbed29d8f4e30870297fdfa9cb7d6e9848a95fec9f937",
    );
    expect(sha256hex("osc-1:2")).toBe(
      "93a48f535ee92daaa34c129741bb4c1f4f68a01b384c0d297e988259a1061bae",
    );
  });

  it("handles multi-byte UTF-8 like crypto-js does", () => {
    expect(sha256hex("héllo")).toBe(
      "3c48591d8d098a4538f5e013dfcf406e948eac4d3277b10bf614e295d6068179",
    );
  });

  it("crosses the 64-byte block boundary correctly (55/56/64/120 bytes)", async () => {
    for (const len of [55, 56, 64, 120, 200]) {
      const input = "a".repeat(len);
      const expected = await webCryptoSha256(input);
      expect(sha256hex(input)).toBe(expected);
    }
  });

  it("matches the Web Crypto (subtle.digest) API", async () => {
    for (const input of [
      "",
      "abc",
      "foo:bar",
      "héllo",
      "the quick brown fox",
    ]) {
      expect(sha256hex(input)).toBe(await webCryptoSha256(input));
    }
  });
});

describe("deterministicId", () => {
  it("stays stable after dropping crypto-js", () => {
    // Locked values: previously produced by the crypto-js-backed implementation.
    expect(deterministicId("osc-1", "2")).toBe(
      "93a48f53-5ee9-4daa-B4c1-29741bb4c1f4",
    );
    expect(deterministicId("foo", "bar")).toBe(
      "a765a8be-aa9d-461d-85cb-ed29d8f4e308",
    );
  });
});

async function webCryptoSha256(message: string): Promise<string> {
  const bytes = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
