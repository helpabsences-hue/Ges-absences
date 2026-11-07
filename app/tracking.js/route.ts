// app/tracking.js/route.ts
// Serves /tracking.js — ad & analytics tags for the PUBLIC pages only
// (landing page and sign-up). Never include it inside the app: those pages
// show students' data.
//
// Configure in Vercel → Project → Settings → Environment Variables (all optional):
//   NEXT_PUBLIC_META_PIXEL_ID       e.g. 123456789012345
//   NEXT_PUBLIC_GA4_ID              e.g. G-ABC123DEF4
//   NEXT_PUBLIC_GOOGLE_ADS_ID       e.g. AW-123456789
//   NEXT_PUBLIC_GOOGLE_ADS_SIGNUP   conversion label for sign-ups, e.g. AbC-D_efG
//   NEXT_PUBLIC_GOOGLE_ADS_LEAD     conversion label for WhatsApp contacts (optional)
//   NEXT_PUBLIC_TIKTOK_PIXEL_ID     e.g. CABCDEF1234567890
// A platform whose ID is empty is simply not loaded.
//
// Tags load only after the visitor accepts cookies (Moroccan law 09-08 / GDPR).
// Pages call   window.attTrack('lead' | 'contact' | 'signup' | 'view_pricing')

export const dynamic = 'force-dynamic'

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/
const clean = (v?: string) => (v && ID_RE.test(v.trim()) ? v.trim() : '')

export function GET() {
  const cfg = {
    meta:     clean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    ga4:      clean(process.env.NEXT_PUBLIC_GA4_ID),
    gads:     clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
    gadsSign: clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP),
    gadsLead: clean(process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD),
    tiktok:   clean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
  }

  const js = `/* Attendefy tracking */
(function () {
  var CFG = ${JSON.stringify(cfg)};
  var KEY = 'att_consent';
  var any = CFG.meta || CFG.ga4 || CFG.gads || CFG.tiktok;
  var queue = [], loaded = false;

  function get() { try { return localStorage.getItem(KEY) } catch (e) { return null } }
  function set(v) { try { localStorage.setItem(KEY, v) } catch (e) {} }

  // ── Event names per platform ─────────────────────────────
  var MAP = {
    lead:         { meta: 'Lead',                 ga: 'generate_lead', tt: 'SubmitForm'           },
    contact:      { meta: 'Contact',              ga: 'contact',       tt: 'Contact'              },
    signup:       { meta: 'CompleteRegistration', ga: 'sign_up',       tt: 'CompleteRegistration' },
    view_pricing: { meta: 'ViewContent',          ga: 'view_item',     tt: 'ViewContent'          }
  };

  function send(name, params) {
    var m = MAP[name]; if (!m) return;
    params = params || {};
    if (CFG.meta && window.fbq) window.fbq('track', m.meta, params);
    if ((CFG.ga4 || CFG.gads) && window.gtag) {
      window.gtag('event', m.ga, params);
      if (CFG.gads && name === 'signup' && CFG.gadsSign) window.gtag('event', 'conversion', { send_to: CFG.gads + '/' + CFG.gadsSign });
      if (CFG.gads && name === 'contact' && CFG.gadsLead) window.gtag('event', 'conversion', { send_to: CFG.gads + '/' + CFG.gadsLead });
    }
    if (CFG.tiktok && window.ttq) window.ttq.track(m.tt, params);
  }

  window.attTrack = function (name, params) {
    if (!any) return;
    if (loaded) send(name, params); else if (get() !== 'no') queue.push([name, params]);
  };

  function addScript(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }

  function load() {
    if (loaded) return; loaded = true;
    if (CFG.meta) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', CFG.meta); window.fbq('track', 'PageView');
    }
    if (CFG.ga4 || CFG.gads) {
      addScript('https://www.googletagmanager.com/gtag/js?id=' + (CFG.ga4 || CFG.gads));
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments) };
      window.gtag('js', new Date());
      if (CFG.ga4)  window.gtag('config', CFG.ga4);
      if (CFG.gads) window.gtag('config', CFG.gads);
    }
    if (CFG.tiktok) {
      !function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
      var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load(CFG.tiktok);ttq.page();}(window, document, 'ttq');
    }
    var q = queue; queue = [];
    for (var i = 0; i < q.length; i++) send(q[i][0], q[i][1]);
  }

  // ── Cookie banner ───────────────────────────────────────
  function banner() {
    var b = document.createElement('div');
    b.id = 'att-consent';
    b.setAttribute('role', 'dialog');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;' +
      'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:14px;padding:16px 18px;' +
      'font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.45)';
    b.innerHTML = '<div style="margin-bottom:12px">Nous utilisons des cookies pour mesurer nos publicités et améliorer le site. ' +
      'Aucune donnée de vos élèves n\\'est concernée. <a href="/confidentialite.html" style="color:#93c5fd">En savoir plus</a></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">' +
      '<button type="button" data-c="no"  style="background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit">Refuser</button>' +
      '<button type="button" data-c="yes" style="background:#2563eb;color:#fff;border:0;border-radius:9px;padding:8px 16px;cursor:pointer;font:inherit;font-weight:600">Accepter</button></div>';
    b.addEventListener('click', function (e) {
      var c = e.target && e.target.getAttribute && e.target.getAttribute('data-c'); if (!c) return;
      set(c); b.remove(); if (c === 'yes') load(); else queue = [];
    });
    document.body.appendChild(b);
  }

  // ── Automatic click tracking on the landing page ──────
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null; if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me/') !== -1) window.attTrack('contact', { method: 'whatsapp' });
    else if (href.indexOf('/auth/register') !== -1) window.attTrack('lead', { cta: (a.textContent || '').trim().slice(0, 40) });
    else if (href === '#pricing') window.attTrack('view_pricing');
  }, true);

  function start() {
    if (!any) return;
    var c = get();
    if (c === 'yes') load(); else if (c !== 'no') banner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
`
  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
