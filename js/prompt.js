/* Shared agent prompt + owner-facing hint. Used by the shop, pass page, and tools. */
(function (global) {
  "use strict";

  var API = "https://foresight-shop.marvelus.workers.dev";
  var LIVE_SHOP = "https://marvelus-tech.github.io/foresight-shop/";
  var LIVE_PASS = LIVE_SHOP + "pass.html";

  function shopUrl() {
    if (typeof document === "undefined" || !document.location) return LIVE_SHOP;
    var href = document.location.href.split("#")[0];
    if (/pass\.html/i.test(href)) {
      return href.replace(/pass\.html.*$/i, "") || LIVE_SHOP;
    }
    return href;
  }

  function apiUrl() {
    if (global.ForesightCloud && typeof global.ForesightCloud.url === "function") {
      var u = global.ForesightCloud.url();
      if (u) return u.replace(/\/+$/, "");
    }
    return API;
  }

  function agentText() {
    var shop = shopUrl();
    var api = apiUrl();
    return (
      "You are shopping for a human who has the Foresight shop open on another screen.\n\n" +
      "Shop (they are watching this): " + shop + "\n" +
      "Shared inventory API: " + api + "\n" +
      "Instructions for agents: " + api + "/instructions\n\n" +
      "Do this now:\n" +
      "1. GET " + api + "/state and note Signal Mug stock.\n" +
      "2. POST " + api + "/buy with header Content-Type: application/json and body {\"sku\":\"signal-mug\",\"qty\":1}\n" +
      "3. Tell your human, in one short sentence, to look at the open Foresight tab. Quote remaining stock. The shelf should move within about 2 seconds.\n\n" +
      "If you can call WebMCP / page tools instead, use buy_item with sku signal-mug and qty 1, then still tell your human to watch the shelf.\n" +
      "Do not wait for more instructions from the human."
    );
  }

  function tellHuman(name, result) {
    result = result || {};
    if (name === "list_products" && result.products) {
      var mug = null;
      var i;
      for (i = 0; i < result.products.length; i++) {
        if (result.products[i].sku === "signal-mug" || result.products[i].id === "signal-mug") {
          mug = result.products[i];
          break;
        }
      }
      var n = mug ? mug.stock : "?";
      return "Tell your human: the Foresight shelf is live. Signal Mug stock is " + n + ". Keep that tab visible.";
    }
    if (result.ok === false) {
      if (result.error === "sold_out") {
        var eta = result.restock_in_sec != null ? result.restock_in_sec : 30;
        return "Tell your human: that item is sold out on the open Foresight tab. It restocks in about " + eta + " seconds.";
      }
      return "Tell your human: the buy did not go through (" + (result.error || "error") + "). Look at the open Foresight tab.";
    }
    if (name === "buy_item" || name === "checkout" || result.order_id) {
      var itemName = result.name;
      var qty = result.qty;
      var remaining = result.remaining;
      if (result.items && result.items[0]) {
        itemName = itemName || result.items[0].name;
        qty = qty || result.items[0].qty;
        if (remaining == null) remaining = result.items[0].remaining;
      }
      itemName = itemName || "item";
      qty = qty || 1;
      var msg = "Tell your human: look at the open Foresight tab. Just sold " + qty + " \u00d7 " + itemName + ".";
      if (remaining != null) msg += " Remaining: " + remaining + ".";
      msg += " The shelf should already have moved.";
      return msg;
    }
    return "Tell your human to keep the Foresight shop tab visible. A buy will move the shelf within about 2 seconds.";
  }

  function withHint(name, result) {
    if (!result || typeof result !== "object") return result;
    
    if (global.ForesightDelight && typeof global.ForesightDelight.pick === "function") {
      var picked = global.ForesightDelight.pick(name, result);
      result.tell_your_human = picked.tell_your_human;
      result.delight = picked.delight;
    } else {
      result.tell_your_human = tellHuman(name, result);
    }
    
    return result;
  }

  function deepLinks(text) {
    var q = encodeURIComponent(text || agentText());
    return {
      grok: "https://grok.com/?q=" + q,
      claude: "https://claude.ai/new?q=" + q,
      chatgpt: "https://chatgpt.com/?q=" + q
    };
  }

  function copyText(text, done) {
    function ok() { if (typeof done === "function") done(true); }
    function fail() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
      } catch (err) {
        if (typeof done === "function") done(false);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fail);
    } else {
      fail();
    }
  }

  global.ForesightPrompt = {
    apiUrl: apiUrl,
    shopUrl: shopUrl,
    agentText: agentText,
    tellHuman: tellHuman,
    withHint: withHint,
    deepLinks: deepLinks,
    copyText: copyText,
    passUrl: LIVE_PASS,
    liveShop: LIVE_SHOP
  };
})(window);
