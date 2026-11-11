/* ============================================================
   MELORA CONCEPT — Espace boutique (cloud Supabase)
   Connexion par compte, publications instantanées.
   ============================================================ */

/* ---------- le seul compte autorisé à publier ---------- */
var ADMIN_EMAIL = "meloraconcept@gmail.com";
/* ------------------------------------------------------ */

var UNIVERS_NAMES = [
  "Beauté & cosmétiques",
  "Parfumerie",
  "Bijouterie & accessoires",
  "Mode & prêt-à-porter",
];

(function () {
  "use strict";

  /* ---------- client cloud ---------- */
  var sb = null;
  var cloudOk = false;
  (function initCloud() {
    var cfg = window.MELORA_SUPABASE;
    if (cfg && cfg.url && cfg.key && cfg.key.indexOf("COLLEZ") === -1 && window.supabase) {
      try {
        sb = window.supabase.createClient(cfg.url, cfg.key);
        cloudOk = true;
      } catch (e) { cloudOk = false; }
    }
  })();

  var gate = document.getElementById("gate");
  var app = document.getElementById("app");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function flash(id, texte, err) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = texte;
    el.style.color = err ? "#e0685f" : "";
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 4500);
  }

  /* ---------- porte : connexion du compte unique ---------- */
  var authBtn = document.getElementById("auth-btn");
  var emailInput = document.getElementById("f-email");
  var passInput = document.getElementById("f-pass");
  var authMsg = document.getElementById("auth-msg");

  if (!cloudOk) {
    authBtn.disabled = true;
    authBtn.style.opacity = ".5";
    authMsg.innerHTML = "Cloud non configuré : collez la clé «\u00a0anon public\u00a0» dans<br><b>assets/js/supabase-config.js</b>";
    return;
  }

  authBtn.addEventListener("click", async function () {
    var email = emailInput.value.trim();
    var pass = passInput.value;
    if (!email || !pass) { authMsg.textContent = "E-mail et mot de passe requis."; return; }
    authBtn.disabled = true;
    try {
      var si = await sb.auth.signInWithPassword({ email: email, password: pass });
      if (si.error) throw si.error;
    } catch (e) {
      authMsg.textContent = "Échec : " + (e.message || e.error_description || "vérifiez e-mail et mot de passe.");
    }
    authBtn.disabled = false;
  });

  passInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") authBtn.click();
  });

  sb.auth.onAuthStateChange(function (event, session) {
    if (session) enterApp(session.user && session.user.email);
  });

  (async function sessionInit() {
    var { data } = await sb.auth.getSession();
    if (data && data.session) enterApp(data.session.user && data.session.user.email);
  })();

  /* ---------- entrée dans l'outil ---------- */
  var articles = [];

  async function enterApp(sessionEmail) {
    var email = sessionEmail || "";
    gate.hidden = true;
    app.hidden = false;
    if (email && ADMIN_EMAIL && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      flash("msg-list",
        "Connecté avec " + email + " — mais seul " + ADMIN_EMAIL +
        " peut publier. Supprimez ce compte et recréez-le avec le bon e-mail (Supabase → Authentication → Users).",
        true);
    }
    await cloudLoad(true);
    renderCatalogue();
  }

  function rowToArticle(r) {
    return {
      id: r.id, u: Number(r.u), nom: r.nom, desc: r.descr || "",
      prix: r.prix || "", img: r.img || "", rupture: !!r.rupture,
    };
  }

  async function cloudLoad(importSeedsIfEmpty) {
    var res = await sb.from("articles").select("*").order("created_at");
    if (res.error) {
      flash("msg-list", "Impossible de lire le catalogue : " + res.error.message, true);
      return;
    }
    if (!res.data.length && importSeedsIfEmpty) {
      await importSeeds();
      return;
    }
    articles = res.data.map(rowToArticle);
  }

  /* première fois : reprendre les exemples du site */
  function loadSeedsFromFile(cb) {
    var s = document.createElement("script");
    s.src = "assets/js/articles.js?v=" + Date.now();
    s.onload = function () { cb(window.MELORA_ARTICLES || []); };
    s.onerror = function () { cb([]); };
    document.head.appendChild(s);
  }

  async function importSeeds() {
    loadSeedsFromFile(async function (seeds) {
      if (!seeds.length) {
        articles = [];
        renderCatalogue();
        return;
      }
      for (var i = 0; i < seeds.length; i++) {
        var a = seeds[i];
        await sb.from("articles").insert({
          id: a.id, u: Number(a.u), nom: a.nom, descr: a.desc || "",
          prix: a.prix || "", img: a.img || "", rupture: !!a.rupture,
        });
      }
      articles = seeds.map(function (a) {
        return { id: a.id, u: Number(a.u), nom: a.nom, desc: a.desc || "", prix: a.prix || "", img: a.img || "", rupture: !!a.rupture };
      });
      renderCatalogue();
      flash("msg-list", "Les exemples du site ont été repris — supprimez-les au fil de vos vraies publications.");
    });
  }

  /* ---------- photo : compression puis envoi dans le cloud ---------- */
  var photoData = "";

  function compress(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var MAX = 900;
        var ratio = Math.min(1, MAX / Math.max(img.width, img.height));
        var w = Math.round(img.width * ratio);
        var h = Math.round(img.height * ratio);
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL("image/jpeg", 0.72), w, h);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("f-photo").addEventListener("change", function () {
    var file = this.files && this.files[0];
    var pv = document.getElementById("preview");
    if (!file) { photoData = ""; pv.hidden = true; return; }
    compress(file, function (data, w, h) {
      photoData = data;
      document.getElementById("pv-img").src = data;
      document.getElementById("pv-note").textContent =
        "Prête : " + w + "×" + h + " px, " + Math.round(data.length / 1024) + " Ko.";
      pv.hidden = false;
    });
  });

  async function uploadPhoto() {
    var blob = await (await fetch(photoData)).blob();
    var path = "articles/" + Date.now().toString(36) + ".jpg";
    var up = await sb.storage.from("photos").upload(path, blob, {
      contentType: "image/jpeg", upsert: true,
    });
    if (up.error) throw up.error;
    return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  }

  /* ---------- publication ---------- */
  var addBtn = document.querySelector("#form-article button[type=submit]");

  document.getElementById("form-article").addEventListener("submit", async function (e) {
    e.preventDefault();
    var nom = document.getElementById("f-nom").value.trim();
    if (!nom) return;
    addBtn.disabled = true;
    addBtn.textContent = "Publication…";
    try {
      var img = "";
      if (photoData) img = await uploadPhoto();
      var article = {
        id: "a" + Date.now().toString(36),
        u: Number(document.getElementById("f-univers").value),
        nom: nom,
        desc: document.getElementById("f-desc").value.trim(),
        prix: document.getElementById("f-prix").value.trim(),
        img: img, rupture: false,
      };
      var res = await sb.from("articles").insert({
        id: article.id, u: article.u, nom: article.nom, descr: article.desc,
        prix: article.prix, img: article.img, rupture: false,
      });
      if (res.error) throw res.error;
      articles.push(article);
      this.reset();
      photoData = "";
      document.getElementById("preview").hidden = true;
      renderCatalogue();
      flash("msg-add", "Publié ! L'article est en ligne sur le site.");
    } catch (err) {
      flash("msg-add", "Échec de la publication : " + (err.message || err.error_description || "réessayez."), true);
    }
    addBtn.disabled = false;
    addBtn.textContent = "Publier l'article";
  });

  /* ---------- liste ---------- */
  function renderCatalogue() {
    var box = document.getElementById("catalogue");
    if (!box) return;
    if (!articles.length) {
      box.innerHTML = '<p class="empty-cat">Aucun article en ligne. Publiez le premier ci-dessus.</p>';
      return;
    }
    var html = "";
    UNIVERS_NAMES.forEach(function (name, u) {
      var list = articles.filter(function (a) { return Number(a.u) === u; });
      if (!list.length) return;
      html += '<p class="cat-group-title">' + esc(name) + "</p>";
      html += list.map(function (a) {
        var thumb = a.img
          ? '<img class="cat-thumb" src="' + esc(a.img) + '" alt="">'
          : '<span class="cat-thumb" aria-hidden="true">M</span>';
        var rup = a.rupture ? ' <span class="rup">· En rupture</span>' : "";
        return (
          '<div class="cat-item">' + thumb +
          '<div class="cat-info"><div class="cat-nom">' + esc(a.nom) + rup +
          (a.prix ? ' <span style="color:var(--gold)">· ' + esc(a.prix) + "</span>" : "") +
          "</div>" +
          '<div class="cat-desc">' + esc(a.desc || "Sans description") + "</div></div>" +
          '<div class="cat-actions">' +
          '<button class="cat-rup' + (a.rupture ? " on" : "") + '" data-id="' + esc(a.id) + '">' +
          (a.rupture ? "De retour en stock" : "Marquer en rupture") + "</button>" +
          '<button class="cat-del" data-id="' + esc(a.id) + '">Supprimer</button>' +
          "</div></div>"
        );
      }).join("");
    });
    box.innerHTML = html;
  }

  document.getElementById("catalogue").addEventListener("click", async function (e) {
    var del = e.target.closest(".cat-del");
    if (del) {
      del.disabled = true;
      var rd = await sb.from("articles").delete().eq("id", del.dataset.id);
      if (rd.error) { flash("msg-list", "Suppression impossible : " + rd.error.message, true); del.disabled = false; return; }
      articles = articles.filter(function (a) { return a.id !== del.dataset.id; });
      renderCatalogue();
      return;
    }
    var rup = e.target.closest(".cat-rup");
    if (rup) {
      var cible = null;
      articles.forEach(function (a) { if (a.id === rup.dataset.id) cible = a; });
      if (!cible) return;
      rup.disabled = true;
      var etat = !cible.rupture;
      var rr = await sb.from("articles").update({ rupture: etat }).eq("id", cible.id);
      if (rr.error) { flash("msg-list", "Mise à jour impossible : " + rr.error.message, true); rup.disabled = false; return; }
      cible.rupture = etat;
      renderCatalogue();
    }
  });
})();
