// 云玩汇落地页交互脚本（外部化以符合 CSP script-src 'self'）
// Mobile nav
const ham = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
ham && ham.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks && navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Filter chips
document.querySelectorAll('.filter-bar .chip').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('.filter-bar .chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
  });
});

// Load more
const toast = document.getElementById('toast');
function showToast(msg){ toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }
document.getElementById('loadMore') && document.getElementById('loadMore').addEventListener('click', () => showToast('更多游戏即将上线，敬请期待 🎮'));

// CTA form
document.getElementById('ctaForm') && document.getElementById('ctaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = document.getElementById('emailInput').value.trim();
  if (v) showToast('注册成功！欢迎加入云玩汇 🎉');
  document.getElementById('ctaForm').reset();
});

// ── Admin-configurable landing content (P0-1) ──
// Pull the 'home' page config from the public API and inject it into
// elements marked with data-cfg attributes. Falls back to the static
// HTML defaults if the request fails or a field is empty.
(function applyLandingConfig() {
  fetch('/api/page-configs')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const home = Array.isArray(list) ? list.find((c) => c.page_key === 'home') : null;
      if (!home) return;
      const setText = (key, val) => {
        if (!val) return;
        const el = document.querySelector('[data-cfg="' + key + '"]');
        if (el) el.textContent = val;
      };
      // Hero (friendly fields)
      setText('heroTitle', home.title);
      setText('heroSub', home.subtitle);
      // Section copy from params JSON
      let params = {};
      try { params = JSON.parse(home.params || '{}'); } catch (e) { params = {}; }
      Object.keys(params).forEach((k) => setText(k, params[k]));
    })
    .catch(() => { /* keep static defaults */ });
})();
