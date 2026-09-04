# Foresight — Dry Run

Two example agent interactions showing the new envelope format in action.

---

## Scenario 1: List Products

**Owner question**: "What's in stock at Foresight?"

### Tool Call (WebMCP or Remote MCP)

```json
{
  "tool": "list_products",
  "arguments": {}
}
```

### Tool Response (JSON)

```json
{
  "ok": true,
  "data": {
    "products": [
      {
        "sku": "signal-mug",
        "name": "Signal Mug",
        "price": 48,
        "stock": 2,
        "max_stock": 6,
        "restock_sec": 30,
        "restock_in_sec": null,
        "flavor": "Stoneware with a rust ring at the lip. Holds heat like it means it."
      },
      {
        "sku": "threshold-lamp",
        "name": "Threshold Lamp",
        "price": 186,
        "stock": 3,
        "max_stock": 4,
        "restock_sec": 40,
        "restock_in_sec": null,
        "flavor": "Brass stem, linen shade. Lights the doorway, not the room."
      },
      {
        "sku": "field-ledger",
        "name": "Field Ledger",
        "price": 32,
        "stock": 5,
        "max_stock": 8,
        "restock_sec": 22,
        "restock_in_sec": null,
        "flavor": "Cloth-bound, unlined. For lists that outlast the week."
      },
      {
        "sku": "day-tote",
        "name": "Day Tote",
        "price": 64,
        "stock": 4,
        "max_stock": 6,
        "restock_sec": 28,
        "restock_in_sec": null,
        "flavor": "Waxed canvas, one pocket, no mark. The bag that disappears."
      },
      {
        "sku": "wick-hour",
        "name": "Wick Hour",
        "price": 42,
        "stock": 4,
        "max_stock": 8,
        "restock_sec": 24,
        "restock_in_sec": null,
        "flavor": "Beeswax and cedar. A measured hour of quiet."
      },
      {
        "sku": "table-deck",
        "name": "Table Deck",
        "price": 28,
        "stock": 6,
        "max_stock": 10,
        "restock_sec": 20,
        "restock_in_sec": null,
        "flavor": "Fifty-two letterpress faces, no jokers. For the long game."
      },
      {
        "sku": "window-fern",
        "name": "Window Fern",
        "price": 54,
        "stock": 3,
        "max_stock": 5,
        "restock_sec": 36,
        "restock_in_sec": null,
        "flavor": "Boston fern in unglazed clay. Needs a sill and patience."
      },
      {
        "sku": "shelf-weight",
        "name": "Shelf Weight",
        "price": 38,
        "stock": 5,
        "max_stock": 7,
        "restock_sec": 26,
        "restock_in_sec": null,
        "flavor": "Cast iron, fist-sized. Keeps paper, and the shelf, honest."
      }
    ],
    "currency": "AUD"
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/foresight-shop/",
    "tool": "list_products",
    "as_of": "2026-09-04T02:30:00.000Z"
  },
  "delight": {
    "line": "Shelf's ready. 2 Signal Mugs in stock. Watch that tab.",
    "tone": "spark",
    "emoji": "⚡",
    "media_url": null
  },
  "tell_your_human": "Shelf's ready. 2 Signal Mugs in stock. Watch that tab."
}
```

### What Agent Says Aloud

> "Foresight has 8 products in stock. Signal Mug is the featured item at $48 AUD with 2 in stock. There's also a Threshold Lamp ($186, 3 in stock), Field Ledger ($32, 5 in stock), Day Tote ($64, 4 in stock), Wick Hour ($42, 4 in stock), Table Deck ($28, 6 in stock), Window Fern ($54, 3 in stock), and Shelf Weight ($38, 5 in stock). Shelf's ready. 2 Signal Mugs in stock. Watch that tab."

**Notes**:
- Agent relays data (`products`) in its own voice
- Agent adds `delight.line` as a brief aside at the end
- Delight doesn't replace facts—it's an accent

---

## Scenario 2: Buy Signal Mug

**Owner question**: "Buy me a Signal Mug."

### Tool Call (WebMCP or Remote MCP)

```json
{
  "tool": "buy_item",
  "arguments": {
    "sku": "signal-mug",
    "qty": 1
  }
}
```

### Tool Response (JSON)

