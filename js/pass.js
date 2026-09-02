/* Pass page: copy on tap, deep-link out. No auto-copy (phones block it). */
(function (global) {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function bind() {
    var prompt = global.ForesightPrompt;
    if (!prompt) return;
    var text = prompt.agentText();
    var block = $("pass-prompt");
    if (block) block.textContent = text;
    var links = prompt.deepLinks(text);
    var map = { "pass-grok": links.grok, "pass-claude": links.claude, "pass-chatgpt": links.chatgpt };
    Object.keys(map).forEach(function (id) {
      var a = $(id);
      if (a) a.href = map[id];
    });
    var btn = $("pass-copy");
    if (btn) {
      btn.addEventListener("click", function () {
        prompt.copyText(text, function () {
          var prev = btn.textContent;
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = prev; }, 1600);
        });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})(window);
