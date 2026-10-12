// Worker delight bank — same voice as page, node/worker compat
const STORAGE_KEY = "foresight_delight_recent";
const RECENT_LIMIT = 5;

const TEMPLATES = {
  list_products: [
    { id: "list_1", text: "Your Ur Bot Can Shop shelf is live. Microduck stock: {stock}. Keep that tab open.", tone: "dry", emoji: "📦" },
    { id: "list_2", text: "Shelf's ready. {stock} Microducks in stock. Watch that tab.", tone: "spark", emoji: "⚡" },
    { id: "list_3", text: "Ur Bot Can Shop inventory loaded. Microduck count: {stock}. Tab stays visible, yeah?", tone: "calm", emoji: "🔍" },
    { id: "list_4", text: "Live shelf confirmed. {stock} Microducks available. Don't close that tab.", tone: "warm", emoji: "✨" },
    { id: "list_5", text: "Shop's open. Microduck stock is {stock}. Eyes on that screen.", tone: "spark", emoji: "🎯" },
    { id: "list_6", text: "Your tab's synced. {stock} Microducks sitting there. Stay tuned.", tone: "calm", emoji: "🌊" },
    { id: "list_7", text: "Inventory check: {stock} Microducks. Ur Bot Can Shop shelf is tracking.", tone: "dry", emoji: "📊" },
    { id: "list_8", text: "Shop's live with {stock} Microducks. Keep watching that browser tab.", tone: "warm", emoji: "💫" },
    { id: "list_9", text: "{stock} Microducks on deck. Your Ur Bot Can Shop tab needs to stay open.", tone: "spark", emoji: "🚀" },
    { id: "list_10", text: "Shelf report: Microduck stock is {stock}. Tab visible? Good.", tone: "dry", emoji: "🎪" },
    { id: "list_11", text: "Ur Bot Can Shop's tracking. {stock} Microducks in play. Keep that window active.", tone: "calm", emoji: "🍃" },
    { id: "list_12", text: "Live count: {stock} Microducks. Your tab's the window to the shelf.", tone: "warm", emoji: "🌟" }
  ],

  get_product: [
    { id: "product_1", text: "{name}: {stock} in stock, {price} USD. Your Ur Bot Can Shop tab's got the live view.", tone: "dry", emoji: "📦" },
    { id: "product_2", text: "Found {name}. Stock: {stock}, price {price} USD. Tab's tracking it.", tone: "calm", emoji: "🔍" },
    { id: "product_3", text: "{name} spotted. {stock} available at {price} USD. Keep watching that tab.", tone: "spark", emoji: "✨" },
    { id: "product_4", text: "Product check: {name}, {stock} units, {price} USD. Ur Bot Can Shop shelf's live.", tone: "warm", emoji: "💫" },
    { id: "product_5", text: "{name} details: {stock} in stock, {price} USD. Your tab's synced.", tone: "dry", emoji: "📊" },
    { id: "product_6", text: "Located {name}. Inventory: {stock}, cost {price} USD. Tab shows it live.", tone: "spark", emoji: "🎯" },
    { id: "product_7", text: "{name} — {stock} available, {price} USD. Ur Bot Can Shop's reflecting reality.", tone: "calm", emoji: "🌊" },
    { id: "product_8", text: "Item found: {name}, {stock} on shelf, {price} USD. Tab's the window.", tone: "warm", emoji: "🌟" },
    { id: "product_9", text: "{name}: stock {stock}, price {price} USD. Your Ur Bot Can Shop tab's accurate.", tone: "dry", emoji: "🎪" },
    { id: "product_10", text: "Product {name} loaded. {stock} units at {price} USD. Watch that screen.", tone: "spark", emoji: "🚀" },
    { id: "product_11", text: "{name} info: {stock} in stock, {price} USD. Tab's your guide.", tone: "calm", emoji: "🍃" },
    { id: "product_12", text: "Retrieved {name}. {stock} available, {price} USD. Ur Bot Can Shop shelf's live.", tone: "warm", emoji: "💥" }
  ],

  add_to_cart: [
    { id: "cart_add_1", text: "Added {qty} × {name} to bag. Cart's updated on your Ur Bot Can Shop tab.", tone: "spark", emoji: "⚡" },
    { id: "cart_add_2", text: "{qty} × {name} in cart now. Check your tab for the bag count.", tone: "dry", emoji: "📦" },
    { id: "cart_add_3", text: "Bagged {qty} × {name}. Your Ur Bot Can Shop cart's reflecting it.", tone: "warm", emoji: "✨" },
    { id: "cart_add_4", text: "Cart update: {qty} × {name} added. Tab shows the new total.", tone: "calm", emoji: "🌊" },
    { id: "cart_add_5", text: "{qty} × {name} dropped in bag. Ur Bot Can Shop tab's synced.", tone: "spark", emoji: "🚀" },
    { id: "cart_add_6", text: "Item added: {qty} × {name}. Your cart's live on that tab.", tone: "dry", emoji: "📊" },
    { id: "cart_add_7", text: "{qty} × {name} secured in cart. Check the badge on your screen.", tone: "warm", emoji: "💫" },
    { id: "cart_add_8", text: "Dropped {qty} × {name} in. Bag's updated in Ur Bot Can Shop.", tone: "spark", emoji: "🎯" },
    { id: "cart_add_9", text: "{qty} × {name} to cart. Tab reflects the add.", tone: "calm", emoji: "🍃" },
    { id: "cart_add_10", text: "Cart's got {qty} × {name} now. Your tab's showing it.", tone: "dry", emoji: "🎪" },
    { id: "cart_add_11", text: "Added {qty} × {name}. Ur Bot Can Shop bag count just bumped.", tone: "warm", emoji: "🌟" },
    { id: "cart_add_12", text: "{qty} × {name} in bag. Your cart's live on the tab.", tone: "spark", emoji: "💥" }
  ],

  get_cart: [
    { id: "cart_get_1", text: "Cart loaded. {item_count} items inside. Check your Ur Bot Can Shop bag panel.", tone: "dry", emoji: "📦" },
    { id: "cart_get_2", text: "Bag check: {item_count} items. Your tab's got the full list.", tone: "calm", emoji: "🔍" },
    { id: "cart_get_3", text: "Cart's showing {item_count} items. Ur Bot Can Shop tab's in sync.", tone: "spark", emoji: "✨" },
    { id: "cart_get_4", text: "Reviewed bag: {item_count} items total. Tab displays it live.", tone: "warm", emoji: "💫" },
    { id: "cart_get_5", text: "{item_count} items in cart. Your Ur Bot Can Shop bag's accurate.", tone: "dry", emoji: "📊" },
    { id: "cart_get_6", text: "Cart retrieved: {item_count} items. Check that tab's panel.", tone: "spark", emoji: "🎯" },
    { id: "cart_get_7", text: "Bag's got {item_count} items. Ur Bot Can Shop's reflecting it.", tone: "calm", emoji: "🌊" },
    { id: "cart_get_8", text: "Cart contents: {item_count} items. Your tab shows the details.", tone: "warm", emoji: "🌟" },
    { id: "cart_get_9", text: "{item_count} items found in bag. Ur Bot Can Shop's live.", tone: "dry", emoji: "🎪" },
    { id: "cart_get_10", text: "Cart status: {item_count} items. Tab's your window.", tone: "spark", emoji: "🚀" },
    { id: "cart_get_11", text: "Bag holds {item_count} items. Your Ur Bot Can Shop panel's synced.", tone: "calm", emoji: "🍃" },
    { id: "cart_get_12", text: "{item_count} in cart. Check your tab for the lineup.", tone: "warm", emoji: "💥" }
  ],

  get_shop_status: [
    { id: "status_1", text: "Shop status pulled. Ur Bot Can Shop's live and tracking.", tone: "dry", emoji: "📊" },
    { id: "status_2", text: "Status check complete. Your tab's synced to the shelf.", tone: "calm", emoji: "🔍" },
    { id: "status_3", text: "Ur Bot Can Shop's running. Shop status confirmed.", tone: "spark", emoji: "✨" },
    { id: "status_4", text: "Shop's operational. Tab's reflecting real-time state.", tone: "warm", emoji: "💫" },
    { id: "status_5", text: "Status loaded. Ur Bot Can Shop shelf's active.", tone: "dry", emoji: "📦" },
    { id: "status_6", text: "Shop check done. Your tab's the live feed.", tone: "spark", emoji: "🎯" },
    { id: "status_7", text: "Ur Bot Can Shop status confirmed. Keep that tab visible.", tone: "calm", emoji: "🌊" },
    { id: "status_8", text: "Status retrieved. Shop's live on your screen.", tone: "warm", emoji: "🌟" },
    { id: "status_9", text: "Shop's tracking. Ur Bot Can Shop status is green.", tone: "dry", emoji: "🎪" },
    { id: "status_10", text: "Operational check: all live. Tab's your window.", tone: "spark", emoji: "🚀" },
    { id: "status_11", text: "Status synced. Ur Bot Can Shop's running smoothly.", tone: "calm", emoji: "🍃" },
    { id: "status_12", text: "Shop status: active. Your tab shows the reality.", tone: "warm", emoji: "💥" }
  ],

  describe_site: [
    { id: "site_1", text: "Ur Bot Can Shop's a robotics shop. Shelf restocks itself. Microduck's featured.", tone: "dry", emoji: "📦" },
    { id: "site_2", text: "Shop's live. Microduck at the top. Keep your tab visible.", tone: "calm", emoji: "🔍" },
    { id: "site_3", text: "Shop's running. Featured: Microduck. Tab shows the shelf in real-time.", tone: "spark", emoji: "✨" },
    { id: "site_4", text: "Ur Bot Can Shop shop intro pulled. Microduck's the star. Your tab's synced.", tone: "warm", emoji: "💫" },
    { id: "site_5", text: "Shop details loaded. Microduck featured. Ur Bot Can Shop shelf's tracking.", tone: "dry", emoji: "📊" },
    { id: "site_6", text: "Shop overview: Microduck up front. Tab's your live feed.", tone: "spark", emoji: "🎯" }
  ],

  describe_page: [
    { id: "page_1", text: "Page context loaded. Ur Bot Can Shop's live. Check your tab.", tone: "dry", emoji: "📦" },
    { id: "page_2", text: "Current page synced. Shelf's tracking. Tab's your window.", tone: "calm", emoji: "🔍" },
    { id: "page_3", text: "Page state confirmed. Ur Bot Can Shop's running live.", tone: "spark", emoji: "✨" },
    { id: "page_4", text: "Page details pulled. Your tab shows the real-time view.", tone: "warm", emoji: "💫" }
  ],

  fallback: [
    { id: "fall_1", text: "Keep the Ur Bot Can Shop shop tab visible. Buys move the shelf in ~2 seconds.", tone: "dry", emoji: "📦" },
    { id: "fall_2", text: "Your tab's the window. Watch for shelf movement on the next buy.", tone: "calm", emoji: "🌊" },
    { id: "fall_3", text: "Ur Bot Can Shop tab stays open. Shelf shifts live when orders land.", tone: "spark", emoji: "✨" },
    { id: "fall_4", text: "Keep that tab up. The shelf's live and will move on purchase.", tone: "warm", emoji: "💫" },
    { id: "fall_5", text: "Tab needs to stay visible. Shelf reacts within about 2 seconds.", tone: "dry", emoji: "🎪" },
    { id: "fall_6", text: "Ur Bot Can Shop's tracking. Tab shows shelf motion when buys happen.", tone: "spark", emoji: "🎯" }
  ]
};

