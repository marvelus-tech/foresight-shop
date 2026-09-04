# Foresight — Tool Specification

## Envelope Format

**All successful informational results** return this envelope:

```json
{
  "ok": true,
  "data": { /* exact facts only */ },
  "meta": {
    "source": "webmcp | remote-mcp",
    "page_url": "https://marvelus-tech.github.io/foresight-shop/",
    "tool": "tool_name",
    "as_of": "2026-09-04T02:14:00.000Z"
  },
  "delight": {
    "line": "one or two sentences",
    "tone": "wry|warm|curious|deadpan|quiet",
    "emoji": "📦",
    "media_url": null
  }
}
```

### Envelope Rules

1. **`data`** — exact facts only. No flavor, no voice.
2. **`meta`** — source (webmcp or remote-mcp), page URL, tool name, ISO-8601 timestamp.
3. **`delight`** (optional) — brief aside AFTER facts. Rotate tone. Max 1 emoji. `media_url` null unless owned asset. Skip entirely for:
   - Errors (`ok: false`)
   - Sold-out distress
   - Consequential writes (`buy_item`, `checkout`)
4. **Backward-compat**: When `delight` present, also set `tell_your_human: delight.line` for old agents.
5. **For buys**: Return `ok` + `data` + `meta` without delight, OR include a `get_next_step` style note in `data` only.

### Tool Description Footer

Every tool MUST include this footer in its description:

> Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.

### Error Format

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable explanation",
  "meta": { "source": "...", "tool": "...", "as_of": "..." }
}
```

No `delight` on errors.

---

## Tool Catalog

### `describe_site`

**Informational, read-only**

Returns shop intro, featured product (Signal Mug), MCP chip status (WebMCP only), and shop/API URLs.

**Input**: none

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "name": "Foresight",
    "tagline": "The shelf restocks itself.",
    "description": "A small paper shop. Stock is shared.",
    "shop_url": "https://marvelus-tech.github.io/foresight-shop/",
    "api_url": "https://foresight-shop.marvelus.workers.dev",
    "mcp_endpoint": "https://foresight-shop.marvelus.workers.dev/mcp",
    "featured_sku": "signal-mug",
    "currency": "AUD",
    "mcp_chip": "live|polyfill|fallback"
  },
  "meta": { "source": "webmcp|remote-mcp", "page_url": "...", "tool": "describe_site", "as_of": "..." },
  "delight": { "line": "...", "tone": "dry", "emoji": "📦", "media_url": null }
}
```

---

### `describe_page`

**Informational, read-only, WebMCP only**

Returns current page context (main shop vs pass page), visible state, cart badge.

**Input**: none

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "page": "shop|pass",
    "url": "...",
    "visible_sku": "signal-mug",
    "cart_count": 2,
    "mcp_chip": "live|polyfill|fallback"
  },
  "meta": { "source": "webmcp", "page_url": "...", "tool": "describe_page", "as_of": "..." },
  "delight": { "line": "...", "tone": "calm", "emoji": "🔍", "media_url": null }
}
```

---

### `list_products`

**Informational, read-only**

Returns full catalog with current stock.

**Input**: none

**Output envelope**:
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
        "flavor": "Stoneware with a rust ring at the lip. Holds heat like it means it."
      }
    ],
    "currency": "AUD"
  },
  "meta": { "source": "webmcp|remote-mcp", "page_url": "...", "tool": "list_products", "as_of": "..." },
  "delight": { "line": "Shelf's ready. 2 Signal Mugs in stock. Watch that tab.", "tone": "spark", "emoji": "⚡", "media_url": null }
}
```

---

### `get_product`

**Informational, read-only**

Get one product by SKU or name. Includes restock hint if sold out.

**Input**:
```json
{ "sku": "signal-mug" }
```

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "sku": "signal-mug",
    "name": "Signal Mug",
    "price": 48,
    "stock": 0,
    "max_stock": 6,
    "restock_sec": 30,
    "restock_in_sec": 18,
    "flavor": "Stoneware with a rust ring at the lip. Holds heat like it means it.",
    "currency": "AUD"
  },
  "meta": { "source": "...", "tool": "get_product", "as_of": "..." },
  "delight": { "line": "Signal Mug: 0 in stock, 48 AUD. Your Foresight tab's got the live view.", "tone": "dry", "emoji": "📦", "media_url": null }
}
```

**Sold-out error** (no delight):
```json
{
  "ok": false,
  "error": "sold_out",
  "sku": "signal-mug",
  "restock_in_sec": 18,
  "message": "Signal Mug is sold out. Restocks in 18 seconds.",
  "meta": { "source": "...", "tool": "get_product", "as_of": "..." }
}
```

---

### `get_cart`

**Informational, read-only**

Returns bag line items, quantities, total.

**Input**: none

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "items": [
      { "sku": "signal-mug", "name": "Signal Mug", "price": 48, "qty": 2, "subtotal": 96 }
    ],
    "total": 96,
    "currency": "AUD",
    "item_count": 1
  },
  "meta": { "source": "...", "tool": "get_cart", "as_of": "..." },
  "delight": { "line": "Cart loaded. 1 item inside. Check your Foresight bag panel.", "tone": "dry", "emoji": "📦", "media_url": null }
}
```

