document.addEventListener('DOMContentLoaded', async () => {
  const rawPage = document.body.dataset.page || '';
  const currentPage = rawPage === 'downloads-hub' ? 'downloads' : rawPage;
  const navPage = document.body.dataset.navPage || (currentPage.indexOf('reference-') === 0 ? 'downloads' : currentPage);
  const assetRoot = document.body.dataset.assetRoot || '';
  const assetPath = (path) => `${assetRoot}${path}`;

  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === navPage) {
      link.classList.add('active');
    }
  });

  const mobileToggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  const yearNode = document.querySelector('[data-current-year]');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const currentReleaseNode = document.querySelector('[data-current-release]');
  const releaseTargetNode = document.querySelector('[data-release-target]');

  let releaseMonth = document.body.dataset.releaseMonth || '2026-03';
  let releaseYear = parseInt((releaseMonth || '2026-03').slice(0, 4), 10);

  if (currentReleaseNode && releaseMonth) {
    currentReleaseNode.textContent = releaseMonth;
  }

  try {
    const releases = await fetchJson(assetPath('assets/data/releases.json'));
    releaseMonth = document.body.dataset.releaseMonth || getReleaseMonth(releases);
    releaseYear = parseInt((releaseMonth || '2026-03').slice(0, 4), 10);

    if (currentReleaseNode && releaseMonth) {
      currentReleaseNode.textContent = releaseMonth;
    }

    if (releaseTargetNode && Array.isArray(releases.items)) {
      releaseTargetNode.innerHTML = releases.items.map(item => `
        <div class="download-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.description)}</small>
          </div>
          <span class="badge ${escapeHtml(item.statusClass || 'info')}">${escapeHtml(item.status || 'Info')}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Release metadata could not be loaded. Falling back to the release month embedded in the page.', err);
  }

  try {
    if (currentPage === 'home') {
      await renderHomePage({ releaseMonth, releaseYear });
    }

    if (currentPage === 'coverage') {
      await renderCoveragePage({ releaseMonth, releaseYear });
    }

    if (currentPage === 'downloads') {
      await renderDownloadsPage({ releaseMonth, releaseYear });
    }

    if (currentPage.indexOf('reference-') === 0) {
      await renderReferencePage({ releaseMonth, releaseYear, page: currentPage });
    }
  } catch (err) {
    console.warn('Website data files could not be loaded. This can happen when the site is opened directly from the file system instead of through a local or hosted web server.', err);
    const statusNode = document.querySelector('[data-reference-status]');
    const bodyNode = document.querySelector('[data-reference-body-target]');
    if (statusNode && bodyNode) {
      statusNode.textContent = 'This catalog could not be loaded for the requested release. Please confirm that the published data exists for this snapshot.';
      bodyNode.innerHTML = '<tr><td colspan="6">Reference data could not be loaded for this page.</td></tr>';
    }
  }
});

async function renderHomePage(context) {
  const metricsNode = document.querySelector('[data-metrics-target]');
  const biggestNode = document.querySelector('[data-home-biggest-target]');
  const countryNode = document.querySelector('[data-home-country-target]');
  const newAsnNode = document.querySelector('[data-home-new-asns-target]');

  const overview = await fetchJson(assetPath(`assets/data/overview-global-${context.releaseMonth}.json`);
  const topAsns = await fetchJson(assetPath(`assets/data/top-asns-global-${context.releaseMonth}.json`);
  const newAsns = await fetchJson(assetPath(`assets/data/new-added-asns-${context.releaseYear}.json`);

  setText('[data-home-stat="countries"]', formatInteger(overview.totalCountriesRepresented));
  setText('[data-home-stat="asns"]', formatInteger(overview.totalAsns));
  setText('[data-home-stat="release"]', context.releaseMonth);

  if (metricsNode) {
    metricsNode.innerHTML = `
      <div class="metric-card glass">
        <div class="muted">Represented countries</div>
        <div class="metric-value">${formatInteger(overview.totalCountriesRepresented)}</div>
        <div class="card-text">Countries represented in the current published release.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Observed ASNs</div>
        <div class="metric-value">${formatInteger(overview.totalAsns)}</div>
        <div class="card-text">Distinct autonomous systems represented in the current global footprint.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Active ASNs</div>
        <div class="metric-value">${formatInteger(overview.activeAsns)}</div>
        <div class="card-text">Operationally active autonomous systems represented in the current release.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Published IPv4 footprint</div>
        <div class="metric-value">${formatCompact(overview.totalIpv4)}</div>
        <div class="card-text">Estimated IPv4 footprint represented in the current release.</div>
      </div>
    `;
  }

  if (biggestNode) {
    const biggest = sortByRank(topAsns.biggestASNs).slice(0, 5);
    biggestNode.innerHTML = biggest.map(item => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(item.asnName || `AS${item.asnId}`)}</strong>
          <small>AS${formatInteger(item.asnId)} · ${escapeHtml(item.countryName || item.countryIso || 'Unknown')} · ${escapeHtml(item.asnType || 'unknown')}</small>
        </div>
        <div class="list-metric">
          <strong>${formatInteger(item.prefixCount)}</strong>
          <small>/24 prefixes</small>
        </div>
      </div>
    `).join('');
  }

  if (countryNode) {
    const topCountries = sortByRank(topAsns.topByCountry).slice(0, 5);
    countryNode.innerHTML = topCountries.map(item => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(item.countryName || item.countryIso || 'Unknown')}</strong>
          <small>${escapeHtml(item.countryIso || 'N/A')} · ${formatInteger(item.asnCount)} ASNs</small>
        </div>
        <div class="list-metric">
          <strong>${formatCompact(item.ipv4Count)}</strong>
          <small>IPv4 est.</small>
        </div>
      </div>
    `).join('');
  }

  if (newAsnNode) {
    const newestItems = getItems(newAsns).slice(0, 5);
    newAsnNode.innerHTML = newestItems.map(item => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(item.autonomousSystem || `AS${item.id}`)}</strong>
          <small>${escapeHtml(item.name || 'Unnamed ASN')} · ${escapeHtml(item.country || 'Unknown')} · ${escapeHtml(item.rir || 'unknown')}</small>
        </div>
        <div class="list-metric">
          <strong>${escapeHtml(item.created || 'N/A')}</strong>
          <small>${escapeHtml(item.type || 'Type n/a')}</small>
        </div>
      </div>
    `).join('');
  }
}

