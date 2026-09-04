/* Foresight delight system — randomized owner-facing voice packs for WebMCP tool results. */
(function (global) {
  "use strict";

  var STORAGE_KEY = "foresight_delight_recent";
  var RECENT_LIMIT = 5;

  var VIBES = ["warm", "dry", "spark", "calm"];
  var EMOJIS = {
    warm: ["✨", "🎯", "💫", "🌟"],
    dry: ["📦", "🔍", "📊", "🎪"],
    spark: ["⚡", "🚀", "💥", "✦"],
    calm: ["🧘", "🍃", "🌊", "🕊️"]
  };

  var TEMPLATES = {
    list_products: [
      { id: "list_1", text: "Your Foresight shelf is live. Signal Mug stock: {stock}. Keep that tab open.", vibe: "dry", emoji: "📦" },
      { id: "list_2", text: "Shelf's ready. {stock} Signal Mugs in stock. Watch that tab.", vibe: "spark", emoji: "⚡" },
      { id: "list_3", text: "Foresight inventory loaded. Signal Mug count: {stock}. Tab stays visible, yeah?", vibe: "calm", emoji: "🔍" },
      { id: "list_4", text: "Live shelf confirmed. {stock} Signal Mugs available. Don't close that tab.", vibe: "warm", emoji: "✨" },
      { id: "list_5", text: "Boutique's open. Signal Mug stock is {stock}. Eyes on that screen.", vibe: "spark", emoji: "🎯" },
      { id: "list_6", text: "Your tab's synced. {stock} Signal Mugs sitting there. Stay tuned.", vibe: "calm", emoji: "🌊" },
      { id: "list_7", text: "Inventory check: {stock} Signal Mugs. Foresight shelf is tracking.", vibe: "dry", emoji: "📊" },
      { id: "list_8", text: "Shop's live with {stock} Signal Mugs. Keep watching that browser tab.", vibe: "warm", emoji: "💫" },
      { id: "list_9", text: "{stock} Signal Mugs on deck. Your Foresight tab needs to stay open.", vibe: "spark", emoji: "🚀" },
      { id: "list_10", text: "Shelf report: Signal Mug stock is {stock}. Tab visible? Good.", vibe: "dry", emoji: "🎪" },
      { id: "list_11", text: "Foresight's tracking. {stock} Signal Mugs in play. Keep that window active.", vibe: "calm", emoji: "🍃" },
      { id: "list_12", text: "Live count: {stock} Signal Mugs. Your tab's the window to the shelf.", vibe: "warm", emoji: "🌟" }
    ],

    buy_item: [
      { id: "buy_1", text: "Just sold {qty} × {name}. Remaining: {remaining}. Check your Foresight tab—shelf should've moved.", vibe: "spark", emoji: "⚡" },
      { id: "buy_2", text: "Done. {qty} × {name} sold. {remaining} left. Your tab should show the shelf shift.", vibe: "dry", emoji: "📦" },
      { id: "buy_3", text: "Grabbed {qty} × {name} for you. {remaining} remaining. Watch the Foresight shelf glide.", vibe: "warm", emoji: "✨" },
      { id: "buy_4", text: "{qty} × {name} secured. {remaining} in stock now. Tab should reflect the move.", vibe: "calm", emoji: "🌊" },
      { id: "buy_5", text: "Snagged {qty} × {name}. Stock's at {remaining}. The shelf's already dancing.", vibe: "spark", emoji: "🚀" },
      { id: "buy_6", text: "Transaction complete: {qty} × {name}. {remaining} units left. Foresight tab's updating.", vibe: "dry", emoji: "📊" },
      { id: "buy_7", text: "{qty} × {name} locked in. Remaining inventory: {remaining}. Check that live shelf.", vibe: "warm", emoji: "💫" },
      { id: "buy_8", text: "Bagged {qty} × {name}. {remaining} still available. Your tab should show it live.", vibe: "spark", emoji: "🎯" },
      { id: "buy_9", text: "Purchased {qty} × {name}. {remaining} on the shelf now. Motion should be visible.", vibe: "calm", emoji: "🍃" },
      { id: "buy_10", text: "{qty} × {name} claimed. {remaining} remain. Foresight shelf just shifted.", vibe: "dry", emoji: "🎪" },
      { id: "buy_11", text: "Secured {qty} × {name}. Inventory: {remaining}. The shelf's already reacting.", vibe: "warm", emoji: "🌟" },
      { id: "buy_12", text: "{qty} × {name} yours. {remaining} left in stock. Shelf movement incoming on your tab.", vibe: "spark", emoji: "💥" }
    ],

    checkout: [
      { id: "checkout_1", text: "Order placed. {qty} × {name}, remaining {remaining}. Foresight shelf's moving now.", vibe: "spark", emoji: "⚡" },
      { id: "checkout_2", text: "Checkout complete. {qty} × {name} secured. {remaining} left. Check that tab.", vibe: "dry", emoji: "📦" },
      { id: "checkout_3", text: "Done at checkout. {qty} × {name}, {remaining} in stock. Your shelf's updating.", vibe: "warm", emoji: "✨" },
      { id: "checkout_4", text: "Cart processed. {qty} × {name} sold, {remaining} remain. Tab should show the shift.", vibe: "calm", emoji: "🌊" },
      { id: "checkout_5", text: "Finalized: {qty} × {name}. Stock now {remaining}. Shelf's already gliding.", vibe: "spark", emoji: "🚀" },
      { id: "checkout_6", text: "Transaction logged. {qty} × {name}, {remaining} units left. Foresight's live.", vibe: "dry", emoji: "📊" },
      { id: "checkout_7", text: "Checkout success. {qty} × {name}, remaining {remaining}. Watch the shelf dance.", vibe: "warm", emoji: "💫" },
      { id: "checkout_8", text: "Bag cleared. {qty} × {name} out, {remaining} in. Your tab's synced.", vibe: "spark", emoji: "🎯" },
      { id: "checkout_9", text: "Order confirmed. {qty} × {name}, {remaining} on shelf. Motion visible now.", vibe: "calm", emoji: "🍃" },
      { id: "checkout_10", text: "Paid and packed. {qty} × {name}, {remaining} remain. Shelf just moved.", vibe: "dry", emoji: "🎪" },
      { id: "checkout_11", text: "All set. {qty} × {name} claimed, {remaining} left. Foresight's reflecting it.", vibe: "warm", emoji: "🌟" },
      { id: "checkout_12", text: "Checkout done. {qty} × {name}, {remaining} in stock. Shelf's already shifted.", vibe: "spark", emoji: "💥" }
    ],

    get_product: [
      { id: "product_1", text: "{name}: {stock} in stock, {price}. Your Foresight tab's got the live view.", vibe: "dry", emoji: "📦" },
      { id: "product_2", text: "Found {name}. Stock: {stock}, price {price}. Tab's tracking it.", vibe: "calm", emoji: "🔍" },
      { id: "product_3", text: "{name} spotted. {stock} available at {price}. Keep watching that tab.", vibe: "spark", emoji: "✨" },
      { id: "product_4", text: "Product check: {name}, {stock} units, {price}. Foresight shelf's live.", vibe: "warm", emoji: "💫" },
      { id: "product_5", text: "{name} details: {stock} in stock, {price} AUD. Your tab's synced.", vibe: "dry", emoji: "📊" },
      { id: "product_6", text: "Located {name}. Inventory: {stock}, cost {price}. Tab shows it live.", vibe: "spark", emoji: "🎯" },
      { id: "product_7", text: "{name} — {stock} available, {price}. Foresight's reflecting reality.", vibe: "calm", emoji: "🌊" },
      { id: "product_8", text: "Item found: {name}, {stock} on shelf, {price}. Tab's the window.", vibe: "warm", emoji: "🌟" },
      { id: "product_9", text: "{name}: stock {stock}, price {price}. Your Foresight tab's accurate.", vibe: "dry", emoji: "🎪" },
      { id: "product_10", text: "Product {name} loaded. {stock} units at {price}. Watch that screen.", vibe: "spark", emoji: "🚀" },
      { id: "product_11", text: "{name} info: {stock} in stock, {price} AUD. Tab's your guide.", vibe: "calm", emoji: "🍃" },
      { id: "product_12", text: "Retrieved {name}. {stock} available, {price}. Foresight shelf's live.", vibe: "warm", emoji: "💥" }
    ],

    add_to_cart: [
      { id: "cart_add_1", text: "Added {qty} × {name} to bag. Cart's updated on your Foresight tab.", vibe: "spark", emoji: "⚡" },
      { id: "cart_add_2", text: "{qty} × {name} in cart now. Check your tab for the bag count.", vibe: "dry", emoji: "📦" },
      { id: "cart_add_3", text: "Bagged {qty} × {name}. Your Foresight cart's reflecting it.", vibe: "warm", emoji: "✨" },
      { id: "cart_add_4", text: "Cart update: {qty} × {name} added. Tab shows the new total.", vibe: "calm", emoji: "🌊" },
      { id: "cart_add_5", text: "{qty} × {name} dropped in bag. Foresight tab's synced.", vibe: "spark", emoji: "🚀" },
      { id: "cart_add_6", text: "Item added: {qty} × {name}. Your cart's live on that tab.", vibe: "dry", emoji: "📊" },
      { id: "cart_add_7", text: "{qty} × {name} secured in cart. Check the badge on your screen.", vibe: "warm", emoji: "💫" },
      { id: "cart_add_8", text: "Dropped {qty} × {name} in. Bag's updated in Foresight.", vibe: "spark", emoji: "🎯" },
      { id: "cart_add_9", text: "{qty} × {name} to cart. Tab reflects the add.", vibe: "calm", emoji: "🍃" },
      { id: "cart_add_10", text: "Cart's got {qty} × {name} now. Your tab's showing it.", vibe: "dry", emoji: "🎪" },
      { id: "cart_add_11", text: "Added {qty} × {name}. Foresight bag count just bumped.", vibe: "warm", emoji: "🌟" },
      { id: "cart_add_12", text: "{qty} × {name} in bag. Your cart's live on the tab.", vibe: "spark", emoji: "💥" }
    ],

    get_cart: [
      { id: "cart_get_1", text: "Cart loaded. {item_count} items inside. Check your Foresight bag panel.", vibe: "dry", emoji: "📦" },
      { id: "cart_get_2", text: "Bag check: {item_count} items. Your tab's got the full list.", vibe: "calm", emoji: "🔍" },
      { id: "cart_get_3", text: "Cart's showing {item_count} items. Foresight tab's in sync.", vibe: "spark", emoji: "✨" },
      { id: "cart_get_4", text: "Reviewed bag: {item_count} items total. Tab displays it live.", vibe: "warm", emoji: "💫" },
      { id: "cart_get_5", text: "{item_count} items in cart. Your Foresight bag's accurate.", vibe: "dry", emoji: "📊" },
      { id: "cart_get_6", text: "Cart retrieved: {item_count} items. Check that tab's panel.", vibe: "spark", emoji: "🎯" },
      { id: "cart_get_7", text: "Bag's got {item_count} items. Foresight's reflecting it.", vibe: "calm", emoji: "🌊" },
      { id: "cart_get_8", text: "Cart contents: {item_count} items. Your tab shows the details.", vibe: "warm", emoji: "🌟" },
      { id: "cart_get_9", text: "{item_count} items found in bag. Foresight's live.", vibe: "dry", emoji: "🎪" },
      { id: "cart_get_10", text: "Cart status: {item_count} items. Tab's your window.", vibe: "spark", emoji: "🚀" },
      { id: "cart_get_11", text: "Bag holds {item_count} items. Your Foresight panel's synced.", vibe: "calm", emoji: "🍃" },
      { id: "cart_get_12", text: "{item_count} in cart. Check your tab for the lineup.", vibe: "warm", emoji: "💥" }
    ],

    get_shop_status: [
      { id: "status_1", text: "Shop status pulled. Foresight's live and tracking.", vibe: "dry", emoji: "📊" },
      { id: "status_2", text: "Status check complete. Your tab's synced to the shelf.", vibe: "calm", emoji: "🔍" },
      { id: "status_3", text: "Foresight's running. Shop status confirmed.", vibe: "spark", emoji: "✨" },
      { id: "status_4", text: "Shop's operational. Tab's reflecting real-time state.", vibe: "warm", emoji: "💫" },
      { id: "status_5", text: "Status loaded. Foresight shelf's active.", vibe: "dry", emoji: "📦" },
      { id: "status_6", text: "Shop check done. Your tab's the live feed.", vibe: "spark", emoji: "🎯" },
      { id: "status_7", text: "Foresight status confirmed. Keep that tab visible.", vibe: "calm", emoji: "🌊" },
      { id: "status_8", text: "Status retrieved. Shop's live on your screen.", vibe: "warm", emoji: "🌟" },
      { id: "status_9", text: "Shop's tracking. Foresight status is green.", vibe: "dry", emoji: "🎪" },
      { id: "status_10", text: "Operational check: all live. Tab's your window.", vibe: "spark", emoji: "🚀" },
      { id: "status_11", text: "Status synced. Foresight's running smoothly.", vibe: "calm", emoji: "🍃" },
      { id: "status_12", text: "Shop status: active. Your tab shows the reality.", vibe: "warm", emoji: "💥" }
    ],

    sold_out: [
      { id: "out_1", text: "Sold out. Restocks in {restock} seconds. Watch your Foresight tab.", vibe: "dry", emoji: "📦" },
      { id: "out_2", text: "That item's gone. Back in {restock}s. Keep your tab open.", vibe: "calm", emoji: "🌊" },
      { id: "out_3", text: "Shelf's empty for that one. Restock: {restock} seconds. Tab stays visible.", vibe: "spark", emoji: "⚡" },
      { id: "out_4", text: "Sold out. Restocking in {restock}s. Your Foresight tab's tracking it.", vibe: "warm", emoji: "✨" },
      { id: "out_5", text: "Out of stock. {restock} seconds 'til it's back. Watch the tab.", vibe: "dry", emoji: "🎪" },
      { id: "out_6", text: "Item cleared out. Restock incoming in {restock}s. Tab's your view.", vibe: "spark", emoji: "🎯" }
    ],

    error: [
      { id: "err_1", text: "Buy didn't go through ({error}). Check your Foresight tab.", vibe: "dry", emoji: "📦" },
      { id: "err_2", text: "Transaction failed: {error}. Look at the open tab.", vibe: "calm", emoji: "🔍" },
      { id: "err_3", text: "Something blocked that ({error}). Your Foresight tab's got details.", vibe: "spark", emoji: "⚡" },
      { id: "err_4", text: "Error hit: {error}. Check the Foresight tab for context.", vibe: "warm", emoji: "💫" },
      { id: "err_5", text: "Didn't work ({error}). Tab might show why.", vibe: "dry", emoji: "🎪" },
      { id: "err_6", text: "Transaction blocked: {error}. Foresight tab's your guide.", vibe: "spark", emoji: "🎯" }
    ],

    fallback: [
      { id: "fall_1", text: "Keep the Foresight shop tab visible. Buys move the shelf in ~2 seconds.", vibe: "dry", emoji: "📦" },
      { id: "fall_2", text: "Your tab's the window. Watch for shelf movement on the next buy.", vibe: "calm", emoji: "🌊" },
      { id: "fall_3", text: "Foresight tab stays open. Shelf shifts live when orders land.", vibe: "spark", emoji: "✨" },
      { id: "fall_4", text: "Keep that tab up. The shelf's live and will move on purchase.", vibe: "warm", emoji: "💫" },
      { id: "fall_5", text: "Tab needs to stay visible. Shelf reacts within about 2 seconds.", vibe: "dry", emoji: "🎪" },
      { id: "fall_6", text: "Foresight's tracking. Tab shows shelf motion when buys happen.", vibe: "spark", emoji: "🎯" }
    ]
  };

  function getRecent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function markUsed(id) {
    try {
      var recent = getRecent();
      recent = recent.filter(function (x) { return x !== id; });
      recent.push(id);
      if (recent.length > RECENT_LIMIT) recent = recent.slice(-RECENT_LIMIT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {
      // localStorage may fail; non-critical
    }
  }

  function pickRandom(pool) {
    if (!pool || pool.length === 0) return null;
    var recent = getRecent();
    var available = pool.filter(function (t) { return recent.indexOf(t.id) === -1; });
    if (available.length === 0) available = pool;
    var idx = Math.floor(Math.random() * available.length);
    return available[idx];
  }

  function interpolate(text, data) {
    return text.replace(/\{(\w+)\}/g, function (match, key) {
      return data[key] != null ? String(data[key]) : match;
    });
  }

  function extractData(name, result) {
    var data = {};
    
    if (name === "list_products" && result.products) {
      var mug = null;
      for (var i = 0; i < result.products.length; i++) {
        if (result.products[i].sku === "signal-mug" || result.products[i].id === "signal-mug") {
          mug = result.products[i];
          break;
        }
      }
      data.stock = mug ? mug.stock : "?";
    }

    if (result.name) data.name = result.name;
    if (result.qty != null) data.qty = result.qty;
    if (result.remaining != null) data.remaining = result.remaining;
    if (result.restock_in_sec != null) data.restock = result.restock_in_sec;
    if (result.price != null) data.price = result.price;
    if (result.stock != null) data.stock = result.stock;
    if (result.error) data.error = result.error;

    if (result.items && result.items[0]) {
      if (!data.name) data.name = result.items[0].name;
      if (data.qty == null) data.qty = result.items[0].qty;
      if (data.remaining == null) data.remaining = result.items[0].remaining;
    }

    if (name === "get_cart" || (result.items && Array.isArray(result.items))) {
      data.item_count = result.items ? result.items.length : 0;
    }

    return data;
  }

  function pick(name, result) {
    result = result || {};
    var pool;

    if (result.ok === false) {
      if (result.error === "sold_out") {
        pool = TEMPLATES.sold_out;
      } else {
        pool = TEMPLATES.error;
      }
    } else if (TEMPLATES[name]) {
      pool = TEMPLATES[name];
    } else {
      pool = TEMPLATES.fallback;
    }

    var template = pickRandom(pool);
    if (!template) {
      template = { id: "default", text: "Keep the Foresight shop tab visible.", vibe: "dry", emoji: "📦" };
    }

    markUsed(template.id);

    var data = extractData(name, result);
    var text = interpolate(template.text, data);

    var delight = {
      emoji: template.emoji,
      vibe: template.vibe,
      gif_url: null
    };

    return {
      tell_your_human: text,
      delight: delight
    };
  }

  global.ForesightDelight = {
    pick: pick
  };
})(window);
