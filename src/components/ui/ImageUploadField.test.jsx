import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ImageUploadField, { IMAGE_ACCEPT } from "./ImageUploadField";

describe("ImageUploadField", () => {
  it("hides the native input and renders the themed empty state", () => {
    const html = renderToStaticMarkup(<ImageUploadField label="Chart Screenshot" onChange={() => {}} />);
    expect(html).toContain("visually-hidden-file");
    expect(html).toContain("Upload Screenshot");
    expect(html).toContain("No image selected");
    expect(html).toContain(IMAGE_ACCEPT);
  });

  it("shows the selected filename", () => {
    const html = renderToStaticMarkup(<ImageUploadField file={{ name: "setup.webp" }} onChange={() => {}} />);
    expect(html).toContain("Change Screenshot");
    expect(html).toContain("setup.webp");
  });

  it("shows an existing preview with replace and remove actions", () => {
    const html = renderToStaticMarkup(<ImageUploadField existingUrl="https://example.com/chart.png" onChange={() => {}} onRemove={() => {}} />);
    expect(html).toContain("Replace Screenshot");
    expect(html).toContain("Remove");
    expect(html).toContain("Screenshot uploaded");
    expect(html).toContain("preview");
  });

  it("announces upload failures", () => {
    const html = renderToStaticMarkup(<ImageUploadField status="error" onChange={() => {}} />);
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("Upload failed. Try again.");
  });
});
