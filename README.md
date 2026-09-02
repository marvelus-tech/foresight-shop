# Foresight

Live: `https://marvelus-tech.github.io/foresight-shop/`

A small shop. The shelf restocks itself.

Paste this page into your own agent. The page registers tools on `document.modelContext`. GitHub Pages loads the official [WebMCP polyfill](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/demos/shared/webmcp-polyfill.js) (Apache-2.0, Google LLC) so tools work without the Chrome flag. The polyfill no-ops when native WebMCP is present. The on-page Agent panel uses `document.modelContext.getTools` + `executeTool` (same pattern as [Page Agent](https://googlechromelabs.github.io/webmcp-tools/demos/page-agent/)); no Gemini API key.

Stock is shared across visitors. The page polls `https://foresight-shop.marvelus.workers.dev/state` and writes buys to `POST /buy`. Same-browser tabs still sync instantly via BroadcastChannel.

## 60-second demo

Presenter: shop tab + agent.

1. Point at stock **2** on **Signal Mug**.
2. Agent: *Buy both Signal Mugs.*
3. Shop: stock **0**, sold out, cart/receipt.
4. Wait ~30s without touching it. Stock returns. Optional toast **Shipment in**.
5. If the chip reads **WebMCP live**, native Chrome tools are on. If it reads **WebMCP polyfill**, the official polyfill is serving `registerTool` / `executeTool`. Use the on-page panel either way and say those are the same functions an agent would call.

## Chrome flag

`chrome://flags/#enable-webmcp-testing`

Origin trial also exists from Chrome 149.

## Copy-paste agent prompt

```
Buy one Signal Mug from the shared Foresight shop. You do not need to be bound to the browser tab.

Shop (keep this open on screen): https://marvelus-tech.github.io/foresight-shop/
Shared inventory API: https://foresight-shop.marvelus.workers.dev

1. GET https://foresight-shop.marvelus.workers.dev/state and note Signal Mug stock.
2. POST https://foresight-shop.marvelus.workers.dev/buy with header Content-Type: application/json and body {"sku":"signal-mug","qty":1}
3. Confirm remaining dropped. The open shop tab should update within about 2 seconds.

If you can call WebMCP / page tools instead, use buy_item with sku signal-mug and qty 1.
```

The Agent panel **Copy prompt for my agent** button copies this with the live URL filled in.

## Tools

| Name | Does |
|---|---|
| `list_products` | Catalog + stock |
| `get_product` | One SKU, blurb, restock hint if sold out |
| `add_to_cart` | `sku`, `qty`. Fails clearly if stock is too low |
| `get_cart` | Lines and totals |
| `checkout` | Buy the bag. Decrements stock. Receipt. No payment |
| `buy_item` | Shortcut: `sku` + `qty`, add and checkout |
| `get_shop_status` | Open/sold out + seconds until restock |

Humans can also click **Buy** on a card. Same path.

On-page panel also accepts: `list`, `cart`, `checkout`, `buy 2x signal-mug`, `buy both signal mugs`.

## Shared shelf API

`https://foresight-shop.marvelus.workers.dev`

| Method | Path | Body |
|---|---|---|
| `GET` | `/state` | catalog + stock |
| `POST` | `/buy` | `{ "sku": "signal-mug", "qty": 1 }` |
| `POST` | `/reset` | restore seed stock (Signal Mug at 2) |

CORS is open. Any agent that can make HTTP calls can buy.

## Reset

**How this demo works → Reset demo** restores starting stock (Signal Mug at 2) and clears the bag.

## Polyfill

Vendored at `shared/webmcp-polyfill.js` from [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/demos/shared/webmcp-polyfill.js). Apache-2.0.

## Publish

Static files at the repo root. Push to `main`. GitHub Actions deploys Pages (`.github/workflows/pages.yml`). `.nojekyll` is included so Pages will not run Jekyll.
