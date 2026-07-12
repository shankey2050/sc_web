/**
 * PROJECT DETAIL — STANDALONE PAGE JS
 *
 * This script runs when a project HTML file is opened directly
 * (e.g. projects/ecommerce-platform.html).
 * It reads the embedded JSON data and renders a full detail page.
 */

'use strict';

(function () {
  const script = document.getElementById('project-data');
  if (!script) return;

  let p;
  try {
    p = JSON.parse(script.textContent);
  } catch (e) {
    document.body.innerHTML = '<p style="color:red;padding:2rem;">Invalid project JSON: ' + e.message + '</p>';
    return;
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d + (d.length === 7 ? '-01' : ''))
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function dateRange(start, end, status) {
    const s = fmtDate(start) || 'Unknown';
    const e = status === 'ongoing' ? 'Present' : (fmtDate(end) || 'Unknown');
    return `${s} – ${e}`;
  }

  function duration(start, end, status) {
    if (!start) return null;
    const s = new Date(start + (start.length === 7 ? '-01' : ''));
    const e = (status === 'ongoing' || !end) ? new Date() : new Date(end + (end.length === 7 ? '-01' : ''));
    const m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (m < 1) return '< 1 month';
    if (m < 12) return `${m} month${m !== 1 ? 's' : ''}`;
    const y = Math.floor(m / 12), r = m % 12;
    return r > 0 ? `${y}y ${r}m` : `${y} year${y !== 1 ? 's' : ''}`;
  }

  function companyColor(name) {
    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316','#84cc16','#e11d48','#0ea5e9','#a855f7','#14b8a6'];
    if (!name) return palette[0];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  function section(title, content) {
    if (!content) return '';
    return `<section class="ds-section">
      <h2 class="ds-section-title">${esc(title)}</h2>
      ${content}
    </section>`;
  }

  function pills(items, cls) {
    return `<div class="ds-pills">${items.map(i => `<span class="${cls}">${esc(i)}</span>`).join('')}</div>`;
  }

  function bullets(items) {
    return `<ul class="ds-bullets">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  }

  /* ── Build page ──────────────────────────────────────────── */
  const color = companyColor(p.company);
  const dr    = dateRange(p.startDate, p.endDate, p.status);
  const dur   = duration(p.startDate, p.endDate, p.status);

  const linksHtml = (() => {
    const lnks = p.links || {};
    const items = [];
    if (lnks.demo)   items.push(`<a href="${esc(lnks.demo)}"   target="_blank" rel="noopener" class="ds-link ds-link-primary">Live Demo</a>`);
    if (lnks.github) items.push(`<a href="${esc(lnks.github)}" target="_blank" rel="noopener" class="ds-link ds-link-secondary">GitHub</a>`);
    if (lnks.docs)   items.push(`<a href="${esc(lnks.docs)}"   target="_blank" rel="noopener" class="ds-link ds-link-secondary">Docs</a>`);
    if (lnks.paper)  items.push(`<a href="${esc(lnks.paper)}"  target="_blank" rel="noopener" class="ds-link ds-link-secondary">Paper</a>`);
    Object.entries(lnks).forEach(([k, v]) => {
      if (['demo','github','docs','paper'].includes(k)) return;
      items.push(`<a href="${esc(v)}" target="_blank" rel="noopener" class="ds-link ds-link-secondary">${esc(cap(k))}</a>`);
    });
    return items.length ? `<div class="ds-links">${items.join('')}</div>` : '';
  })();

  document.title = `${p.title || 'Project'} — Portfolio`;

  document.head.insertAdjacentHTML('beforeend', `
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="../css/project.css"/>
  `);

  document.body.innerHTML = `
    <div class="ds-page">
      <nav class="ds-nav">
        <a href="../../portfolio.html" class="ds-back">
          <svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back to Portfolio
        </a>
      </nav>

      <header class="ds-hero" style="--accent-color: ${color};">
        <div class="ds-hero-inner">
          <div class="ds-hero-badges">
            <span class="ds-company-badge" style="background:${color}22;color:${color};border-color:${color}44;">${esc(p.company || 'Unknown')}</span>
            <span class="ds-status-badge ds-status-${p.status || 'completed'}">${cap(p.status || 'completed')}</span>
            ${(p.tags || []).map(t => `<span class="ds-tag">${esc(t)}</span>`).join('')}
          </div>

          <h1 class="ds-title">${esc(p.title || 'Untitled Project')}</h1>
          ${p.role ? `<p class="ds-role">${esc(p.role)}</p>` : ''}

          <div class="ds-meta">
            <span class="ds-meta-item">
              <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              ${esc(dr)}
            </span>
            ${dur ? `<span class="ds-meta-item">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              ${esc(dur)}
            </span>` : ''}
            ${p.teamSize ? `<span class="ds-meta-item">
              <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              Team of ${p.teamSize}
            </span>` : ''}
            ${p.impactMetric ? `<span class="ds-meta-item ds-meta-highlight">
              <svg viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${esc(p.impactMetric)}
            </span>` : ''}
          </div>

          ${linksHtml}
        </div>
      </header>

      <main class="ds-main">
        ${section('Overview', p.detailedDescription || p.description
          ? `<p class="ds-prose">${esc(p.detailedDescription || p.description)}</p>` : '')}

        ${section('Key Highlights', p.highlights && p.highlights.length ? bullets(p.highlights) : '')}

        ${section('Major Work Areas', p.majorWorkAreas && p.majorWorkAreas.length ? pills(p.majorWorkAreas, 'ds-pill-area') : '')}

        ${section('Technologies Used', p.technologies && p.technologies.length ? pills(p.technologies, 'ds-pill-tech') : '')}

        ${section('Responsibilities', p.responsibilities && p.responsibilities.length ? bullets(p.responsibilities) : '')}

        ${section('Challenges & Solutions', p.challenges && p.challenges.length ? bullets(p.challenges) : '')}

        ${section('Outcome', p.outcome ? `<p class="ds-prose">${esc(p.outcome)}</p>` : '')}
      </main>

      <footer class="ds-footer">
        <a href="../../portfolio.html" class="ds-back">
          <svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back to Portfolio
        </a>
      </footer>
    </div>
  `;
})();
