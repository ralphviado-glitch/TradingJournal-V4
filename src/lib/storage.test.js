import { describe, expect, it } from "vitest";
import { generateScreenshotPath } from "./storage";

describe("screenshot storage paths", () => {
  it("generates user and record scoped screenshot paths", () => {
    const file = { name: "chart.png", type: "image/png" };

    expect(generateScreenshotPath(file, "user-1", "watchlist-1", 123, "uuid-1")).toBe(
      "user-1/watchlist-1/123-uuid-1.png"
    );
  });
});
