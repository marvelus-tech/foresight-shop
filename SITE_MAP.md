# Foresight — Site Map

**Live URL**: https://marvelus-tech.github.io/foresight-shop/  
**Shared API**: https://foresight-shop.marvelus.workers.dev  
**Pass Page**: https://marvelus-tech.github.io/foresight-shop/pass.html

## What This Is

A boutique paper shop where the shelf restocks itself. Stock is shared across all visitors. Agents buy for humans who keep the shop tab open and watch inventory move in real-time. No payment processor—buys decrement stock immediately. Demo.

## Featured Product

**Signal Mug** (`signal-mug`)  
Stoneware with a rust ring at the lip. Holds heat like it means it. AUD 48.

## Full Catalog

All stock is shared. Items restock automatically 20–45 seconds after selling out.

| SKU | Name | Price (AUD) | Max Stock | Restock (sec) | What It Is |
|-----|------|-------------|-----------|---------------|------------|
| `signal-mug` | Signal Mug | 48 | 6 | 30 | Stoneware with a rust ring at the lip. Holds heat like it means it. |
| `threshold-lamp` | Threshold Lamp | 186 | 4 | 40 | Brass stem, linen shade. Lights the doorway, not the room. |
| `field-ledger` | Field Ledger | 32 | 8 | 22 | Cloth-bound, unlined. For lists that outlast the week. |
| `day-tote` | Day Tote | 64 | 6 | 28 | Waxed canvas, one pocket, no mark. The bag that disappears. |
| `wick-hour` | Wick Hour | 42 | 8 | 24 | Beeswax and cedar. A measured hour of quiet. |
| `table-deck` | Table Deck | 28 | 10 | 20 | Fifty-two letterpress faces, no jokers. For the long game. |
| `window-fern` | Window Fern | 54 | 5 | 36 | Boston fern in unglazed clay. Needs a sill and patience. |
| `shelf-weight` | Shelf Weight | 38 | 7 | 26 | Cast iron, fist-sized. Keeps paper, and the shelf, honest. |

## Architecture

### Pages Site (GitHub Pages)
- Static HTML/CSS/JS at repo root
- WebMCP registration via `js/webmcp.js` on `document.modelContext`
- Polls `GET /state` every 1.5s, syncs same-browser tabs via BroadcastChannel
- Cart lives in page memory; buys call worker

### Worker (Cloudflare Durable Object)
- `https://foresight-shop.marvelus.workers.dev`
- Durable Object `Shelf` holds shared stock state
- CORS open to any origin
- Serves both:
  - Classic REST (`/state`, `/buy`, `/reset`, `/instructions`)
  - **Remote MCP** at `/mcp` (Streamable HTTP JSON-RPC)

### Shared Tools
Both WebMCP and Remote MCP expose identical tools:

**Informational (read-only)**
- `describe_site` — shop intro, featured product, MCP chip status
- `describe_page` — current page context (only WebMCP)
- `list_products` — catalog with stock
- `get_product` — one SKU, restock hint if sold out
- `get_cart` — bag contents
- `get_shop_status` — sold-out SKUs, restock timers

**Mutating**
- `add_to_cart` — sku + qty, fails clearly if stock too low
- `buy_item` — one-step purchase (sku + qty)
- `checkout` — purchase cart

**Sensitive**
- `buy_item` and `checkout` **decrement shared stock immediately**
- Marked `consequential: true` in schema
- Never silent—require explicit agent action
- No payment processing (demo mode)

**Administrative**
- `reset` — restore seed stock (gated, only if explicitly requested)

## WebMCP Integration

The page registers tools on `document.modelContext` when:
- Native Chrome WebMCP exists (flag: `chrome://flags/#enable-webmcp-testing` or origin trial 149+), OR
- Polyfill loaded from `shared/webmcp-polyfill.js` (GoogleChromeLabs/webmcp-tools, Apache-2.0)

**Status Chip** (`#mcp-chip`) shows:
- `WebMCP live` — native browser API
- `WebMCP polyfill` — official polyfill active
- `Demo agent (fallback)` — neither present, on-page panel only

## Pass Page

`pass.html` — mobile-friendly prompt copy page with QR code. Humans scan on their phone, copy prompt, paste into their agent (Grok, Claude, ChatGPT). Agent calls tools via WebMCP or REST.

## Jobs To Be Done

1. **List / discover products** — agent sees catalog + stock
2. **Get product details** — price, flavor, availability
3. **Cart management** — add items, review bag
4. **Buy** — checkout cart OR one-step `buy_item`
5. **Status check** — sold-out items, restock timers
6. **Watch shelf** — agent tells human to keep tab visible, shelf animates on buy

## Voice & Tone

**Foresight boutique**: spare, confident, tactile, considered, unadorned, essential, patient, honest

**Sample phrases from the site**:
- "The shelf restocks itself."
- "A small paper shop."
- "Stoneware with a rust ring at the lip. Holds heat like it means it."
- "For lists that outlast the week."
- "Lights the doorway, not the room."
- "The bag that disappears."
- "A measured hour of quiet."
- "Needs a sill and patience."
- "Keeps paper, and the shelf, honest."
- "For the long game."

Agent responses adopt **dry-spark**: boutique precision with a live-feed urgency. Facts first, then a brief aside (delight) if included. Never generic enthusiasm. Rotate tone (wry / warm / curious / deadpan / quiet). One emoji max. No GIFs unless owned.

## Reset

`POST /reset` restores seed stock (Signal Mug at 2, etc.). Gated—only call if explicitly requested. Clears server state, triggers page resync.
