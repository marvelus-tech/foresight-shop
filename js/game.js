/* Foresight — single owner of stock, cart, restock. UI and tools call shop.* only. */
(function (global) {
  "use strict";

  var STORAGE_KEY = "foresight-shop-v1";
  var TICK_MS = 15000;
  var NEW_STOCK_MS = 4000;
  var CURRENCY = "AUD";

  var FALLBACK_CATALOG = [
    { id: "signal-mug", name: "Signal Mug", price: 48, stock: 2, maxStock: 6, restockSec: 30, flavor: "Stoneware with a rust ring at the lip. Holds heat like it means it." },
    { id: "threshold-lamp", name: "Threshold Lamp", price: 186, stock: 3, maxStock: 4, restockSec: 40, flavor: "Brass stem, linen shade. Lights the doorway, not the room." },
    { id: "field-ledger", name: "Field Ledger", price: 32, stock: 5, maxStock: 8, restockSec: 22, flavor: "Cloth-bound, unlined. For lists that outlast the week." },
    { id: "day-tote", name: "Day Tote", price: 64, stock: 4, maxStock: 6, restockSec: 28, flavor: "Waxed canvas, one pocket, no mark. The bag that disappears." },
    { id: "wick-hour", name: "Wick Hour", price: 42, stock: 4, maxStock: 8, restockSec: 24, flavor: "Beeswax and cedar. A measured hour of quiet." },
    { id: "table-deck", name: "Table Deck", price: 28, stock: 6, maxStock: 10, restockSec: 20, flavor: "Fifty-two letterpress faces, no jokers. For the long game." },
    { id: "window-fern", name: "Window Fern", price: 54, stock: 3, maxStock: 5, restockSec: 36, flavor: "Boston fern in unglazed clay. Needs a sill and patience." },
    { id: "shelf-weight", name: "Shelf Weight", price: 38, stock: 5, maxStock: 7, restockSec: 26, flavor: "Cast iron, fist-sized. Keeps paper, and the shelf, honest." }
  ];

  var seed = FALLBACK_CATALOG.map(copy);
  var products = [];
  var cart = [];
  var restockAt = {};
  var restockTimers = {};
  var newStockUntil = {};
  var orderSeq = 1;
  var tickTimer = null;
  var ribbonTimers = {};

  function copy(p) {
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      maxStock: p.maxStock,
      restockSec: p.restockSec,
      flavor: p.flavor
    };
  }

  function now() {
    return Date.now();
  }

  var rev = 0;
  var tabId = Math.random().toString(36).slice(2, 10);
  var applyingRemote = false;
  var channel = null;
  try { channel = new BroadcastChannel("foresight-shop"); } catch (err) { channel = null; }

  function snapshot() {
    return {
      rev: rev,
      tabId: tabId,
      stock: Object.fromEntries(products.map(function (p) { return [p.id, p.stock]; })),
      cart: cart,
      restockAt: restockAt,
      orderSeq: orderSeq
    };
  }

  function persist() {
    if (!applyingRemote) rev += 1;
    var snap = snapshot();
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (err) { /* private mode */ }
    if (!applyingRemote && channel) {
      try { channel.postMessage(snap); } catch (err) { /* ignore */ }
    }
  }

  function applyRemote(saved) {
    if (!saved || !saved.stock || saved.tabId === tabId) return false;
    var fromCloud = saved.tabId === "cloud";
    if (!fromCloud && typeof saved.rev === "number" && saved.rev <= rev) return false;
    applyingRemote = true;
    if (typeof saved.rev === "number") rev = saved.rev;
    var changed = [];
    products.forEach(function (p) {
      if (typeof saved.stock[p.id] !== "number") return;
      var next = Math.max(0, Math.floor(saved.stock[p.id]));
      if (next === p.stock) return;
      changed.push({ sku: p.id, name: p.name, from: p.stock, to: next });
      var prev = p.stock;
      p.stock = next;
      if (p.stock === 0) {
        if (fromCloud) cancelRestock(p.id);
        else scheduleRestock(p, true);
      } else {
        cancelRestock(p.id);
        if (fromCloud && prev === 0) markNewStock(p.id);
      }
    });
    if (saved.restockAt && typeof saved.restockAt === "object") restockAt = saved.restockAt;
    if (typeof saved.orderSeq === "number") orderSeq = saved.orderSeq;
    applyingRemote = false;
    if (changed.length) emit("remote", { changed: changed });
    return changed.length > 0;
  }

  function startSync() {
    if (channel) {
      channel.onmessage = function (e) { applyRemote(e.data); };
    }
    global.addEventListener("storage", function (e) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try { applyRemote(JSON.parse(e.newValue)); } catch (err) { /* ignore */ }
    });
  }

  function emit(reason, extra) {
    var detail = Object.assign({ reason: reason }, extra || {});
    document.dispatchEvent(new CustomEvent("shop:change", { detail: detail }));
  }

  function findProduct(sku) {
    if (sku == null || sku === "") return null;
    var key = String(sku).trim().toLowerCase();
    var i, p, slug;
    for (i = 0; i < products.length; i++) {
      p = products[i];
      if (p.id === key) return p;
      if (p.name.toLowerCase() === key) return p;
      slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (slug === key) return p;
    }
    return null;
  }

  function restockInSec(sku) {
    var t = restockAt[sku];
    if (!t) return null;
    return Math.max(0, Math.ceil((t - now()) / 1000));
  }

  function publicProduct(p) {
    var soldOut = p.stock <= 0;
    var eta = soldOut ? restockInSec(p.id) : null;
    return {
      sku: p.id,
      id: p.id,
      name: p.name,
      price: p.price,
      currency: CURRENCY,
      stock: p.stock,
      maxStock: p.maxStock,
      restockSec: p.restockSec,
      flavor: p.flavor,
      soldOut: soldOut,
      restocking: soldOut && eta != null,
      restock_in_sec: eta,
      newStock: (newStockUntil[p.id] || 0) > now()
    };
  }

  function soldOutPayload(p) {
    return {
      ok: false,
      error: "sold_out",
      sku: p.id,
      restock_in_sec: restockInSec(p.id)
    };
  }

  function nextOrderId() {
    var id = "FS-" + String(orderSeq++).padStart(4, "0");
    persist();
    return id;
  }

  function scheduleRestock(p, fromSaved) {
    clearTimeout(restockTimers[p.id]);
    var when;
    if (fromSaved && restockAt[p.id] && restockAt[p.id] > now()) {
      when = restockAt[p.id];
    } else {
      var jitter = 0.85 + Math.random() * 0.3;
      when = now() + Math.round(p.restockSec * 1000 * jitter);
      restockAt[p.id] = when;
    }
    restockTimers[p.id] = setTimeout(function () {
      replenish(p.id);
    }, Math.max(0, when - now()));
    persist();
    emit("arriving", { sku: p.id, restock_in_sec: restockInSec(p.id) });
  }

  function cancelRestock(sku) {
    clearTimeout(restockTimers[sku]);
    delete restockTimers[sku];
    delete restockAt[sku];
  }

  function markNewStock(sku) {
    clearTimeout(ribbonTimers[sku]);
    newStockUntil[sku] = now() + NEW_STOCK_MS;
    ribbonTimers[sku] = setTimeout(function () {
      delete newStockUntil[sku];
      emit("ribbon-clear", { sku: sku });
    }, NEW_STOCK_MS);
  }

  function replenish(sku) {
    var p = products.find(function (x) { return x.id === sku; });
    if (!p) return;
    if (p.stock > 0) {
      cancelRestock(sku);
      persist();
      return;
    }
    var span = Math.max(0, p.maxStock - 2);
    p.stock = 2 + Math.floor(Math.random() * (span + 1));
    cancelRestock(sku);
    markNewStock(sku);
    persist();
    emit("restock", { sku: sku, stock: p.stock, name: p.name });
  }

  function cartView() {
    var items = [];
    var total = 0;
    var count = 0;
    var i, line, p, sub;
    for (i = 0; i < cart.length; i++) {
      line = cart[i];
      p = products.find(function (x) { return x.id === line.sku; });
      if (!p) continue;
      sub = p.price * line.qty;
      total += sub;
      count += line.qty;
      items.push({
        sku: p.id,
        name: p.name,
        qty: line.qty,
        price: p.price,
        subtotal: sub,
        currency: CURRENCY
      });
    }
    return { items: items, total: total, count: count, currency: CURRENCY };
  }

  function removeFromCart(sku, qty) {
    var line = cart.find(function (l) { return l.sku === sku; });
    if (!line) return;
    if (qty == null || line.qty <= qty) {
      cart = cart.filter(function (l) { return l.sku !== sku; });
    } else {
      line.qty -= qty;
    }
  }

  var shop = {
    list: function () {
      return products.map(publicProduct);
    },

    get: function (sku) {
      var p = findProduct(sku);
      if (!p) return { ok: false, error: "not_found", sku: sku };
      return { ok: true, product: publicProduct(p) };
    },

    addToCart: function (sku, qty) {
      qty = Math.floor(Number(qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { ok: false, error: "invalid_qty", sku: sku };
      }
      var p = findProduct(sku);
      if (!p) return { ok: false, error: "not_found", sku: sku };
      var existing = cart.find(function (l) { return l.sku === p.id; });
      var already = existing ? existing.qty : 0;
      if (p.stock < already + qty) {
        if (p.stock <= 0) return soldOutPayload(p);
        return {
          ok: false,
          error: "insufficient_stock",
          sku: p.id,
          stock: p.stock,
          restock_in_sec: restockInSec(p.id)
        };
      }
      if (existing) existing.qty += qty;
      else cart.push({ sku: p.id, qty: qty });
      persist();
      emit("cart", { sku: p.id, qty: qty, name: p.name });
      return { ok: true, added: { sku: p.id, name: p.name, qty: qty }, cart: cartView() };
    },

    getCart: function () {
      return Object.assign({ ok: true }, cartView());
    },

    checkout: function () {
      if (!cart.length) return { ok: false, error: "empty_cart" };
      var i, line, p;
      for (i = 0; i < cart.length; i++) {
        line = cart[i];
        p = products.find(function (x) { return x.id === line.sku; });
        if (!p || p.stock < line.qty) {
          return {
            ok: false,
            error: "sold_out",
            sku: line.sku,
            restock_in_sec: restockInSec(line.sku)
          };
        }
      }
      var items = [];
      var total = 0;
      var hitZero = [];
      for (i = 0; i < cart.length; i++) {
        line = cart[i];
        p = products.find(function (x) { return x.id === line.sku; });
        p.stock -= line.qty;
        if (p.stock < 0) p.stock = 0;
        items.push({
          sku: p.id,
          name: p.name,
          qty: line.qty,
          price: p.price,
          subtotal: p.price * line.qty,
          remaining: p.stock
        });
        total += p.price * line.qty;
        if (p.stock === 0) hitZero.push(p);
      }
      cart = [];
      var order_id = nextOrderId();
      for (i = 0; i < hitZero.length; i++) scheduleRestock(hitZero[i]);
      persist();
      emit("checkout", { order_id: order_id, items: items, total: total });
      return { ok: true, order_id: order_id, items: items, total: total, currency: CURRENCY };
    },

    buy: function (sku, qty) {
      qty = Math.floor(Number(qty));
      if (!Number.isFinite(qty) || qty < 1) {
        return { ok: false, error: "invalid_qty", sku: sku };
      }
      var p = findProduct(sku);
      if (!p) return { ok: false, error: "not_found", sku: sku };
      if (p.stock < qty) return soldOutPayload(p);
      p.stock -= qty;
      if (p.stock < 0) p.stock = 0;
      removeFromCart(p.id, qty);
      var order_id = nextOrderId();
      var item = {
        sku: p.id,
        name: p.name,
        qty: qty,
        price: p.price,
        subtotal: p.price * qty,
        remaining: p.stock
      };
      if (p.stock === 0) scheduleRestock(p);
      persist();
      emit("buy", { sku: p.id, qty: qty, order_id: order_id, remaining: p.stock, name: p.name, total: item.subtotal, items: [item] });
      return {
        ok: true,
        order_id: order_id,
        sku: p.id,
        name: p.name,
        qty: qty,
        remaining: p.stock,
        items: [item],
        total: item.subtotal,
        currency: CURRENCY
      };
    },

    status: function () {
      var sold = [];
      var i, p, row;
      for (i = 0; i < products.length; i++) {
        p = products[i];
        if (p.stock <= 0) {
          sold.push({ sku: p.id, name: p.name, restock_in_sec: restockInSec(p.id) });
        }
      }
      return {
        ok: true,
        open: true,
        flavor: sold.length
          ? "Open. A few shelves are waiting on a shipment."
          : "Open. The shelf is stocked.",
        currency: CURRENCY,
        sold_out: sold,
        products: products.map(function (x) {
          return {
            sku: x.id,
            name: x.name,
            stock: x.stock,
            maxStock: x.maxStock,
            restock_in_sec: x.stock <= 0 ? restockInSec(x.id) : null
          };
        }),
        cart_count: cartView().count
      };
    },

    applyRemote: applyRemote,

    pauseLocalSim: function () {
      clearInterval(tickTimer);
      tickTimer = null;
    },

    reset: function () {
      var k;
      for (k in restockTimers) if (Object.prototype.hasOwnProperty.call(restockTimers, k)) {
        clearTimeout(restockTimers[k]);
      }
      for (k in ribbonTimers) if (Object.prototype.hasOwnProperty.call(ribbonTimers, k)) {
        clearTimeout(ribbonTimers[k]);
      }
      products = seed.map(copy);
      cart = [];
      restockAt = {};
      restockTimers = {};
      newStockUntil = {};
      ribbonTimers = {};
      orderSeq = 1;
      persist();
      emit("reset", {});
      return { ok: true };
    }
  };

  function applyCatalog(catalog) {
    seed = catalog.map(copy);
    products = catalog.map(copy);
    cart = [];
    restockAt = {};
    orderSeq = 1;
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.stock) {
          products.forEach(function (p) {
            if (typeof saved.stock[p.id] === "number") {
              p.stock = Math.max(0, Math.floor(saved.stock[p.id]));
            }
          });
        }
        if (saved && Array.isArray(saved.cart)) cart = saved.cart;
        if (saved && saved.restockAt && typeof saved.restockAt === "object") {
          restockAt = saved.restockAt;
        }
        if (saved && typeof saved.orderSeq === "number") orderSeq = saved.orderSeq;
        if (saved && typeof saved.rev === "number") rev = saved.rev;
      }
    } catch (err) { /* ignore */ }
    products.forEach(function (p) {
      if (p.stock === 0) scheduleRestock(p, true);
    });
    persist();
  }

  function startTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      var pool = products.filter(function (p) {
        return p.stock > 0 && p.stock < p.maxStock;
      });
      if (!pool.length) return;
      var p = pool[Math.floor(Math.random() * pool.length)];
      p.stock += 1;
      persist();
      emit("tick", { sku: p.id, stock: p.stock });
    }, TICK_MS);
  }

  function init() {
    return fetch("./data/catalog.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("catalog " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length) applyCatalog(data);
        else applyCatalog(FALLBACK_CATALOG);
      })
      .catch(function () {
        applyCatalog(FALLBACK_CATALOG);
      })
      .then(function () {
        startTick();
        startSync();
        emit("init", {});
        return shop;
      });
  }

  global.shop = shop;
  global.ForesightReady = init();
})(window);
