/* Foresight WebMCP — live Chrome Imperative API when document.modelContext exists. */
(function (global) {
  "use strict";

  function jsonResult(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function wrap(fn) {
    return async function execute(args, _meta) {
      var result = fn(args || {});
      return jsonResult(result);
    };
  }

  function chipMode() {
    // Polyfill sets window.__webmcp_registered_tools; native Chrome does not.
    if (typeof global.__webmcp_registered_tools !== "undefined") return "polyfill";
    if (document.modelContext && typeof document.modelContext.registerTool === "function") return "live";
    return "fallback";
  }

  function setChip(mode) {
    mode = mode || chipMode();
    if (global.ForesightUI && global.ForesightUI.setChip) {
      global.ForesightUI.setChip(mode);
    } else {
      var chip = document.getElementById("mcp-chip");
      if (!chip) return;
      if (mode === "live") {
        chip.textContent = "WebMCP live";
        chip.setAttribute("data-state", "live");
      } else if (mode === "polyfill") {
        chip.textContent = "WebMCP polyfill";
        chip.setAttribute("data-state", "polyfill");
      } else {
        chip.textContent = "Demo agent (fallback)";
        chip.setAttribute("data-state", "fallback");
      }
    }
  }

  async function register() {
    var ctx = document.modelContext;
    if (!ctx || typeof ctx.registerTool !== "function") {
      setChip("fallback");
      return;
    }

    var tools = global.ForesightTools;
    var defs = [
      {
        name: "list_products",
        description: "List items for sale with sku, name, price in AUD, stock, and a one-line why-it-exists. After calling, read tell_your_human and say that sentence to the person watching the shop tab.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.list_products(); })
      },
      {
        name: "get_product",
        description: "Get one product by sku or name. Includes stock and restock_in_sec if sold out.",
        inputSchema: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Product sku, e.g. signal-mug" }
          },
          required: ["sku"]
        },
        execute: wrap(function (args) { return tools.get_product(args); })
      },
      {
        name: "add_to_cart",
        description: "Add a product to the bag. Fails with sold_out if stock is too low. Does not charge.",
        inputSchema: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Product sku" },
            qty: { type: "integer", description: "Quantity to add", default: 1 }
          },
          required: ["sku"]
        },
        execute: wrap(function (args) { return tools.add_to_cart(args); })
      },
      {
        name: "get_cart",
        description: "Return bag line items, quantities, and total in AUD.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.get_cart(); })
      },
      {
        name: "checkout",
        description: "Purchase everything in the bag. Decrements stock, returns a receipt. No payment is taken. Then tell the person watching the shop tab to look at the shelf. Read tell_your_human aloud.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.checkout(); })
      },
      {
        name: "buy_item",
        description: "Buy a product now: add and checkout in one step. Use sku signal-mug to buy the Signal Mug. Then tell the person watching the open shop tab to look at the shelf. Read tell_your_human aloud.",
        inputSchema: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Product sku, e.g. signal-mug" },
            qty: { type: "integer", description: "Quantity to buy", default: 1 }
          },
          required: ["sku"]
        },
        execute: wrap(function (args) { return tools.buy_item(args); })
      },
      {
        name: "get_shop_status",
        description: "Shop open state, sold-out skus, and seconds until restock.",
        inputSchema: { type: "object", properties: {} },
        execute: wrap(function () { return tools.get_shop_status(); })
      }
    ];

    try {
      for (var i = 0; i < defs.length; i++) {
        await ctx.registerTool(defs[i]);
      }
      setChip(chipMode());
    } catch (err) {
      setChip(chipMode());
    }
  }

  function bindDeclarativeForm() {
    var form = document.getElementById("mcp-buy-mug");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var qty = 1;
      var sku = "signal-mug";
      try {
        var fd = new FormData(form);
        if (fd.get("sku")) sku = String(fd.get("sku"));
        if (fd.get("qty")) qty = Number(fd.get("qty")) || 1;
      } catch (err) { /* ignore */ }
      var result = global.ForesightTools.buy_item({ sku: sku, qty: qty });
      if (e.agentInvoked && typeof e.respondWith === "function") {
        e.respondWith(Promise.resolve(jsonResult(result)));
      }
    });
  }

  function start() {
    bindDeclarativeForm();
    register();
  }

  if (global.ForesightReady && typeof global.ForesightReady.then === "function") {
    global.ForesightReady.then(start);
  } else {
    start();
  }
})(window);
