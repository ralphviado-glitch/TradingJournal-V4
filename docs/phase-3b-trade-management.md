# Phase 3B trade-management derivation

## What is derived

For broker imports, each completed reconstructed trade retains its chronological filled orders. A scale-out is derived only when:

- direction, initial shares, price, side, and quantity are valid;
- there are at least two distinct closing fill events; and
- total closing shares exactly match the reconstructed initial position.

Exact adjacent closing fills with the same timestamp, side, and price are treated as partial fills of one exit event. The first distinct closing event becomes the first scale. Every later closing event is combined into the runner using a share-weighted exit price. First-scale and runner percentages use reconstructed initial shares. Long and Short closing sides and P&L signs are handled separately.

A single full exit is intentionally not labeled as a scale-out. Imported derivations are persisted for newly imported trades and are also derived at fetch time for older trades whose `orders` data is complete and whose actual management fields are empty. Saved manual actual values take precedence.

## What is not derived

The app leaves actual management fields empty when the order history is absent, invalid, incomplete, or does not close the reconstructed position exactly. It does not guess whether fills with different timestamps or prices belong to the same broker order because the imported order format has no stable broker order ID. It also does not infer planned management, setup quality, execution quality, execution score, or management notes.

For three or more distinct exit events, the first event is the first scale and all remaining exits are summarized as one weighted-average runner. This compact two-bucket representation does not preserve separate second/third scale labels.
