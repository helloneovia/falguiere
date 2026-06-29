/*
 * Mesure d'audience interne (sans cookie, sans IP) — d'où viennent nos visiteurs.
 * Envoie une seule fois par session une "visite" au serveur, en capturant la
 * provenance (référent + paramètre ?source= / utm_source) et la page d'entrée.
 * Conçu pour rester sous l'exemption "mesure d'audience" de la CNIL (RGPD).
 */
(function () {
  'use strict';
  try {
    // Une visite par session : on s'intéresse au point d'entrée et à sa provenance.
    if (sessionStorage.getItem('fg_tracked')) return;
  } catch (e) { /* sessionStorage indisponible : on enverra quand même la visite */ }

  var params = new URLSearchParams(window.location.search);
  var data = {
    referrer: document.referrer || '',
    landing: window.location.pathname || '/',
    source: params.get('source') || params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || ''
  };

  function markSent() {
    try { sessionStorage.setItem('fg_tracked', '1'); } catch (e) {}
  }

  try {
    var body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/track', blob)) { markSent(); return; }
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true
    }).then(markSent).catch(function () {});
  } catch (e) { /* best-effort : ne jamais bloquer la page */ }
})();
