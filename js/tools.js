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

  function afterTool(name, args, result) {
    var view = ui();
    var sku = args && (args.sku || (result && result.sku));
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

  function list_products() {
    var products = global.shop.list();
    return afterTool("list_products", {}, { ok: true, products: products });
  }

  function get_product(input) {
    var sku = asSku(input && input.sku);
    var result = global.shop.get(sku);
    return afterTool("get_product", { sku: sku }, result);
  }

  function add_to_cart(input) {
    var sku = asSku(input && input.sku);
    var qty = asQty(input && input.qty, 1);
    var result = global.shop.addToCart(sku, qty);
    return afterTool("add_to_cart", { sku: sku, qty: qty }, result);
  }

  function get_cart() {
    return afterTool("get_cart", {}, global.shop.getCart());
  }

  function checkout() {
    var result = global.shop.checkout();
    var sku = result.items && result.items[0] ? result.items[0].sku : (result.sku || null);
    return afterTool("checkout", {}, result);
  }

  function buy_item(input) {
    var sku = asSku(input && input.sku);
    var qty = asQty(input && input.qty, 1);
    var result = global.shop.buy(sku, qty);
    return afterTool("buy_item", { sku: sku, qty: qty }, result);
  }

  function get_shop_status() {
    return afterTool("get_shop_status", {}, global.shop.status());
  }

  global.ForesightTools = {
    list_products: list_products,
    get_product: get_product,
    add_to_cart: add_to_cart,
    get_cart: get_cart,
    checkout: checkout,
    buy_item: buy_item,
    get_shop_status: get_shop_status
  };
})(window);
