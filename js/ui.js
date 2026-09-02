/* Foresight UI — render shelf, bag, toasts. Mutations stay in shop. */
(function (global) {
  "use strict";

  var reduceMotion = false;
  try {
    reduceMotion = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) { /* ignore */ }

  var lastReceipt = null;
  var bagOpen = false;
  var countdownTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function money(n) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0
    }).format(n);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatEta(sec) {
    if (sec == null) return "";
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    if (m > 0) return m + ":" + String(r).padStart(2, "0");
    return r + "s";
  }

  function toast(message, kind) {
    var host = $("toasts");
    if (!host || !message) return;
    var el = document.createElement("div");
    el.className = "toast toast-" + (kind || "ok");
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("is-in");
    });
    setTimeout(function () {
      el.classList.remove("is-in");
      el.classList.add("is-out");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }, 3200);
  }

  function bumpCart() {
    var badge = $("cart-badge");
    if (!badge) return;
    badge.classList.remove("is-tick");
    void badge.offsetWidth;
    badge.classList.add("is-tick");
    setTimeout(function () { badge.classList.remove("is-tick"); }, 180);
  }

  var hitTimers = {};

  function highlightCard(sku, opts) {
    if (!sku) return;
    opts = opts || {};
    var card = document.querySelector('.card[data-sku="' + sku.replace(/"/g, "") + '"]');
    if (!card) return;
    var hit = opts.hit !== false;
    card.classList.remove("is-hot", "is-hit");
    var count = card.querySelector(".stock .count");
    if (count) count.classList.remove("is-pop");
    void card.offsetWidth;
    if (hit) {
      card.classList.add("is-hit");
      card.classList.add("is-hot");
    }
    if (count) count.classList.add("is-pop");
    if (!reduceMotion && opts.scroll !== false) {
      try { card.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      catch (err) { card.scrollIntoView(); }
    }
    clearTimeout(hitTimers[sku]);
    hitTimers[sku] = setTimeout(function () {
      card.classList.remove("is-hot", "is-hit");
      if (count) count.classList.remove("is-pop");
    }, 1450);
  }

  function renderBadge() {
    var cart = global.shop.getCart();
    var badge = $("cart-badge");
    var btn = $("cart-btn");
    if (!badge) return;
    if (cart.count > 0) {
      badge.hidden = false;
      badge.textContent = String(cart.count);
    } else {
      badge.hidden = true;
      badge.textContent = "0";
    }
    if (btn) btn.setAttribute("data-count", String(cart.count || 0));
  }

  function stockPips(product) {
    var html = "";
    var i;
    var max = Math.min(product.maxStock, 10);
    for (i = 0; i < max; i++) {
      html += '<span class="pip' + (i < product.stock ? " is-on" : "") + '"></span>';
    }
    return html;
  }

  function cardHtml(product) {
    var sold = product.soldOut;
    var cls = "card" + (sold ? " is-sold" : "") + (product.restocking ? " is-arriving" : "") + (product.newStock ? " is-new" : "");
    var action;
    if (sold) {
      action = '<button type="button" class="buy" disabled>Sold out</button>';
    } else {
      action =
        '<button type="button" class="buy" data-act="buy">Buy</button>' +
        '<button type="button" class="add" data-act="add">Add to bag</button>';
    }
    var eta = "";
    if (product.restocking) {
      eta = '<p class="eta" data-restock data-sku="' + escapeHtml(product.sku) + '">Shipment in ' + formatEta(product.restock_in_sec) + "</p>";
    }
    var ribbon = product.newStock ? '<span class="ribbon">New stock</span>' : "";
    var stockLine = sold
      ? '<p class="stock">Sold out</p>'
      : '<p class="stock"><span class="count">' + product.stock + "</span> left</p>";
    return (
      '<article class="' + cls + '" data-sku="' + escapeHtml(product.sku) + '">' +
        '<span class="hit-ring" aria-hidden="true"></span>' +
        ribbon +
        '<div class="mark mark-' + escapeHtml(product.sku) + '" aria-hidden="true"></div>' +
        '<h2 class="name">' + escapeHtml(product.name) + "</h2>" +
        '<p class="flavor">' + escapeHtml(product.flavor) + "</p>" +
        '<p class="price">' + money(product.price) + "</p>" +
        '<div class="pips" aria-hidden="true">' + stockPips(product) + "</div>" +
        stockLine +
        '<div class="acts">' + action + "</div>" +
        eta +
      "</article>"
    );
  }

  function renderShelf() {
    var shelf = $("shelf");
    if (!shelf) return;
    var list = global.shop.list();
    if (!list.length) {
      shelf.innerHTML = '<p class="empty">The shelf is empty. Reset the demo.</p>';
      return;
    }
    shelf.innerHTML = list.map(cardHtml).join("");
  }

  function renderBag() {
    var panel = $("bag-panel");
    if (!panel) return;
    var cart = global.shop.getCart();
    var body = panel.querySelector(".bag-body");
    var foot = panel.querySelector(".bag-foot");
    if (!body) return;
    if (!cart.items.length) {
      body.innerHTML = '<p class="empty-bag">Bag is empty.</p>';
      if (foot) foot.hidden = true;
    } else {
      body.innerHTML = cart.items.map(function (line) {
        return (
          '<div class="bag-line">' +
            '<span>' + escapeHtml(line.name) + ' <em>×' + line.qty + "</em></span>" +
            "<span>" + money(line.subtotal) + "</span>" +
          "</div>"
        );
      }).join("");
      if (foot) {
        foot.hidden = false;
        var total = foot.querySelector(".bag-total");
        if (total) total.textContent = money(cart.total);
      }
    }
    var receipt = panel.querySelector(".bag-receipt");
    if (receipt) {
      if (lastReceipt && lastReceipt.ok) {
        receipt.hidden = false;
        receipt.innerHTML =
          "<strong>Receipt " + escapeHtml(lastReceipt.order_id) + "</strong> · " +
          money(lastReceipt.total);
      } else {
        receipt.hidden = true;
      }
    }
  }

  function render() {
    renderShelf();
    renderBadge();
    renderBag();
    ensureCountdown();
  }

  function ensureCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      var nodes = document.querySelectorAll("[data-restock]");
      if (!nodes.length) return;
      nodes.forEach(function (el) {
        var got = global.shop.get(el.getAttribute("data-sku"));
        if (!got.ok) return;
        if (got.product.restock_in_sec == null) return;
        el.textContent = "Shipment in " + formatEta(got.product.restock_in_sec);
      });
    }, 1000);
  }

  function setBagOpen(open) {
    bagOpen = open;
    var panel = $("bag-panel");
    var btn = $("cart-btn");
    if (!panel || !btn) return;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function onShelfClick(e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var card = btn.closest(".card");
    if (!card) return;
    var sku = card.getAttribute("data-sku");
    var act = btn.getAttribute("data-act");
    var result;
    if (act === "buy") {
      result = global.ForesightTools.buy_item({ sku: sku, qty: 1 });
    } else {
      result = global.ForesightTools.add_to_cart({ sku: sku, qty: 1 });
    }
    if (result && result.ok) bumpCart();
  }

  function onShopChange(e) {
    var d = e.detail || {};
    render();
    if (d.reason === "buy" && d.order_id) {
      lastReceipt = { ok: true, order_id: d.order_id, total: d.total };
      toast("Sold. Receipt " + d.order_id, "ok");
    }
    if (d.reason === "checkout" && d.order_id) {
      lastReceipt = { ok: true, order_id: d.order_id, total: d.total };
      toast("Sold. Receipt " + d.order_id, "ok");
      renderBag();
    }
    if (d.reason === "cart") {
      toast("Added to bag", "ok");
    }
    if (d.reason === "restock") {
      toast("Shipment in" + (d.name ? " — " + d.name : ""), "ship");
    }
    if (d.reason === "reset") {
      lastReceipt = null;
      toast("Demo reset", "ok");
    }
    if (d.reason === "buy" || d.reason === "checkout") {
      if (d.items && d.items.length) {
        lastReceipt = { ok: true, order_id: d.order_id, total: d.total };
      }
      renderBag();
      setLiveSale(d.name || (d.items && d.items[0] && d.items[0].name), d.qty || (d.items && d.items[0] && d.items[0].qty) || 1);
    }
    var flashes = [];
    if ((d.reason === "buy" || d.reason === "checkout") && d.items && d.items.length) {
      d.items.forEach(function (it) { if (it.sku) flashes.push({ sku: it.sku, hit: true }); });
    } else if (d.reason === "buy" && d.sku) {
      flashes.push({ sku: d.sku, hit: true });
    }
    if (d.reason === "restock" && d.sku) flashes.push({ sku: d.sku, hit: false });
    if (d.reason === "remote" && d.changed && d.changed.length) {
      d.changed.forEach(function (c) {
        flashes.push({ sku: c.sku, hit: c.to < c.from });
        if (c.to < c.from) toast(c.name + " sold on another tab", "ok");
        else if (c.to > c.from) toast("Shipment in" + (c.name ? ": " + c.name : ""), "ship");
      });
      var drop = d.changed.filter(function (c) { return c.to < c.from; })[0];
      if (drop) setLiveSale(drop.name, drop.from - drop.to);
    }
    if (flashes.length) {
      requestAnimationFrame(function () {
        flashes.forEach(function (f, i) {
          setTimeout(function () {
            highlightCard(f.sku, { hit: f.hit, scroll: i === 0 });
          }, i * 80);
        });
      });
    }
  }

  function setLiveSale(name, qty) {
    var el = $("live-sale");
    if (!el || !name) return;
    el.textContent = "Just sold: " + qty + " × " + name;
  }

  function bind() {
    var shelf = $("shelf");
    if (shelf) shelf.addEventListener("click", onShelfClick);

    var cartBtn = $("cart-btn");
    if (cartBtn) {
      cartBtn.addEventListener("click", function () {
        setBagOpen(!bagOpen);
      });
    }

    var checkoutBtn = $("bag-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        global.ForesightTools.checkout();
      });
    }

    var resetBtn = $("reset-demo");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        global.shop.reset();
      });
    }

    document.addEventListener("shop:change", onShopChange);

    document.addEventListener("shop:tool", function (e) {
      var r = e.detail && e.detail.result;
      if (!r || r.ok) return;
      if (r.error === "sold_out") {
        var eta = r.restock_in_sec != null ? " — shipment in " + r.restock_in_sec + "s" : "";
        toast("Sold out" + eta, "err");
      } else if (r.error === "empty_cart") toast("Bag is empty", "err");
      else if (r.error === "not_found") toast("Not on the shelf", "err");
      else if (r.error === "insufficient_stock") toast("Not enough on the shelf", "err");
      else if (r.error === "invalid_qty") toast("Need a quantity", "err");
    });

    document.addEventListener("click", function (e) {
      var panel = $("bag-panel");
      var btn = $("cart-btn");
      if (!bagOpen || !panel) return;
      if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
      setBagOpen(false);
    });
  }

  global.ForesightUI = {
    render: render,
    toast: toast,
    bumpCart: bumpCart,
    highlightCard: highlightCard,
    setChip: function (mode) {
      var chip = $("mcp-chip");
      if (!chip) return;
      if (mode === true || mode === "live") {
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
  };

  function start() {
    bind();
    render();
  }

  if (global.ForesightReady && typeof global.ForesightReady.then === "function") {
    global.ForesightReady.then(start);
  } else {
    start();
  }
})(window);
