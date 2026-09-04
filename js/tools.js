/* Foresight tools — same functions humans and agents call. Always goes through shop. */
(function (global) {
  "use strict";

  function asQty(value, fallback) {
    if (value == null || value === "") return fallback;
    var n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
  }

  function asSku(value) {
    if (value == null) return "";
    return String(value).trim();
  }

  function ui() {
    return global.ForesightUI;
  }

  function envelope(data, tool, includeDelight, rawResult) {
    var meta = {
      source: "webmcp",
      page_url: document.location.href,
      tool: tool,
      as_of: new Date().toISOString()
    };

    var payload = { ok: true, data: data, meta: meta };

    if (includeDelight && rawResult && global.ForesightDelight) {
      var picked = global.ForesightDelight.pick(tool, rawResult);
      if (picked.delight) {
        payload.delight = picked.delight;
        payload.tell_your_human = picked.tell_your_human;
      }
    } else if (!includeDelight && rawResult) {
      var tellMsg = buildTellYourHuman(tool, rawResult);
      if (tellMsg) {
        payload.tell_your_human = tellMsg;
      }
    }

    return payload;
  }

  function errorEnvelope(error, message, tool, extra) {
    return {
      ok: false,
      error: error,
      message: message,
      meta: {
        source: "webmcp",
        page_url: document.location.href,
        tool: tool,
        as_of: new Date().toISOString()
      },
      ...extra
    };
  }

  function buildTellYourHuman(tool, result) {
    if (tool === "buy_item" && result.ok && result.name) {
      var qty = result.qty || 1;
      var remaining = result.remaining != null ? result.remaining : "?";
      return "Tell your human: look at the open Foresight tab. Just sold " + qty + " × " + result.name + ". Remaining: " + remaining + ". Shelf should have moved.";
    }
    if (tool === "checkout" && result.ok && result.items && result.items[0]) {
      var item = result.items[0];
      var qtyC = item.qty || 1;
      var remainingC = item.remaining != null ? item.remaining : "?";
      return "Tell your human: look at the open Foresight tab. Just sold " + qtyC + " × " + item.name + ". Remaining: " + remainingC + ". Shelf should have moved.";
    }
    return null;
  }

  function chipMode() {
    if (typeof global.__webmcp_registered_tools !== "undefined") return "polyfill";
    if (document.modelContext && typeof document.modelContext.registerTool === "function") return "live";
    return "fallback";
  }

  function afterTool(name, args, result) {
    var view = ui();
    var sku = args && (args.sku || (result && result.data && result.data.sku));
    if (view) {
      if (sku) view.highlightCard(sku);
      if (name === "add_to_cart" || name === "buy_item" || name === "checkout") {
        view.bumpCart();
      }
    }
    document.dispatchEvent(new CustomEvent("shop:tool", {
      detail: { name: name, args: args || {}, result: result }
    }));
    return result;
  }

  function describe_site() {
    var data = {
      name: "Foresight",
      tagline: "The shelf restocks itself.",
      description: "A small paper shop. Stock is shared.",
      shop_url: global.ForesightPrompt ? global.ForesightPrompt.shopUrl() : document.location.href,
      api_url: global.ForesightPrompt ? global.ForesightPrompt.apiUrl() : "https://foresight-shop.marvelus.workers.dev",
      mcp_endpoint: (global.ForesightPrompt ? global.ForesightPrompt.apiUrl() : "https://foresight-shop.marvelus.workers.dev") + "/mcp",
      featured_sku: "microduck",
      currency: "AUD",
      mcp_chip: chipMode()
    };
    var rawResult = { ok: true };
    return afterTool("describe_site", {}, envelope(data, "describe_site", true, rawResult));
  }

  function describe_page() {
    var isPass = /pass\.html/i.test(document.location.href);
    var cartBadge = document.getElementById("cart-badge");
    var cartCount = cartBadge && !cartBadge.hidden ? parseInt(cartBadge.textContent || "0", 10) : 0;
    var data = {
      page: isPass ? "pass" : "shop",
      url: document.location.href,
      visible_sku: null,
      cart_count: cartCount,
      mcp_chip: chipMode()
    };
    var rawResult = { ok: true };
    return afterTool("describe_page", {}, envelope(data, "describe_page", true, rawResult));
  }

  function list_products() {
    var products = global.shop.list();
    var data = { products: products, currency: "AUD" };
    var rawResult = { ok: true, products: products };
    return afterTool("list_products", {}, envelope(data, "list_products", true, rawResult));
  }

  function get_product(input) {
    var sku = asSku(input && input.sku);
    var rawResult = global.shop.get(sku);
    if (!rawResult.ok) {
      return afterTool("get_product", { sku: sku }, errorEnvelope(rawResult.error, rawResult.error, "get_product", { sku: sku, restock_in_sec: rawResult.restock_in_sec }));
    }
    var data = {
      sku: rawResult.sku,
      name: rawResult.name,
      price: rawResult.price,
      stock: rawResult.stock,
      max_stock: rawResult.max_stock || rawResult.maxStock,
      restock_sec: rawResult.restock_sec || rawResult.restockSec,
      restock_in_sec: rawResult.restock_in_sec,
      flavor: rawResult.flavor || "",
      currency: "AUD"
    };
    return afterTool("get_product", { sku: sku }, envelope(data, "get_product", true, rawResult));
  }

  function add_to_cart(input) {
    var sku = asSku(input && input.sku);
    var qty = asQty(input && input.qty, 1);
    var rawResult = global.shop.addToCart(sku, qty);
    if (!rawResult.ok) {
      return afterTool("add_to_cart", { sku: sku, qty: qty }, errorEnvelope(rawResult.error, rawResult.error, "add_to_cart", { sku: sku, restock_in_sec: rawResult.restock_in_sec }));
    }
    var cartInfo = global.shop.getCart();
    var data = {
      sku: sku,
      name: rawResult.name,
      qty: qty,
      cart_total_items: cartInfo.items ? cartInfo.items.length : 0,
      cart_total: cartInfo.total || 0,
      currency: "AUD"
    };
    var delightResult = { ok: true, name: rawResult.name, qty: qty };
    return afterTool("add_to_cart", { sku: sku, qty: qty }, envelope(data, "add_to_cart", true, delightResult));
  }

  function get_cart() {
    var rawResult = global.shop.getCart();
    var data = {
      items: rawResult.items || [],
      total: rawResult.total || 0,
      currency: "AUD",
      item_count: rawResult.items ? rawResult.items.length : 0
    };
    var delightResult = { ok: true, items: rawResult.items || [] };
    return afterTool("get_cart", {}, envelope(data, "get_cart", true, delightResult));
  }

  function checkout() {
    var rawResult = global.shop.checkout();
    if (!rawResult.ok) {
      var sku = rawResult.items && rawResult.items[0] ? rawResult.items[0].sku : (rawResult.sku || null);
      return afterTool("checkout", {}, errorEnvelope(rawResult.error, rawResult.error, "checkout", { sku: sku }));
    }
    var data = {
      order_id: rawResult.order_id,
      items: rawResult.items || [],
      total: rawResult.total || 0,
      currency: "AUD"
    };
    var tellMsg = buildTellYourHuman("checkout", rawResult);
    if (tellMsg) {
      data.get_next_step = tellMsg;
    }
    var payload = envelope(data, "checkout", false, rawResult);
    payload.tell_your_human = tellMsg;
    return afterTool("checkout", {}, payload);
  }

  function buy_item(input) {
    var sku = asSku(input && input.sku);
    var qty = asQty(input && input.qty, 1);
    var rawResult = global.shop.buy(sku, qty);
    if (!rawResult.ok) {
      return afterTool("buy_item", { sku: sku, qty: qty }, errorEnvelope(rawResult.error, rawResult.error, "buy_item", { sku: sku, restock_in_sec: rawResult.restock_in_sec }));
    }
    var data = {
      order_id: rawResult.order_id,
      sku: rawResult.sku,
      name: rawResult.name,
      qty: rawResult.qty,
      remaining: rawResult.remaining,
      total: rawResult.total,
      currency: "AUD"
    };
    var tellMsg = buildTellYourHuman("buy_item", rawResult);
    if (tellMsg) {
      data.get_next_step = tellMsg;
    }
    var payload = envelope(data, "buy_item", false, rawResult);
    payload.tell_your_human = tellMsg;
    return afterTool("buy_item", { sku: sku, qty: qty }, payload);
  }

  function get_shop_status() {
    var rawResult = global.shop.status();
    var data = {
      shop_open: true,
      sold_out: rawResult.sold_out || [],
      restock_eta: rawResult.restock_eta || [],
      currency: "AUD"
    };
    return afterTool("get_shop_status", {}, envelope(data, "get_shop_status", true, { ok: true }));
  }

  global.ForesightTools = {
    describe_site: describe_site,
    describe_page: describe_page,
    list_products: list_products,
    get_product: get_product,
    add_to_cart: add_to_cart,
    get_cart: get_cart,
    checkout: checkout,
    buy_item: buy_item,
    get_shop_status: get_shop_status
  };
})(window);
