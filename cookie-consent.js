/*
 * Bannière de consentement aux cookies — auto-hébergée, sans dépendance.
 * Remplace CookieYes. Intègre le Consent Mode v2 de Google (gtag).
 * Le consentement est mémorisé dans le localStorage du navigateur.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'falguiere_cookie_consent'; // 'granted' | 'denied'
  var POLICY_URL = 'politique-confidentialite.html';

  // S'assure que gtag est disponible (au cas où le bloc inline n'aurait pas chargé).
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function applyConsent(granted) {
    var state = granted ? 'granted' : 'denied';
    gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });
  }

  function store(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function injectStyles() {
    if (document.getElementById('cc-styles')) return;
    var css =
      '.cc-banner{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:2147483647;' +
      'max-width:560px;margin:0 auto;background:#1e1e24;color:#fff;border-radius:16px;' +
      'box-shadow:0 20px 25px -5px rgba(0,0,0,.3),0 10px 10px -5px rgba(0,0,0,.2);' +
      'padding:1.5rem;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;' +
      'transform:translateY(150%);transition:transform .4s cubic-bezier(.25,.8,.25,1)}' +
      '.cc-banner.cc-show{transform:translateY(0)}' +
      '.cc-banner h2{font-size:1.1rem;margin:0 0 .5rem;font-weight:700}' +
      '.cc-banner p{font-size:.9rem;line-height:1.5;margin:0 0 1rem;color:rgba(255,255,255,.85)}' +
      '.cc-banner a{color:#e08a52;text-decoration:underline}' +
      '.cc-actions{display:flex;gap:.75rem;flex-wrap:wrap}' +
      '.cc-btn{flex:1 1 auto;min-width:130px;padding:.75rem 1rem;border-radius:9999px;' +
      'border:none;font-size:.9rem;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .2s}' +
      '.cc-btn:hover{opacity:.88}' +
      '.cc-accept{background:#b0541f;color:#fff}' +
      '.cc-refuse{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5)}' +
      '@media(max-width:480px){.cc-btn{flex:1 1 100%}}';
    var style = document.createElement('style');
    style.id = 'cc-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildBanner() {
    injectStyles();
    var banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Consentement aux cookies');
    banner.innerHTML =
      '<h2>🍪 Respect de votre vie privée</h2>' +
      '<p>Nous utilisons des cookies pour mesurer notre audience et améliorer votre ' +
      'expérience. Vous pouvez les accepter ou les refuser. ' +
      '<a href="' + POLICY_URL + '">En savoir plus</a></p>' +
      '<div class="cc-actions">' +
      '<button type="button" class="cc-btn cc-refuse">Refuser</button>' +
      '<button type="button" class="cc-btn cc-accept">Tout accepter</button>' +
      '</div>';
    document.body.appendChild(banner);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { banner.classList.add('cc-show'); });
    });

    function close() {
      banner.classList.remove('cc-show');
      setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
    }

    banner.querySelector('.cc-accept').addEventListener('click', function () {
      store('granted'); applyConsent(true); close();
    });
    banner.querySelector('.cc-refuse').addEventListener('click', function () {
      store('denied'); applyConsent(false); close();
    });
  }

  function init() {
    var choice = getStored();
    if (choice === 'granted') {
      applyConsent(true); // respecte le choix mémorisé dès le chargement
    } else if (choice === 'denied') {
      applyConsent(false);
    } else {
      buildBanner(); // aucun choix encore fait -> on demande
    }
  }

  // Permet de rouvrir la bannière (ex: lien "Gérer les cookies" en pied de page).
  window.openCookieSettings = function () {
    var existing = document.querySelector('.cc-banner');
    if (existing) return;
    buildBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
