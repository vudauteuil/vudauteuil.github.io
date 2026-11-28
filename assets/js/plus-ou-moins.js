/* Vu d'Auteuil : le jeu « Plus ou moins ».
 *
 * Les parties et leurs duels viennent de _data/plus_ou_moins.yml (Pages CMS,
 * menu « Le jeu »). Rien à modifier ici pour ajouter une partie.
 *
 * Règles : 10 duels par partie, le dernier est le piège. 1 point par bonne
 * réponse ; avec « Je suis sûr », +2 si juste et −2 si faux. Score sur 20.
 * Chaque partie s'ouvre à sa date de mise en ligne, la même pour tout le monde.
 * Les parties jouées restent dans le navigateur du joueur (rien n'est envoyé).
 */
(function (racine, fabrique) {
  var outils = fabrique();
  if (typeof module === "object" && module.exports) module.exports = outils;
  else racine.PlusOuMoins = outils;
})(this, function () {
  "use strict";

  /* ---------- Fonctions pures : elles ne touchent pas à la page ---------- */

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  var NOTES = [
    "La revanche, c'est à la prochaine partie.",
    "Soirée compliquée. Ça arrive aux meilleurs.",
    "Les pièges t'ont fait douter.",
    "Bonne partie. Quelques ballons perdus en route.",
    "Très solide. Ta place est au premier rang.",
    "Sans faute. Tout le virage se lève pour toi."
  ];

  function texte(v) { return v === undefined || v === null ? "" : String(v).trim(); }

  // « 2026-11-28 », « 2026-11-28 00:00:00 +0100 » ou une date : on garde AAAA-MM-JJ.
  function cleDate(v) {
    if (v instanceof Date) return v.getFullYear() + "-" + String(v.getMonth() + 1).padStart(2, "0") + "-" + String(v.getDate()).padStart(2, "0");
    var m = texte(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
  }

  function dateLisible(cle, avecJour) {
    var m = cle.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return cle;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var s = d.getDate() + (d.getDate() === 1 ? "er" : "") + " " + MOIS[d.getMonth()];
    return avecJour ? JOURS[d.getDay()] + " " + s : s;
  }

  // Un nombre (« 47929 », « 49 575 », « 836,1 ») ou une date (« 1982-05-15 »).
  function enNombre(v) {
    var s = texte(v);
    var m = s.match(/^(-?\d{1,4})-(\d{2})-(\d{2})$/);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    s = s.replace(/[\s  ]/g, "").replace(",", ".").replace(/^[≈~]/, "");
    return s === "" ? NaN : Number(s);
  }

  // Ce qui s'affiche sur le tableau : le texte choisi, sinon le nombre avec ses espaces.
  function affichage(valeur, choisi) {
    var a = texte(choisi);
    if (a) return a;
    var s = texte(valeur);
    if (/^\d{5,}$/.test(s)) return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return s;
  }

  function sensDe(v) {
    return /petit|ancien|moins|min/i.test(texte(v)) ? "min" : "max";
  }

  function gagnant(duel) {
    var a = enNombre(duel.a.valeur), b = enNombre(duel.b.valeur);
    if (!(a === a) || !(b === b) || a === b) return null;
    return (duel.sens === "min" ? a < b : a > b) ? "a" : "b";
  }

  function preparerDuel(brut, idPartie, i) {
    brut = brut || {};
    var cote = function (k) {
      return {
        nom: texte(brut[k + "_nom"]),
        precision: texte(brut[k + "_precision"]),
        valeur: texte(brut[k + "_valeur"]),
        affiche: affichage(brut[k + "_valeur"], brut[k + "_affiche"])
      };
    };
    return {
      id: idPartie + "#" + (i + 1),
      categorie: texte(brut.categorie) || "Histoire",
      question: texte(brut.question),
      sens: sensDe(brut.sens),
      unite: texte(brut.unite),
      a: cote("a"),
      b: cote("b"),
      anecdote: texte(brut.anecdote),
      source: texte(brut.source),
      lien: texte(brut.lien)
    };
  }

  // Les parties dans l'ordre des dates, numérotées. Les duels sans gagnant sont écartés.
  function preparerParties(donnees) {
    var liste = (donnees && Array.isArray(donnees.parties)) ? donnees.parties : [];
    var parties = liste.map(function (p) {
      var id = cleDate(p && p.date);
      var duels = ((p && Array.isArray(p.duels)) ? p.duels : []).map(function (d, i) { return preparerDuel(d, id, i); });
      return { id: id, titre: texte(p && p.titre), duels: duels.filter(function (d) { return gagnant(d) !== null && d.question; }) };
    }).filter(function (p) { return p.id && p.duels.length; });
    parties.sort(function (x, y) { return x.id < y.id ? -1 : (x.id > y.id ? 1 : 0); });
    parties.forEach(function (p, i) { p.numero = i + 1; });
    return parties;
  }

  function publiees(parties, aujourdhui) { return parties.filter(function (p) { return p.id <= aujourdhui; }); }
  function prochaine(parties, aujourdhui) { return parties.filter(function (p) { return p.id > aujourdhui; })[0] || null; }

  function points(r) { return r.sur ? (r.ok ? 2 : -2) : (r.ok ? 1 : 0); }
  function total(reponses) { return reponses.reduce(function (s, r) { return s + (r ? points(r) : 0); }, 0); }
  function score(reponses) { return Math.max(0, total(reponses)); }
  function signe(p) { return p > 0 ? "+" + p : (p < 0 ? "−" + Math.abs(p) : "0"); }
  function maximum(partie) { return partie.duels.length * 2; }

  function note(s, max) {
    var r = max ? s / max : 0;
    if (r >= 1) return NOTES[5];
    if (r >= 0.8) return NOTES[4];
    if (r >= 0.6) return NOTES[3];
    if (r >= 0.4) return NOTES[2];
    if (r >= 0.2) return NOTES[1];
    return NOTES[0];
  }

  function emoji(r) { return r.ok ? (r.sur ? "🌟" : "🟩") : (r.sur ? "🟥" : "⬜"); }

  function texteDePartage(partie, reponses, adresse) {
    return "Plus ou moins · Vu d'Auteuil\n" +
      "Partie n°" + partie.numero + " : " + score(reponses) + "/" + maximum(partie) + "\n" +
      reponses.map(emoji).join("") + "\n" + adresse;
  }

  // Parties terminées d'affilée, en partant de la dernière parue
  // (ou de l'avant-dernière, si la dernière n'est pas encore jouée).
  function serie(parues, jouees) {
    var n = 0, i = parues.length - 1;
    if (i >= 0 && !(jouees[parues[i].id] && jouees[parues[i].id].fini)) i--;
    for (; i >= 0; i--) {
      if (jouees[parues[i].id] && jouees[parues[i].id].fini) n++;
      else break;
    }
    return n;
  }

  function melanger(t, hasard) {
    var a = t.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(hasard() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  // Le mode survie pioche dans les duels déjà parus. La partie en cours n'y entre
  // qu'une fois terminée, pour ne rien dévoiler. Les duels ratés passent en premier.
  function reserveSurvie(parues, jouees, aRevoir, aujourdhui, hasard) {
    var duels = [];
    parues.forEach(function (p, i) {
      var derniere = i === parues.length - 1;
      if (derniere && !(jouees[p.id] && jouees[p.id].fini)) return;
      duels = duels.concat(p.duels);
    });
    var dus = duels.filter(function (d) { return aRevoir[d.id] && aRevoir[d.id] <= aujourdhui; });
    var autres = duels.filter(function (d) { return dus.indexOf(d) < 0; });
    return { duels: melanger(dus, hasard).concat(melanger(autres, hasard)), revisions: dus.map(function (d) { return d.id; }) };
  }

  var outils = {
    cleDate: cleDate, dateLisible: dateLisible, enNombre: enNombre, affichage: affichage, sensDe: sensDe,
    gagnant: gagnant, preparerParties: preparerParties, publiees: publiees, prochaine: prochaine,
    points: points, total: total, score: score, signe: signe, maximum: maximum, note: note,
    texteDePartage: texteDePartage, serie: serie, reserveSurvie: reserveSurvie
  };

  /* ---------- Le jeu dans la page ---------- */

  if (typeof document === "undefined") return outils;

  function demarrer() {
    var racine = document.getElementById("pom");
    var source = document.getElementById("pom-donnees");
    if (!racine || !source) return;

    var CLE = "vda-plus-ou-moins:v1";
    var $ = function (id) { return document.getElementById(id); };
    var lent = false;
    try { lent = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var test = /[?&]test\b/.test(window.location.search);
    var adresse = racine.getAttribute("data-adresse") || "https://vudauteuil.fr/plus-ou-moins/";

    var donnees = {};
    try { donnees = JSON.parse(source.textContent || "{}"); } catch (e) { donnees = {}; }
    var toutes = preparerParties(donnees);

    var memo = {}, E = null, minuteries = [];
    function charger() {
      try { var brut = window.localStorage.getItem(CLE); memo = brut ? JSON.parse(brut) : {}; } catch (e) { memo = {}; }
      if (!memo.parties) memo.parties = {};
      if (!memo.revoir) memo.revoir = {};
    }
    function garder() { try { window.localStorage.setItem(CLE, JSON.stringify(memo)); } catch (e) {} }
    function aujourdhui() { return cleDate(new Date()); }
    function demain() { var d = new Date(); d.setDate(d.getDate() + 1); return cleDate(d); }
    function parues() { return publiees(toutes, aujourdhui()); }
    function enCours() { var p = parues(); return p[p.length - 1] || null; }
    function haut() { try { racine.scrollIntoView({ behavior: lent ? "auto" : "smooth", block: "start" }); } catch (e) {} }
    function arreter() { minuteries.forEach(function (x) { clearInterval(x); clearTimeout(x); }); minuteries = []; }
    function el(tag, classe, contenu) {
      var n = document.createElement(tag);
      if (classe) n.className = classe;
      if (contenu !== undefined) n.textContent = contenu;
      return n;
    }

    function ouvrirPartie(partie) {
      var deja = memo.parties[partie.id];
      var reponses = deja && Array.isArray(deja.reponses) ? deja.reponses.slice(0, partie.duels.length) : [];
      E = { mode: "partie", partie: partie, duels: partie.duels, i: reponses.length, reponses: reponses, revele: false, sur: false,
            fini: !!(deja && deja.fini) || reponses.length >= partie.duels.length };
      afficher();
    }

    /* Le tableau d'affichage : une case par caractère, les chiffres défilent. */
    function tableau(n, valeur, options) {
      options = options || {};
      n.innerHTML = "";
      n.setAttribute("aria-label", options.libelle || valeur);
      n.classList.toggle("pom-tableau--long", valeur.length > 6);
      n.classList.toggle("pom-tableau--tres-long", valeur.length > 9);
      var cases = Array.from(valeur).map(function (c) {
        var s = el("span", "pom-case" + (c === " " ? " pom-case--vide" : (/[,.:\/\-–]/.test(c) ? " pom-case--signe" : "")) + (options.attente ? " pom-case--attente" : ""));
        s.setAttribute("aria-hidden", "true");
        s.textContent = c === " " ? " " : c;
        n.appendChild(s);
        return { s: s, c: c };
      });
      if (!options.anime || lent) return;
      cases.filter(function (x) { return /\d/.test(x.c); }).forEach(function (x, k) {
        var tours = 5 + k * 2;
        x.s.textContent = String(Math.floor(Math.random() * 10));
        var iv = setInterval(function () {
          tours--;
          x.s.textContent = tours <= 0 ? x.c : String(Math.floor(Math.random() * 10));
          x.s.classList.remove("pom-case--bascule");
          void x.s.offsetWidth;
          x.s.classList.add("pom-case--bascule");
          if (tours <= 0) clearInterval(iv);
        }, 55);
        minuteries.push(iv);
      });
    }

    function enTete() {
      var p = enCours();
      var etiquette = $("pom-etiquette");
      if (E && E.mode === "survie") etiquette.textContent = "Le jeu · Mode survie";
      else if (E) etiquette.textContent = "Le jeu · Partie n°" + E.partie.numero + " · " + dateLisible(E.partie.id, true);
      else etiquette.textContent = "Le jeu";
      var n = serie(parues(), memo.parties);
      var chip = $("pom-serie");
      chip.hidden = !p || n < 1;
      chip.textContent = "Série : " + n + " partie" + (n > 1 ? "s" : "");
    }

    function progression() {
      var barre = $("pom-progression");
      barre.innerHTML = "";
      barre.hidden = E.mode !== "partie";
      if (E.mode !== "partie") return;
      E.duels.forEach(function (d, k) {
        var r = E.reponses[k];
        barre.appendChild(el("span", "pom-pas" + (r ? (r.ok ? " pom-pas--juste" : " pom-pas--faux") + (r.sur ? " pom-pas--sur" : "") : (k === E.i ? " pom-pas--ici" : ""))));
      });
    }

    function afficherDuel(anime) {
      arreter();
      $("pom-jeu").hidden = false;
      $("pom-fin").hidden = true;
      $("pom-vide").hidden = true;
      var partie = E.mode === "partie";
      var d = E.duels[E.i];
      var r = E.revele ? E.reponses[E.i] : null;
      var g = gagnant(d);
      var piege = partie && E.i === E.duels.length - 1;
      var revision = !partie && E.revisions.indexOf(d.id) >= 0;

      $("pom-categorie").textContent = d.categorie;
      var marque = $("pom-marque");
      marque.hidden = !(piege || revision);
      marque.className = "pom-marque" + (piege ? " pom-marque--piege" : "");
      marque.textContent = piege ? "Le piège" : "Révision";
      $("pom-compteur").textContent = partie
        ? (E.i + 1) + " / " + E.duels.length + " · " + signe(total(E.reponses.slice(0, E.revele ? E.i + 1 : E.i))).replace("+", "") + " pts"
        : "D'affilée : " + E.suite + " · Record : " + Math.max(memo.record || 0, E.suite);
      $("pom-question").textContent = d.question;

      var bouton = $("pom-sur");
      var surActif = r ? !!r.sur : !!E.sur;
      bouton.hidden = !partie;
      bouton.disabled = !!r;
      bouton.setAttribute("aria-pressed", String(surActif));
      $("pom-arene").classList.toggle("pom-arene--mise", partie && surActif && !r);

      ["a", "b"].forEach(function (k) {
        var cote = d[k], btn = $("pom-cote-" + k);
        $("pom-nom-" + k).textContent = cote.nom;
        $("pom-precision-" + k).textContent = cote.precision;
        btn.disabled = !!r;
        btn.classList.remove("pom-cote--gagne", "pom-cote--perd");
        var ancien = btn.querySelector(".pom-tampon");
        if (ancien) ancien.remove();
        if (r) {
          tableau($("pom-valeur-" + k), cote.affiche, { anime: anime, libelle: cote.affiche + " " + d.unite });
          $("pom-unite-" + k).textContent = d.unite;
          btn.classList.add(k === g ? "pom-cote--gagne" : "pom-cote--perd");
          if (r.choix === k) {
            var p = partie ? points(r) : null;
            var t = el("span", "pom-tampon");
            if (partie) {
              t.classList.add(p > 0 ? "pom-tampon--juste" : (p < 0 ? "pom-tampon--faux" : "pom-tampon--nul"));
              t.textContent = p === 0 ? "Raté" : signe(p);
            } else {
              t.classList.add(r.ok ? "pom-tampon--juste" : "pom-tampon--faux");
              t.textContent = r.ok ? "✓" : "Raté";
            }
            btn.appendChild(t);
          }
          btn.setAttribute("aria-label", cote.nom + " : " + cote.affiche + " " + d.unite + (k === g ? ", bonne réponse" : ""));
        } else {
          tableau($("pom-valeur-" + k), "???", { attente: true, libelle: "valeur cachée" });
          $("pom-unite-" + k).textContent = "";
          btn.setAttribute("aria-label", "Choisir " + cote.nom);
        }
      });
      verdict(d, r, g, piege);
      progression();
      archives();
      enTete();
    }

    function verdict(d, r, g, piege) {
      var v = $("pom-verdict");
      var partie = E.mode === "partie";
      v.innerHTML = "";
      if (!r) {
        v.appendChild(el("p", "pom-aide", !partie
          ? "Enchaîne les bonnes réponses : la première erreur met fin à la série. Les duels ratés reviennent ici en révision, à partir du lendemain."
          : (piege ? "Dernier duel, et c'est le piège. Méfie-toi de ta première intuition."
            : (E.i === 0 ? "Choisis le bon côté. Sûr de toi ? Active « Je suis sûr » avant de choisir : la réponse compte double, dans les deux sens."
              : "Choisis le bon côté. Avec « Je suis sûr », c'est +2 si juste et −2 si faux."))));
        v.appendChild(el("p", "pom-clavier", partie ? "Au clavier : ← et → pour choisir, S pour « Je suis sûr »." : "Au clavier : ← et → pour choisir."));
        return;
      }
      var titre;
      if (partie) titre = r.ok ? (r.sur ? "Sûr et juste : +2." : "Bien vu : +1.") : (r.sur ? "Raté alors que tu étais sûr : −2. C'était " + d[g].nom + "." : "Raté. C'était " + d[g].nom + ".");
      else titre = r.ok ? "Bien vu. " + E.suite + " d'affilée." : "Raté. C'était " + d[g].nom + ". Fin de la série.";
      v.appendChild(el("p", "pom-verdict-titre " + (r.ok ? "pom-juste" : "pom-faux"), titre));
      if (d.anecdote) v.appendChild(el("p", "pom-anecdote", d.anecdote));
      if (d.source) {
        var src = el("p", "pom-source", "Source : ");
        if (/^https?:\/\//.test(d.lien)) {
          var a = el("a", "", d.source);
          a.href = d.lien;
          a.rel = "noopener";
          a.target = "_blank";
          src.appendChild(a);
        } else src.appendChild(document.createTextNode(d.source));
        v.appendChild(src);
      }
      var actions = el("div", "pom-actions");
      var suite = el("button", "bouton pom-bouton");
      suite.type = "button";
      suite.id = "pom-suivant";
      if (partie) suite.textContent = E.i + 1 >= E.duels.length ? "Voir mon score" : "Duel suivant";
      else suite.textContent = r.ok && E.i + 1 < E.duels.length ? "Duel suivant" : "Voir le résultat";
      suite.addEventListener("click", continuer);
      actions.appendChild(suite);
      v.appendChild(actions);
    }

    function basculerSur() {
      if (!E || E.mode !== "partie" || E.revele || E.fini) return;
      E.sur = !E.sur;
      $("pom-sur").setAttribute("aria-pressed", String(E.sur));
      $("pom-arene").classList.toggle("pom-arene--mise", E.sur);
    }

    function choisir(k) {
      if (!E || E.fini || E.revele || !$("pom-fin").hidden) return;
      var d = E.duels[E.i];
      var ok = k === gagnant(d);
      var r = { id: d.id, choix: k, ok: ok };
      if (E.mode === "partie") r.sur = !!E.sur;
      E.reponses[E.i] = r;
      E.revele = true;
      E.sur = false;
      if (!ok) memo.revoir[d.id] = demain();
      else if (memo.revoir[d.id]) delete memo.revoir[d.id];
      if (E.mode === "partie") memo.parties[E.partie.id] = { reponses: E.reponses.slice(), fini: false };
      else if (ok) E.suite++;
      garder();
      afficherDuel(true);
      var b = $("pom-suivant");
      if (b) minuteries.push(setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }, lent ? 0 : 450));
    }

    function continuer() {
      if (E.mode === "survie") {
        var der = E.reponses[E.i];
        if (!der || !der.ok) { finirSurvie(false); return; }
        E.i++;
        E.revele = false;
        if (E.i >= E.duels.length) { finirSurvie(true); return; }
        afficherDuel(false);
        haut();
        return;
      }
      E.i++;
      E.revele = false;
      E.sur = false;
      if (E.i >= E.duels.length) { finirPartie(); return; }
      afficherDuel(false);
      haut();
    }

    function finirPartie() {
      E.fini = true;
      memo.parties[E.partie.id] = { reponses: E.reponses.slice(), fini: true };
      garder();
      afficherFin(true);
      haut();
    }

    function lancerSurvie() {
      var res = reserveSurvie(parues(), memo.parties, memo.revoir, aujourdhui(), Math.random);
      if (!res.duels.length) return;
      E = { mode: "survie", duels: res.duels, revisions: res.revisions, i: 0, reponses: [], revele: false, fini: false, suite: 0, sur: false };
      afficherDuel(false);
      haut();
    }

    function finirSurvie(vide) {
      E.fini = true;
      E.vide = vide;
      E.ancienRecord = memo.record || 0;
      E.nouveauRecord = E.suite > E.ancienRecord;
      if (E.nouveauRecord) memo.record = E.suite;
      garder();
      afficherFin(true);
      haut();
    }

    function afficherFin(anime) {
      arreter();
      $("pom-jeu").hidden = true;
      $("pom-fin").hidden = false;
      $("pom-vide").hidden = true;
      var survie = E.mode === "survie";
      var sous = $("pom-fin-sous");
      if (survie) {
        $("pom-fin-libelle").textContent = "Mode survie";
        tableau($("pom-score"), String(E.suite), { anime: anime, libelle: E.suite + " d'affilée" });
        $("pom-note").textContent = E.vide ? "Tu as vidé toute la réserve de duels. Chapeau."
          : (E.suite === 0 ? "Raté dès le premier duel." : (E.suite === 1 ? "1 duel d'affilée." : E.suite + " duels d'affilée."));
        sous.hidden = false;
        sous.className = "pom-fin-sous" + (E.nouveauRecord ? " pom-juste" : "");
        sous.textContent = E.nouveauRecord ? "Nouveau record !" : "Ton record : " + Math.max(memo.record || 0, E.suite);
      } else {
        var s = score(E.reponses), max = maximum(E.partie);
        $("pom-fin-libelle").textContent = "Partie n°" + E.partie.numero;
        tableau($("pom-score"), s + "/" + max, { anime: anime, libelle: s + " sur " + max });
        $("pom-note").textContent = note(s, max);
        sous.hidden = true;
      }
      var carres = $("pom-carres");
      carres.innerHTML = "";
      carres.hidden = survie;
      if (!survie) E.reponses.forEach(function (r) { carres.appendChild(el("span", "pom-carre " + (r.ok ? "pom-carre--juste" : "pom-carre--faux") + (r.sur ? " pom-carre--sur" : ""))); });

      var liste = $("pom-recap");
      liste.innerHTML = "";
      E.reponses.forEach(function (r, k) {
        var d = E.duels[k];
        if (!d) return;
        var g = gagnant(d), l = g === "a" ? "b" : "a";
        var li = el("li");
        li.appendChild(el("span", "pom-pastille " + (r.ok ? "pom-pastille--juste" : "pom-pastille--faux") + (r.sur ? " pom-pastille--sur" : ""), r.ok ? "✓" : "✗"));
        var corps = el("div");
        var libelle = d.categorie + (!survie && k === E.duels.length - 1 ? " · Le piège" : "") + (survie && E.revisions.indexOf(d.id) >= 0 ? " · Révision" : "");
        corps.appendChild(el("p", "pom-recap-question", libelle + " · " + d.question));
        corps.appendChild(el("p", "pom-recap-reponse", d[g].nom + " : " + d[g].affiche + " · " + d[l].nom + " : " + d[l].affiche));
        li.appendChild(corps);
        var pts = el("span", "pom-recap-points");
        if (!survie) {
          var p = points(r);
          pts.classList.add(p > 0 ? "pom-juste" : (p < 0 ? "pom-faux" : "pom-nul"));
          pts.textContent = signe(p);
        }
        li.appendChild(pts);
        liste.appendChild(li);
      });
      $("pom-recap-titre").hidden = !E.reponses.length;
      $("pom-copie").hidden = true;
      $("pom-secours").hidden = true;
      $("pom-partager").hidden = survie;

      var res = reserveSurvie(parues(), memo.parties, memo.revoir, aujourdhui(), Math.random);
      var bSurvie = $("pom-survie");
      // La survie arrive avec la deuxième partie : avant, elle ne ferait que rejouer la première.
      bSurvie.hidden = res.duels.length < 10 || parues().length < 2;
      bSurvie.textContent = survie ? "Rejouer la survie" : "Mode survie : jusqu'à la première erreur";
      var retour = $("pom-retour");
      var courante = enCours();
      var surCourante = !survie && courante && E.partie.id === courante.id;
      retour.hidden = surCourante || !courante;
      retour.textContent = courante && memo.parties[courante.id] && memo.parties[courante.id].fini ? "Revoir la partie en cours" : "Jouer la partie en cours";
      compteARebours();
      archives();
      enTete();
    }

    function afficherVide() {
      arreter();
      $("pom-jeu").hidden = true;
      $("pom-fin").hidden = true;
      $("pom-vide").hidden = false;
      var p = prochaine(toutes, aujourdhui());
      $("pom-vide-texte").textContent = p
        ? "La première partie arrive le " + dateLisible(p.id, true) + ". Reviens ce jour-là."
        : "La première partie arrive bientôt.";
      archives();
      enTete();
    }

    function compteARebours() {
      var p = prochaine(toutes, aujourdhui());
      $("pom-prochaine").textContent = p
        ? "Prochaine partie : " + dateLisible(p.id, true) + "."
        : "La prochaine partie arrive bientôt. Suis @vudauteuil sur Instagram pour la voir passer.";
    }

    function archives() {
      var bloc = $("pom-archives"), liste = $("pom-archives-liste");
      var anciennes = parues().slice(0, -1).reverse();
      liste.innerHTML = "";
      bloc.hidden = !anciennes.length;
      anciennes.forEach(function (p) {
        var li = el("li");
        var b = el("button", "pom-archive");
        b.type = "button";
        var j = memo.parties[p.id];
        b.appendChild(el("span", "pom-archive-numero", "Partie n°" + p.numero));
        b.appendChild(el("span", "pom-archive-date", dateLisible(p.id, true)));
        b.appendChild(el("span", "pom-archive-etat", j && j.fini ? score(j.reponses || []) + "/" + maximum(p) : (j ? "En cours" : "À jouer")));
        b.addEventListener("click", function () { ouvrirPartie(p); haut(); });
        li.appendChild(b);
        liste.appendChild(li);
      });
    }

    function afficher() {
      if (!E) { afficherVide(); return; }
      if (E.fini) afficherFin(false);
      else afficherDuel(false);
    }

    function partager() {
      var t = texteDePartage(E.partie, E.reponses, adresse);
      var secours = function () {
        $("pom-secours").hidden = false;
        var zone = $("pom-texte-partage");
        zone.value = t;
        zone.focus();
        zone.select();
      };
      var copier = function () {
        try {
          if (!navigator.clipboard || !navigator.clipboard.writeText) { secours(); return; }
          navigator.clipboard.writeText(t).then(function () {
            $("pom-copie").hidden = false;
            minuteries.push(setTimeout(function () { $("pom-copie").hidden = true; }, 2500));
          }, secours);
        } catch (e) { secours(); }
      };
      // Sur téléphone, le menu de partage ouvre directement WhatsApp, Instagram…
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
        navigator.share({ text: t }).catch(function (e) { if (!e || e.name !== "AbortError") copier(); });
      } else copier();
    }

    function effacer() {
      var p = E && E.mode === "partie" ? E.partie : enCours();
      if (p) delete memo.parties[p.id];
      garder();
      if (p) ouvrirPartie(p); else afficher();
      haut();
    }

    $("pom-cote-a").addEventListener("click", function () { choisir("a"); });
    $("pom-cote-b").addEventListener("click", function () { choisir("b"); });
    $("pom-sur").addEventListener("click", basculerSur);
    $("pom-partager").addEventListener("click", partager);
    $("pom-survie").addEventListener("click", lancerSurvie);
    $("pom-retour").addEventListener("click", function () { var p = enCours(); if (p) { ouvrirPartie(p); haut(); } });
    var reset = $("pom-effacer");
    reset.hidden = !test;
    reset.addEventListener("click", effacer);
    document.addEventListener("keydown", function (e) {
      if (!E || E.fini || E.revele || $("pom-jeu").hidden) return;
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); choisir("a"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); choisir("b"); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); basculerSur(); }
    });

    charger();
    racine.classList.add("pom--pret");
    var p = enCours();
    if (p) ouvrirPartie(p); else afficher();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
  return outils;
});
