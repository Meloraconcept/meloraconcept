/* ============================================================
   MELORA — La Pile d'Or (interactions)
   Le vocabulaire d'état : tout est présent en fantôme ;
   l'élément actif est FRAPPÉ (instantané), l'ancien se
   décompose lentement (afterglow).
   ============================================================ */

/* ---------- À MODIFIER PAR LA BOUTIQUE ---------- */
const CONFIG = {
  // Numéro WhatsApp au format international, sans « + » ni espaces.
  // Exemple Côte d'Ivoire : "2250574794969" — Exemple France : "33612345678"
  whatsapp: "2250574794969",

  // Message pré-rempli envoyé par le client (optionnel).
  message: "Bonjour MELORA CONCEPT ! J'ai découvert la boutique via le site, j'aimerais un conseil.",

  // Compte Instagram sans @ (laisser "" pour masquer la ligne).
  instagram: "melora_concept",

  // Compte TikTok sans @ (laisser "" pour masquer la ligne).
  tiktok: "meloraconcept",

  // Page Facebook — adresse complète (laisser "" pour masquer la ligne).
  facebook: "https://www.facebook.com/share/1DdRuaGE2f/",

  // Adresse e-mail de la boutique (laisser "" pour masquer la ligne).
  email: "meloraconcept@gmail.com",

  // Horaires d'ouverture affichés dans la section Contact.
  horaires: "Lun – Ven · 07h – 20h · Sam · 08h – 16h · Dim · 10h – 20h",

  // Adresse de la boutique (laisser "" pour masquer la ligne).
  adresse: "Rue H133, 333",
};
/* ------------------------------------------------ */

// Univers : contenu du lecteur (readout) — textes modifiables librement.
const UNIVERS = [
  {
    name: "Beauté & cosmétiques",
    text: "Soins du visage et du corps, huiles précieuses et maquillage : une sélection pensée pour votre rituel quotidien.",
    tags: "Soins · Teint · Éclat",
  },
  {
    name: "Parfumerie",
    text: "Des sillages rares aux grandes signatures : le parfum qui vous ressemble, choisi en toute confiance.",
    tags: "Sillages · Signatures · Découvertes",
  },
  {
    name: "Bijouterie & accessoires",
    text: "Or, pierres choisies et pièces d'exception : des bijoux qui marquent les grands moments — et les autres.",
    tags: "Or · Pierres · Pièces d'exception",
  },
  {
    name: "Mode & prêt-à-porter",
    text: "Pièces de saison et intemporelles : une garde-robe qui répond à vos bijoux et à vos parfums.",
    tags: "Saison · Intemporel · Accessoires",
  },
];

