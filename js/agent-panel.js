/* Foresight fallback agent panel — same tools, no chatbot. */
(function (global) {
  "use strict";

  var open = false;
  var logEl;

  function $(id) {
    return document.getElementById(id);
  }

  function slug(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\bthe signal mugs?\b/g, "signal-mug")
      .replace(/\bsignal mugs?\b/g, "signal-mug")
      .replace(/\bthe mug\b/g, "signal-mug")
      .replace(/\bthreshold lamps?\b/g, "threshold-lamp")
      .replace(/\bfield ledgers?\b/g, "field-ledger")
      .replace(/\bday totes?\b/g, "day-tote")
      .replace(/\bwick hours?\b/g, "wick-hour")
      .replace(/\btable decks?\b/g, "table-deck")
      .replace(/\bwindow ferns?\b/g, "window-fern")
      .replace(/\bshelf weights?\b/g, "shelf-weight")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function resolveSku(raw) {
    var s = slug(raw);
    var list = global.shop.list();
    var i, p, nameSlug;
    if (s === "mug" || s === "the-mug") return "signal-mug";
    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.id === s || p.sku === s) return p.id;
      nameSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (nameSlug === s) return p.id;
      if (p.name.toLowerCase().indexOf(String(raw).trim().toLowerCase()) !== -1) return p.id;
    }
    return s;
  }

  function parse(text) {
    var t = String(text || "").trim();
    if (!t) return null;
    var lower = t.toLowerCase();
    var m;

    if (/^(list|shelf|products|catalog)\b/.test(lower)) {
      return { name: "list_products", args: {} };
    }
    if (/^(cart|bag)\b/.test(lower)) {
      return { name: "get_cart", args: {} };
    }
    if (/^checkout\b/.test(lower)) {
      return { name: "checkout", args: {} };
    }
    if (/^(status|shop status)\b/.test(lower)) {
      return { name: "get_shop_status", args: {} };
    }

    m = lower.match(/^get[_ ]product\s+(.+)/);
    if (m) return { name: "get_product", args: { sku: resolveSku(m[1]) } };

    m = lower.match(/^buy\s+both\s+(.+)/);
    if (m) {
      var skuBoth = resolveSku(m[1]);
      var got = global.shop.get(skuBoth);
      var qtyBoth = got.ok ? Math.max(1, got.product.stock) : 2;
      return { name: "buy_item", args: { sku: skuBoth, qty: qtyBoth } };
    }

    m = lower.match(/^buy\s+(\d+)\s*x\s+(.+)/);
    if (m) return { name: "buy_item", args: { sku: resolveSku(m[2]), qty: Number(m[1]) } };

    m = lower.match(/^buy\s+(\d+)\s+(.+)/);
    if (m) return { name: "buy_item", args: { sku: resolveSku(m[2]), qty: Number(m[1]) } };

    m = lower.match(/^(buy|add)\s+(.+)/);
    if (m) {
      var name = m[1] === "add" ? "add_to_cart" : "buy_item";
      return { name: name, args: { sku: resolveSku(m[2]), qty: 1 } };
    }

    return { name: "get_product", args: { sku: resolveSku(t) } };
  }

  function parseResult(value) {
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch (err) { return value; }
    }
    return value;
  }

  async function callTool(name, args) {
    var ctx = document.modelContext;
    if (ctx && typeof ctx.getTools === "function" && typeof ctx.executeTool === "function") {
      var listed = await ctx.getTools();
      var tool = listed.find(function (t) { return t.name === name; });
      if (tool) {
        var raw = await ctx.executeTool(tool, JSON.stringify(args || {}));
        return parseResult(raw);
      }
    }
    var tools = global.ForesightTools;
    if (!tools || typeof tools[name] !== "function") {
      return { ok: false, error: "unknown_tool", name: name };
    }
    if (name === "list_products" || name === "get_cart" || name === "checkout" || name === "get_shop_status") {
      return tools[name]();
    }
    return tools[name](args || {});
  }

  function pretty(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }

  function logLine(name, args, result) {
    if (!logEl) return;
    var empty = logEl.querySelector(".log-empty");
    if (empty) empty.remove();
    var row = document.createElement("article");
    row.className = "log-row" + (result && result.ok === false ? " is-err" : "");
    var head = document.createElement("header");
    head.textContent = name;
    var pre = document.createElement("pre");
    pre.textContent = pretty({ args: args, result: result });
    row.appendChild(head);
    row.appendChild(pre);
    logEl.insertBefore(row, logEl.firstChild);
  }

  async function runInput() {
    var field = $("agent-input");
    if (!field) return;
    var parsed = parse(field.value);
    if (!parsed) return;
    field.value = "";
    await callTool(parsed.name, parsed.args);
    field.focus();
  }

  function agentPrompt() {
    var shopUrl = document.location.href.split("#")[0];
    var api = (global.ForesightCloud && typeof global.ForesightCloud.url === "function" && global.ForesightCloud.url()) || "https://foresight-shop.marvelus.workers.dev";
    return (
      "Buy one Signal Mug from the shared Foresight shop. You do not need to be bound to the browser tab.\n\n" +
      "Shop (keep this open on screen): " + shopUrl + "\n" +
      "Shared inventory API: " + api + "\n\n" +
      "1. GET " + api + "/state and note Signal Mug stock.\n" +
      "2. POST " + api + "/buy with header Content-Type: application/json and body {\"sku\":\"signal-mug\",\"qty\":1}\n" +
      "3. Confirm remaining dropped. The open shop tab should update within about 2 seconds.\n\n" +
      "If you can call WebMCP / page tools instead, use buy_item with sku signal-mug and qty 1."
    );
  }

  function copyPrompt() {
    var text = agentPrompt();
    var btn = $("agent-copy");
    function ok() {
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = prev; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        fallbackCopy(text);
        ok();
      });
    } else {
      fallbackCopy(text);
      ok();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function setOpen(next) {
    open = next;
    var panel = $("agent-panel");
    var back = $("agent-backdrop");
    var btn = $("agent-open");
    if (!panel) return;
    panel.hidden = !open;
    if (back) back.hidden = !open;
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("agent-open", open);
    if (open) {
      var field = $("agent-input");
      if (field) field.focus();
    }
  }

  function bind() {
    logEl = $("agent-log");
    var openBtn = $("agent-open");
    var closeBtn = $("agent-close");
    var back = $("agent-backdrop");
    var form = $("agent-form");
    var copyBtn = $("agent-copy");

    if (openBtn) openBtn.addEventListener("click", function () { setOpen(!open); });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    if (back) back.addEventListener("click", function () { setOpen(false); });
    if (copyBtn) copyBtn.addEventListener("click", copyPrompt);
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        runInput();
      });
    }

    document.addEventListener("shop:tool", function (e) {
      var d = e.detail || {};
      logLine(d.name || "tool", d.args, d.result);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) setOpen(false);
    });

    async function hintTools() {
      var hint = document.querySelector(".agent-hint");
      var ctx = document.modelContext;
      if (!hint || !ctx || typeof ctx.getTools !== "function") return;
      try {
        var listed = await ctx.getTools();
        var names = listed.map(function (t) { return t.name; }).filter(Boolean);
        if (names.length) {
          hint.innerHTML = "Tools: <code>" + names.join("</code>, <code>") + "</code>. Try <code>list</code>, <code>buy 2x signal-mug</code>, <code>cart</code>, <code>checkout</code>.";
        }
      } catch (err) { /* ignore */ }
    }

    hintTools();
    if (document.modelContext && typeof document.modelContext.addEventListener === "function") {
      document.modelContext.addEventListener("toolchange", hintTools);
    }
    if (global.ForesightReady && typeof global.ForesightReady.then === "function") {
      global.ForesightReady.then(function () { setTimeout(hintTools, 0); });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})(window);
