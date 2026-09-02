const SEED = [
  { id: "signal-mug", name: "Signal Mug", price: 48, stock: 2, maxStock: 6, restockSec: 30 },
  { id: "threshold-lamp", name: "Threshold Lamp", price: 186, stock: 3, maxStock: 4, restockSec: 40 },
  { id: "field-ledger", name: "Field Ledger", price: 32, stock: 5, maxStock: 8, restockSec: 22 },
  { id: "day-tote", name: "Day Tote", price: 64, stock: 4, maxStock: 6, restockSec: 28 },
  { id: "wick-hour", name: "Wick Hour", price: 42, stock: 4, maxStock: 8, restockSec: 24 },
  { id: "table-deck", name: "Table Deck", price: 28, stock: 6, maxStock: 10, restockSec: 20 },
  { id: "window-fern", name: "Window Fern", price: 54, stock: 3, maxStock: 5, restockSec: 36 },
  { id: "shelf-weight", name: "Shelf Weight", price: 38, stock: 5, maxStock: 7, restockSec: 26 }
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

const SHOP = "https://marvelus-tech.github.io/foresight-shop/";
const API = "https://foresight-shop.marvelus.workers.dev";
const FOR_AGENT = "You are shopping for a human who has the Foresight shop open. GET /state, then POST /buy {sku, qty}. Featured SKU: signal-mug. After a buy, tell your human to look at the open shop tab and quote remaining stock. Do not wait for more instructions. Read tell_your_human aloud.";

function agentHint(state) {
  if (state && state.lastSale && state.lastSale.name) {
    return "Tell your human: look at the open Foresight tab. Just sold " + state.lastSale.qty + " \u00d7 " + state.lastSale.name + ". Remaining: " + state.lastSale.remaining + ".";
  }
  return "Tell your human to keep the Foresight shop tab visible. A buy will move the shelf within about 2 seconds.";
}


function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}

function seedState() {
  const products = {};
  for (const p of SEED) {
    products[p.id] = { ...p, restockAt: null };
  }
  return { rev: 1, products, lastSale: null, orderSeq: 1 };
}

function applyRestocks(state) {
  const now = Date.now();
  let changed = false;
  for (const p of Object.values(state.products)) {
    if (p.stock <= 0 && p.restockAt && p.restockAt <= now) {
      const span = Math.max(0, p.maxStock - 2);
      p.stock = 2 + Math.floor(Math.random() * (span + 1));
      p.restockAt = null;
      changed = true;
    }
  }
  if (changed) state.rev += 1;
  return state;
}

async function load(env) {
  const raw = await env.STOCK.get("state", { type: "json" });
  const state = raw && raw.products ? raw : seedState();
  return applyRestocks(state);
}

async function save(env, state) {
  await env.STOCK.put("state", JSON.stringify(state));
  return state;
}

function publicState(state) {
  const products = Object.values(state.products).map((p) => ({
    sku: p.id,
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    maxStock: p.maxStock,
    restockSec: p.restockSec,
    restock_in_sec: p.stock <= 0 && p.restockAt ? Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000)) : null
  }));
  return {
    ok: true,
    rev: state.rev,
    lastSale: state.lastSale,
    products,
    for_agent: FOR_AGENT,
    tell_your_human: agentHint(state)
  };
}

function find(state, sku) {
  if (!sku) return null;
  const key = String(sku).trim().toLowerCase();
  if (state.products[key]) return state.products[key];
  for (const p of Object.values(state.products)) {
    if (p.name.toLowerCase() === key) return p;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (slug === key) return p;
  }
  return null;
}

async function buy(env, sku, qty) {
  qty = Math.floor(Number(qty));
  if (!Number.isFinite(qty) || qty < 1) return { ok: false, error: "invalid_qty", sku };
  const state = await load(env);
  const p = find(state, sku);
  if (!p) return { ok: false, error: "not_found", sku };
  if (p.stock < qty) {
    const eta = p.restockAt ? Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000)) : 30;
    return {
      ok: false,
      error: "sold_out",
      sku: p.id,
      restock_in_sec: p.restockAt ? eta : null,
      tell_your_human: "Tell your human: that item is sold out on the open Foresight tab. It restocks in about " + eta + " seconds."
    };
  }
  p.stock -= qty;
  if (p.stock === 0) p.restockAt = Date.now() + p.restockSec * 1000;
  state.rev += 1;
  const order_id = "FS-" + String(state.orderSeq++).padStart(4, "0");
  state.lastSale = { sku: p.id, name: p.name, qty, remaining: p.stock, order_id, at: Date.now() };
  await save(env, state);
  return {
    ok: true,
    order_id,
    sku: p.id,
    name: p.name,
    qty,
    remaining: p.stock,
    total: p.price * qty,
    currency: "AUD",
    ...publicState(state)
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (request.method === "GET" && path === "/instructions") {
        return json({
          ok: true,
          shop: SHOP,
          api: API,
          featured: "signal-mug",
          for_agent: FOR_AGENT,
          tell_your_human: "Tell your human to keep the Foresight shop tab visible. A buy will move the shelf within about 2 seconds.",
          prompt: [
            "You are shopping for a human who has the Foresight shop open on another screen.",
            "Shop: " + SHOP,
            "API: " + API,
            "1. GET " + API + "/state and note Signal Mug stock.",
            "2. POST " + API + "/buy with Content-Type application/json and body {\"sku\":\"signal-mug\",\"qty\":1}",
            "3. Tell your human, in one short sentence, to look at the open Foresight tab. Quote remaining stock."
          ].join("\n")
        });
      }
      if (request.method === "GET" && (path === "/" || path === "/state")) {
        const state = await save(env, await load(env));
        return json(publicState(state));
      }
      if (request.method === "POST" && path === "/buy") {
        const body = await request.json().catch(() => ({}));
        return json(await buy(env, body.sku || body.id, body.qty == null ? 1 : body.qty));
      }
      if (request.method === "POST" && path === "/reset") {
        const state = seedState();
        await save(env, state);
        return json(publicState(state));
      }
      return json({ ok: false, error: "not_found", hint: "GET /state, GET /instructions, or POST /buy {sku, qty}" }, 404);
    } catch (err) {
      return json({ ok: false, error: "server", message: String(err && err.message ? err.message : err) }, 500);
    }
  }
};
