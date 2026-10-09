/* Cigar House Armenia: click-through screenshot demo.
   Pages are pictures captured from the real site; click areas sit where the real links are. */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");
  var switchBtns = Array.prototype.slice.call(document.querySelectorAll(".switch__btn"));
  var data = null;
  var view = initialView();
  var overlay = null; // "drawer" | "langmenu" | null
  var toastTimer = 0;

  var LANG_NAMES = { en: "English", es: "Español", fr: "Français", hy: "Հայերեն", ru: "Русский", fa: "فارسی" };

  function initialView() {
    var q = new URLSearchParams(location.search).get("view");
    if (q === "mobile" || q === "desktop") return q;
    try {
      var saved = localStorage.getItem("cha-demo-view");
      if (saved === "mobile" || saved === "desktop") return saved;
    } catch (e) {}
    return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  }

  /* ---------- Routing: #/catalog (English), #/hy/catalog (Armenian) ---------- */
  function parseHash() {
    var raw = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
    var m = /^\/([a-z]{2})(\/.*)?$/.exec(raw);
    if (m && data && data.locales.indexOf(m[1]) !== -1 && m[1] !== "en") return { loc: m[1], path: m[2] || "/" };
    return { loc: "en", path: raw };
  }
  function hashFor(loc, path) {
    return "#" + (loc === "en" ? path : "/" + loc + (path === "/" ? "" : path));
  }

  /* ---------- Helpers ---------- */
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function pct(v, total) {
    return (v / total) * 100 + "%";
  }
  function place(node, a, W, H) {
    node.style.left = pct(a.x, W);
    node.style.top = pct(a.y, H);
    node.style.width = pct(a.w, W);
    node.style.height = pct(a.h, H);
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.hidden = true;
    }, 3600);
  }
  function hint(root) {
    root.classList.add("hint");
    setTimeout(function () {
      root.classList.remove("hint");
    }, 650);
  }
  function langToast(code) {
    var shown = data.locales.map(function (l) {
      return LANG_NAMES[l];
    });
    toast(
      (LANG_NAMES[code] || code) +
        " is part of the live site. This demo shows " +
        shown.join(" and ") +
        "."
    );
  }

  /* A click area: link to another page, a language, an external page, or a menu button. */
  function hotspot(a, W, H, ctx) {
    var node;
    if (a.to) {
      node = el("a", "hs", { href: hashFor(a.loc || ctx.loc, a.to) });
      node.addEventListener("click", function () {
        overlay = null;
      });
    } else if (a.ext) {
      node = el("a", "hs", { href: a.ext, target: "_blank", rel: "noopener noreferrer" });
    } else {
      node = el("button", "hs", { type: "button" });
      node.addEventListener("click", function (e) {
        e.stopPropagation();
        if (a.lang) langToast(a.lang);
        else if (a.leave) toast("On the live site this button leaves to google.com.");
        else if (a.button === "drawer") openOverlay("drawer");
        else if (a.button === "langmenu") openOverlay(overlay === "langmenu" ? null : "langmenu");
        else if (a.button === "close") openOverlay(null);
        else if (a.button === "enter") enterSite();
      });
    }
    place(node, a, W, H);
    return node;
  }

  /* ---------- Rendering ---------- */
  function render() {
    if (!data) return;
    var v = data.views[view];
    var route = parseHash();
    var locData = v.locales[route.loc] || v.locales.en;
    var page = locData.pages[route.path];
    if (!page) {
      location.replace(hashFor(route.loc, "/"));
      return;
    }
    var W = v.width;
    document.documentElement.lang = route.loc;
    document.title = page.title + " · Demo";
    switchBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view));
    });

    var frame = el("div", "frame frame--" + view);

    // Sticky header (its own picture + click areas).
    var hdr = el("div", "hdr");
    var himg = el("img", "", { src: page.header.src, alt: "", width: W, height: page.header.h, draggable: "false" });
    hdr.appendChild(himg);
    var hlayer = el("div", "layer");
    page.headerAreas.forEach(function (a) {
      hlayer.appendChild(hotspot(a, W, page.header.h, route));
    });
    hdr.appendChild(hlayer);
    if (overlay === "langmenu" && locData.langMenu) {
      var lm = locData.langMenu;
      var menu = el("div", "langmenu");
      place(menu, lm, W, page.header.h);
      menu.appendChild(el("img", "", { src: lm.src, alt: "", width: lm.w, height: lm.h, draggable: "false" }));
      var mlayer = el("div", "layer");
      lm.areas.forEach(function (a) {
        mlayer.appendChild(hotspot(a, lm.w, lm.h, route));
      });
      menu.appendChild(mlayer);
      hdr.appendChild(menu);
    }
    frame.appendChild(hdr);

    // Page body: stacked slices; the header slice slides under the sticky header.
    var body = el("div", "page-body");
    body.style.marginTop = "-" + (page.header.h / W) * 100 + "%";
    page.slices.forEach(function (s, i) {
      body.appendChild(
        el("img", "", {
          src: s.src,
          alt: i === 0 ? page.title : "",
          width: W,
          height: s.h,
          loading: i < 2 ? "eager" : "lazy",
          decoding: "async",
          draggable: "false",
        })
      );
    });
    var layer = el("div", "layer");
    page.areas.forEach(function (a) {
      layer.appendChild(hotspot(a, W, page.height, route));
    });
    (page.states || []).forEach(function (st) {
      var box = el("div", "state");
      place(box, st, W, page.height);
      var img = el("img", "", { src: st.images[0], alt: "", draggable: "false" });
      box.appendChild(img);
      layer.appendChild(box);
      st.images.slice(1).forEach(function (src) {
        new Image().src = src;
      });
      st.triggers.forEach(function (t) {
        var b = el("button", "hs", { type: "button" });
        place(b, t, W, page.height);
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          img.src = st.images[t.state];
        });
        layer.appendChild(b);
      });
    });
    body.appendChild(layer);
    frame.appendChild(body);

    // Tap on a non-clickable spot: flash the click areas so the client sees what's live.
    frame.addEventListener("click", function (e) {
      if (overlay === "langmenu") {
        openOverlay(null);
        return;
      }
      if (!e.target.closest(".hs")) hint(frame);
    });

    app.replaceChildren(frame);
    if (overlay === "drawer" && locData.drawer) app.appendChild(drawerOverlay(locData.drawer, W, route));
    if (!entered()) app.appendChild(gateOverlay(v));
  }

  function drawerOverlay(d, W, route) {
    var ov = el("div", "overlay");
    var back = el("button", "overlay__backdrop", { type: "button", "aria-label": "Close menu" });
    back.addEventListener("click", function () {
      openOverlay(null);
    });
    ov.appendChild(back);
    var wrap = el("div", "drawer");
    var panel = el("div", "drawer__panel");
    panel.style.left = pct(d.x, W);
    panel.style.width = pct(d.w, W);
    panel.appendChild(el("img", "", { src: d.src, alt: "", width: d.w, height: d.h, draggable: "false" }));
    var layer = el("div", "layer");
    d.areas.forEach(function (a) {
      layer.appendChild(hotspot(a, d.w, d.h, route));
    });
    panel.appendChild(layer);
    wrap.appendChild(panel);
    ov.appendChild(wrap);
    return ov;
  }

  /* ---------- Age gate (once per browser session) ---------- */
  function entered() {
    try {
      return sessionStorage.getItem("cha-demo-entered") === "1";
    } catch (e) {
      return true;
    }
  }
  function enterSite() {
    try {
      sessionStorage.setItem("cha-demo-entered", "1");
    } catch (e) {}
    guardClicks();
    render();
  }
  function gateOverlay(v) {
    var g = v.ageGate;
    var wrap = el("div", "gate gate--" + view);
    var box = el("div", "gate__box");
    box.style.setProperty("--ar", g.w + " / " + g.h);
    box.appendChild(el("img", "", { src: g.src, alt: "Age check", width: g.w, height: g.h, draggable: "false" }));
    var layer = el("div", "layer");
    g.areas.forEach(function (a) {
      layer.appendChild(hotspot(a, g.w, g.h, { loc: "en" }));
    });
    box.appendChild(layer);
    wrap.appendChild(box);
    return wrap;
  }

  function openOverlay(name) {
    overlay = name;
    guardClicks();
    render();
  }

  /* After a layer opens or closes, swallow the rest of the same tap so it can't hit what's now underneath. */
  var guardUntil = 0;
  function guardClicks() {
    guardUntil = Date.now() + 350;
  }
  ["click", "pointerup", "mouseup"].forEach(function (type) {
    document.addEventListener(
      type,
      function (e) {
        if (Date.now() < guardUntil && !e.target.closest(".switch")) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  });

  /* ---------- Events ---------- */
  window.addEventListener("hashchange", function () {
    overlay = null;
    render();
    window.scrollTo(0, 0);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay) openOverlay(null);
  });
  switchBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      view = b.getAttribute("data-view");
      overlay = null;
      try {
        localStorage.setItem("cha-demo-view", view);
      } catch (e) {}
      if (location.search) history.replaceState(null, "", location.pathname + location.hash);
      render();
      window.scrollTo(0, 0);
    });
  });
  document.addEventListener("contextmenu", function (e) {
    if (e.target.tagName === "IMG") e.preventDefault();
  });

  app.innerHTML = '<p class="loading">Loading…</p>';
  fetch("data.json", { cache: "no-cache" })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      data = d;
      render();
    })
    .catch(function () {
      app.innerHTML = '<p class="loading">The demo could not load. Please refresh.</p>';
    });
})();
