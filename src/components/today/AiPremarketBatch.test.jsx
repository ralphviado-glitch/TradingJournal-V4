import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BatchApprovalSummary, BatchMergeConfirmation } from "./AiPremarketAssistant";

describe("multi-batch approval UX", () => {
  it("shows draft and existing ticker groups before approval", () => { const html = renderToStaticMarkup(<BatchApprovalSummary draftTickers={["SNDK", "DELL", "INTC"]} existingTickers={["NVDA", "AMD", "TSLA", "MU"]} showExisting />); expect(html).toContain("Draft tickers:"); expect(html).toContain("SNDK, DELL, INTC"); expect(html).toContain("Existing tickers:"); expect(html).toContain("NVDA, AMD, TSLA, MU"); expect(html).toContain("remain in the watchlist"); });
  it("uses explicit Cancel and Approve & Merge actions", () => { const html = renderToStaticMarkup(<BatchMergeConfirmation draftTickers={["NVDA", "SNDK", "DELL"]} isSaving={false} onCancel={() => {}} onApprove={() => {}} />); expect(html).toContain("Approve &amp; Merge"); expect(html).toContain(">Cancel<"); expect(html).toContain("PMH/PML"); expect(html).toContain("linked trades"); });
});
