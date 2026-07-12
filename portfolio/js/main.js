/**
 * PORTFOLIO — MAIN JS
 *
 * Flow:
 *  1. Fetch projects/manifest.json  →  get list of project filenames
 *  2. Fetch each project HTML file  →  parse embedded JSON data block
 *  3. Render project tiles in the grid
 *  4. Wire up search / filter / sort controls
 *  5. Open modal with full project detail on tile click
 */

'use strict';

/* ─── State ──────────────────────────────────────────────────── */
let allProjects = [];
let filtered    = [];

/* ─── DOM refs ───────────────────────────────────────────────── */
const grid          = document.getElementById('projects-grid');
const emptyState    = document.getElementById('empty-state');
const headerStats   = document.getElementById('header-stats');
const resultsCount  = document.getElementById('results-count');
const activeFilters = document.getElementById('active-filters');

const searchInput   = document.getElementById('search-input');
const companyFilter = document.getElementById('company-filter');
const techFilter    = document.getElementById('tech-filter');
const areaFilter    = document.getElementById('area-filter');
const statusFilter  = document.getElementById('status-filter');
const sortSelect    = document.getElementById('sort-select');
const resetBtn      = document.getElementById('reset-filters');

const modal         = document.getElementById('project-modal');
const modalContent  = document.getElementById('modal-content');
const modalClose    = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════════════════════ */
(async function init() {
  try {
    const manifest = await fetchJSON('portfolio/projects/manifest.json');
    const files    = manifest.projects || [];

    if (files.length === 0) {
      showError('No projects listed in <code>projects/manifest.json</code>.');
      return;
    }

    const results = await Promise.allSettled(
      files.map(filename => loadProject(filename))
    );

    allProjects = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      console.warn(`${failed.length} project(s) failed to load.`);
    }

    if (allProjects.length === 0) {
      showError('No valid project files could be loaded. Check the console for details.');
      return;
    }

    populateFilters();
    renderStats();
    applyFilters();
    wireControls();

  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('fetch')) {
      showError(
        'Could not load <code>projects/manifest.json</code>.<br>' +
        'This portfolio requires a local HTTP server. Run:<br>' +
        '<code>python -m http.server 8080</code> then open <code>http://localhost:8080</code>'
      );
    } else {
      showError('An unexpected error occurred: ' + escHtml(err.message));
    }
  }
})();