(function () {
  "use strict";

  /* ---------- liens WhatsApp & coordonnées ---------- */
  const waHref =
    "https://wa.me/" + encodeURIComponent(CONFIG.whatsapp) +
    "?text=" + encodeURIComponent(CONFIG.message || "");

  document.querySelectorAll(".js-wa").forEach((a) => { a.href = waHref; });

  const cfgSlot = (key) => document.querySelector('[data-cfg="' + key + '"]');
  const setSlot = (key, value, parentHide) => {
    const el = cfgSlot(key);
    if (!el) return;
    if (value) { el.textContent = value; }
    else if (parentHide) { el.closest(parentHide).hidden = true; }
  };
  setSlot("horaires", CONFIG.horaires, ".ci");
  setSlot("adresse", CONFIG.adresse, ".ci");

  const igLink = document.querySelector('[data-cfg-href="instagram"]');
  if (igLink) {
    if (CONFIG.instagram) {
      igLink.href = "https://instagram.com/" + encodeURIComponent(CONFIG.instagram);
      igLink.textContent = "@" + CONFIG.instagram;
    } else {
      igLink.closest(".ci").hidden = true;
    }
  }

  const tiktokLink = document.querySelector('[data-cfg-href="tiktok"]');
  if (tiktokLink) {
    if (CONFIG.tiktok) {
      tiktokLink.href = "https://www.tiktok.com/@" + encodeURIComponent(CONFIG.tiktok);
      tiktokLink.textContent = "@" + CONFIG.tiktok;
    } else {
      tiktokLink.closest(".ci").hidden = true;
    }
  }

  const fbLink = document.querySelector('[data-cfg-href="facebook"]');
  if (fbLink) {
    if (CONFIG.facebook) {
      fbLink.href = CONFIG.facebook;
    } else {
      fbLink.closest(".ci").hidden = true;
    }
  }

  const emailLink = document.querySelector('[data-cfg-href="email"]');
  if (emailLink) {
    if (CONFIG.email) {
      emailLink.href = "mailto:" + CONFIG.email;
      emailLink.textContent = CONFIG.email;
    } else {
      emailLink.closest(".ci").hidden = true;
    }
  }

  /* ---------- la pile des univers : frappé / décomposé ---------- */
  const buttons = Array.from(document.querySelectorAll(".universe-btn"));
  const readout = document.querySelector(".readout");
  const roName = document.getElementById("ro-name");
  const roText = document.getElementById("ro-text");
  const roTags = document.getElementById("ro-tags");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function strike(btn, opts) {
    opts = opts || {};
    buttons.forEach((b) => {
      const on = b === btn;
      // Le retrait de .struck hérite de la transition lente (afterglow) ;
      // l'ajout est instantané (voir .universe-btn.struck { transition: none }).
      b.classList.toggle("struck", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const i = Number(btn.dataset.u);
    const u = UNIVERS[i];
    if (u && roName) {
      roName.textContent = u.name;
      roText.textContent = u.text;
      roTags.textContent = u.tags;
    }

    // Les articles de l'univers frappé remplacent la vitrine.
    renderArticles(i);

    // Le lecteur doit être visible quand il change : on le ramène dans
    // le champ s'il se trouve sous la ligne de flottaison.
    if (opts.ensureVisible && readout) {
      const below = readout.getBoundingClientRect().top > window.innerHeight - 120;
      if (below) {
        readout.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "nearest",
        });
      }
    }
  }

  /* ---------- la vitrine : les articles de l'univers ---------- */

  const articlesEl = document.getElementById("articles");
  const articlesLabel = document.getElementById("articles-label");
  var CATALOG_READY = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderArticles(i) {
    if (!articlesEl || !CATALOG_READY) return;
    const u = UNIVERS[i];
    const list = (window.MELORA_ARTICLES || []).filter(function (a) {
      return Number(a.u) === i;
    });

    if (articlesLabel && u) {
      articlesLabel.textContent = "Articles — " + u.name;
    }

    if (!list.length) {
      articlesEl.innerHTML =
        '<div class="articles-empty">' +
        '<p class="ae-word" aria-hidden="true">Vitrine en préparation</p>' +
        '<p>Aucun article n\u2019est encore affiché dans cet univers. Publiez vos pièces depuis l\u2019espace boutique \u2014 ou demandez-nous directement.</p>' +
        '<a class="js-wa" href="https://wa.me/' + encodeURIComponent(CONFIG.whatsapp) +
        '" target="_blank" rel="noopener">Demander sur WhatsApp</a></div>';
      return;
    }

    articlesEl.innerHTML = list.map(function (a) {
      var img = a.img
        ? '<img src="' + esc(a.img) + '" alt="' + esc(a.nom) + '" loading="lazy">'
        : '<div class="art-nophoto" aria-hidden="true"><span>M</span></div>';
      var prix = a.prix ? '<span class="art-prix">' + esc(a.prix) + "</span>" : "";
      var rupture = a.rupture
        ? '<span class="art-rupture">En rupture</span>' : "";
      var askTxt = a.rupture ? "Me prévenir du retour" : "Demander celui-ci";
      var msg = a.rupture
        ? "Bonjour MELORA CONCEPT ! \u00ab " + (a.nom || "un article") +
          " \u00bb est en rupture : pouvez-vous me pr\u00e9venir de son retour en stock ?"
        : "Bonjour MELORA CONCEPT ! Je suis int\u00e9ress\u00e9(e) par \u00ab " + (a.nom || "un article") +
          " \u00bb (" + (u ? u.name : "") + "). Est-il disponible ?";
      return (
        '<figure class="article">' +
        '<div class="art-img">' + img + rupture +
        '<span class="art-nom">' + esc(a.nom) + "</span></div>" +
        (a.desc ? '<p class="art-desc">' + esc(a.desc) + "</p>" : "") +
        '<p class="art-meta">' + prix +
        '<a class="art-ask" href="https://wa.me/' + encodeURIComponent(CONFIG.whatsapp) +
        "?text=" + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + askTxt + "</a>" +
        "</p></figure>"
      );
    }).join("");
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => strike(btn, { ensureVisible: true }));
  });

  /* ---------- fantômes du héros : chaque mot mène à son univers ---------- */
  document.querySelectorAll(".js-ghost").forEach((ghost) => {
    ghost.addEventListener("click", () => {
      const btn = buttons[Number(ghost.dataset.u)];
      if (!btn) return;
      strike(btn);
      const cible = document.getElementById("univers");
      if (cible) {
        cible.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });
  });

  /* ---------- apparence : Nuit (encre & or) / Jour (ivoire & or) ---------- */
  const root = document.documentElement;
  const ttNuit = document.getElementById("tt-nuit");
  const ttJour = document.getElementById("tt-jour");
  const metaTheme = document.getElementById("meta-theme");

  function setTheme(t) {
    if (t === "jour") root.setAttribute("data-theme", "jour");
    else root.removeAttribute("data-theme");
    try { localStorage.setItem("melora-theme", t); } catch (e) {}
    if (ttNuit) ttNuit.setAttribute("aria-pressed", t === "nuit" ? "true" : "false");
    if (ttJour) ttJour.setAttribute("aria-pressed", t === "jour" ? "true" : "false");
    if (metaTheme) metaTheme.setAttribute("content", t === "jour" ? "#f4efe4" : "#0d0d11");
  }

  if (ttNuit) ttNuit.addEventListener("click", () => setTheme("nuit"));
  if (ttJour) ttJour.addEventListener("click", () => setTheme("jour"));
  setTheme(root.getAttribute("data-theme") === "jour" ? "jour" : "nuit");

  /* ---------- entête : densité au défilement ---------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- état initial : catalogue cloud, repli fichier local ---------- */
  async function initCatalog() {
    var ok = false;
    var cfg = window.MELORA_SUPABASE;
    if (cfg && cfg.url && cfg.key && cfg.key.indexOf("COLLEZ") === -1 && window.supabase) {
      try {
        var sbc = window.supabase.createClient(cfg.url, cfg.key);
        var res = await sbc.from("articles").select("*").order("created_at");
        if (!res.error && res.data && res.data.length) {
          window.MELORA_ARTICLES = res.data.map(function (r) {
            return {
              id: r.id, u: Number(r.u), nom: r.nom, desc: r.descr || "",
              prix: r.prix || "", img: r.img || "", rupture: !!r.rupture,
            };
          });
          ok = true;
        }
        /* cloud joignable mais vide : on garde les exemples du fichier
           jusqu'à la première vraie publication */
      } catch (e) { ok = false; }
    }
    if (ok) {
      CATALOG_READY = true;
      renderArticles(0);
      return;
    }
    /* repli : le fichier local articles.js (hors-ligne ou cloud absent) */
    var s = document.createElement("script");
    s.src = "assets/js/articles.js?v=" + Date.now();
    s.onload = function () {
      CATALOG_READY = true;
      renderArticles(0);
    };
    document.head.appendChild(s);
  }
  initCatalog();
})();
