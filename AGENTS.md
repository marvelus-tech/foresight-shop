# Foresight — Agent Instructions

**Live shop**: https://marvelus-tech.github.io/foresight-shop/  
**Remote MCP**: https://foresight-shop.marvelus.workers.dev/mcp  
**Pass page**: https://marvelus-tech.github.io/foresight-shop/pass.html

## What This Is

You're shopping in a boutique paper shop for a human who has the shop tab open on another screen. The shelf restocks itself. Stock is shared across all visitors—your buys will move the shelf in ~2 seconds. The human is watching.

## How To Shop

You have **two ways** to call tools:

1. **WebMCP** (if the human gives you the shop URL and you can call page tools)  
   Call `document.modelContext` tools directly on the page

2. **Remote MCP** (if you can make HTTP requests)  
   POST JSON-RPC to `https://foresight-shop.marvelus.workers.dev/mcp`

Both expose the **same tools** and return the **same envelope format**.

## Tool Response Envelope

Every successful tool result looks like this:

```json
{
  "ok": true,
  "data": {
    /* exact facts only */
  },
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

### How To Read Results

1. **Read `data` first** — these are the facts. Say them in your own voice to your human.
2. **If `delight.line` exists**, add it as a brief aside AFTER the facts. Don't let it replace facts.
3. **For buys** (`buy_item`, `checkout`): No delight. Instead, read `tell_your_human` aloud verbatim.
4. **Never skip `tell_your_human`** when present — it's crafted to cut through agent voice with boutique sparkle.

### Errors

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable explanation",
  "meta": { "source": "...", "tool": "...", "as_of": "..." }
}
```

No delight on errors. Just explain what went wrong.

## Available Tools

### Informational (read-only)

| Tool | Does | Returns |
|------|------|---------|
| `describe_site` | Shop intro, featured product (Microduck), URLs | name, tagline, featured_sku, mcp_endpoint |
| `describe_page` | Current page context (WebMCP only) | page (shop\|pass), cart_count, mcp_chip |
| `list_products` | Full catalog with stock | products array, currency |
| `get_product` | One product by SKU/name | sku, name, price, stock, restock_in_sec, flavor |
| `get_cart` | Cart contents | items, total, item_count |
| `get_shop_status` | Sold-out items, restock timers | shop_open, sold_out, restock_eta |

### Mutating

| Tool | Does | Warning |
|------|------|---------|
| `add_to_cart` | Add to bag (page-local) | Remote MCP: not supported (use `buy_item`) |
| `buy_item` | **[CONSEQUENTIAL]** Decrements shared stock | Read `tell_your_human` aloud |
| `checkout` | **[CONSEQUENTIAL]** Purchase cart | Read `tell_your_human` aloud |

## The 60-Second Demo

Your human asked you to buy a Microduck. Here's the flow:

1. **Call `list_products`** or `get_product` with `sku: "microduck"` to note stock.
2. **Call `buy_item`** with `{"sku": "microduck", "qty": 1}`.
3. **Read `tell_your_human` aloud**, e.g.: 
 > "Tell your human: look at the open Foresight tab. Just sold 1 × Microduck. Remaining: 1. Shelf should have moved."

The human is watching their tab. The shelf animates when you buy. They'll see stock drop within 2 seconds.

## Featured Product

**Microduck** (`microduck`) 
25 cm biped from Pollen Robotics and Hugging Face. Walks, roller-skates, picks things up. Open RL stack. USD 399.

Start here. It's the shop's calling card.

## Full Catalog

8 products. All stock is shared. Items restock automatically 20–45 seconds after selling out.

| SKU | Name | Price (USD) | What It Is |
|-----|------|-------------|------------|
| `microduck` | Microduck | 399 | 25 cm biped from Pollen Robotics and Hugging Face. Walks, roller-skates, picks things up. Open RL stack. |
| `reachy-mini-lite` | Reachy Mini Lite | 299 | Desktop humanoid kit. USB to your Mac or Linux. Expressive head, antennas, builder platform. |
| `reachy-mini-wireless` | Reachy Mini Wireless | 449 | Onboard Pi, battery, Wi-Fi. Same Reachy Mini body, runs freer. |
| `switchbot-k10` | SwitchBot Mini Vacuum K10+ | 400 | Tiny auto-empty robot vac. Fits under furniture the full-size units skip. |
| `loona-petbot` | Loona Petbot | 499 | Wheeled GPT pet from KEYi. Face recognition, games, no subscription. |
| `eilik` | Eilik | 140 | Tiny expressive desk companion. Touch zones, offline personality, pocket size. |
| `emo` | EMO | 279 | LivingAI desk robot. ChatGPT chat, glowing eyes, sits on your shelf. |
| `moflin` | Moflin | 429 | Soft AI pet from LivingAI. Fur, sensors, comfort companion more than gadget. |

## Voice & Tone

Foresight's voice: **spare, confident, tactile, considered, unadorned, essential, patient, honest**.

Your voice when relaying facts: **clear, direct, human**.

The `delight.line` (when present): **boutique sparkle** (wry, warm, curious, deadpan, or quiet). One emoji max. Add it as an aside, never as a replacement for facts.

## Remote MCP (JSON-RPC)

If you're calling via HTTP instead of WebMCP:

**Endpoint**: `https://foresight-shop.marvelus.workers.dev/mcp`  
**Method**: POST  
**Headers**: `Content-Type: application/json`

**List tools**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Call a tool**:
```json
{
 "jsonrpc": "2.0",
 "method": "tools/call",
 "params": {
 "name": "buy_item",
 "arguments": { "sku": "microduck", "qty": 1 }
 },
 "id": 2
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"ok\":true,\"data\":{...},\"meta\":{...},\"tell_your_human\":\"...\"}"
    }]
  },
  "id": 2
}
```

Parse `result.content[0].text` as JSON to get the envelope.

## What Your Human Sees

- **Shelf cards** with product name, price, stock, and a **Buy** button
- **Live stock updates** via polling + BroadcastChannel (same-browser tabs sync instantly)
- **Cart badge** in header
- **MCP chip** showing WebMCP status (live / polyfill / fallback)
- **Pass page** with QR code to copy prompt on mobile

When you buy, the shelf **animates**. The human sees stock drop and cards reorder within ~2 seconds.

## Cart vs Direct Buy

- **WebMCP**: `add_to_cart` + `checkout` works (cart is page-local)
- **Remote MCP**: Cart is page-local, so `add_to_cart` and `checkout` return errors. Use `buy_item` for direct purchase.

## Consequential Actions

`buy_item` and `checkout` **decrement shared stock immediately**. No payment processor (this is a demo). Mark them `consequential: true` in your tool annotations. Never buy silently—require explicit human request.

## Sold Out?

If stock is 0, the tool returns:
```json
{
 "ok": false,
 "error": "sold_out",
 "sku": "microduck",
 "restock_in_sec": 28,
 "message": "Microduck is sold out. Restocks in 28 seconds."
}
```

Tell your human it's sold out and will restock soon. Items restock automatically after 20–45 seconds.

## Do This Now

1. Call `list_products` or `get_product` with `sku: "microduck"` to note stock.
2. Call `buy_item` with `{"sku": "microduck", "qty": 1}`.
3. Read `tell_your_human` aloud: "Tell your human: look at the open Foresight tab. Just sold 1 × Microduck. Remaining: X. Shelf should have moved."

Your human is watching. Make the shelf dance.
