import { describe, expect, it } from "vitest";
import { buildPublicUrl } from "./_core/r2";

describe("R2 public URL builder", () => {
  it("joins base and key with a single slash", () => {
    expect(buildPublicUrl("https://media.dindoman.se", "board/x.webp")).toBe(
      "https://media.dindoman.se/board/x.webp"
    );
  });

  it("trims trailing slash on base and leading slash on key", () => {
    expect(buildPublicUrl("https://media.dindoman.se/", "/board/x.webp")).toBe(
      "https://media.dindoman.se/board/x.webp"
    );
  });

  it("keeps nested key paths intact", () => {
    expect(buildPublicUrl("https://cdn.example.com", "board/2026/x.webp")).toBe(
      "https://cdn.example.com/board/2026/x.webp"
    );
  });
});
