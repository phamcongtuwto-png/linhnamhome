/* Linh Nam Home – đo nguồn khách và gửi form về Google Sheet.
   Điền mã khi anh Tú tạo xong GA4 / Google Ads. Để trống = không tải mã Google nào. */
(function () {
  var CFG = {
    GA4_ID: '',            // ví dụ 'G-XXXXXXX'
    ADS_ID: '',            // ví dụ 'AW-123456789'
    ADS_LABEL: {           // nhãn chuyển đổi trong Google Ads
      form: '',
      call: '',
      zalo: ''
    },
    EXEC: 'https://script.google.com/macros/s/AKfycbywCCuQnIl5flNHtr5lv0stzZ5CP0_cynNDYty245nRk3yXXwwUjOSQBNS_fZlGtufY/exec'
  };

  // 1. Tải gtag khi đã có mã
  var tagId = CFG.GA4_ID || CFG.ADS_ID;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (tagId) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(tagId);
    document.head.appendChild(s);
    gtag('js', new Date());
    if (CFG.GA4_ID) gtag('config', CFG.GA4_ID);
    if (CFG.ADS_ID) gtag('config', CFG.ADS_ID);
  }

  // 2. Ghi nhớ nguồn khách (gclid, utm) trong 30 ngày
  var KEY = 'ln_attr';
  var attr = {};
  try { attr = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { attr = {}; }
  if (attr.t && Date.now() - attr.t > 30 * 864e5) attr = {};
  var q = new URLSearchParams(location.search);
  var fresh = false;
  ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term'].forEach(function (k) {
    var v = q.get(k);
    if (v) { if (!fresh) { attr = {}; fresh = true; } attr[k] = v.slice(0, 200); }
  });
  if (!attr.ref && document.referrer && document.referrer.indexOf(location.host) === -1) {
    try { attr.ref = new URL(document.referrer).hostname; } catch (e) {}
  }
  if (fresh || !attr.t) attr.t = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(attr)); } catch (e) {}

  function source() {
    if (attr.gclid || attr.gbraid || attr.wbraid ||
        (/google/i.test(attr.utm_source || '') && /cpc|ppc|paid/i.test(attr.utm_medium || ''))) return 'google-ads';
    if (attr.utm_source) return attr.utm_source + (attr.utm_medium ? '-' + attr.utm_medium : '');
    if (/google\./i.test(attr.ref || '')) return 'google-seo';
    if (/facebook|fb\.|instagram/i.test(attr.ref || '')) return 'facebook';
    if (attr.ref) return 'web-' + attr.ref;
    return 'website';
  }

  // 3. Đếm chuyển đổi
  function track(kind) {
    try {
      gtag('event', 'ln_' + kind, { page_path: location.pathname, nguon: source() });
      if (CFG.ADS_ID && CFG.ADS_LABEL[kind]) {
        gtag('event', 'conversion', { send_to: CFG.ADS_ID + '/' + CFG.ADS_LABEL[kind] });
      }
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) track('call');
    else if (h.indexOf('zalo.me') !== -1) track('zalo');
  }, true);

  // 4. Gửi form về Google Sheet (Apps Script)
  function sendLead(f) {
    var nguon = source();
    var extra = [];
    if (f.nhan_nha) extra.push('Nhận nhà: ' + f.nhan_nha);
    if (f.ngan_sach) extra.push('Ngân sách: ' + f.ngan_sach);
    if (f.dien_tich) extra.push('DT: ' + f.dien_tich + ' m²');
    if (f.ghi_chu) extra.push('Ghi chú: ' + f.ghi_chu);
    var d = new URLSearchParams({
      ten: f.ten || '',
      sdt: f.sdt || '',
      can: f.can || '',
      // gộp câu lọc khách vào cột Nhu cầu để sheet cũ vẫn thấy đủ
      nhu: [f.nhu || ''].concat(extra).join(' | '),
      nhan_nha: f.nhan_nha || '',
      ngan_sach: f.ngan_sach || '',
      web: f.web || '',
      nguon: nguon,
      trang: location.pathname.split('/').pop() || 'index.html',
      gclid: attr.gclid || '',
      utm_campaign: attr.utm_campaign || '',
      utm_term: attr.utm_term || ''
    });
    return fetch(CFG.EXEC, { method: 'POST', mode: 'no-cors', body: d }).then(function () { track('form'); });
  }

  window.LN = { source: source, track: track, sendLead: sendLead };
})();
