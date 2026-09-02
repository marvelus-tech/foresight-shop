/* Shared shelf via Cloudflare Worker. Polls GET /state; buys POST /buy. */
(function (global) {
  "use strict";
  var CLOUD_URL = global.FORESIGHT_CLOUD_URL || "https://foresight-shop.marvelus.workers.dev";
  var pollMs = 1500;
  var lastRev = 0;
  var timer = null;
  var live = false;

  function applyProducts(products) {
    if (!global.shop || !products || !products.length) return;
    var stock = {};
    products.forEach(function (p) { stock[p.sku || p.id] = p.stock; });
    var saved = { rev: lastRev, tabId: "cloud", stock: stock };
    if (typeof global.shop.applyRemote === "function") {
      global.shop.applyRemote(saved);
    }
  }

  async function pull() {
    if (!CLOUD_URL) return;
    try {
      var res = await fetch(CLOUD_URL.replace(/\/+$/, "") + "/state", { cache: "no-store" });
      if (!res.ok) return;
      var data = await res.json();
      live = true;
      setCloudChip(true);
      if (global.shop && typeof global.shop.pauseLocalSim === "function") {
        global.shop.pauseLocalSim();
      }
      if (typeof data.rev === "number" && data.rev === lastRev) return;
      lastRev = data.rev || lastRev;
      if (data.lastSale && data.lastSale.name) {
        var el = document.getElementById("live-sale");
        if (el) el.textContent = "Just sold: " + data.lastSale.qty + " \u00d7 " + data.lastSale.name;
      }
      applyProducts(data.products || []);
    } catch (err) {
      live = false;
    }
  }

  async function postBuy(sku, qty) {
    if (!CLOUD_URL) return null;
    var res = await fetch(CLOUD_URL.replace(/\/+$/, "") + "/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: sku, qty: qty })
    });
    var data = await res.json();
    if (typeof data.rev === "number") lastRev = data.rev;
    if (data.lastSale && data.lastSale.name) {
      var el = document.getElementById("live-sale");
      if (el) el.textContent = "Just sold: " + data.lastSale.qty + " \u00d7 " + data.lastSale.name;
    }
    if (data.products) applyProducts(data.products);
    return data;
  }

  async function postReset() {
    if (!CLOUD_URL) return null;
    var res = await fetch(CLOUD_URL.replace(/\/+$/, "") + "/reset", { method: "POST" });
    var data = await res.json();
    lastRev = 0;
    if (data.products) {
      if (typeof data.rev === "number") lastRev = data.rev;
      applyProducts(data.products);
    }
    return data;
  }

  function setCloudChip(on) {
    var chip = document.getElementById("mcp-chip");
    if (!chip || !on) return;
    chip.setAttribute("data-cloud", "live");
  }

  function wrapShop() {
    var shop = global.shop;
    if (!shop || shop.__cloudWrapped) return;
    shop.__cloudWrapped = true;
    var origBuy = shop.buy;
    var origCheckout = shop.checkout;
    var origReset = shop.reset;

    shop.buy = function (sku, qty) {
      var local = origBuy.call(shop, sku, qty);
      if (CLOUD_URL && local && local.ok) {
        postBuy(sku, qty).catch(function () { /* stay local */ });
      }
      return local;
    };

    shop.checkout = function () {
      var bag = typeof shop.getCart === "function" ? shop.getCart() : { items: [] };
      var items = (bag.items || []).slice();
      var local = origCheckout.call(shop);
      if (CLOUD_URL && local && local.ok && items.length) {
        (async function () {
          var i;
          for (i = 0; i < items.length; i++) {
            try { await postBuy(items[i].sku, items[i].qty); } catch (err) { /* stay local */ }
          }
        })();
      }
      return local;
    };

    shop.reset = function () {
      var local = origReset.call(shop);
      if (CLOUD_URL) postReset().catch(function () { /* stay local */ });
      return local;
    };
  }

  function start() {
    wrapShop();
    if (!CLOUD_URL) return;
    pull();
    clearInterval(timer);
    timer = setInterval(pull, pollMs);
  }

  global.ForesightCloud = { pull: pull, postBuy: postBuy, postReset: postReset, url: function () { return CLOUD_URL; } };

  if (global.ForesightReady && typeof global.ForesightReady.then === "function") {
    global.ForesightReady.then(start);
  } else {
    start();
  }
})(window);
