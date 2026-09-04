import { pick as pickDelight } from "./delight.js";

const SEED = [
  { id: "microduck", name: "Microduck", price: 399, stock: 3, maxStock: 5, restockSec: 32, flavor: "25 cm biped from Pollen Robotics and Hugging Face. Walks, roller-skates, picks things up. Open RL stack.", image: "images/microduck.png" },
  { id: "reachy-mini-lite", name: "Reachy Mini Lite", price: 299, stock: 4, maxStock: 6, restockSec: 28, flavor: "Desktop humanoid kit. USB to your Mac or Linux. Expressive head, antennas, builder platform.", image: "images/reachy-mini-lite.png" },
  { id: "reachy-mini-wireless", name: "Reachy Mini Wireless", price: 449, stock: 2, maxStock: 4, restockSec: 40, flavor: "Onboard Pi, battery, Wi-Fi. Same Reachy Mini body, runs freer.", image: "images/reachy-mini-wireless.png" },
  { id: "switchbot-k10", name: "SwitchBot Mini Vacuum K10+", price: 400, stock: 3, maxStock: 5, restockSec: 36, flavor: "Tiny auto-empty robot vac. Fits under furniture the full-size units skip.", image: "images/switchbot-k10.png" },
  { id: "loona-petbot", name: "Loona Petbot", price: 499, stock: 3, maxStock: 5, restockSec: 34, flavor: "Wheeled GPT pet from KEYi. Face recognition, games, no subscription.", image: "images/loona-petbot.png" },
  { id: "eilik", name: "Eilik", price: 140, stock: 5, maxStock: 8, restockSec: 22, flavor: "Tiny expressive desk companion. Touch zones, offline personality, pocket size.", image: "images/eilik.png" },
  { id: "emo", name: "EMO", price: 279, stock: 4, maxStock: 6, restockSec: 26, flavor: "LivingAI desk robot. ChatGPT chat, glowing eyes, sits on your shelf.", image: "images/emo.png" },
  { id: "moflin", name: "Moflin", price: 429, stock: 3, maxStock: 5, restockSec: 30, flavor: "Soft AI pet from LivingAI. Fur, sensors, comfort companion more than gadget.", image: "images/moflin.png" }
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

const SHOP = "https://marvelus-tech.github.io/foresight-shop/";
const API = "https://foresight-shop.marvelus.workers.dev";
const FOR_AGENT = "You are shopping for a human who has the Foresight shop open. GET /state, then POST /buy {sku, qty}. Featured SKU: microduck. After a buy, tell your human to look at the open shop tab and quote remaining stock. Do not wait for more instructions. Read tell_your_human aloud.";

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
  return { state, changed };
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
    restock_in_sec: p.stock <= 0 && p.restockAt ? Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000)) : null,
    flavor: p.flavor || "",
    image: p.image || ""
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

function envelope(data, tool, source = "remote-mcp", pageUrl = SHOP, includeDelight = true, result = null) {
  const meta = {
    source,
    page_url: pageUrl,
    tool,
    as_of: new Date().toISOString()
  };

  const payload = { ok: true, data, meta };

  if (includeDelight && result) {
    const sessionId = "worker-session";
    const delight = pickDelight(tool, result, sessionId);
    if (delight.delight) {
      payload.delight = delight.delight;
      payload.tell_your_human = delight.tell_your_human;
    }
  } else if (!includeDelight && result) {
    const tellMsg = buildTellYourHuman(tool, result);
    if (tellMsg) {
      payload.tell_your_human = tellMsg;
    }
  }

  return payload;
}

function errorEnvelope(error, message, tool, source = "remote-mcp", pageUrl = SHOP, extra = {}) {
  return {
    ok: false,
    error,
    message,
    ...extra,
    meta: {
      source,
      page_url: pageUrl,
      tool,
      as_of: new Date().toISOString()
    }
  };
}

function buildTellYourHuman(tool, result) {
  if (tool === "buy_item" && result.ok && result.name) {
    const qty = result.qty || 1;
    const remaining = result.remaining != null ? result.remaining : "?";
    return `Tell your human: look at the open Foresight tab. Just sold ${qty} × ${result.name}. Remaining: ${remaining}. Shelf should have moved.`;
  }
  if (tool === "checkout" && result.ok && result.items && result.items[0]) {
    const item = result.items[0];
    const qty = item.qty || 1;
    const remaining = item.remaining != null ? item.remaining : "?";
    return `Tell your human: look at the open Foresight tab. Just sold ${qty} × ${item.name}. Remaining: ${remaining}. Shelf should have moved.`;
  }
  return null;
}