async function renderCoveragePage(context) {
  const metricsNode = document.querySelector('[data-metrics-target]');
  const coverageNode = document.querySelector('[data-coverage-target]');
  const leadersNode = document.querySelector('[data-coverage-leaders-target]');
  const laggardsNode = document.querySelector('[data-coverage-laggards-target]');
  const rirMixNode = document.querySelector('[data-coverage-rir-target]');
  const coverageNoteNode = document.querySelector('[data-coverage-note-target]');

  const countryProfiles = await fetchJson(assetPath(`assets/data/country-profiles-${context.releaseMonth}.json`);
  const concentration = await fetchJson(assetPath(`assets/data/country-concentration-${context.releaseMonth}.json`);
  const prefixesPerRir = await fetchJson(assetPath(`assets/data/prefixes-per-rir-${context.releaseMonth}.json`);
  const asnsPerRir = await fetchJson(assetPath(`assets/data/asns-per-rir-${context.releaseMonth}.json`);
  const asnTypesPerCountry = await fetchJson(assetPath(`assets/data/asn-types-per-country-${context.releaseMonth}.json`);
  const topAsnsByRir = await fetchJson(assetPath(`assets/data/top-asns-by-rir-${context.releaseMonth}.json`);
  const worldCountryMap = await fetchJson(assetPath('assets/data/world-country-map.json');

  const concentrationMap = new Map(getItems(concentration).map(item => [String(item.iso2 || '').toUpperCase(), item]));
  const merged = getItems(countryProfiles).map(profile => {
    const concentrationRow = concentrationMap.get(String(profile.iso2 || '').toUpperCase()) || {};
    return Object.assign({}, profile, {
      top1AsnShare: numericValue(concentrationRow.top1AsnShare),
      top5AsnShare: numericValue(concentrationRow.top5AsnShare),
      top10AsnShare: numericValue(concentrationRow.top10AsnShare)
    });
  });

  const activeCountries = merged.filter(item => numericValue(item.prefixCount) > 0);
  const concentrationEligible = activeCountries.filter(item => numericValue(item.asnCount) >= 5);
  const totalPrefixes = activeCountries.reduce((sum, item) => sum + numericValue(item.prefixCount), 0);
  const totalIpv4 = activeCountries.reduce((sum, item) => sum + numericValue(item.ipv4Count), 0);
  const averageTop1 = activeCountries.length > 0
    ? activeCountries.reduce((sum, item) => sum + numericValue(item.top1AsnShare), 0) / activeCountries.length
    : 0;
  const mostConcentrated = concentrationEligible
    .slice()
    .sort((a, b) => numericValue(b.top1AsnShare) - numericValue(a.top1AsnShare) || numericValue(b.prefixCount) - numericValue(a.prefixCount))[0] || null;

  if (metricsNode) {
    metricsNode.innerHTML = `
      <div class="metric-card glass">
        <div class="muted">Countries in this release</div>
        <div class="metric-value">${formatInteger(activeCountries.length)}</div>
        <div class="card-text">Countries included in the current monthly release with non-zero published prefix coverage.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Published /24 prefixes</div>
        <div class="metric-value">${formatCompact(totalPrefixes)}</div>
        <div class="card-text">Total published /24 prefixes across all covered countries in the current release.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Estimated IPv4 footprint</div>
        <div class="metric-value">${formatCompact(totalIpv4)}</div>
        <div class="card-text">Approximate number of IPv4 addresses represented by the published country totals.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Average leading ASN share</div>
        <div class="metric-value">${formatShare(averageTop1)}</div>
        <div class="card-text">Average share held by the largest ASN within each covered country.</div>
      </div>
    `;
  }

  const mapController = renderCoverageMap({
    activeCountries,
    rirTotals: getItems(prefixesPerRir),
    asnsPerRir: getItems(asnsPerRir),
    asnTypesPerCountry: getItems(asnTypesPerCountry),
    topAsnsByRir: getItems(topAsnsByRir),
    releaseMonth: context.releaseMonth,
    worldCountryMap
  });

  if (coverageNode) {
    const topCoverage = activeCountries
      .slice()
      .sort((a, b) => numericValue(b.prefixCount) - numericValue(a.prefixCount))
      .slice(0, 25);

    coverageNode.innerHTML = topCoverage.map(item => {
      const iso = escapeHtml(item.iso2 || '');
      return `
      <tr class="coverage-table-row" tabindex="0" role="button" data-coverage-iso="${iso}" aria-label="Focus ${escapeHtml(item.countryName || item.iso2 || 'country')} on the map">
        <td>
          <strong>${escapeHtml(item.countryName || item.iso2 || 'Unknown')}</strong>
          <div class="table-subtext">${escapeHtml(item.topAsnName || 'Leading ASN unavailable')}</div>
        </td>
        <td>${escapeHtml(item.iso2 || 'N/A')}</td>
        <td>${escapeHtml(formatRirName(item.rir || 'unknown'))}</td>
        <td>${formatInteger(item.prefixCount)}</td>
        <td>${formatCompact(item.ipv4Count)}</td>
        <td>${formatShare(item.top1AsnShare)}</td>
      </tr>`;
    }).join('');

    const rows = Array.from(coverageNode.querySelectorAll('[data-coverage-iso]'));
    rows.forEach(row => {
      const iso = String(row.getAttribute('data-coverage-iso') || '').toUpperCase();
      const activate = () => {
        if (mapController && typeof mapController.selectCountry === 'function') {
          mapController.selectCountry(iso, { focus: true, adjustFilter: true });
        }
      };

      row.addEventListener('click', activate);
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });
    });

    if (mapController && typeof mapController.onSelectionChange === 'function') {
      mapController.onSelectionChange(profile => {
        const selectedIso = String((profile || {}).iso2 || '').toUpperCase();
        rows.forEach(row => {
          const iso = String(row.getAttribute('data-coverage-iso') || '').toUpperCase();
          row.classList.toggle('is-selected', iso === selectedIso);
          row.setAttribute('aria-pressed', iso === selectedIso ? 'true' : 'false');
        });
      });
    }
  }

  if (leadersNode) {
    const concentrationLeaders = concentrationEligible
      .slice()
      .sort((a, b) => numericValue(b.top1AsnShare) - numericValue(a.top1AsnShare) || numericValue(b.prefixCount) - numericValue(a.prefixCount))
      .slice(0, 5);

    leadersNode.innerHTML = concentrationLeaders.map(item => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(item.countryName || item.iso2 || 'Unknown')}</strong>
          <small>${escapeHtml(item.iso2 || 'N/A')} · ${escapeHtml(item.topAsnName || 'No dominant ASN')} · ${formatInteger(item.asnCount)} ASNs</small>
        </div>
        <div class="list-metric">
          <strong>${formatShare(item.top1AsnShare)}</strong>
          <small>leading ASN share</small>
        </div>
      </div>
    `).join('');
  }

  if (laggardsNode) {
    const leastConcentrated = concentrationEligible
      .slice()
      .sort((a, b) => numericValue(a.top1AsnShare) - numericValue(b.top1AsnShare) || numericValue(b.prefixCount) - numericValue(a.prefixCount))
      .slice(0, 5);

    laggardsNode.innerHTML = leastConcentrated.map(item => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(item.countryName || item.iso2 || 'Unknown')}</strong>
          <small>${escapeHtml(item.iso2 || 'N/A')} · ${escapeHtml(item.topAsnName || 'No single dominant ASN')} · ${formatInteger(item.asnCount)} ASNs</small>
        </div>
        <div class="list-metric">
          <strong>${formatShare(item.top1AsnShare)}</strong>
          <small>leading ASN share</small>
        </div>
      </div>
    `).join('');
  }

  if (rirMixNode) {
    const rirSummary = summarizeByRir(activeCountries);
    rirMixNode.innerHTML = rirSummary.map(item => `
      <div class="kpi-row">
        <span>${escapeHtml(formatRirName(item.rir))}</span>
        <div class="kpi-bar"><span style="width:${item.sharePercent.toFixed(1)}%"></span></div>
        <strong>${item.sharePercent.toFixed(1)}%</strong>
      </div>
    `).join('');
  }

  if (coverageNoteNode) {
    coverageNoteNode.textContent = mostConcentrated
      ? `${mostConcentrated.countryName} currently has the highest leading-ASN share among countries with at least 5 ASNs in this release at ${formatShare(mostConcentrated.top1AsnShare)}.`
      : 'Coverage notes will appear here when country data is available.';
  }
}


function renderCoverageMap(context) {
  const root = document.querySelector('[data-country-map-root]');
  const svg = document.querySelector('[data-country-map-svg]');
  const tooltip = document.querySelector('[data-country-map-tooltip]');
  const titleNode = document.querySelector('[data-country-map-title]');
  const descriptionNode = document.querySelector('[data-country-map-description]');
  const rirNode = document.querySelector('[data-country-map-rir]');
  const capitalNode = document.querySelector('[data-country-map-capital]');
  const asnsNode = document.querySelector('[data-country-map-asns]');
  const prefixesNode = document.querySelector('[data-country-map-prefixes]');
  const ipv4Node = document.querySelector('[data-country-map-ipv4]');
  const shareNode = document.querySelector('[data-country-map-share]');
  const topAsnNode = document.querySelector('[data-country-map-top-asn]');
  const registryNode = document.querySelector('[data-country-map-registry]');
  const rirMixNode = document.querySelector('[data-country-map-rir-mix]');
  const rirTopAsnNode = document.querySelector('[data-country-map-rir-top-asn]');
  const countryMixNode = document.querySelector('[data-country-map-country-mix]');
  const noteNode = document.querySelector('[data-country-map-note]');
  const filterButtons = Array.from(document.querySelectorAll('[data-country-filter]'));
  const searchNode = document.querySelector('[data-country-map-search]');
  const optionsNode = document.querySelector('[data-country-map-options]');
  const findButton = document.querySelector('[data-country-map-find]');
  const resetViewButton = document.querySelector('[data-country-map-reset-view]');
  const statusNode = document.querySelector('[data-country-map-status]');

  if (!root || !svg || !titleNode || !descriptionNode || !rirNode || !capitalNode || !asnsNode || !prefixesNode || !ipv4Node || !shareNode || !topAsnNode || !registryNode || !noteNode) {
    return null;
  }

  const registryDescriptions = {
    arin: 'North America and part of the Caribbean in the current release footprint.',
    lacnic: 'Latin America and the Caribbean in the current release footprint.',
    ripe: 'Europe, the Middle East, and parts of Central Asia in the current release footprint.',
    afrinic: 'Africa in the current release footprint.',
    apnic: 'Asia Pacific, including Oceania, in the current release footprint.'
  };

  const countries = getItems(context.activeCountries).slice().sort((a, b) => numericValue(b.prefixCount) - numericValue(a.prefixCount));
  const alphabeticCountries = countries.slice().sort((a, b) => String(a.countryName || a.iso2 || '').localeCompare(String(b.countryName || b.iso2 || '')));
  const profileMap = new Map(countries.map(item => [String(item.iso2 || '').toUpperCase(), item]));
  const rirTotalsMap = new Map(getItems(context.rirTotals).map(item => [String(item.rir || '').toLowerCase(), item]));
  const rirAsnMixMap = new Map(getItems(context.asnsPerRir).map(item => [String(item.rir || '').toLowerCase(), item]));
  const countryAsnMixMap = new Map(getItems(context.asnTypesPerCountry).map(item => [String(item.iso2 || '').toUpperCase(), item]));
  const topAsnByRirMap = new Map(getItems(context.topAsnsByRir).map(item => [String(item.rir || '').toLowerCase(), item]));
  const selectionListeners = [];
  const fullViewBox = parseViewBox((context.worldCountryMap && context.worldCountryMap.viewBox) || svg.getAttribute('viewBox') || '0 0 1000 520');
  let currentViewBox = Object.assign({}, fullViewBox);
  let animationFrame = null;

  const mapShapes = getItems(context.worldCountryMap && context.worldCountryMap.countries)
    .map(shape => {
      const iso2 = String(shape.iso2 || '').toUpperCase();
      const profile = profileMap.get(iso2) || null;
      return Object.assign({}, shape, {
        iso2,
        profile,
        rir: String((profile || {}).rir || '').toLowerCase()
      });
    })
    .filter(shape => shape.profile);

  if (!mapShapes.length) {
    titleNode.textContent = 'Country map unavailable';
    descriptionNode.textContent = 'The country-level map layer could not be loaded for this release.';
    return null;
  }

  let activeFilter = 'all';
  let selectedIso = countries[0] ? String(countries[0].iso2 || '').toUpperCase() : '';

  svg.setAttribute('viewBox', formatViewBox(fullViewBox));
  svg.innerHTML = buildCountryMapBackdrop() + mapShapes.map(shape => buildCountryMapShape(shape)).join('');

  const shapeNodes = Array.from(svg.querySelectorAll('[data-country-iso]'));
  const shapeNodeMap = new Map();
  shapeNodes.forEach(node => {
    const iso = String(node.getAttribute('data-country-iso') || '').toUpperCase();
    if (iso && !shapeNodeMap.has(iso)) {
      shapeNodeMap.set(iso, node);
    }
  });

  markMicroCountries();
  populateSearchOptions();
  updateFilterButtons();
  syncSelection({ focus: false });
  focusCurrentScope(false);

  shapeNodes.forEach(node => {
    const iso = String(node.getAttribute('data-country-iso') || '').toUpperCase();

    node.addEventListener('mouseenter', event => showTooltip(event, iso));
    node.addEventListener('mousemove', event => showTooltip(event, iso));
    node.addEventListener('mouseleave', hideTooltip);
    node.addEventListener('focus', event => showTooltip(event, iso));
    node.addEventListener('blur', hideTooltip);
    node.addEventListener('click', () => {
      selectedIso = iso;
      syncSelection({ focus: true, focusMode: 'selection' });
    });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectedIso = iso;
        syncSelection({ focus: true, focusMode: 'selection' });
      }
    });
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const requestedFilter = String(button.getAttribute('data-country-filter') || 'all').toLowerCase();
      setActiveFilter(requestedFilter, { focus: true });
    });
  });

  if (findButton) {
    findButton.addEventListener('click', () => {
      trySelectSearch(true);
    });
  }

  if (searchNode) {
    searchNode.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        trySelectSearch(true);
      }
    });
    searchNode.addEventListener('change', () => {
      trySelectSearch(false);
    });
  }

  if (resetViewButton) {
    resetViewButton.addEventListener('click', () => {
      focusCurrentScope(true);
      updateStatus(profileMap.get(selectedIso) || null);
    });
  }

  return {
    selectCountry,
    resetView: () => focusCurrentScope(true),
    onSelectionChange(handler) {
      if (typeof handler === 'function') {
        selectionListeners.push(handler);
        handler(profileMap.get(selectedIso) || null);
      }
    }
  };

  function populateSearchOptions() {
    if (!optionsNode) {
      return;
    }
    optionsNode.innerHTML = alphabeticCountries.map(item => `<option value="${escapeHtml(item.countryName || item.iso2 || '')}">${escapeHtml(item.iso2 || '')}</option>`).join('');
  }

  function updateFilterButtons() {
    filterButtons.forEach(item => {
      const pressed = String(item.getAttribute('data-country-filter') || 'all').toLowerCase() === activeFilter;
      item.classList.toggle('active', pressed);
      item.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });
  }

  function setActiveFilter(filter, options) {
    activeFilter = String(filter || 'all').toLowerCase();
    updateFilterButtons();

    if (!getFilteredCountries().some(item => String(item.iso2 || '').toUpperCase() === selectedIso)) {
      const firstVisible = getFilteredCountries()[0];
      selectedIso = firstVisible ? String(firstVisible.iso2 || '').toUpperCase() : '';
    }

    syncSelection({ focus: !(options && options.focus === false), focusMode: 'filter' });
  }

  function getFilteredCountries() {
    return countries.filter(item => activeFilter === 'all' || String(item.rir || '').toLowerCase() === activeFilter);
  }

  function selectCountry(iso, options) {
    const targetIso = String(iso || '').toUpperCase();
    const profile = profileMap.get(targetIso);
    if (!profile) {
      if (statusNode) {
        statusNode.textContent = `No country matched “${String(iso || '').trim()}”.`;
      }
      return false;
    }

    const targetRir = String(profile.rir || '').toLowerCase();
    if (options && options.adjustFilter !== false && activeFilter !== 'all' && targetRir !== activeFilter) {
      activeFilter = targetRir;
      updateFilterButtons();
    }

    selectedIso = targetIso;
    if (searchNode) {
      searchNode.value = profile.countryName || profile.iso2 || '';
    }
    syncSelection({ focus: !(options && options.focus === false), focusMode: 'selection' });
    return true;
  }

  function trySelectSearch(focus) {
    if (!searchNode) {
      return;
    }
    const query = String(searchNode.value || '').trim();
    if (!query) {
      focusCurrentScope(true);
      updateStatus(profileMap.get(selectedIso) || null);
      return;
    }

    const match = resolveCountryQuery(query);
    if (!match) {
      if (statusNode) {
        statusNode.textContent = `No country matched “${query}”. Try a country name or a 2-letter ISO code.`;
      }
      return;
    }

    selectCountry(match.iso2, { focus, adjustFilter: true });
  }

  function resolveCountryQuery(query) {
    const normal = String(query || '').trim().toUpperCase();
    if (!normal) {
      return null;
    }

    return alphabeticCountries.find(item => String(item.iso2 || '').toUpperCase() === normal)
      || alphabeticCountries.find(item => String(item.countryName || '').toUpperCase() === normal)
      || alphabeticCountries.find(item => String(item.countryName || '').toUpperCase().startsWith(normal))
      || alphabeticCountries.find(item => String(item.countryName || '').toUpperCase().includes(normal))
      || null;
  }

  function syncSelection(options) {
    const selectedProfile = profileMap.get(selectedIso) || getFilteredCountries()[0] || null;
    if (selectedProfile) {
      selectedIso = String(selectedProfile.iso2 || '').toUpperCase();
    }

    shapeNodes.forEach(node => {
      const iso = String(node.getAttribute('data-country-iso') || '').toUpperCase();
      const rir = String(node.getAttribute('data-country-rir') || '').toLowerCase();
      const visible = activeFilter === 'all' || rir === activeFilter;
      const selected = iso === selectedIso;
      node.classList.toggle('is-dim', !visible);
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    updatePanel(selectedProfile);
    updateStatus(selectedProfile);
    selectionListeners.forEach(listener => listener(selectedProfile));

    if (options && options.focus) {
      if (options.focusMode === 'selection' && selectedProfile) {
        focusCountry(selectedIso, true);
      } else {
        focusCurrentScope(true);
      }
    }
  }

  function updatePanel(profile) {
    if (!profile) {
      titleNode.textContent = 'No countries for this filter';
      descriptionNode.textContent = 'The selected registry filter does not have published countries in the current release.';
      rirNode.textContent = '—';
      capitalNode.textContent = '—';
      asnsNode.textContent = '—';
      prefixesNode.textContent = '—';
      ipv4Node.textContent = '—';
      shareNode.textContent = '—';
      topAsnNode.innerHTML = '';
      registryNode.innerHTML = '';
      if (rirMixNode) { rirMixNode.innerHTML = ''; }
      if (rirTopAsnNode) { rirTopAsnNode.innerHTML = ''; }
      if (countryMixNode) { countryMixNode.innerHTML = ''; }
      noteNode.textContent = 'Choose another registry filter to continue exploring the country map.';
      return;
    }

    const rir = String(profile.rir || '').toLowerCase();
    const registryTotals = rirTotalsMap.get(rir) || {};
    const registryCountries = countries.filter(item => String(item.rir || '').toLowerCase() === rir);
    const registryAsns = registryCountries.reduce((sum, item) => sum + numericValue(item.asnCount), 0);
    const registryPrefixes = registryCountries.reduce((sum, item) => sum + numericValue(item.prefixCount), 0);
    const registryIpv4 = registryCountries.reduce((sum, item) => sum + numericValue(item.ipv4Count), 0);
    const registryAsnMix = rirAsnMixMap.get(rir) || null;
    const countryAsnMix = countryAsnMixMap.get(String(profile.iso2 || '').toUpperCase()) || null;
    const registryTopAsn = topAsnByRirMap.get(rir) || null;

    titleNode.textContent = profile.countryName || profile.iso2 || 'Unknown country';
    descriptionNode.textContent = `${profile.countryName || profile.iso2} (${profile.iso2 || 'n/a'}${profile.tld ? ` · ${profile.tld}` : ''}) is currently published under ${formatRirName(rir)}. The panel below summarizes the country footprint and the broader registry totals for this release.`;
    rirNode.textContent = formatRirName(rir);
    capitalNode.textContent = profile.capital || 'n/a';
    asnsNode.textContent = formatInteger(profile.asnCount);
    prefixesNode.textContent = formatCompact(profile.prefixCount);
    ipv4Node.textContent = formatCompact(profile.ipv4Count);
    shareNode.textContent = formatShare(profile.top1AsnShare);

    topAsnNode.innerHTML = `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(profile.topAsnName || 'Leading ASN unavailable')}</strong>
          <small>${escapeHtml(formatAsnTypeLabel((profile.topAsnType || 'unknown').toString()))}</small>
        </div>
        <div class="list-metric">
          <strong>${formatCompact(profile.topAsnIpv4Count)}</strong>
          <small>IPv4 est.</small>
        </div>
      </div>
      <div class="list-row">
        <div>
          <strong>Lead network share</strong>
          <small>Share held by the largest ASN in this country</small>
        </div>
        <div class="list-metric">
          <strong>${formatShare(profile.top1AsnShare)}</strong>
          <small>${formatInteger(profile.topAsnPrefixCount)} /24s</small>
        </div>
      </div>
    `;

    registryNode.innerHTML = `
      <div class="list-row">
        <div>
          <strong>${formatRirName(rir)}</strong>
          <small>${escapeHtml(registryDescriptions[rir] || 'Regional registry summary for the current release.')}</small>
        </div>
        <div class="list-metric">
          <strong>${formatInteger(registryCountries.length)}</strong>
          <small>countries</small>
        </div>
      </div>
      <div class="list-row">
        <div>
          <strong>Registry footprint</strong>
          <small>Published release totals for the selected registry</small>
        </div>
        <div class="list-metric">
          <strong>${formatCompact(registryPrefixes || registryTotals.prefixCount)}</strong>
          <small>${formatCompact(registryIpv4 || registryTotals.ipv4Count)} IPv4</small>
        </div>
      </div>
      <div class="list-row">
        <div>
          <strong>Registry ASN count</strong>
          <small>Summed country ASN counts currently visible in the publication</small>
        </div>
        <div class="list-metric">
          <strong>${formatInteger(registryAsns || registryTotals.asnCount)}</strong>
          <small>${formatRirName(rir)}</small>
        </div>
      </div>
    `;

    if (rirMixNode) {
      rirMixNode.innerHTML = renderAsnMixCard(registryAsnMix, {
        emptyTitle: 'Registry mix unavailable',
        emptyText: 'ASN composition is not available for the selected registry.',
        summaryText: total => `Based on ${formatInteger(total)} ASNs currently published in ${formatRirName(rir)}.`
      });
    }

    if (rirTopAsnNode) {
      rirTopAsnNode.innerHTML = renderTopAsnCard(registryTopAsn, formatRirName(rir));
    }

    if (countryMixNode) {
      countryMixNode.innerHTML = renderAsnMixCard(countryAsnMix, {
        emptyTitle: 'Country mix unavailable',
        emptyText: 'ASN composition is not available for the selected country.',
        summaryText: total => total >= 5
          ? `Dominant ASN type in the current country profile: ${formatAsnTypeLabel(getDominantAsnType(countryAsnMix).key)}.`
          : 'Small ASN base; composition should be read cautiously.'
      });
    }

    noteNode.textContent = `${profile.countryName} is highlighted on the map. Use search for a direct jump, or use reset map view to return to the current registry scope.`;
  }

  function updateStatus(profile) {
    if (!statusNode) {
      return;
    }

    const visibleCountries = getFilteredCountries();
    const scopeText = activeFilter === 'all' ? 'All registries' : formatRirName(activeFilter);
    const selectedText = profile ? `${profile.countryName} (${profile.iso2 || 'n/a'})` : 'None';
    statusNode.innerHTML = `<strong>${escapeHtml(scopeText)}</strong> · ${formatInteger(visibleCountries.length)} visible countries · Selected: <strong>${escapeHtml(selectedText)}</strong>`;
  }

  function focusCurrentScope(animate) {
    const visibleIsos = getFilteredCountries().map(item => String(item.iso2 || '').toUpperCase());
    const target = visibleIsos.length ? getBoundsForIsos(visibleIsos, { pad: activeFilter === 'all' ? 18 : 26, minWidth: activeFilter === 'all' ? fullViewBox.width : 260, minHeight: activeFilter === 'all' ? fullViewBox.height : 150 }) : fullViewBox;
    setViewBox(target || fullViewBox, animate);
  }

  function focusCountry(iso, animate) {
    const target = getBoundsForIsos([iso], { pad: 18, minWidth: 150, minHeight: 84, maxScale: 0.26 }) || fullViewBox;
    setViewBox(target, animate);
  }

  function getBoundsForIsos(isoList, options) {
    const bounds = isoList
      .map(iso => {
        const node = shapeNodeMap.get(String(iso || '').toUpperCase());
        return node ? node.getBBox() : null;
      })
      .filter(Boolean)
      .reduce((acc, box) => unionBounds(acc, box), null);

    if (!bounds) {
      return null;
    }

    const padded = {
      x: bounds.x - numericValue((options || {}).pad || 0),
      y: bounds.y - numericValue((options || {}).pad || 0),
      width: bounds.width + (numericValue((options || {}).pad || 0) * 2),
      height: bounds.height + (numericValue((options || {}).pad || 0) * 2)
    };

    let minWidth = numericValue((options || {}).minWidth);
    let minHeight = numericValue((options || {}).minHeight);
    if (numericValue((options || {}).maxScale) > 0) {
      minWidth = Math.max(minWidth, fullViewBox.width * numericValue((options || {}).maxScale));
      minHeight = Math.max(minHeight, fullViewBox.height * numericValue((options || {}).maxScale));
    }

    return constrainBounds(padded, fullViewBox, minWidth, minHeight);
  }

  function setViewBox(targetBox, animate) {
    const target = constrainBounds(targetBox, fullViewBox, 0, 0);
    if (!target) {
      return;
    }

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (!animate) {
      currentViewBox = Object.assign({}, target);
      svg.setAttribute('viewBox', formatViewBox(currentViewBox));
      return;
    }

    const start = Object.assign({}, currentViewBox);
    const startTime = performance.now();
    const duration = 280;

    const step = now => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentViewBox = {
        x: start.x + ((target.x - start.x) * eased),
        y: start.y + ((target.y - start.y) * eased),
        width: start.width + ((target.width - start.width) * eased),
        height: start.height + ((target.height - start.height) * eased)
      };
      svg.setAttribute('viewBox', formatViewBox(currentViewBox));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        currentViewBox = Object.assign({}, target);
        svg.setAttribute('viewBox', formatViewBox(currentViewBox));
        animationFrame = null;
      }
    };

    animationFrame = requestAnimationFrame(step);
  }

  function markMicroCountries() {
    shapeNodes.forEach(node => {
      const box = node.getBBox();
      const isMicro = node.tagName.toLowerCase() === 'circle' || (box.width * box.height) < 120 || Math.min(box.width, box.height) < 6;
      if (isMicro) {
        node.classList.add('is-micro');
      }
    });
  }

  function showTooltip(event, iso) {
    if (!tooltip) {
      return;
    }

    const profile = profileMap.get(iso);
    if (!profile) {
      return;
    }

    tooltip.hidden = false;
    tooltip.innerHTML = `
      <strong>${escapeHtml(profile.countryName || profile.iso2 || 'Unknown country')}</strong>
      <span>${escapeHtml(profile.iso2 || 'N/A')} · ${escapeHtml(formatRirName(profile.rir || ''))}</span>
      <span>${formatCompact(profile.prefixCount)} /24s · ${formatInteger(profile.asnCount)} ASNs</span>
      <span>${formatShare(profile.top1AsnShare)} lead ASN share</span>
    `;

    positionTooltip(event.currentTarget, event);
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.hidden = true;
    }
  }

  function positionTooltip(target, event) {
    if (!tooltip || !root) {
      return;
    }

    const shellBox = root.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    const pointX = event && typeof event.clientX === 'number' ? event.clientX : targetBox.left + (targetBox.width / 2);
    const pointY = event && typeof event.clientY === 'number' ? event.clientY : targetBox.top + (targetBox.height / 2);

    const tooltipWidth = tooltip.offsetWidth || 220;
    const tooltipHeight = tooltip.offsetHeight || 90;

    let left = pointX - shellBox.left + 14;
    let top = pointY - shellBox.top + 14;

    if (left + tooltipWidth > shellBox.width - 12) {
      left = shellBox.width - tooltipWidth - 12;
    }
    if (top + tooltipHeight > shellBox.height - 12) {
      top = pointY - shellBox.top - tooltipHeight - 14;
    }

    tooltip.style.left = `${Math.max(12, left)}px`;
    tooltip.style.top = `${Math.max(12, top)}px`;
  }
}