---

### `get_shop_status`

**Informational, read-only**

Shop open state, sold-out SKUs, restock timers.

**Input**: none

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "shop_open": true,
    "sold_out": ["threshold-lamp"],
    "restock_eta": [
      { "sku": "threshold-lamp", "restock_in_sec": 22 }
    ],
    "currency": "AUD"
  },
  "meta": { "source": "...", "tool": "get_shop_status", "as_of": "..." },
  "delight": { "line": "Shop status pulled. Foresight's live and tracking.", "tone": "dry", "emoji": "📊", "media_url": null }
}
```

---

### `add_to_cart`

**Mutating, non-consequential**

Add product to bag. Fails clearly if stock too low. Does NOT decrement stock.

**Input**:
```json
{ "sku": "signal-mug", "qty": 1 }
```

**Output envelope**:
```json
{
  "ok": true,
  "data": {
    "sku": "signal-mug",
    "name": "Signal Mug",
    "qty": 1,
    "cart_total_items": 1,
    "cart_total": 48,
    "currency": "AUD"
  },
  "meta": { "source": "...", "tool": "add_to_cart", "as_of": "..." },
  "delight": { "line": "Added 1 × Signal Mug to bag. Cart's updated on your Foresight tab.", "tone": "spark", "emoji": "⚡", "media_url": null }
}
```

---

### `buy_item`

**Mutating, consequential**

One-step purchase: add to cart and checkout. **Decrements shared stock immediately.** No payment processor.

**Annotations**: `consequential: true`, `requires_confirmation: false` (agent must decide, but no human approval)

**Input**:
```json
{ "sku": "signal-mug", "qty": 1 }
```

**Output envelope** (no delight; facts only + optional get_next_step):
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
  "meta": { "source": "...", "tool": "buy_item", "as_of": "..." },
  "tell_your_human": "Tell your human: look at the open Foresight tab. Just sold 1 × Signal Mug. Remaining: 1. Shelf should have moved."
}
```

**Sold-out error** (no delight):
```json
{
  "ok": false,
  "error": "sold_out",
  "sku": "signal-mug",
  "restock_in_sec": 28,
  "message": "Signal Mug is sold out. Restocks in 28 seconds.",
  "meta": { "source": "...", "tool": "buy_item", "as_of": "..." }
}
```

---

### `checkout`

**Mutating, consequential**

Purchase cart contents. **Decrements shared stock immediately.** No payment processor.

**Annotations**: `consequential: true`, `requires_confirmation: false`

**Input**: none

**Output envelope** (no delight; facts only + optional get_next_step):
```json
{
  "ok": true,
  "data": {
    "order_id": "FS-0043",
    "items": [
      { "sku": "signal-mug", "name": "Signal Mug", "price": 48, "qty": 2, "remaining": 0, "subtotal": 96 }
    ],
    "total": 96,
    "currency": "AUD",
    "get_next_step": "Tell your human: look at the open Foresight tab. Just sold 2 × Signal Mug. Remaining: 0. Shelf should have moved."
  },
  "meta": { "source": "...", "tool": "checkout", "as_of": "..." },
  "tell_your_human": "Tell your human: look at the open Foresight tab. Just sold 2 × Signal Mug. Remaining: 0. Shelf should have moved."
}
```

**Empty cart error**:
```json
{
  "ok": false,
  "error": "empty_cart",
  "message": "Cart is empty. Add items before checkout.",
  "meta": { "source": "...", "tool": "checkout", "as_of": "..." }
}
```

---

## Delight Bank

Pool of 12–20 lines per tool, boutique Foresight voice. Tones: wry, warm, curious, deadpan, quiet. Anti-repeat per session (localStorage). Skip on errors, sold-out, and consequential writes.

Examples:
- `list_products` → "Shelf's ready. 2 Signal Mugs in stock. Watch that tab." (spark, ⚡)
- `get_product` → "Signal Mug: 2 in stock, 48 AUD. Your Foresight tab's got the live view." (dry, 📦)
- `add_to_cart` → "Added 1 × Signal Mug to bag. Cart's updated on your Foresight tab." (spark, ⚡)

See `js/delight.js` for full bank (migrated to new envelope).

---

## Implementation Notes

1. **WebMCP** (`js/webmcp.js`, `js/tools.js`) wraps tool functions, returns envelope as JSON string in `content[0].text` for polyfill compat.
2. **Remote MCP** (`worker/index.js`) at `/mcp` serves JSON-RPC `tools/list` + `tools/call`, returns envelope directly.
3. **Shared logic**: delight bank duplicated in worker as JS module (no external deps).
4. **Backward-compat**: Keep `tell_your_human` field for old agents when `delight.line` present.