function mcpTools() {
  const footer = "Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.";
  
  return [
    {
      name: "describe_site",
      description: `Returns shop intro, featured product (Microduck), and shop/API URLs. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "list_products",
      description: `List all products with SKU, name, price (USD), stock, restock timing, and flavor text. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_product",
      description: `Get one product by SKU or name. Returns stock, price, restock hint if sold out. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Product SKU (e.g. microduck) or name" }
        },
        required: ["sku"]
      }
    },
    {
      name: "get_cart",
      description: `Returns cart line items, quantities, and total in USD. Note: cart is page-local; remote MCP calls see an empty cart unless page shares state. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "add_to_cart",
      description: `Add a product to cart. Fails clearly if stock too low. Does NOT decrement stock. Note: cart is page-local; remote MCP cannot persist cart state. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Product SKU" },
          qty: { type: "integer", description: "Quantity to add", default: 1 }
        },
        required: ["sku"]
      }
    },
    {
      name: "get_shop_status",
      description: `Returns shop open state, sold-out SKUs, and restock timers. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "buy_item",
      description: `[CONSEQUENTIAL] Buy a product now: decrements shared stock immediately. No payment processor. Use SKU microduck for Microduck. After buy, tell your human to look at the open shop tab. Read tell_your_human aloud. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {
          sku: { type: "string", description: "Product SKU (e.g. microduck)" },
          qty: { type: "integer", description: "Quantity to buy", default: 1 }
        },
        required: ["sku"]
      }
    },
    {
      name: "checkout",
      description: `[CONSEQUENTIAL] Purchase cart contents: decrements shared stock immediately. No payment processor. Note: cart is page-local; remote MCP calls will see empty cart. After checkout, tell your human to look at the open shop tab. Read tell_your_human aloud. ${footer}`,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ];
}

async function mcpDescribeSite(shelf, origin) {
  const data = {
    name: "Foresight",
    tagline: "The shelf restocks itself.",
    description: "A robotics shop. Stock is shared.",
    shop_url: SHOP,
    api_url: API,
    mcp_endpoint: `${API}/mcp`,
    featured_sku: "microduck",
    currency: "USD"
  };
  return envelope(data, "describe_site", "remote-mcp", origin, true, { ok: true });
}

async function mcpListProducts(shelf, origin) {
  const state = await shelf.load();
  const products = Object.values(state.products).map(p => ({
    sku: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    max_stock: p.maxStock,
    restock_sec: p.restockSec,
    restock_in_sec: p.stock <= 0 && p.restockAt ? Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000)) : null,
    flavor: p.flavor || "",
    image: p.image || ""
  }));
  const data = { products, currency: "USD" };
  return envelope(data, "list_products", "remote-mcp", origin, true, { ok: true, products });
}

async function mcpGetProduct(shelf, origin, args) {
  const state = await shelf.load();
  const p = find(state, args.sku);
  if (!p) {
    return errorEnvelope("not_found", `Product '${args.sku}' not found.`, "get_product", "remote-mcp", origin, { sku: args.sku });
  }
  const data = {
    sku: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    max_stock: p.maxStock,
    restock_sec: p.restockSec,
    restock_in_sec: p.stock <= 0 && p.restockAt ? Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000)) : null,
    flavor: p.flavor || "",
    image: p.image || "",
    currency: "USD"
  };
  const result = { ok: true, ...data };
  return envelope(data, "get_product", "remote-mcp", origin, true, result);
}

async function mcpGetCart(shelf, origin, args) {
  const data = {
    items: [],
    total: 0,
    currency: "USD",
    item_count: 0,
    note: "Cart is page-local. Remote MCP cannot access page cart state."
  };
  return envelope(data, "get_cart", "remote-mcp", origin, true, { ok: true, items: [] });
}

async function mcpAddToCart(shelf, origin, args) {
  return errorEnvelope(
    "not_supported",
    "add_to_cart requires page context. Use buy_item for direct purchase via remote MCP.",
    "add_to_cart",
    "remote-mcp",
    origin
  );
}

async function mcpGetShopStatus(shelf, origin, args) {
  const state = await shelf.load();
  const soldOut = [];
  const restockEta = [];
  for (const p of Object.values(state.products)) {
    if (p.stock <= 0) {
      soldOut.push(p.id);
      if (p.restockAt) {
        restockEta.push({
          sku: p.id,
          restock_in_sec: Math.max(0, Math.ceil((p.restockAt - Date.now()) / 1000))
        });
      }
    }
  }
  const data = {
    shop_open: true,
    sold_out: soldOut,
    restock_eta: restockEta,
    currency: "USD"
  };
  return envelope(data, "get_shop_status", "remote-mcp", origin, true, { ok: true });
}

async function mcpBuyItem(shelf, origin, args) {
  const sku = args.sku;
  const qty = args.qty != null ? Math.floor(Number(args.qty)) : 1;
  if (!Number.isFinite(qty) || qty < 1) {
    return errorEnvelope("invalid_qty", "Quantity must be a positive integer.", "buy_item", "remote-mcp", origin, { sku });
  }
  
  const result = await shelf.buy(sku, qty);
  
  if (!result.ok) {
    if (result.error === "sold_out") {
      return errorEnvelope(
        "sold_out",
        `${result.sku} is sold out. Restocks in ${result.restock_in_sec || 30} seconds.`,
        "buy_item",
        "remote-mcp",
        origin,
        { sku: result.sku, restock_in_sec: result.restock_in_sec }
      );
    }
    return errorEnvelope(result.error, result.error, "buy_item", "remote-mcp", origin, { sku });
  }
  
  const data = {
    order_id: result.order_id,
    sku: result.sku,
    name: result.name,
    qty: result.qty,
    remaining: result.remaining,
    total: result.total,
    currency: result.currency
  };
  
  const tellMsg = buildTellYourHuman("buy_item", result);
  data.get_next_step = tellMsg;
  
  const payload = envelope(data, "buy_item", "remote-mcp", origin, false, result);
  payload.tell_your_human = tellMsg;
  return payload;
}

async function mcpCheckout(shelf, origin, args) {
  return errorEnvelope(
    "not_supported",
    "checkout requires page context (cart is page-local). Use buy_item for direct purchase via remote MCP.",
    "checkout",
    "remote-mcp",
    origin
  );
}

async function handleMcpToolCall(shelf, method, params, origin) {
  const args = params?.arguments || params || {};
  
  switch (method) {
    case "describe_site":
      return await mcpDescribeSite(shelf, origin);
    case "list_products":
      return await mcpListProducts(shelf, origin);
    case "get_product":
      return await mcpGetProduct(shelf, origin, args);
    case "get_cart":
      return await mcpGetCart(shelf, origin, args);
    case "add_to_cart":
      return await mcpAddToCart(shelf, origin, args);
    case "get_shop_status":
      return await mcpGetShopStatus(shelf, origin, args);
    case "buy_item":
      return await mcpBuyItem(shelf, origin, args);
    case "checkout":
      return await mcpCheckout(shelf, origin, args);
    default:
      throw new Error(`Unknown tool: ${method}`);
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowed = [
    "https://marvelus-tech.github.io",
    "http://localhost",
    "http://127.0.0.1"
  ];
  return allowed.some(base => origin.startsWith(base));
}

async function handleMcpRequest(request, env) {
  const origin = request.headers.get("origin") || SHOP;
  
  if (!isAllowedOrigin(origin)) {
    return json({ error: "forbidden", message: "Origin not allowed" }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ 
      jsonrpc: "2.0", 
      error: { code: -32700, message: "Parse error" }, 
      id: null 
    }, 400);
  }

  const { jsonrpc, method, params, id } = body;

  if (jsonrpc !== "2.0") {
    return json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request: jsonrpc must be 2.0" },
      id: id || null
    }, 400);
  }

  try {
    if (method === "tools/list") {
      return json({
        jsonrpc: "2.0",
        result: { tools: mcpTools() },
        id
      });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      if (!toolName) {
        return json({
          jsonrpc: "2.0",
          error: { code: -32602, message: "Invalid params: name required" },
          id
        }, 400);
      }

      const stub = env.SHELF.get(env.SHELF.idFromName("foresight"));
      const shelf = { 
        async load() {
          const stateReq = new Request("https://do/state", { method: "GET" });
          const stateRes = await stub.fetch(stateReq);
          const stateData = await stateRes.json();
          // publicState returns { ok, rev, lastSale, products, for_agent, tell_your_human }
          // Transform products array back to state shape
          if (stateData.products && Array.isArray(stateData.products)) {
            const productsMap = {};
            for (const p of stateData.products) {
              productsMap[p.id] = {
                id: p.id,
                name: p.name,
                price: p.price,
                stock: p.stock,
                maxStock: p.maxStock,
                restockSec: p.restockSec,
                flavor: p.flavor || "",
                restockAt: p.restock_in_sec ? Date.now() + (p.restock_in_sec * 1000) : null
              };
            }
            return {
              rev: stateData.rev,
              products: productsMap,
              lastSale: stateData.lastSale,
              orderSeq: stateData.orderSeq || 1
            };
          }
          return stateData;
        },
        async buy(sku, qty) {
          const buyReq = new Request("https://do/buy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sku, qty })
          });
          const buyRes = await stub.fetch(buyReq);
          const buyData = await buyRes.json();
          return buyData;
        }
      };
      
      const result = await handleMcpToolCall(shelf, toolName, params, origin);

      return json({
        jsonrpc: "2.0",
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
        id
      });
    }

    return json({
      jsonrpc: "2.0",
      error: { code: -32601, message: `Method not found: ${method}` },
      id
    }, 404);

  } catch (err) {
    return json({
      jsonrpc: "2.0",
      error: { code: -32603, message: `Internal error: ${err.message}` },
      id
    }, 500);
  }
}

function instructions() {
  return json({
    ok: true,
    shop: SHOP,
    api: API,
    featured: "microduck",
    for_agent: FOR_AGENT,
    tell_your_human: "Tell your human to keep the Foresight shop tab visible. A buy will move the shelf within about 2 seconds.",
    prompt: [
      "You are shopping for a human who has the Foresight shop open on another screen.",
      "Shop: " + SHOP,
      "API: " + API,
      "1. GET " + API + "/state and note Microduck stock.",
      "2. POST " + API + "/buy with Content-Type application/json and body {\"sku\":\"microduck\",\"qty\":1}",
      "3. Tell your human, in one short sentence, to look at the open Foresight tab. Quote remaining stock."
    ].join("\n")
  });
}

export class Shelf {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async load() {
    let raw = await this.ctx.storage.get("state");
    if (!raw && this.env.STOCK) {
      try {
        raw = await this.env.STOCK.get("state", { type: "json" });
      } catch (err) {
        raw = null;
      }
    }
    const base = raw && raw.products ? raw : seedState();
    const { state, changed } = applyRestocks(base);
    if (changed) await this.ctx.storage.put("state", state);
    return state;
  }

  async buy(sku, qty) {
    qty = Math.floor(Number(qty));
    if (!Number.isFinite(qty) || qty < 1) return { ok: false, error: "invalid_qty", sku };
    const state = await this.load();
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
    await this.ctx.storage.put("state", state);
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

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "GET" && (path === "/" || path === "/state")) {
      return json(publicState(await this.load()));
    }
    if (request.method === "POST" && path === "/buy") {
      const body = await request.json().catch(() => ({}));
      return json(await this.buy(body.sku || body.id, body.qty == null ? 1 : body.qty));
    }
    if (request.method === "POST" && path === "/reset") {
      const state = seedState();
      await this.ctx.storage.put("state", state);
      return json(publicState(state));
    }
    return json({ ok: false, error: "not_found", hint: "GET /state, GET /instructions, or POST /buy {sku, qty}" }, 404);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    
    if (request.method === "GET" && path === "/.well-known/mcp.json") {
      return json({
        mcpServers: {
          "foresight-shop": {
            transportType: "streamable-http",
            url: `${API}/mcp`,
            supportsAuth: false
          }
        }
      });
    }
    
    if (request.method === "POST" && path === "/mcp") {
      return handleMcpRequest(request, env);
    }
    
    if (request.method === "GET" && path === "/instructions") {
      return instructions();
    }
    const stub = env.SHELF.get(env.SHELF.idFromName("foresight"));
    return stub.fetch(request);
  }
};