/* ═══════════════════════════════════════════════════════════════
   DATA LOADING
   ═══════════════════════════════════════════════════════════════ */

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function loadProject(filename) {
  try {
    const url = 'portfolio/projects/' + filename;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const script = doc.getElementById('project-data');

    if (!script) {
      console.warn(`[${filename}] Missing <script id="project-data"> block.`);
      return null;
    }

    const data = JSON.parse(script.textContent);
    data._filename = filename;
    return data;
  } catch (err) {
    console.error(`Failed to load project "${filename}":`, err);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   FILTERS & SORT
   ═══════════════════════════════════════════════════════════════ */

function populateFilters() {
  const companies = [...new Set(allProjects.map(p => p.company).filter(Boolean))].sort();
  const techs     = [...new Set(allProjects.flatMap(p => p.technologies || []))].sort();
  const areas     = [...new Set(allProjects.flatMap(p => p.majorWorkAreas || []))].sort();

  appendOptions(companyFilter, companies);
  appendOptions(techFilter, techs);
  appendOptions(areaFilter, areas);
}

function appendOptions(select, values) {
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const query   = searchInput.value.trim().toLowerCase();
  const company = companyFilter.value;
  const tech    = techFilter.value;
  const area    = areaFilter.value;
  const status  = statusFilter.value;
  const sort    = sortSelect.value;

  filtered = allProjects.filter(p => {
    if (company && p.company !== company) return false;
    if (tech    && !(p.technologies  || []).includes(tech))    return false;
    if (area    && !(p.majorWorkAreas || []).includes(area))   return false;
    if (status  && p.status !== status) return false;

    if (query) {
      const haystack = [
        p.title, p.company, p.role, p.description, p.detailedDescription,
        ...(p.technologies  || []),
        ...(p.majorWorkAreas || []),
        ...(p.highlights    || []),
        ...(p.tags          || []),
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sort) {
      case 'date-asc':   return dateVal(a.startDate) - dateVal(b.startDate);
      case 'date-desc':  return dateVal(b.startDate) - dateVal(a.startDate);
      case 'title-asc':  return (a.title || '').localeCompare(b.title || '');
      case 'title-desc': return (b.title || '').localeCompare(a.title || '');
      default:           return dateVal(b.startDate) - dateVal(a.startDate);
    }
  });

  renderGrid();
  renderActiveFilters({ query, company, tech, area, status });
  updateResultsCount();
}

function dateVal(str) {
  if (!str) return 0;
  return new Date(str + (str.length === 7 ? '-01' : '')).getTime() || 0;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — GRID
   ═══════════════════════════════════════════════════════════════ */

function renderGrid() {
  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  filtered.forEach((project, idx) => {
    const card = buildCard(project, idx);
    grid.appendChild(card);
  });
}

function buildCard(p, idx) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.style.animationDelay = `${idx * 40}ms`;
  card.style.setProperty('--company-color', companyColor(p.company));
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${p.title}`);

  const techsToShow = (p.technologies || []).slice(0, 5);
  const techsExtra  = (p.technologies || []).length - techsToShow.length;
  const areasToShow = (p.majorWorkAreas || []).slice(0, 3);

  const dateRange = formatDateRange(p.startDate, p.endDate, p.status);
  const duration  = calcDuration(p.startDate, p.endDate, p.status);

  card.innerHTML = `
    <div class="card-header">
      <div class="card-header-left">
        <span class="company-badge" style="background:${companyColor(p.company)}22; color:${companyColor(p.company)}; border-color:${companyColor(p.company)}44;">
          ${escHtml(p.company || 'Unknown')}
        </span>
        <h2 class="card-title">${escHtml(p.title || 'Untitled Project')}</h2>
        ${p.role ? `<p class="card-role">${escHtml(p.role)}</p>` : ''}
      </div>
      <span class="status-badge status-${p.status || 'completed'}">
        ${capitalize(p.status || 'completed')}
      </span>
    </div>

    <div class="card-meta">
      <span class="meta-item">
        <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        ${escHtml(dateRange)}
      </span>
      ${duration ? `<span class="meta-item">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        ${escHtml(duration)}
      </span>` : ''}
      ${p.teamSize ? `<span class="meta-item">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="11.5" cy="5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M14.5 13c0-2-1.3-3.2-3-3.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Team of ${p.teamSize}
      </span>` : ''}
    </div>

    <p class="card-description">${escHtml(p.description || '')}</p>

    ${areasToShow.length ? `
    <div>
      <p class="card-section-label">Work Areas</p>
      <div class="work-areas">
        ${areasToShow.map(a => `<span class="area-tag">${escHtml(a)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${techsToShow.length ? `
    <div>
      <p class="card-section-label">Technologies</p>
      <div class="tech-tags">
        ${techsToShow.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('')}
        ${techsExtra > 0 ? `<span class="tech-tag-more">+${techsExtra} more</span>` : ''}
      </div>
    </div>` : ''}

    <div class="card-footer">
      <span class="card-team">
        ${p.impactMetric ? `<svg viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>${escHtml(p.impactMetric)}` : ''}
      </span>
      <span class="card-cta">
        View Details
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>
  `;

  card.addEventListener('click', () => openModal(p));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(p); });

  return card;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — STATS
   ═══════════════════════════════════════════════════════════════ */

function renderStats() {
  const companies = new Set(allProjects.map(p => p.company).filter(Boolean));
  const techs     = new Set(allProjects.flatMap(p => p.technologies || []));
  const ongoing   = allProjects.filter(p => p.status === 'ongoing').length;

  headerStats.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${allProjects.length}</div>
      <div class="stat-label">Projects</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${companies.size}</div>
      <div class="stat-label">Companies</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${techs.size}</div>
      <div class="stat-label">Technologies</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${ongoing}</div>
      <div class="stat-label">Ongoing</div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   RENDER — ACTIVE FILTER CHIPS
   ═══════════════════════════════════════════════════════════════ */

function renderActiveFilters({ query, company, tech, area, status }) {
  activeFilters.innerHTML = '';

  const chips = [];
  if (query)   chips.push({ label: `"${query}"`,  clear: () => { searchInput.value = ''; applyFilters(); } });
  if (company) chips.push({ label: company,        clear: () => { companyFilter.value = ''; applyFilters(); } });
  if (tech)    chips.push({ label: tech,           clear: () => { techFilter.value = ''; applyFilters(); } });
  if (area)    chips.push({ label: area,           clear: () => { areaFilter.value = ''; applyFilters(); } });
  if (status)  chips.push({ label: capitalize(status), clear: () => { statusFilter.value = ''; applyFilters(); } });

  chips.forEach(({ label, clear }) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `${escHtml(label)}<button class="filter-chip-remove" aria-label="Remove filter">×</button>`;
    chip.querySelector('button').addEventListener('click', clear);
    activeFilters.appendChild(chip);
  });
}

function updateResultsCount() {
  const total = allProjects.length;
  const shown = filtered.length;
  resultsCount.textContent = shown === total
    ? `Showing all ${total} project${total !== 1 ? 's' : ''}`
    : `Showing ${shown} of ${total} project${total !== 1 ? 's' : ''}`;
}

/* ═══════════════════════════════════════════════════════════════
   MODAL — PROJECT DETAIL
   ═══════════════════════════════════════════════════════════════ */

function openModal(p) {
  const color = companyColor(p.company);
  const dateRange = formatDateRange(p.startDate, p.endDate, p.status);
  const duration  = calcDuration(p.startDate, p.endDate, p.status);

  const linksHtml = buildLinksHtml(p.links || {});

  modalContent.innerHTML = `
    <div class="modal-hero" style="border-top: 3px solid ${color}; border-radius: 4px 4px 0 0; margin: -32px -32px 28px; padding: 28px 32px 24px;">
      <div class="modal-hero-top">
        <div class="modal-badges">
          <span class="company-badge" style="background:${color}22; color:${color}; border-color:${color}44;">
            ${escHtml(p.company || 'Unknown')}
          </span>
          <span class="status-badge status-${p.status || 'completed'}">
            ${capitalize(p.status || 'completed')}
          </span>
        </div>
        ${p.tags && p.tags.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${p.tags.map(t => `<span style="padding:2px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:20px;font-size:11px;color:var(--text-muted);">${escHtml(t)}</span>`).join('')}
        </div>` : ''}
      </div>

      <h2 class="modal-title" id="modal-title">${escHtml(p.title || 'Untitled')}</h2>
      ${p.role ? `<p class="modal-role">${escHtml(p.role)}</p>` : ''}

      <div class="modal-meta-row">
        <span class="modal-meta-item">
          <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          <strong>${escHtml(dateRange)}</strong>
        </span>
        ${duration ? `<span class="modal-meta-item">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          <strong>${escHtml(duration)}</strong>
        </span>` : ''}
        ${p.teamSize ? `<span class="modal-meta-item">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          Team of <strong>${p.teamSize}</strong>
        </span>` : ''}
        ${p.impactMetric ? `<span class="modal-meta-item">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <strong>${escHtml(p.impactMetric)}</strong>
        </span>` : ''}
      </div>
    </div>

    ${p.detailedDescription || p.description ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Overview</h3>
      <p class="modal-description">${escHtml(p.detailedDescription || p.description)}</p>
    </div>` : ''}

    ${p.highlights && p.highlights.length ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Key Highlights</h3>
      <ul class="highlights-list">
        ${p.highlights.map(h => `<li>${escHtml(h)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${p.majorWorkAreas && p.majorWorkAreas.length ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Major Work Areas</h3>
      <div class="area-grid">
        ${p.majorWorkAreas.map(a => `<span class="area-pill">${escHtml(a)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${p.technologies && p.technologies.length ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Technologies Used</h3>
      <div class="tech-grid">
        ${p.technologies.map(t => `<span class="tech-pill">${escHtml(t)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${p.responsibilities && p.responsibilities.length ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Responsibilities</h3>
      <ul class="highlights-list">
        ${p.responsibilities.map(r => `<li>${escHtml(r)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${p.challenges && p.challenges.length ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Challenges &amp; Solutions</h3>
      <ul class="highlights-list">
        ${p.challenges.map(c => `<li>${escHtml(c)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${p.outcome ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Outcome</h3>
      <p class="modal-description">${escHtml(p.outcome)}</p>
    </div>` : ''}

    ${linksHtml ? `
    <div class="modal-section">
      <h3 class="modal-section-title">Links</h3>
      <div class="links-row">${linksHtml}</div>
    </div>` : ''}
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

function buildLinksHtml(links) {
  const items = [];

  if (links.demo) {
    items.push(`<a href="${escAttr(links.demo)}" target="_blank" rel="noopener" class="project-link project-link-primary">
      <svg viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 2h5v5M14 2L8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Live Demo
    </a>`);
  }

  if (links.github) {
    items.push(`<a href="${escAttr(links.github)}" target="_blank" rel="noopener" class="project-link project-link-secondary">
      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      GitHub
    </a>`);
  }

  if (links.docs) {
    items.push(`<a href="${escAttr(links.docs)}" target="_blank" rel="noopener" class="project-link project-link-secondary">
      <svg viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      Documentation
    </a>`);
  }

  if (links.paper) {
    items.push(`<a href="${escAttr(links.paper)}" target="_blank" rel="noopener" class="project-link project-link-secondary">
      <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" stroke-width="1.3"/><path d="M10 2v3h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      Paper / Report
    </a>`);
  }

  // Any other custom links
  Object.entries(links).forEach(([key, url]) => {
    if (['demo','github','docs','paper'].includes(key)) return;
    items.push(`<a href="${escAttr(url)}" target="_blank" rel="noopener" class="project-link project-link-secondary">
      <svg viewBox="0 0 16 16" fill="none"><path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 2h5v5M14 2L8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${escHtml(capitalize(key))}
    </a>`);
  });

  return items.join('');
}

/* ═══════════════════════════════════════════════════════════════
   EVENT WIRING
   ═══════════════════════════════════════════════════════════════ */

function wireControls() {
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  });

  [companyFilter, techFilter, areaFilter, statusFilter, sortSelect].forEach(el => {
    el.addEventListener('change', applyFilters);
  });

  resetBtn.addEventListener('click', resetAllFilters);

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
}

function resetAllFilters() {
  searchInput.value   = '';
  companyFilter.value = '';
  techFilter.value    = '';
  areaFilter.value    = '';
  statusFilter.value  = '';
  sortSelect.value    = 'date-desc';
  applyFilters();
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function showError(html) {
  grid.innerHTML = `<div class="error-banner">${html}</div>`;
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return escHtml(str);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDateRange(start, end, status) {
  const fmt = d => {
    if (!d) return null;
    const date = new Date(d + (d.length === 7 ? '-01' : ''));
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const s = fmt(start) || 'Unknown';
  const e = status === 'ongoing' ? 'Present' : (fmt(end) || 'Unknown');
  return `${s} – ${e}`;
}

function calcDuration(start, end, status) {
  if (!start) return null;
  const s = new Date(start + (start.length === 7 ? '-01' : ''));
  const e = (status === 'ongoing' || !end)
    ? new Date()
    : new Date(end + (end.length === 7 ? '-01' : ''));

  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months < 1) return '< 1 month';
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const yrs = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${yrs}y ${rem}m` : `${yrs} year${yrs !== 1 ? 's' : ''}`;
}

/**
 * Deterministic color from company name string.
 * Returns a hex color from a curated palette.
 */
function companyColor(name) {
  const palette = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#f97316', '#84cc16',
    '#e11d48', '#0ea5e9', '#a855f7', '#14b8a6',
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}
