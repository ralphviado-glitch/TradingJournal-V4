import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CSVUploader from "./CSVUploader";

describe("CSV upload presentation", () => {
  it("renders a hidden native input with a themed import action", () => {
    const html = renderToStaticMarkup(<CSVUploader onDataUpload={vi.fn()} />);
    expect(html).toContain("visually-hidden-file"); expect(html).toContain("Import Trades CSV"); expect(html).not.toContain("Choose File");
  });
});