function renderAsnMixCard(record, options) {
  const settings = options || {};
  const emptyTitle = settings.emptyTitle || 'Composition unavailable';
  const emptyText = settings.emptyText || 'Composition data is not available.';
  const summaryFactory = typeof settings.summaryText === 'function' ? settings.summaryText : null;
  const mixRows = getAsnMixRows(record);

  if (!mixRows.length) {
    return `
      <div class="mix-summary">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <span>${escapeHtml(emptyText)}</span>
      </div>
    `;
  }

  const total = mixRows.reduce((sum, item) => sum + numericValue(item.value), 0);
  const dominant = mixRows[0] || null;
  const summaryText = summaryFactory
    ? summaryFactory(total, dominant)
    : `${formatAsnTypeLabel((dominant || {}).key)} is currently the largest category.`;

  return `
    <div class="mix-summary">
      <strong>${escapeHtml(total > 0 && dominant ? `${formatAsnTypeLabel(dominant.key)} leads this published mix` : emptyTitle)}</strong>
      <span>${escapeHtml(summaryText || emptyText)}</span>
    </div>
    <div class="mix-stack">
      ${mixRows.map(item => `
        <div class="mix-row">
          <div class="mix-row-label">${escapeHtml(item.label)}</div>
          <div class="mix-bar"><span style="width:${item.sharePercent.toFixed(1)}%"></span></div>
          <div class="mix-row-metric">
            <strong>${item.sharePercent.toFixed(1)}%</strong>
            <small>${formatInteger(item.value)} ASNs</small>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTopAsnCard(item, rirName) {
  if (!item) {
    return `
      <div class="list-row">
        <div>
          <strong>Largest ASN unavailable</strong>
          <small>No registry-level ASN leader is available for ${escapeHtml(rirName || 'this registry')}.</small>
        </div>
      </div>
    `;
  }

  const asnLabel = numericValue(item.asnId) > 0 ? `AS${Math.trunc(numericValue(item.asnId))}` : 'ASN unavailable';
  return `
    <div class="list-row">
      <div>
        <strong>${escapeHtml(item.asnName || asnLabel)}</strong>
        <small>${escapeHtml(asnLabel)} · ${escapeHtml(item.countryIso || 'N/A')} · ${escapeHtml(formatAsnTypeLabel(item.asnType || 'unknown'))}</small>
      </div>
      <div class="list-metric">
        <strong>${formatCompact(item.ipv4Count)}</strong>
        <small>IPv4 est.</small>
      </div>
    </div>
    <div class="list-row">
      <div>
        <strong>Published footprint</strong>
        <small>Largest ASN currently visible in ${escapeHtml(rirName || 'the selected registry')}</small>
      </div>
      <div class="list-metric">
        <strong>${formatInteger(item.prefixCount)}</strong>
        <small>/24 prefixes</small>
      </div>
    </div>
  `;
}

function getAsnMixRows(record) {
  if (!record) {
    return [];
  }

  const ordered = [
    { key: 'isp', label: 'ISP' },
    { key: 'hosting', label: 'Hosting' },
    { key: 'business', label: 'Business' },
    { key: 'education', label: 'Education' },
    { key: 'government', label: 'Government' },
    { key: 'inactive', label: 'Inactive' }
  ].map(item => ({
    key: item.key,
    label: item.label,
    value: numericValue(record[item.key])
  }));

  const total = numericValue(record.total) || ordered.reduce((sum, item) => sum + numericValue(item.value), 0);
  return ordered
    .filter(item => numericValue(item.value) > 0)
    .sort((a, b) => numericValue(b.value) - numericValue(a.value))
    .map(item => Object.assign({}, item, {
      sharePercent: total > 0 ? (numericValue(item.value) / total) * 100 : 0
    }));
}

function getDominantAsnType(record) {
  const rows = getAsnMixRows(record);
  return rows[0] || { key: 'unknown', label: 'Unknown', value: 0, sharePercent: 0 };
}

function formatAsnTypeLabel(value) {
  const key = String(value || '').toLowerCase();
  const labels = {
    isp: 'ISP',
    hosting: 'Hosting',
    business: 'Business',
    education: 'Education',
    government: 'Government',
    inactive: 'Inactive',
    unknown: 'Unknown'
  };
  return labels[key] || String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}


function buildCountryMapBackdrop() {
  const width = 1000;
  const height = 520;
  const verticals = [-120, -60, 0, 60, 120]
    .map(lon => {
      const x = ((lon + 180) / 360) * width;
      return `<line class="country-map-graticule" x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${height}"></line>`;
    })
    .join('');

  const horizontals = [-60, -30, 0, 30, 60]
    .map(lat => {
      const y = ((90 - lat) / 180) * height;
      return `<line class="country-map-graticule" x1="0" y1="${y.toFixed(2)}" x2="${width}" y2="${y.toFixed(2)}"></line>`;
    })
    .join('');

  return `
    <rect class="country-map-ocean" x="0" y="0" width="${width}" height="${height}" rx="30"></rect>
    <g class="country-map-grid" aria-hidden="true">
      ${verticals}
      ${horizontals}
    </g>
  `;
}

function buildCountryMapShape(shape) {
  const iso = escapeHtml(shape.iso2 || '');
  const rir = escapeHtml(shape.rir || 'unknown');
  const label = escapeHtml(shape.name || shape.iso2 || 'Country');
  const common = `class="country-map-country rir-${rir}" data-country-iso="${iso}" data-country-rir="${rir}" tabindex="0" role="button" aria-label="Select ${label}" aria-pressed="false"`;

  if (shape.type === 'point') {
    return `<circle ${common} cx="${Number(shape.cx || 0).toFixed(2)}" cy="${Number(shape.cy || 0).toFixed(2)}" r="${Number(shape.r || 4).toFixed(2)}"></circle>`;
  }

  return `<path ${common} d="${shape.path}"></path>`;
}

function parseViewBox(value) {
  const parts = String(value || '0 0 1000 520').trim().split(/\s+/).map(Number);
  return {
    x: Number.isFinite(parts[0]) ? parts[0] : 0,
    y: Number.isFinite(parts[1]) ? parts[1] : 0,
    width: Number.isFinite(parts[2]) ? parts[2] : 1000,
    height: Number.isFinite(parts[3]) ? parts[3] : 520
  };
}

function formatViewBox(box) {
  const target = box || { x: 0, y: 0, width: 1000, height: 520 };
  return `${target.x.toFixed(2)} ${target.y.toFixed(2)} ${target.width.toFixed(2)} ${target.height.toFixed(2)}`;
}

function unionBounds(current, next) {
  if (!next) {
    return current;
  }
  if (!current) {
    return {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height
    };
  }

  const left = Math.min(current.x, next.x);
  const top = Math.min(current.y, next.y);
  const right = Math.max(current.x + current.width, next.x + next.width);
  const bottom = Math.max(current.y + current.height, next.y + next.height);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

function constrainBounds(bounds, fullBounds, minWidth, minHeight) {
  if (!bounds || !fullBounds) {
    return null;
  }

  const full = {
    x: numericValue(fullBounds.x),
    y: numericValue(fullBounds.y),
    width: Math.max(1, numericValue(fullBounds.width)),
    height: Math.max(1, numericValue(fullBounds.height))
  };

  let width = Math.max(numericValue(bounds.width), numericValue(minWidth));
  let height = Math.max(numericValue(bounds.height), numericValue(minHeight));
  const targetAspect = full.width / full.height;
  const currentAspect = width / height;

  if (currentAspect > targetAspect) {
    height = width / targetAspect;
  } else {
    width = height * targetAspect;
  }

  width = Math.min(width, full.width);
  height = Math.min(height, full.height);

  let x = numericValue(bounds.x) + ((numericValue(bounds.width) - width) / 2);
  let y = numericValue(bounds.y) + ((numericValue(bounds.height) - height) / 2);

  x = clamp(x, full.x, full.x + full.width - width);
  y = clamp(y, full.y, full.y + full.height - height);

  return { x, y, width, height };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function renderDownloadsPage(context) {
  const metricsNode = document.querySelector('[data-download-metrics-target]');
  const referenceNode = document.querySelector('[data-reference-target]');
  const summaryNode = document.querySelector('[data-release-summary-target]');

  const [overview, countryProfiles, rirProfiles, bogons, cidr, ports, rootZone] = await Promise.all([
    fetchJson(assetPath(`assets/data/overview-global-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/country-profiles-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/rir-profiles-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/bogons-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/cidr-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/ports-${context.releaseMonth}.json`),
    fetchJson(assetPath(`assets/data/root-zone-database-${context.releaseMonth}.json`)
  ]);

  if (metricsNode) {
    metricsNode.innerHTML = `
      <div class="metric-card glass">
        <div class="muted">Current release</div>
        <div class="metric-value">${escapeHtml(context.releaseMonth)}</div>
        <div class="card-text">Single monthly publication label reused consistently across the website data estate.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Published country profiles</div>
        <div class="metric-value">${formatInteger(getItems(countryProfiles).length)}</div>
        <div class="card-text">Country-level summary objects ready to power directory, coverage, and comparison views.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Published RIR profiles</div>
        <div class="metric-value">${formatInteger(getItems(rirProfiles).length)}</div>
        <div class="card-text">Executive registry profiles with type mix and footprint metrics for the monthly release.</div>
      </div>
      <div class="metric-card glass">
        <div class="muted">Global IPv4 estimate</div>
        <div class="metric-value">${formatCompact(overview.totalIpv4)}</div>
        <div class="card-text">High-level publication scale indicator exposed directly from the global overview dataset.</div>
      </div>
    `;
  }

  if (referenceNode) {
    const referenceItems = [
      {
        title: 'CIDR reference',
        count: getItemCount(cidr),
        description: 'CIDR notation dictionary intended for explanatory and educational use.',
        pageHref: 'reference-cidr.html'
      },
      {
        title: 'Ports reference',
        count: getItemCount(ports),
        description: 'Protocol and port mapping catalog for network operations context.',
        pageHref: 'reference-ports.html'
      },
      {
        title: 'Root zone database',
        count: getItemCount(rootZone),
        description: 'TLD-oriented reference material supporting internet namespace context.',
        pageHref: 'reference-root-zone.html'
      }
    ];

    referenceNode.innerHTML = referenceItems.map(item => `
      <div class="list-row list-row-actions">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.description)}</small>
        </div>
        <div class="list-metric list-metric-actions">
          <strong>${formatInteger(item.count)}</strong>
          <small>published rows</small>
          <div class="button-group compact-actions">
            <a class="btn btn-secondary" href="${escapeHtml(item.pageHref)}">View data</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (summaryNode) {
    summaryNode.innerHTML = `
      <li>Publish refreshed JSON files under <strong>assets/data</strong> for the active monthly release.</li>
      <li>Keep layout assets stable and let <strong>site.js</strong> consume the current release dynamically from <strong>releases.json</strong>.</li>
      <li>Use the country and RIR profile master files as the primary public website feeds.</li>
      <li>Expose reference catalogs through dedicated browser pages so the published rows themselves are visible on the website.</li>
    `;
  }
}

async function renderReferencePage(context) {
  const config = getReferenceConfig(context.page, context.releaseMonth);
  if (!config) {
    return;
  }

  const metricsNode = document.querySelector('[data-reference-metrics-target]');
  const notesNode = document.querySelector('[data-reference-notes-target]');
  const headNode = document.querySelector('[data-reference-head-target]');
  const bodyNode = document.querySelector('[data-reference-body-target]');
  const statusNode = document.querySelector('[data-reference-status]');
  const searchNode = document.querySelector('[data-reference-search]');
  const pageSizeNode = document.querySelector('[data-reference-page-size]');
  const prevNode = document.querySelector('[data-reference-prev]');
  const nextNode = document.querySelector('[data-reference-next]');
  const rawLinkNode = document.querySelector('[data-reference-raw-link]');

  const payload = getInlineReferencePayload() || await fetchJson(config.dataPath);
  const items = getItems(payload);
  if (rawLinkNode) {
    rawLinkNode.setAttribute('href', config.dataPath);
  }

  if (metricsNode) {
    const cards = config.metricCards(items, payload, context.releaseMonth);
    metricsNode.innerHTML = cards.map(card => `
      <div class="metric-card glass">
        <div class="muted">${escapeHtml(card.label)}</div>
        <div class="metric-value">${escapeHtml(card.value)}</div>
        <div class="card-text">${escapeHtml(card.text)}</div>
      </div>
    `).join('');
  }

  if (notesNode) {
    notesNode.innerHTML = config.notes.map(note => `
      <div class="list-row">
        <div>
          <strong>${escapeHtml(note.title)}</strong>
          <small>${escapeHtml(note.text)}</small>
        </div>
      </div>
    `).join('');
  }

  if (headNode) {
    headNode.innerHTML = `<tr>${config.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>`;
  }

  const state = {
    page: 1,
    pageSize: pageSizeNode ? numericValue(pageSizeNode.value) || 50 : 50,
    filtered: items.slice()
  };

  function filterItems(term) {
    const searchTerm = String(term || '').trim().toLowerCase();
    if (!searchTerm) {
      return items.slice();
    }

    return items.filter(item => config.columns.some(column => {
      const raw = getCellValue(item, column);
      return String(raw == null ? '' : raw).toLowerCase().indexOf(searchTerm) >= 0;
    }));
  }

  function renderPage() {
    state.pageSize = pageSizeNode ? numericValue(pageSizeNode.value) || 50 : state.pageSize;
    const total = state.filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > pageCount) {
      state.page = pageCount;
    }
    if (state.page < 1) {
      state.page = 1;
    }

    const startIndex = (state.page - 1) * state.pageSize;
    const pageItems = state.filtered.slice(startIndex, startIndex + state.pageSize);

    if (bodyNode) {
      bodyNode.innerHTML = pageItems.length > 0
        ? pageItems.map(item => `<tr>${config.columns.map(column => `<td>${formatReferenceCell(getCellValue(item, column), column)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${config.columns.length}">No rows match the current filter.</td></tr>`;
    }

    if (statusNode) {
      const from = total === 0 ? 0 : startIndex + 1;
      const to = Math.min(startIndex + pageItems.length, total);
      statusNode.textContent = `Showing ${formatInteger(from)}-${formatInteger(to)} of ${formatInteger(total)} rows for ${config.shortTitle}.`;
    }

    if (prevNode) {
      prevNode.disabled = state.page <= 1;
    }
    if (nextNode) {
      nextNode.disabled = state.page >= pageCount;
    }
  }

  if (searchNode) {
    searchNode.addEventListener('input', event => {
      state.filtered = filterItems(event.target.value);
      state.page = 1;
      renderPage();
    });
  }

  if (pageSizeNode) {
    pageSizeNode.addEventListener('change', () => {
      state.page = 1;
      renderPage();
    });
  }

  if (prevNode) {
    prevNode.addEventListener('click', () => {
      state.page -= 1;
      renderPage();
    });
  }

  if (nextNode) {
    nextNode.addEventListener('click', () => {
      state.page += 1;
      renderPage();
    });
  }

  renderPage();
}

function getReferenceConfig(page, releaseMonth) {
  const base = {
    'reference-bogons': {
      shortTitle: 'bogons catalog',
      dataPath: `assets/data/bogons-${releaseMonth}.json`,
      columns: [
        { key: 'network', label: 'Network' },
        { key: 'description', label: 'Description' }
      ],
      notes: [
        { title: 'What this catalog is for', text: 'These rows summarize special-purpose or restricted IPv4 blocks that are frequently needed for technical filtering, validation, or documentation workflows.' },
        { title: 'Publication model', text: 'The table is loaded directly from the monthly JSON export. The browser view is a convenience layer on top of the raw published file.' },
        { title: 'How to read the rows', text: 'Each row combines the network base address with the CIDR width, then shows the descriptive label captured in the export.' }
      ],
      metricCards: function (items, payload, release) {
        const cidrValues = items.map(item => numericValue(item.cidr));
        const minCidr = cidrValues.length ? Math.min.apply(null, cidrValues) : 0;
        const maxCidr = cidrValues.length ? Math.max.apply(null, cidrValues) : 0;
        return [
          { label: 'Current release', value: release, text: 'Active monthly reference publication loaded through releases.json.' },
          { label: 'Published rows', value: formatInteger(items.length), text: 'Distinct bogon or special-purpose ranges currently exposed through the reference feed.' },
          { label: 'CIDR span', value: `/${minCidr}–/${maxCidr}`, text: 'Observed prefix-width range represented in the current publication set.' },
          { label: 'Publication contract', value: 'ProdIPData monthly export', text: 'Stored-procedure-backed export contract used to publish this catalog.' }
        ];
      }
    },
    'reference-cidr': {
      shortTitle: 'CIDR reference',
      dataPath: `assets/data/cidr-${releaseMonth}.json`,
      columns: [
        { key: 'class', label: 'Class' },
        { key: 'prefix', label: 'Prefix' },
        { key: 'numberOfHosts', label: 'Number of hosts', type: 'integer' },
        { key: 'netmask', label: 'Netmask' }
      ],
      notes: [
        { title: 'What this catalog is for', text: 'This is a compact educational dictionary for CIDR prefixes, host counts, and netmask equivalents.' },
        { title: 'Publication model', text: 'Because the dataset is small, the full monthly reference can be browsed comfortably without hiding rows behind a download-only experience.' },
        { title: 'How to read the rows', text: 'The table aligns prefix notation with host-count scale and a readable dotted-decimal netmask for quick explanation and lookup.' }
      ],
      metricCards: function (items, payload, release) {
        const largest = items.slice().sort((a, b) => numericValue(b.numberOfHosts) - numericValue(a.numberOfHosts))[0] || {};
        return [
          { label: 'Current release', value: release, text: 'Active monthly reference publication loaded through releases.json.' },
          { label: 'Published rows', value: formatInteger(items.length), text: 'CIDR definitions currently exposed through the public monthly reference package.' },
          { label: 'Largest host span', value: escapeMetricValue(largest.prefix || 'n/a'), text: 'The widest prefix entry published in the current CIDR dictionary.' },
          { label: 'Publication contract', value: 'ProdIPData monthly export', text: 'Stored-procedure-backed export contract used to publish this catalog.' }
        ];
      }
    },
    'reference-ports': {
      shortTitle: 'ports catalog',
      dataPath: `assets/data/ports-${releaseMonth}.json`,
      columns: [
        { key: 'serviceName', label: 'Service name' },
        { key: 'portNumber', label: 'Port', type: 'integer' },
        { key: 'description', label: 'Description' },
        { key: 'transportSummary', label: 'Protocols' },
        { key: 'official', label: 'Official' },
        { key: 'reference', label: 'Reference' }
      ],
      notes: [
        { title: 'What this catalog is for', text: 'This catalog supports network-operations lookups by exposing the current published service-to-port mapping rows directly in the website.' },
        { title: 'Publication model', text: 'The table is paged because the reference feed is materially larger than the other catalogs. Search runs fully client-side against the published JSON payload.' },
        { title: 'How to read the rows', text: 'Protocol flags are condensed into a transport summary to keep the browser view compact while preserving the original raw columns in the JSON file.' }
      ],
      metricCards: function (items, payload, release) {
        const officialCount = items.filter(item => String(item.official || '').toUpperCase() === 'Y').length;
        const tcpCount = items.filter(item => String(item.tcp || '') === '1').length;
        return [
          { label: 'Current release', value: release, text: 'Active monthly reference publication loaded through releases.json.' },
          { label: 'Published rows', value: formatInteger(items.length), text: 'Protocol and service rows currently exposed through the public reference package.' },
          { label: 'Official rows', value: formatInteger(officialCount), text: 'Entries explicitly flagged as official in the monthly exported catalog.' },
          { label: 'TCP-tagged rows', value: formatInteger(tcpCount), text: 'Published entries that expose TCP support in the current reference payload.' }
        ];
      }
    },
    'reference-root-zone': {
      shortTitle: 'root zone catalog',
      dataPath: `assets/data/root-zone-database-${releaseMonth}.json`,
      columns: [
        { key: 'domain', label: 'Domain' },
        { key: 'type', label: 'Type' },
        { key: 'manager', label: 'Manager' },
        { key: 'location', label: 'Location' },
        { key: 'abbreviation', label: 'Abbrev.' },
        { key: 'applicationId', label: 'Application ID' }
      ],
      notes: [
        { title: 'What this catalog is for', text: 'This catalog gives the website a browsable namespace reference layer for TLD-oriented workflows, editorial notes, and future search experiences.' },
        { title: 'Publication model', text: 'The browser view is paged to keep the static site responsive while still surfacing the full monthly row set.' },
        { title: 'How to read the rows', text: 'Each row shows the domain, top-level category, sponsoring manager, and supporting identifiers captured in the exported dataset.' }
      ],
      metricCards: function (items, payload, release) {
        const genericCount = items.filter(item => String(item.type || '').toLowerCase() === 'generic').length;
        const countryCodeCount = items.filter(item => String(item.type || '').toLowerCase().indexOf('country') >= 0).length;
        return [
          { label: 'Current release', value: release, text: 'Active monthly reference publication loaded through releases.json.' },
          { label: 'Published rows', value: formatInteger(items.length), text: 'Root-zone entries currently exposed through the public reference package.' },
          { label: 'Generic rows', value: formatInteger(genericCount), text: 'Entries labeled as generic TLDs in the exported monthly dataset.' },
          { label: 'Country-code rows', value: formatInteger(countryCodeCount), text: 'Entries carrying country-oriented type labels in the current publication.' }
        ];
      }
    }
  };

  return base[page] || null;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}


function getInlineReferencePayload() {
  const node = document.querySelector('script[data-reference-inline]');
  if (!node) {
    return null;
  }
  try {
    return JSON.parse(node.textContent || 'null');
  } catch (err) {
    console.warn('Inline reference payload could not be parsed.', err);
    return null;
  }
}

function getReleaseMonth(releases) {
  if (releases && typeof releases.current_release === 'string' && releases.current_release.length >= 7) {
    return releases.current_release;
  }
  return '2026-03';
}

function getItems(value) {
  if (value && Array.isArray(value.items)) {
    return value.items;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function getItemCount(value) {
  return getItems(value).length;
}

function sortByRank(items) {
  return getItems(items).slice().sort((a, b) => numericValue(a.rank) - numericValue(b.rank) || numericValue(b.prefixCount) - numericValue(a.prefixCount));
}

function formatRirName(value) {
  const rir = String(value || '').toLowerCase();
  const labels = {
    afrinic: 'AFRINIC',
    apnic: 'APNIC',
    arin: 'ARIN',
    lacnic: 'LACNIC',
    ripe: 'RIPE'
  };
  return labels[rir] || String(value || '').toUpperCase();
}

function summarizeByRir(items) {
  const totals = new Map();
  let grandTotal = 0;

  items.forEach(item => {
    const rir = (item.rir || 'unknown').toLowerCase();
    const prefixCount = numericValue(item.prefixCount);
    grandTotal += prefixCount;
    totals.set(rir, (totals.get(rir) || 0) + prefixCount);
  });

  return Array.from(totals.entries())
    .map(([rir, prefixCount]) => ({
      rir,
      prefixCount,
      sharePercent: grandTotal > 0 ? (prefixCount / grandTotal) * 100 : 0
    }))
    .sort((a, b) => b.prefixCount - a.prefixCount)
    .slice(0, 5);
}

function getCellValue(item, column) {
  if (!item || !column) {
    return '';
  }
  if (typeof column.getter === 'function') {
    return column.getter(item);
  }
  if (column.key === 'network') {
    return `${item.ip || ''}/${item.cidr || ''}`;
  }
  if (column.key === 'transportSummary') {
    const transports = [];
    if (String(item.tcp || '') === '1') transports.push('TCP');
    if (String(item.udp || '') === '1') transports.push('UDP');
    if (String(item.sctp || '') === '1') transports.push('SCTP');
    if (String(item.dccp || '') === '1') transports.push('DCCP');
    return transports.length ? transports.join(', ') : 'None';
  }
  return item[column.key];
}

function formatReferenceCell(value, column) {
  const raw = value == null ? '' : value;
  if (column && column.type === 'integer') {
    return formatInteger(raw);
  }
  return escapeHtml(raw);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numericValue(value));
}

function formatCompact(value) {
  const numeric = numericValue(value);
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(numeric);
  } catch (err) {
    return formatInteger(numeric);
  }
}

function formatShare(value) {
  const numeric = numericValue(value);
  return `${(numeric * 100).toFixed(1)}%`;
}

function numericValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function escapeMetricValue(value) {
  return String(value == null ? '' : value);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