// Session storage for anti-repeat (in-memory for worker)
const sessionRecent = new Map();

function getRecent(sessionId) {
  return sessionRecent.get(sessionId) || [];
}

function markUsed(sessionId, id) {
  let recent = getRecent(sessionId);
  recent = recent.filter(x => x !== id);
  recent.push(id);
  if (recent.length > RECENT_LIMIT) recent = recent.slice(-RECENT_LIMIT);
  sessionRecent.set(sessionId, recent);
}

function pickRandom(pool, sessionId) {
  if (!pool || pool.length === 0) return null;
  const recent = getRecent(sessionId);
  let available = pool.filter(t => !recent.includes(t.id));
  if (available.length === 0) available = pool;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

function interpolate(text, data) {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] != null ? String(data[key]) : match;
  });
}

function extractData(name, result) {
  const data = {};
  
  if (name === "list_products" && result.products) {
    const mug = result.products.find(p => p.sku === "microduck" || p.id === "microduck");
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

export function pick(name, result, sessionId = "default") {
  result = result || {};
  let pool;
  let skipDelight = false;

  if (result.ok === false) {
    skipDelight = true;
  } else if (name === "buy_item" || name === "checkout") {
    skipDelight = true;
  } else if (TEMPLATES[name]) {
    pool = TEMPLATES[name];
  } else {
    pool = TEMPLATES.fallback;
  }

  if (skipDelight) {
    return { tell_your_human: null, delight: null };
  }

  const template = pickRandom(pool, sessionId) || { 
    id: "default", 
    text: "Keep the Ur Bot Can Shop shop tab visible.", 
    tone: "dry", 
    emoji: "📦" 
  };

  markUsed(sessionId, template.id);

  const data = extractData(name, result);
  const text = interpolate(template.text, data);

  const delight = {
    line: text,
    tone: template.tone,
    emoji: template.emoji,
    media_url: null
  };

  return {
    tell_your_human: text,
    delight: delight
  };
}
