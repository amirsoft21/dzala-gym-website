/* =========================================================
   DZALA — interactions & motion
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  "use strict";

  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const CURSOR_LABELS = {
    ka: { view: "ნახვა", drag: "გადაათრიე" },
    en: { view: "View", drag: "Drag" }
  };

  /* ---------------- storage (safe) ---------------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  let lang = store.get("dzala-lang");
  if (lang !== "ka" && lang !== "en") lang = "ka";

  /* =========================================================
     TEXT SPLITTING
     ========================================================= */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const wi = document.createElement("span");
            wi.className = "wi";
            wi.style.setProperty("--i", i++);
            wi.textContent = p;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
  }

  function splitFill(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span");
            s.className = "fw";
            s.textContent = p;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
  }

  function splitChars(el) {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const w = document.createElement("span");
      w.className = "w";
      const wi = document.createElement("span");
      wi.className = "wi";
      wi.style.setProperty("--i", i);
      wi.textContent = ch;
      w.appendChild(wi);
      el.appendChild(w);
    });
  }

  /* =========================================================
     I18N
     ========================================================= */
  function applyLang(l) {
    const dict = window.I18N[l];
    root.lang = l;
    document.title = l === "ka" ? "ძალა — სავარჯიშო კლუბი თბილისში" : "DZALA — Training Club Tbilisi";

    $$("[data-i18n]").forEach((el) => {
      const v = dict[el.dataset.i18n];
      if (v == null) return;
      if (el.classList.contains("nav__link")) {
        el.innerHTML = `<span class="roll"><span data-text="${v}">${v}</span></span>`;
      } else {
        el.innerHTML = v;
      }
    });

    $$("[data-split]").forEach(splitWords);
    $$("[data-fill]").forEach(splitFill);
    $$(".footer__word span").forEach(splitChars);

    $(".lang-wipe__text").textContent = dict["lang.name"];
    positionToggle();
  }

  applyLang(lang);

  /* =========================================================
     SMOOTH SCROLL (Lenis)
     ========================================================= */
  let lenis = null;
  if (!reduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), ...opts });
    else {
      const el = typeof target === "string" ? $(target) : target;
      if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
      else if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  /* =========================================================
     HEADER / MENU / ANCHORS
     ========================================================= */
  const header = $(".header");
  let lastY = 0;
  const onScroll = (y) => {
    header.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("menu-open");
    if (!menuOpen) header.classList.toggle("is-hidden", y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  if (lenis) lenis.on("scroll", (e) => onScroll(e.scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    $(".menu").setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
  };
  $(".burger").addEventListener("click", () => {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    $(".menu").setAttribute("aria-hidden", String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#") return;
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (document.body.classList.contains("menu-open")) {
        closeMenu();
        setTimeout(() => scrollTo(target), 450);
      } else scrollTo(target);
    });
  });

  /* =========================================================
     REVEALS
     ========================================================= */
  const revealOnce = (el, start = "top 86%") => {
    ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => el.classList.add("is-in")
    });
  };

  function setupReveals() {
    $$("[data-split]").forEach((el) => { if (!el.closest(".hero")) revealOnce(el); });
    $$(".reveal-up").forEach((el) => revealOnce(el, "top 90%"));
    $$(".reveal-img").forEach((el) => revealOnce(el, "top 85%"));
    revealOnce($(".footer__word"), "top 95%");
  }

  /* Manifesto — words light up while scrolling */
  let fillST = null;
  const updateFill = (progress) => {
    const words = $$(".manifesto .fw");
    const n = Math.round(progress * words.length * 1.05);
    words.forEach((w, i) => w.classList.toggle("on", i < n));
  };
  function setupFill() {
    fillST = ScrollTrigger.create({
      trigger: ".manifesto",
      start: "top 82%",
      end: "bottom 42%",
      onUpdate: (self) => updateFill(self.progress)
    });
  }

  /* =========================================================
     HERO
     ========================================================= */
  const heroImg = $(".hero__img");
  const heroBits = [
    ".hero__eyebrow", ".hero__sub", ".hero__side--left .side-stack", ".hero__side--right .side-stack",
    ".hero__scroll", ".pillbar", ".hero__stats li"
  ];

  if (!reduced) {
    gsap.set(heroBits.join(","), { autoAlpha: 0, y: 30 });
    gsap.set(".side-line", { scaleX: 0 });
  }

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(heroImg, { scale: 1.06, duration: 2.6, ease: "expo.out" }, 0)
      .to(".hero__glow", { opacity: 1, duration: 2.4, ease: "power2.out" }, 0.3)
      .add(() => $(".hero__title").classList.add("is-in"), 0.25)
      .to(".hero__eyebrow", { autoAlpha: 1, y: 0, duration: 1.4 }, 0.2)
      .to(".hero__sub", { autoAlpha: 1, y: 0, duration: 1.4 }, 0.75)
      .to(".hero__side .side-stack", { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.1 }, 0.9)
      .to(".side-line", { scaleX: 1, duration: 1.4, ease: "expo.inOut" }, 1)
      .to(".pillbar", { autoAlpha: 1, y: 0, duration: 1.4 }, 1)
      .to(".hero__scroll", { autoAlpha: 1, y: 0, duration: 1.2 }, 1.15)
      .to(".hero__stats li", { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08 }, 1.1)
      .add(countUp, 1.1);
    return tl;
  }

  function countUp() {
    $$("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suf = el.dataset.suffix || "";
      const o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2.2, ease: "power3.out",
        onUpdate: () => { el.textContent = (dec ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString("en-US")) + suf; }
      });
    });
  }

  function setupHeroScroll() {
    gsap.to(".hero__media", {
      yPercent: 22, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to([".hero__content", ".hero__side"], {
      y: -120, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "70% top", scrub: true }
    });
    gsap.to(".hero__bottom", {
      y: -60, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "5% top", end: "45% top", scrub: true }
    });

    if (finePointer) {
      const xTo = gsap.quickTo(heroImg, "x", { duration: 1.4, ease: "power3" });
      const yTo = gsap.quickTo(heroImg, "y", { duration: 1.4, ease: "power3" });
      $(".hero").addEventListener("mousemove", (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        xTo(nx * -28);
        yTo(ny * -18);
      });
    }
  }

  /* =========================================================
     MARQUEE — velocity driven
     ========================================================= */
  function setupMarquee() {
    const track = $(".marquee__track");
    const row = $(".marquee__row");
    let x = 0, dir = 1, boost = 0;
    if (lenis) lenis.on("scroll", (e) => {
      if (e.direction) dir = e.direction;
      boost = Math.min(Math.abs(e.velocity) * 0.6, 30);
    });
    gsap.ticker.add((_, dt) => {
      const w = row.offsetWidth;
      if (!w) return;
      const speed = (0.9 + boost) * (dt / 16.67);
      x -= speed * dir;
      boost *= 0.92;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* =========================================================
     PROGRAMS — pinned horizontal scroll
     ========================================================= */
  function setupPrograms() {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => {
      const track = $(".programs__track");
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: ".programs",
          pin: ".programs__pin",
          start: "top top",
          end: () => "+=" + dist(),
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(".programs__progress span", { scaleX: self.progress })
        }
      });

      $$(".pcard").forEach((card) => {
        const media = $(".pcard__media", card);
        if (!media) return;
        gsap.set(media, { left: "-12%", right: "-12%" });
        gsap.fromTo(media, { xPercent: -8 }, {
          xPercent: 8, ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true }
        });
      });

      gsap.from(".pcard", {
        y: 120, rotate: 3, autoAlpha: 0, duration: 1.4, ease: "expo.out", stagger: 0.08, clearProps: "transform",
        scrollTrigger: { trigger: ".programs", start: "top 70%", once: true }
      });
    });
  }

  /* =========================================================
     COMMUNITY — fan of cards
     ========================================================= */
  function setupFan() {
    const cards = $$(".fan__card");
    const mid = (cards.length - 1) / 2;
    const spread = () => Math.min(window.innerWidth * 0.155, 250);

    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".fan", start: "top 85%", end: "center 45%", scrub: 1.2, invalidateOnRefresh: true }
    });
    cards.forEach((card, i) => {
      const off = i - mid;
      const r = parseFloat(getComputedStyle(card).getPropertyValue("--r")) || 0;
      tl.fromTo(card,
        { xPercent: -50, yPercent: -50, x: 0, y: 120, rotate: off * 2, scale: 0.78 },
        { xPercent: -50, yPercent: -50, x: () => off * spread(), y: () => Math.abs(off) * Math.abs(off) * 14 + (off === 0 ? -24 : 0), rotate: r, scale: 1, ease: "power2.out" },
        0);
    });
  }

  /* =========================================================
     STEPS — progress line
     ========================================================= */
  function setupSteps() {
    gsap.to(".steps__line span", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".steps__list", start: "top 70%", end: "bottom 60%", scrub: true }
    });
  }

  /* =========================================================
     REVIEWS — drag rail with inertia
     ========================================================= */
  function setupReviews() {
    const rail = $(".reviews__rail");
    const track = $(".reviews__track");
    let x = 0, target = 0, dragging = false, startX = 0, startT = 0, lastX = 0, vel = 0;
    const min = () => Math.min(0, rail.clientWidth - track.scrollWidth);

    rail.addEventListener("pointerdown", (e) => {
      dragging = true; startX = e.clientX; startT = target; lastX = e.clientX; vel = 0;
      rail.classList.add("is-drag");
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      target = startT + (e.clientX - startX) * 1.2;
      vel = e.clientX - lastX; lastX = e.clientX;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false; rail.classList.remove("is-drag");
      target += vel * 12;
    };
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("lostpointercapture", end);

    gsap.ticker.add(() => {
      const lo = min();
      if (!dragging) target = Math.max(lo, Math.min(0, target));
      x += (target - x) * 0.09;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });

    // drift-in on enter
    ScrollTrigger.create({
      trigger: rail, start: "top 85%", once: true,
      onEnter: () => { x = 300; }
    });
    gsap.from(".review", {
      autoAlpha: 0, y: 60, duration: 1.4, ease: "expo.out", stagger: 0.08, clearProps: "transform",
      scrollTrigger: { trigger: rail, start: "top 85%", once: true }
    });
  }

  /* =========================================================
     PRICING — toggle & animated numbers
     ========================================================= */
  let period = "month";
  function positionToggle() {
    const active = $(".toggle__btn.is-active");
    const thumb = $(".toggle__thumb");
    if (!active || !thumb) return;
    thumb.style.width = active.offsetWidth + "px";
    thumb.style.transform = `translateX(${active.offsetLeft - 5}px)`;
  }
  function setupPricing() {
    $$(".toggle__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.period === period) return;
        period = btn.dataset.period;
        $$(".toggle__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
        positionToggle();
        $$(".price").forEach((el, i) => {
          const to = parseFloat(el.dataset[period]);
          const o = { v: parseFloat(el.textContent) };
          gsap.to(o, {
            v: to, duration: 1, delay: i * 0.06, ease: "expo.out",
            onUpdate: () => { el.textContent = Math.round(o.v); }
          });
          gsap.fromTo(el, { y: period === "year" ? -14 : 14, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.9, delay: i * 0.06, ease: "expo.out" });
        });
      });
    });
    positionToggle();
  }

  /* =========================================================
     CTA — frame expands to full-bleed
     ========================================================= */
  function setupCTA() {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 641px)", () => {
      gsap.fromTo(".cta__frame",
        { clipPath: "inset(7% 5% 7% 5% round 40px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
          scrollTrigger: { trigger: ".cta", start: "top 95%", end: "top top", scrub: true } });
    });
    gsap.fromTo(".cta__img", { yPercent: -12 }, {
      yPercent: 0, ease: "none",
      scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true }
    });
    gsap.from(".cta__info > div", {
      y: 40, autoAlpha: 0, duration: 1.2, ease: "expo.out", stagger: 0.1,
      scrollTrigger: { trigger: ".cta__info", start: "top 92%", once: true }
    });
  }

  /* =========================================================
     MAGNETIC BUTTONS
     ========================================================= */
  function setupMagnetic() {
    if (!finePointer) return;
    $$(".magnetic").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* =========================================================
     CURSOR
     ========================================================= */
  function setupCursor() {
    if (!finePointer) return;
    const cur = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    });

    document.addEventListener("mouseover", (e) => {
      const lab = e.target.closest("[data-cursor]");
      const link = e.target.closest("a, button, .toggle__btn");
      if (lab) {
        label.textContent = CURSOR_LABELS[lang][lab.dataset.cursor] || "";
        cur.classList.add("is-label"); cur.classList.remove("is-hover");
      } else if (link) {
        cur.classList.add("is-hover"); cur.classList.remove("is-label");
      } else {
        cur.classList.remove("is-hover", "is-label");
      }
    });
    document.addEventListener("mouseleave", () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
    document.addEventListener("mouseenter", () => gsap.to(cur, { opacity: 1, duration: 0.3 }));
  }

  /* =========================================================
     LANGUAGE SWITCH — wipe transition
     ========================================================= */
  let switching = false;
  function switchLang(next) {
    if (switching || next === lang) return;
    switching = true;
    store.set("dzala-lang", next);

    const wipe = $(".lang-wipe");
    const panel = $(".lang-wipe__panel");
    const txt = $(".lang-wipe__text");
    txt.textContent = window.I18N[next]["lang.name"];

    const tl = gsap.timeline({ onComplete: () => { switching = false; gsap.set(wipe, { visibility: "hidden" }); } });
    tl.set(wipe, { visibility: "visible" })
      .fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "expo.inOut" })
      .fromTo(txt, { yPercent: 120 }, { yPercent: 0, duration: 0.7, ease: "expo.out" }, "-=0.25")
      .add(() => {
        // remember revealed state, swap content, restore
        const revealed = $$("[data-split].is-in, .footer__word.is-in");
        const inView = [];
        revealed.forEach((el) => {
          const r = el.getBoundingClientRect();
          el.classList.remove("is-in");
          if (r.bottom > 0 && r.top < window.innerHeight) inView.push(el);
          else el.classList.add("no-trans");
        });

        lang = next;
        applyLang(next);

        revealed.forEach((el) => { if (!inView.includes(el)) el.classList.add("is-in"); });
        requestAnimationFrame(() => requestAnimationFrame(() => {
          $$(".no-trans").forEach((el) => el.classList.remove("no-trans"));
        }));
        tl.data = inView;

        if (fillST) updateFill(fillST.progress);
        ScrollTrigger.refresh();
      })
      .to(txt, { yPercent: -120, duration: 0.6, ease: "expo.in" }, "+=0.15")
      .to(panel, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.2")
      .add(() => { (tl.data || []).forEach((el) => el.classList.add("is-in")); }, "-=0.55");
  }

  $(".lang").addEventListener("click", () => switchLang(lang === "ka" ? "en" : "ka"));

  /* =========================================================
     PRELOADER
     ========================================================= */
  function waitFor() {
    const img = new Promise((res) => {
      if (heroImg.complete) return res();
      heroImg.addEventListener("load", res, { once: true });
      heroImg.addEventListener("error", res, { once: true });
    });
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeout = new Promise((res) => setTimeout(res, 6000));
    return Promise.race([Promise.all([img, fonts]), timeout]);
  }

  function runLoader() {
    const num = $(".loader__num");
    const bar = $(".loader__bar span");
    const counter = { v: 0 };
    let ready = false;
    waitFor().then(() => { ready = true; });

    return new Promise((resolve) => {
      if (reduced) {
        gsap.set(".loader", { display: "none" });
        resolve();
        return;
      }
      // count to ~85 while loading, finish when ready
      gsap.to(counter, {
        v: 86, duration: 1.8, ease: "power2.out",
        onUpdate: () => { num.textContent = Math.round(counter.v); gsap.set(bar, { scaleX: counter.v / 100 }); },
        onComplete: function finish() {
          if (!ready) { setTimeout(finish, 80); return; }
          gsap.to(counter, {
            v: 100, duration: 0.6, ease: "power2.inOut",
            onUpdate: () => { num.textContent = Math.round(counter.v); gsap.set(bar, { scaleX: counter.v / 100 }); },
            onComplete: () => {
              const tl = gsap.timeline({ onComplete: () => { gsap.set(".loader", { display: "none" }); } });
              tl.to(".loader__count", { yPercent: -110, duration: 0.8, ease: "expo.in" })
                .to(".loader__top, .loader__bar", { autoAlpha: 0, duration: 0.4 }, "<")
                .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 1.2, ease: "expo.inOut" }, "-=0.2")
                .add(resolve, "-=0.75");
            }
          });
        }
      });
    });
  }

  /* =========================================================
     BOOT
     ========================================================= */
  setupReveals();
  setupFill();
  setupMarquee();
  setupPrograms();
  setupFan();
  setupSteps();
  setupReviews();
  setupPricing();
  setupCTA();
  setupMagnetic();
  setupCursor();

  window.scrollTo(0, 0);
  runLoader().then(() => {
    document.body.classList.remove("is-loading");
    if (lenis) lenis.start();
    if (reduced) {
      $(".hero__title").classList.add("is-in");
      countUp();
    } else {
      heroIntro();
      setupHeroScroll();
    }
    ScrollTrigger.refresh();
  });

  window.addEventListener("resize", positionToggle);
  if (document.fonts) document.fonts.ready.then(() => { positionToggle(); ScrollTrigger.refresh(); });
})();
