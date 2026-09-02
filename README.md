# Foresight

Live: `https://marvelus-tech.github.io/foresight-shop/`

A small shop. The shelf restocks itself.

Paste this page into your own agent. The page registers tools on `document.modelContext`. GitHub Pages loads the official [WebMCP polyfill](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/demos/shared/webmcp-polyfill.js) (Apache-2.0, Google LLC) so tools work without the Chrome flag. The polyfill no-ops when native WebMCP is present. The on-page Agent panel uses `document.modelContext.getTools` + `executeTool` (same pattern as [Page Agent](https://googlechromelabs.github.io/webmcp-tools/demos/page-agent/)); no Gemini API key.

Inventory is per-browser, not shared across visitors. This is a sim.

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
You are shopping on my behalf at https://marvelus-tech.github.io/foresight-shop/. The page exposes WebMCP tools (list_products, get_product, add_to_cart, checkout, buy_item, get_shop_status). If you can use WebMCP / page tools, buy one "Signal Mug" and confirm stock changed. If you cannot call WebMCP, tell me what you would call.
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

## Reset

**How this demo works → Reset demo** restores starting stock (Signal Mug at 2) and clears the bag.

## Polyfill

Vendored at `shared/webmcp-polyfill.js` from [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/demos/shared/webmcp-polyfill.js). Apache-2.0.

## Publish

Static files at the repo root. Push to `main`. GitHub Actions deploys Pages (`.github/workflows/pages.yml`). `.nojekyll` is included so Pages will not run Jekyll.