```json
{
  "ok": true,
  "data": {
    "order_id": "FS-0042",
    "sku": "signal-mug",
    "name": "Signal Mug",
    "qty": 1,
    "remaining": 1,
    "total": 48,
    "currency": "AUD",
    "get_next_step": "Tell your human: look at the open Foresight tab. Just sold 1 × Signal Mug. Remaining: 1. Shelf should have moved."
  },
  "meta": {
    "source": "remote-mcp",
    "page_url": "https://marvelus-tech.github.io/foresight-shop/",
    "tool": "buy_item",
    "as_of": "2026-09-04T02:31:15.000Z"
  },
  "tell_your_human": "Tell your human: look at the open Foresight tab. Just sold 1 × Signal Mug. Remaining: 1. Shelf should have moved."
}
```

**Note**: No `delight` object. Consequential actions return facts + `tell_your_human` only.

### What Agent Says Aloud

> "Done. I bought 1 Signal Mug for $48 AUD. Order ID is FS-0042. Tell your human: look at the open Foresight tab. Just sold 1 × Signal Mug. Remaining: 1. Shelf should have moved."

**Notes**:
- Agent relays data (`order_id`, `total`, `remaining`) in its own voice
- Agent reads `tell_your_human` verbatim as instructed
- No delight on buys—this is consequential, so voice stays factual + directive
- The human sees the shelf animate within ~2 seconds

---

## Error Case: Sold Out

**Owner question**: "Buy 5 Signal Mugs."

### Tool Call

```json
{
  "tool": "buy_item",
  "arguments": {
    "sku": "signal-mug",
    "qty": 5
  }
}
```

### Tool Response (JSON)

```json
{
  "ok": false,
  "error": "sold_out",
  "sku": "signal-mug",
  "restock_in_sec": 28,
  "message": "signal-mug is sold out. Restocks in 28 seconds.",
  "meta": {
    "source": "remote-mcp",
    "page_url": "https://marvelus-tech.github.io/foresight-shop/",
    "tool": "buy_item",
    "as_of": "2026-09-04T02:32:00.000Z"
  }
}
```

**Note**: No `delight`. Errors are factual only.

### What Agent Says Aloud

> "Signal Mug is sold out—only 2 were in stock, but you asked for 5. It'll restock in about 28 seconds. Keep that Foresight tab open and we can try again when stock returns."

**Notes**:
- Agent relays error in human terms
- Agent mentions restock timing from `restock_in_sec`
- No delight on errors—just clear explanation

---

## Key Differences vs Old Format

### Old Format (deprecated)

```json
{
  "ok": true,
  "products": [...],
  "tell_your_human": "...",
  "delight": { "emoji": "⚡", "vibe": "spark", "gif_url": null }
}
```

Problems:
- Data and metadata mixed at top level
- `delight` had `vibe` instead of `tone`, no `line` field
- No `meta` object with source/timestamp
- Hard to parse for agents

### New Format (current)

```json
{
  "ok": true,
  "data": { "products": [...] },
  "meta": { "source": "webmcp", "tool": "list_products", "as_of": "..." },
  "delight": { "line": "...", "tone": "spark", "emoji": "⚡", "media_url": null }
}
```

Benefits:
- Clean separation: `data` (facts), `meta` (context), `delight` (voice)
- `delight.line` is the actual text to say
- `meta.source` distinguishes WebMCP vs Remote MCP
- `meta.as_of` for staleness checks
- Backward-compat: `tell_your_human` still present when `delight` exists

---

## Testing Checklist

- [ ] WebMCP `list_products` returns new envelope with `data.products`
- [ ] Remote MCP `list_products` returns same structure
- [ ] Delight rotates (check localStorage `foresight_delight_recent`)
- [ ] `buy_item` returns envelope with `tell_your_human`, no `delight`
- [ ] Sold-out error returns `ok: false`, no `delight`
- [ ] `describe_site` and `describe_page` work (WebMCP only for `describe_page`)
- [ ] `get_cart` returns empty on remote MCP with note
- [ ] `add_to_cart` on remote MCP returns "not_supported" error
- [ ] Worker `/mcp` serves `tools/list` and `tools/call`
- [ ] Worker `/.well-known/mcp.json` exists
- [ ] llms.txt updated to reference new envelope
