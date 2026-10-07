(() => {
  'use strict';
  // I load Google Analytics only after a visitor accepts it.
  const script = document.currentScript;
  const measurementId = script.dataset.measurementId;
  const panel = document.getElementById('analytics-choice');
  const storageKey = 'website-analytics-choice';
  let started = false;

  function startAnalytics() {
    if (location.hostname !== 'saswataiith.github.io') return;
    if (started || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(tag);
  }

  function readChoice() {
    try { return localStorage.getItem(storageKey); }
    catch (_) { return null; }
  }

  function choose(value) {
    try { localStorage.setItem(storageKey, value); }
    catch (_) { /* I keep the choice for this page when browser storage is unavailable. */ }
    panel.hidden = true;
    window['ga-disable-' + measurementId] = value !== 'accepted';
    if (value === 'accepted') startAnalytics();
  }

  panel.querySelectorAll('[data-analytics-choice]').forEach(button => {
    button.addEventListener('click', () => choose(button.dataset.analyticsChoice));
  });
  document.querySelectorAll('[data-change-analytics]').forEach(button => {
    button.addEventListener('click', () => { panel.hidden = false; });
  });
  const choice = readChoice();
  if (choice === 'accepted') startAnalytics();
  else if (choice !== 'declined') panel.hidden = false;
})();
