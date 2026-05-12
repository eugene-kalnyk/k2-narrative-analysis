// =============================================================================
// К-2 Media Dashboard — main app
// =============================================================================

// ─── Constants ────────────────────────────────────────────────────────────────
const NIDS = ["N1", "N2", "N3", "N4", "N5", "N6", "N7"];
const NIDS_SHORT = {
  N1: "Піонер НРК",
  N2: "Результат на фронті",
  N3: "Лінія дронів / СБС",
  N4: "Тех-інноватор",
  N5: "Верес — комбриг",
  N6: "Людське обличчя",
  N7: "Швидка еволюція",
};
const ENTITY_COLORS = {
  "К-2": "#6D5BFF",
  "Птахи Мадяра": "#C8FF61",
  "Азов": "#F59E0B",
};
const TONE_LABELS = {
  Positive: "Позитивна",
  Neutral: "Нейтральна",
  Negative: "Негативна",
};
const COVERAGE_LABELS = {
  News: "News",
  Mention: "Mention",
  "Comment/quote": "Comment/quote",
  Interview: "Interview",
  "Feature story": "Feature story",
  List: "List",
  "Guest post": "Guest post",
};

// ─── State ────────────────────────────────────────────────────────────────────
let articles = [];
let narratives = [];
let campaigns = [];
let filters = { entity: "", tier: "", coverage: "", tone: "" };
let metric = "count"; // "count" or "mqs"
let charts = {}; // chart.js instances by canvas id

function metricLabel() {
  if (metric === "count") return "Кількість статей";
  if (metric === "mqs") return "Total MQS";
  return "Average MQS";
}
function sumMqs(arts) {
  return arts.reduce((s, a) => s + (a.mqs || 0), 0);
}
// Aggregate value for a group of articles depending on selected metric
function groupValue(arts) {
  if (metric === "count") return arts.length;
  if (metric === "mqs") return sumMqs(arts);
  return arts.length ? sumMqs(arts) / arts.length : 0;
}
function fmtMetric(v) {
  if (metric === "count") return v.toString();
  if (metric === "mqs") return Math.round(v).toString();
  return v.toFixed(1);
}
// Strip "Category: " prefix from campaign name when category is shown in its own column
function cleanCampaignName(name, group) {
  if (!name) return "";
  if (!group) return name;
  const prefix = group + ":";
  const trimmed = name.trim();
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
    return trimmed.slice(prefix.length).trim();
  }
  return trimmed;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  const [art, narr, camp] = await Promise.all([
    fetch("data/articles.json").then((r) => r.json()),
    fetch("data/narratives.json").then((r) => r.json()),
    fetch("data/campaigns.json").then((r) => r.json()),
  ]);
  articles = art;
  narratives = narr;
  campaigns = camp;

  document.getElementById("datasetStamp").textContent =
    `${articles.length} статей · ${campaigns.length} кампаній · ${narratives.length} наративів`;

  initFilters();
  initTabs();
  initModal();
  renderAll();
}

// ─── Filtering ────────────────────────────────────────────────────────────────
function filteredArticles() {
  return articles.filter((a) => {
    if (filters.entity && !a.entities.includes(filters.entity)) return false;
    if (filters.tier && a.tier !== filters.tier) return false;
    if (filters.coverage && a.coverage_type !== filters.coverage) return false;
    if (filters.tone && a.tone !== filters.tone) return false;
    return true;
  });
}

// K-2 articles for narrative analysis (always K-2 only — but apply other filters)
function k2Articles() {
  return articles.filter((a) => {
    if (!a.entities.includes("К-2")) return false;
    if (filters.tier && a.tier !== filters.tier) return false;
    if (filters.coverage && a.coverage_type !== filters.coverage) return false;
    if (filters.tone && a.tone !== filters.tone) return false;
    return true;
  });
}

function initFilters() {
  ["Entity", "Tier", "Coverage", "Tone"].forEach((k) => {
    const el = document.getElementById("filter" + k);
    el.addEventListener("change", () => {
      filters[k.toLowerCase()] = el.value;
      renderAll();
    });
  });
  document.getElementById("filterReset").addEventListener("click", () => {
    filters = { entity: "", tier: "", coverage: "", tone: "" };
    ["Entity", "Tier", "Coverage", "Tone"].forEach((k) => {
      document.getElementById("filter" + k).value = "";
    });
    renderAll();
  });
  // Metric toggle
  document.querySelectorAll("#metricToggle .mt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#metricToggle .mt-btn").forEach((b) => b.classList.remove("mt-active"));
      btn.classList.add("mt-active");
      metric = btn.dataset.metric;
      renderAll();
    });
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("tab-active"));
      btn.classList.add("tab-active");
      const t = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
      document.getElementById("tab-" + t).classList.remove("hidden");
    });
  });
}

// ─── Render orchestrator ──────────────────────────────────────────────────────
function renderAll() {
  Object.values(charts).forEach((c) => c.destroy && c.destroy());
  charts = {};
  renderOverview();
  renderCampaigns();
  renderNarratives();
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function renderOverview() {
  const arts = filteredArticles();
  const k2 = arts.filter((a) => a.entities.includes("К-2"));
  const madyar = arts.filter((a) => a.entities.includes("Птахи Мадяра"));

  // KPI cards
  const k2Share = madyar.length > 0 ? Math.round((k2.length / madyar.length) * 100) : 0;
  const totalMqs = sumMqs(arts);
  const avgMqs = arts.length ? totalMqs / arts.length : 0;
  const k2Mqs = sumMqs(k2);
  const k2AvgMqs = k2.length ? k2Mqs / k2.length : 0;

  const kpiHtml = [
    { label: "Усього статей", value: arts.length.toString(), sub: "у поточному фільтрі" },
    { label: "Total MQS", value: totalMqs.toFixed(0), sub: "сумарна вага покриття" },
    { label: "Average MQS", value: avgMqs.toFixed(1), sub: "якість покриття на 1 статтю" },
    { label: "Статті про К-2", value: k2.length.toString(), sub: `${k2Share}% від Мадяра · avg MQS ${k2AvgMqs.toFixed(1)}` },
  ].map((k) => `
    <div class="kpi-card">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join("");
  document.getElementById("kpiCards").innerHTML = kpiHtml;

  // Top-5 campaigns (by selected metric)
  const campAgg = {};
  arts.forEach((a) => {
    if (!a.campaign_id) return;
    if (!campAgg[a.campaign_id]) campAgg[a.campaign_id] = { count: 0, mqs: 0, articles: [] };
    campAgg[a.campaign_id].count += 1;
    campAgg[a.campaign_id].mqs += a.mqs || 0;
    campAgg[a.campaign_id].articles.push(a);
  });
  const top5 = Object.entries(campAgg)
    .map(([cid, v]) => {
      const c = campaigns.find((x) => x.id === parseInt(cid));
      const avg = v.count ? v.mqs / v.count : 0;
      return { id: parseInt(cid), name: c ? c.name : `#${cid}`, group: c ? c.group : "", count: v.count, mqs: v.mqs, avg, articles: v.articles };
    })
    .sort((a, b) => groupValue(b.articles) - groupValue(a.articles))
    .slice(0, 5);

  charts.topCampaigns = new Chart(document.getElementById("overviewTopCampaigns"), {
    type: "bar",
    data: {
      labels: top5.map((t) => truncate(cleanCampaignName(t.name, t.group), 40)),
      datasets: [{
        label: metricLabel(),
        data: top5.map((t) => groupValue(campAgg[t.id].articles)),
        backgroundColor: "#6D5BFF",
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const t = top5[ctx.dataIndex];
              return `${t.count} статей · Total MQS ${t.mqs.toFixed(0)} · Avg ${t.avg.toFixed(1)}`;
            },
          },
        },
      },
      onClick: (e, els) => {
        if (els.length) openCampaignModal(top5[els[0].index].id);
      },
      scales: { x: { beginAtZero: true } },
    },
  });

  // Entity share (donut)
  const entCounts = { "К-2": 0, "Птахи Мадяра": 0, "Азов": 0 };
  arts.forEach((a) => {
    a.entities.forEach((e) => {
      if (entCounts[e] !== undefined) entCounts[e]++;
    });
  });
  charts.entityShare = new Chart(document.getElementById("overviewEntityShare"), {
    type: "doughnut",
    data: {
      labels: Object.keys(entCounts),
      datasets: [{
        data: Object.values(entCounts),
        backgroundColor: Object.keys(entCounts).map((e) => ENTITY_COLORS[e]),
        borderWidth: 2,
        borderColor: "#FFFFFF",
      }],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      onClick: (e, els) => {
        if (els.length) {
          const ent = Object.keys(entCounts)[els[0].index];
          openModal({
            title: `Статті: ${ent}`,
            subtitle: `${entCounts[ent]} статей`,
            articles: arts.filter((a) => a.entities.includes(ent)),
          });
        }
      },
    },
  });

  // Timeline (monthly)
  const months = {};
  arts.forEach((a) => {
    const m = a.date.slice(0, 7);
    if (!m) return;
    if (!months[m]) months[m] = { "К-2": 0, "Птахи Мадяра": 0, "Азов": 0, articles: [] };
    a.entities.forEach((e) => {
      if (months[m][e] !== undefined) months[m][e]++;
    });
    months[m].articles.push(a);
  });
  const monthLabels = Object.keys(months).sort();
  charts.timeline = new Chart(document.getElementById("overviewTimeline"), {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: ["К-2", "Птахи Мадяра", "Азов"].map((e) => ({
        label: e,
        data: monthLabels.map((m) => months[m][e]),
        borderColor: ENTITY_COLORS[e],
        backgroundColor: ENTITY_COLORS[e] + "30",
        tension: 0.3,
        fill: false,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      })),
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      onClick: (e, els) => {
        if (els.length) {
          const idx = els[0].index;
          const m = monthLabels[idx];
          openModal({
            title: `Статті за ${m}`,
            subtitle: `${months[m].articles.length} статей`,
            articles: months[m].articles,
          });
        }
      },
    },
  });
}

// ─── Campaigns tab ────────────────────────────────────────────────────────────
function renderCampaigns() {
  const arts = filteredArticles();
  const totalArts = arts.length;
  // Which entity columns to show: if entity filter is set — only that one
  const visibleEntities = filters.entity
    ? [filters.entity]
    : ["К-2", "Птахи Мадяра", "Азов"];

  const byCampaign = {};
  arts.forEach((a) => {
    if (!a.campaign_id) return;
    if (!byCampaign[a.campaign_id]) {
      byCampaign[a.campaign_id] = {
        id: a.campaign_id,
        name: a.campaign_name,
        group: a.campaign_group,
        entities: { "К-2": 0, "Птахи Мадяра": 0, "Азов": 0 },
        entitiesMqs: { "К-2": 0, "Птахи Мадяра": 0, "Азов": 0 },
        entitiesArts: { "К-2": [], "Птахи Мадяра": [], "Азов": [] },
        articles: [],
        mqs: 0,
      };
    }
    a.entities.forEach((e) => {
      if (visibleEntities.includes(e) && byCampaign[a.campaign_id].entities[e] !== undefined) {
        byCampaign[a.campaign_id].entities[e]++;
        byCampaign[a.campaign_id].entitiesMqs[e] += a.mqs || 0;
        byCampaign[a.campaign_id].entitiesArts[e].push(a);
      }
    });
    byCampaign[a.campaign_id].articles.push(a);
    byCampaign[a.campaign_id].mqs += a.mqs || 0;
  });
  const sorted = Object.values(byCampaign).sort((a, b) => groupValue(b.articles) - groupValue(a.articles));

  document.getElementById("campaignsTotal").textContent = totalArts;

  // Stacked bar — values by metric
  // For avg_mqs: bars are NOT stacked (avg can't be summed); show grouped
  const isAvgMode = metric === "avg_mqs";
  const valueOf = (c, e) => {
    if (metric === "count") return c.entities[e];
    if (metric === "mqs") return c.entitiesMqs[e];
    // avg_mqs
    return c.entities[e] ? c.entitiesMqs[e] / c.entities[e] : 0;
  };

  charts.campaigns = new Chart(document.getElementById("campaignsChart"), {
    type: "bar",
    data: {
      labels: sorted.map((c) => truncate(cleanCampaignName(c.name, c.group), 50)),
      datasets: visibleEntities.map((e) => ({
        label: e,
        data: sorted.map((c) => isAvgMode ? +valueOf(c, e).toFixed(1) : Math.round(valueOf(c, e))),
        backgroundColor: ENTITY_COLORS[e],
        borderRadius: 4,
      })),
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { position: "top", align: "start", display: visibleEntities.length > 1 },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const c = sorted[ctx.dataIndex];
              const e = ctx.dataset.label;
              const cnt = c.entities[e];
              const tm = c.entitiesMqs[e];
              const avg = cnt ? tm / cnt : 0;
              return `${e}: ${cnt} статей · Total MQS ${tm.toFixed(0)} · Avg ${avg.toFixed(1)}`;
            },
          },
        },
        title: { display: true, text: `Відображення: ${metricLabel()}${isAvgMode ? " (не стекаємо — це середнє)" : ""}`, color: "#5B6072", font: { size: 11 }, padding: { bottom: 6 } },
      },
      onClick: (e, els) => {
        if (els.length) openCampaignModal(sorted[els[0].index].id);
      },
      scales: {
        x: { stacked: !isAvgMode, beginAtZero: true },
        y: { stacked: !isAvgMode },
      },
    },
  });

  // Table — both count and MQS columns
  const headRow = document.querySelector("#campaignsTable thead tr");
  headRow.innerHTML = `
    <th class="text-left py-3 px-3">Категорія</th>
    <th class="text-left py-3 px-3">Кампанія</th>
    ${visibleEntities.map((e) => `<th class="text-right py-3 px-3">${e}</th>`).join("")}
    <th class="text-right py-3 px-3">Статей</th>
    <th class="text-right py-3 px-3">% від фільтру</th>
    <th class="text-right py-3 px-3">Total MQS</th>
    <th class="text-right py-3 px-3">Avg MQS</th>
  `;

  const tbody = document.querySelector("#campaignsTable tbody");
  tbody.innerHTML = sorted.map((c) => {
    const pct = totalArts ? Math.round((c.articles.length / totalArts) * 100) : 0;
    const avg = c.articles.length ? c.mqs / c.articles.length : 0;
    return `
    <tr class="hover:bg-surface-muted cursor-pointer" data-cid="${c.id}">
      <td class="py-3 px-3 text-xs text-muted uppercase tracking-wider">${c.group}</td>
      <td class="py-3 px-3 font-medium">${escapeHtml(cleanCampaignName(c.name, c.group))}</td>
      ${visibleEntities.map((e) => `<td class="py-3 px-3 text-right tabular-nums">${c.entities[e] || ""}</td>`).join("")}
      <td class="py-3 px-3 text-right font-bold tabular-nums">${c.articles.length}</td>
      <td class="py-3 px-3 text-right tabular-nums text-muted">${pct}%</td>
      <td class="py-3 px-3 text-right font-semibold tabular-nums">${c.mqs.toFixed(0)}</td>
      <td class="py-3 px-3 text-right tabular-nums text-muted">${avg.toFixed(1)}</td>
    </tr>
  `;
  }).join("");
  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openCampaignModal(parseInt(tr.dataset.cid)));
  });
}

function openCampaignModal(cid) {
  const arts = filteredArticles().filter((a) => a.campaign_id === cid);
  const c = campaigns.find((x) => x.id === cid);
  openModal({
    title: c ? cleanCampaignName(c.name, c.group) : `Кампанія #${cid}`,
    subtitle: `${c ? c.group : ""} · ${arts.length} статей`,
    articles: arts,
  });
}

// ─── Narratives tab ───────────────────────────────────────────────────────────
function renderNarratives() {
  const arts = k2Articles();
  document.getElementById("narrativesArticlesCount").textContent = arts.length;

  // 3a. Coverage bar chart — count / Total MQS / Avg MQS
  const counts = {};
  const mqsByN = {};
  const artsByN = {};
  NIDS.forEach((n) => { counts[n] = 0; mqsByN[n] = 0; artsByN[n] = []; });
  arts.forEach((a) => a.narratives.forEach((n) => {
    counts[n]++;
    mqsByN[n] += a.mqs || 0;
    artsByN[n].push(a);
  }));

  charts.narratives = new Chart(document.getElementById("narrativesChart"), {
    type: "bar",
    data: {
      labels: NIDS.map((n) => NIDS_SHORT[n]),
      datasets: [{
        label: metricLabel(),
        data: NIDS.map((n) => {
          const v = groupValue(artsByN[n]);
          return metric === "avg_mqs" ? +v.toFixed(1) : Math.round(v);
        }),
        backgroundColor: "#6D5BFF",
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const n = NIDS[ctx.dataIndex];
              const c = counts[n];
              const pct = arts.length ? Math.round((c / arts.length) * 100) : 0;
              const avg = c ? mqsByN[n] / c : 0;
              return [`${c} статей (${pct}%)`, `Total MQS: ${mqsByN[n].toFixed(0)} · Avg ${avg.toFixed(1)}`];
            },
          },
        },
        title: { display: true, text: `Відображення: ${metricLabel()}`, color: "#5B6072", font: { size: 11 }, padding: { bottom: 6 } },
      },
      onClick: (e, els) => {
        if (els.length) openNarrativeModal(NIDS[els[0].index]);
      },
      scales: { x: { beginAtZero: true } },
    },
  });

  // 3a.5 Narratives table (mirrors Campaigns style)
  const tableData = NIDS.map((nid) => {
    const a = artsByN[nid];
    const tm = mqsByN[nid];
    const cnt = counts[nid];
    const avg = cnt ? tm / cnt : 0;
    const pct = arts.length ? Math.round((cnt / arts.length) * 100) : 0;
    return { nid, count: cnt, pct, total_mqs: tm, avg_mqs: avg, articles: a };
  }).sort((a, b) => NIDS.indexOf(a.nid) - NIDS.indexOf(b.nid));

  const nHead = document.querySelector("#narrativesTable thead tr");
  nHead.innerHTML = `
    <th class="text-left py-3 px-3">ID</th>
    <th class="text-left py-3 px-3">Наратив</th>
    <th class="text-right py-3 px-3">Статей</th>
    <th class="text-right py-3 px-3">% К-2 статей</th>
    <th class="text-right py-3 px-3">Total MQS</th>
    <th class="text-right py-3 px-3">Avg MQS</th>
  `;
  const nBody = document.querySelector("#narrativesTable tbody");
  nBody.innerHTML = tableData.map((row) => {
    const n = narratives.find((x) => x.id === row.nid);
    return `
      <tr class="hover:bg-surface-muted cursor-pointer" data-nid="${row.nid}">
        <td class="py-3 px-3"><span class="badge" style="background:#6D5BFF;color:#FFFFFF">${row.nid}</span></td>
        <td class="py-3 px-3 font-medium">${escapeHtml(n.title)}</td>
        <td class="py-3 px-3 text-right font-bold tabular-nums">${row.count}</td>
        <td class="py-3 px-3 text-right tabular-nums text-muted">${row.pct}%</td>
        <td class="py-3 px-3 text-right font-semibold tabular-nums">${row.total_mqs.toFixed(0)}</td>
        <td class="py-3 px-3 text-right tabular-nums text-muted">${row.avg_mqs.toFixed(1)}</td>
      </tr>
    `;
  }).join("");
  nBody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => openNarrativeModal(tr.dataset.nid));
  });

  // 3b. Evidence cards
  // Sort by best MQS quality (avg MQS) descending — interesting signal
  const evidenceData = NIDS.map((nid) => {
    const articlesWithNid = arts.filter((a) => a.narratives.includes(nid));
    const tMqs = sumMqs(articlesWithNid);
    const avg = articlesWithNid.length ? tMqs / articlesWithNid.length : 0;
    return { nid, articlesWithNid, tMqs, avg };
  });
  // Sort by narrative index (N1 → N7) for consistent reading order
  evidenceData.sort((a, b) => NIDS.indexOf(a.nid) - NIDS.indexOf(b.nid));

  const eviHtml = evidenceData.map(({ nid, articlesWithNid, tMqs, avg }) => {
    const n = narratives.find((x) => x.id === nid);
    const pct = arts.length ? Math.round((articlesWithNid.length / arts.length) * 100) : 0;
    const samples = articlesWithNid
      .filter((a) => a.evidence[nid])
      .sort((a, b) => (b.mqs || 0) - (a.mqs || 0))
      .slice(0, 5)
      .map((a) => `
        <div class="quote-item">
          «${escapeHtml(a.evidence[nid])}»
          <div class="quote-source">${a.date} · ${escapeHtml(a.domain)} · MQS ${(a.mqs || 0).toFixed(1)} · ${escapeHtml(truncate(a.headline, 80))}</div>
        </div>
      `).join("");
    return `
      <details class="evidence-card">
        <summary>
          <span class="nid-pill">${nid}</span>
          <span class="narrative-title">${escapeHtml(n.title)}</span>
          <span class="narrative-count">${articlesWithNid.length} статей · ${pct}% · MQS ${tMqs.toFixed(0)} (avg ${avg.toFixed(1)})</span>
        </summary>
        <div class="quote-list">${samples || '<p class="text-sm text-muted">Цитати не знайдено за поточними фільтрами.</p>'}</div>
        ${articlesWithNid.length > 5 ? `<button onclick="openNarrativeModal('${nid}')" class="mt-3 text-sm text-primary font-medium hover:text-primary-2">Подивитися всі ${articlesWithNid.length} →</button>` : ""}
      </details>
    `;
  }).join("");
  document.getElementById("narrativesEvidence").innerHTML = eviHtml;

  // 3c. Heatmaps
  renderHeatmap("heatCoverage", arts, "coverage_type", Object.keys(COVERAGE_LABELS), (v) => COVERAGE_LABELS[v] || v);
  renderHeatmap("heatTier", arts, "tier", ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"], (v) => v);
  renderHeatmap("heatTone", arts, "tone", ["Positive", "Neutral", "Negative"], (v) => TONE_LABELS[v] || v);

  // Months for heatmap
  const monthSet = new Set();
  arts.forEach((a) => {
    const m = a.date.slice(0, 7);
    if (m) monthSet.add(m);
  });
  const months = Array.from(monthSet).sort();
  renderHeatmap("heatMonth", arts, "_month", months, (v) => v.slice(2));

  // Narrative × Narrative co-occurrence
  renderCoOccurrence("heatCoocc", arts);

  // Insights
  renderInsights(arts);
}

function renderHeatmap(elId, arts, dimension, dimValues, formatter) {
  const el = document.getElementById(elId);

  // Totals per dimension column
  const dimTotalsCount = {};
  const dimTotalsMqs = {};
  dimValues.forEach((dv) => { dimTotalsCount[dv] = 0; dimTotalsMqs[dv] = 0; });
  arts.forEach((a) => {
    const v = dimension === "_month" ? a.date.slice(0, 7) : a[dimension];
    if (dimTotalsCount[v] === undefined) return;
    dimTotalsCount[v]++;
    dimTotalsMqs[v] += a.mqs || 0;
  });

  // Narrative × dim — count + MQS
  const dataCount = {};
  const dataMqs = {};
  NIDS.forEach((n) => {
    dataCount[n] = {};
    dataMqs[n] = {};
    dimValues.forEach((dv) => { dataCount[n][dv] = 0; dataMqs[n][dv] = 0; });
  });
  arts.forEach((a) => {
    const v = dimension === "_month" ? a.date.slice(0, 7) : a[dimension];
    if (dimTotalsCount[v] === undefined) return;
    a.narratives.forEach((n) => {
      dataCount[n][v]++;
      dataMqs[n][v] += a.mqs || 0;
    });
  });

  // Cell display values + max for color scaling.
  // count / mqs modes: show % share (current behavior).
  // avg_mqs mode: show absolute avg MQS for articles with narrative N in column.
  const cellValue = (n, dv) => {
    if (metric === "count") {
      const t = dimTotalsCount[dv];
      return t > 0 ? dataCount[n][dv] / t : 0;
    }
    if (metric === "mqs") {
      const t = dimTotalsMqs[dv];
      return t > 0 ? dataMqs[n][dv] / t : 0;
    }
    // avg_mqs
    const c = dataCount[n][dv];
    return c > 0 ? dataMqs[n][dv] / c : 0;
  };
  const colHasData = (dv) => dimTotalsCount[dv] > 0;

  let maxVal = 0;
  NIDS.forEach((n) => dimValues.forEach((dv) => {
    if (!colHasData(dv)) return;
    const v = cellValue(n, dv);
    if (v > maxVal) maxVal = v;
  }));
  if (maxVal === 0) maxVal = 1;

  // Build grid
  const isMonth = dimension === "_month";
  const colWidth = isMonth ? "70px" : "minmax(110px, 1fr)";
  el.style.gridTemplateColumns = `160px repeat(${dimValues.length}, ${colWidth})`;
  let html = `<div class="h-row-label"></div>`;
  dimValues.forEach((dv) => {
    let totalDisplay;
    if (metric === "count") totalDisplay = `n=${dimTotalsCount[dv] || 0}`;
    else if (metric === "mqs") totalDisplay = `MQS ${(dimTotalsMqs[dv] || 0).toFixed(0)}`;
    else {
      const c = dimTotalsCount[dv] || 0;
      const avg = c ? dimTotalsMqs[dv] / c : 0;
      totalDisplay = `avg ${avg.toFixed(1)} · n=${c}`;
    }
    html += `<div class="h-col-label" data-tip="${dv}">${formatter(dv)}<span class="h-n">${totalDisplay}</span></div>`;
  });
  NIDS.forEach((n) => {
    html += `<div class="h-row-label" data-tip="${narratives.find(x=>x.id===n)?.title || n}">${NIDS_SHORT[n]}</div>`;
    dimValues.forEach((dv) => {
      if (!colHasData(dv) || dataCount[n][dv] === 0) {
        html += `<div class="h-cell empty">—</div>`;
        return;
      }
      const v = cellValue(n, dv);
      const intensity = v / maxVal;
      const bg = `rgba(109, 91, 255, ${0.08 + intensity * 0.85})`;
      const textColor = intensity > 0.5 ? "#FFFFFF" : "#1F2430";
      let display, tip;
      if (metric === "count") {
        display = `${Math.round(v * 100)}%`;
        tip = `${dataCount[n][dv]}/${dimTotalsCount[dv]} статей (${Math.round(v*100)}%)`;
      } else if (metric === "mqs") {
        display = `${Math.round(v * 100)}%`;
        tip = `MQS ${dataMqs[n][dv].toFixed(0)}/${dimTotalsMqs[dv].toFixed(0)} (${Math.round(v*100)}%)`;
      } else {
        display = v.toFixed(1);
        tip = `avg MQS ${v.toFixed(1)} · ${dataCount[n][dv]} статей · Total MQS ${dataMqs[n][dv].toFixed(0)}`;
      }
      html += `<div class="h-cell" style="background:${bg};color:${textColor}" data-nid="${n}" data-dim="${dv}" data-tip="${tip}">${display}</div>`;
    });
  });
  el.innerHTML = html;

  // Wire clicks
  el.querySelectorAll(".h-cell:not(.empty)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const nid = cell.dataset.nid;
      const dv = cell.dataset.dim;
      const sel = arts.filter((a) => {
        const v = dimension === "_month" ? a.date.slice(0, 7) : a[dimension];
        return v === dv && a.narratives.includes(nid);
      });
      const n = narratives.find((x) => x.id === nid);
      openModal({
        title: `${NIDS_SHORT[nid]} × ${formatter(dv)}`,
        subtitle: `${sel.length} статей · ${escapeHtml(n.title)}`,
        articles: sel,
        focusNid: nid,
      });
    });
  });
}

function renderCoOccurrence(elId, arts) {
  const el = document.getElementById(elId);

  // Per narrative: count of articles having it + map of co-narratives
  const rowTotals = {}; // n_row → total articles with n_row
  const rowMqs = {};
  const pair = {}; // pair[a][b] = { count, mqs }
  NIDS.forEach((a) => {
    rowTotals[a] = 0;
    rowMqs[a] = 0;
    pair[a] = {};
    NIDS.forEach((b) => (pair[a][b] = { count: 0, mqs: 0 }));
  });
  arts.forEach((a) => {
    a.narratives.forEach((nA) => {
      rowTotals[nA] = (rowTotals[nA] || 0) + 1;
      rowMqs[nA] = (rowMqs[nA] || 0) + (a.mqs || 0);
      a.narratives.forEach((nB) => {
        pair[nA][nB].count += 1;
        pair[nA][nB].mqs += a.mqs || 0;
      });
    });
  });

  // Cell value depends on metric:
  // count: % of articles with row narrative that ALSO have col narrative
  // mqs:   % of MQS of articles-with-row that also-have-col (i.e. MQS share)
  // avg_mqs: avg MQS of articles having both narratives
  const cellVal = (r, c) => {
    if (r === c) return null; // hide diagonal
    if (metric === "count") {
      return rowTotals[r] > 0 ? pair[r][c].count / rowTotals[r] : 0;
    }
    if (metric === "mqs") {
      return rowMqs[r] > 0 ? pair[r][c].mqs / rowMqs[r] : 0;
    }
    // avg_mqs
    return pair[r][c].count > 0 ? pair[r][c].mqs / pair[r][c].count : 0;
  };

  // Find max for scaling (off-diagonal only)
  let maxVal = 0;
  NIDS.forEach((r) => NIDS.forEach((c) => {
    if (r === c) return;
    const v = cellVal(r, c) || 0;
    if (v > maxVal) maxVal = v;
  }));
  if (maxVal === 0) maxVal = 1;

  // Build grid
  el.style.gridTemplateColumns = `160px repeat(${NIDS.length}, minmax(80px, 1fr))`;
  let html = `<div class="h-row-label"></div>`;
  NIDS.forEach((c) => {
    let totalDisplay;
    if (metric === "count") totalDisplay = `n=${rowTotals[c] || 0}`;
    else if (metric === "mqs") totalDisplay = `MQS ${(rowMqs[c] || 0).toFixed(0)}`;
    else {
      const avg = rowTotals[c] ? rowMqs[c] / rowTotals[c] : 0;
      totalDisplay = `avg ${avg.toFixed(1)}`;
    }
    html += `<div class="h-col-label" data-tip="${narratives.find(x=>x.id===c)?.title || c}">${NIDS_SHORT[c]}<span class="h-n">${totalDisplay}</span></div>`;
  });
  NIDS.forEach((r) => {
    html += `<div class="h-row-label" data-tip="${narratives.find(x=>x.id===r)?.title || r}">${NIDS_SHORT[r]}</div>`;
    NIDS.forEach((c) => {
      if (r === c) {
        html += `<div class="h-cell empty">●</div>`;
        return;
      }
      const v = cellVal(r, c);
      if (!v || pair[r][c].count === 0) {
        html += `<div class="h-cell empty">—</div>`;
        return;
      }
      const intensity = v / maxVal;
      const bg = `rgba(109, 91, 255, ${0.08 + intensity * 0.85})`;
      const textColor = intensity > 0.5 ? "#FFFFFF" : "#1F2430";
      let display, tip;
      if (metric === "count") {
        display = `${Math.round(v * 100)}%`;
        tip = `Коли є ${r}: у ${pair[r][c].count}/${rowTotals[r]} (${Math.round(v*100)}%) є також ${c}`;
      } else if (metric === "mqs") {
        display = `${Math.round(v * 100)}%`;
        tip = `${pair[r][c].mqs.toFixed(0)}/${rowMqs[r].toFixed(0)} MQS (${Math.round(v*100)}%) також несуть ${c}`;
      } else {
        display = v.toFixed(1);
        tip = `Статті з ${r}+${c}: avg MQS ${v.toFixed(1)} · ${pair[r][c].count} статей · Total MQS ${pair[r][c].mqs.toFixed(0)}`;
      }
      html += `<div class="h-cell" style="background:${bg};color:${textColor}" data-row="${r}" data-col="${c}" data-tip="${tip}">${display}</div>`;
    });
  });
  el.innerHTML = html;

  // Wire clicks
  el.querySelectorAll(".h-cell:not(.empty)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const r = cell.dataset.row;
      const c = cell.dataset.col;
      const sel = arts.filter((a) => a.narratives.includes(r) && a.narratives.includes(c));
      openModal({
        title: `${NIDS_SHORT[r]} + ${NIDS_SHORT[c]}`,
        subtitle: `${sel.length} статей містять обидва наративи одночасно`,
        articles: sel,
        focusNid: r,
      });
    });
  });
}

function openNarrativeModal(nid) {
  const arts = k2Articles().filter((a) => a.narratives.includes(nid));
  const n = narratives.find((x) => x.id === nid);
  openModal({
    title: `${nid} — ${n.title}`,
    subtitle: `${arts.length} статей містять цей наратив`,
    articles: arts,
    focusNid: nid,
  });
}

function renderInsights(arts) {
  const insights = [];
  if (arts.length === 0) {
    document.getElementById("insightsList").innerHTML =
      '<li class="text-muted">Немає достатньо даних для інсайтів за поточними фільтрами.</li>';
    return;
  }

  // 1. Narrative × Coverage type: find strongest correlation
  const covInsights = [];
  Object.keys(COVERAGE_LABELS).forEach((ct) => {
    const inCov = arts.filter((a) => a.coverage_type === ct);
    if (inCov.length < 5) return; // need volume
    NIDS.forEach((n) => {
      const pctInCov = inCov.filter((a) => a.narratives.includes(n)).length / inCov.length;
      const pctOverall = arts.filter((a) => a.narratives.includes(n)).length / arts.length;
      if (pctOverall > 0 && pctInCov > pctOverall * 1.5 && pctInCov > 0.25) {
        covInsights.push({
          msg: `<strong>${COVERAGE_LABELS[ct]}</strong> у ${Math.round(pctInCov * 100)}% несе наратив <strong>«${NIDS_SHORT[n]}»</strong> — у ${(pctInCov / pctOverall).toFixed(1)}× частіше середнього`,
          score: pctInCov / pctOverall,
        });
      }
    });
  });
  covInsights.sort((a, b) => b.score - a.score).slice(0, 3).forEach((i) => insights.push(i.msg));

  // 2. Tier: find strongest
  const tierInsights = [];
  ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"].forEach((t) => {
    const inT = arts.filter((a) => a.tier === t);
    if (inT.length < 5) return;
    NIDS.forEach((n) => {
      const pctInT = inT.filter((a) => a.narratives.includes(n)).length / inT.length;
      const pctOverall = arts.filter((a) => a.narratives.includes(n)).length / arts.length;
      if (pctOverall > 0 && pctInT > pctOverall * 1.5 && pctInT > 0.25) {
        tierInsights.push({
          msg: `<strong>${t}</strong> непропорційно сильно несе <strong>«${NIDS_SHORT[n]}»</strong> (${Math.round(pctInT * 100)}% vs ${Math.round(pctOverall * 100)}% у середньому)`,
          score: pctInT / pctOverall,
        });
      }
    });
  });
  tierInsights.sort((a, b) => b.score - a.score).slice(0, 2).forEach((i) => insights.push(i.msg));

  // 3. Tone
  ["Positive", "Negative"].forEach((t) => {
    const inT = arts.filter((a) => a.tone === t);
    if (inT.length < 3) return;
    NIDS.forEach((n) => {
      const pctInT = inT.filter((a) => a.narratives.includes(n)).length / inT.length;
      const pctOverall = arts.filter((a) => a.narratives.includes(n)).length / arts.length;
      if (pctOverall > 0 && pctInT > pctOverall * 1.6 && pctInT > 0.4) {
        insights.push(`У статтях з <strong>${TONE_LABELS[t].toLowerCase()}</strong> тональністю наратив <strong>«${NIDS_SHORT[n]}»</strong> з'являється у ${Math.round(pctInT * 100)}% (≈ ${(pctInT/pctOverall).toFixed(1)}× частіше середнього)`);
      }
    });
  });

  // 4. Missing narratives
  NIDS.forEach((n) => {
    const cnt = arts.filter((a) => a.narratives.includes(n)).length;
    if (cnt / arts.length < 0.08) {
      insights.push(`Наратив <strong>«${NIDS_SHORT[n]}»</strong> майже не зустрічається — лише ${cnt} статей (${Math.round(cnt/arts.length*100)}%). Може бути <em>зоною росту</em> для комунікацій.`);
    }
  });

  // 5. Strongest narrative pair (co-occurrence)
  let bestPair = { count: 0, a: null, b: null };
  for (let i = 0; i < NIDS.length; i++) {
    for (let j = i + 1; j < NIDS.length; j++) {
      const both = arts.filter((x) => x.narratives.includes(NIDS[i]) && x.narratives.includes(NIDS[j])).length;
      if (both > bestPair.count) bestPair = { count: both, a: NIDS[i], b: NIDS[j] };
    }
  }
  if (bestPair.count >= 5) {
    const pctOfTotal = Math.round((bestPair.count / arts.length) * 100);
    insights.push(`Найсильніша пара наративів: <strong>«${NIDS_SHORT[bestPair.a]}»</strong> + <strong>«${NIDS_SHORT[bestPair.b]}»</strong> — разом у ${bestPair.count} статтях (${pctOfTotal}%). Це <em>звʼязка</em>, що формує спільне сприйняття.`);
  }

  // 6. MQS quality leader — narrative with highest avg MQS
  const overallAvgMqs = arts.length ? sumMqs(arts) / arts.length : 0;
  const narrAvgMqs = NIDS.map((n) => {
    const a = arts.filter((x) => x.narratives.includes(n));
    return { n, avg: a.length ? sumMqs(a) / a.length : 0, count: a.length };
  }).filter((x) => x.count >= 5);
  if (narrAvgMqs.length && overallAvgMqs > 0) {
    narrAvgMqs.sort((a, b) => b.avg - a.avg);
    const best = narrAvgMqs[0];
    if (best.avg > overallAvgMqs * 1.15) {
      insights.push(`Наратив <strong>«${NIDS_SHORT[best.n]}»</strong> має <strong>найвищий avg MQS ${best.avg.toFixed(1)}</strong> (середній ${overallAvgMqs.toFixed(1)}) — зʼявляється у <em>якіснішому покритті</em>.`);
    }
    const worst = narrAvgMqs[narrAvgMqs.length - 1];
    if (worst.n !== best.n && worst.avg < overallAvgMqs * 0.85) {
      insights.push(`Наратив <strong>«${NIDS_SHORT[worst.n]}»</strong> має <strong>найнижчий avg MQS ${worst.avg.toFixed(1)}</strong> — більше у дешевих згадках і нижчих tier.`);
    }
  }

  document.getElementById("insightsList").innerHTML = insights.length
    ? insights.slice(0, 8).map((m) => `<li>• ${m}</li>`).join("")
    : '<li class="text-muted">Для поточної вибірки немає яскравих кореляцій.</li>';
}

// ─── Modal ────────────────────────────────────────────────────────────────────
let modalState = null;

function initModal() {
  ["modalClose", "modalCloseBtn"].forEach((id) => {
    document.getElementById(id).addEventListener("click", closeModal);
  });
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
  document.getElementById("modalExport").addEventListener("click", () => {
    if (!modalState) return;
    exportArticlesCsv(modalState.articles, modalState.title);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function openModal({ title, subtitle, articles, focusNid }) {
  modalState = { title, articles };
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalSubtitle").textContent = subtitle || "";
  const body = document.getElementById("modalBody");

  if (!articles.length) {
    body.innerHTML = '<p class="text-muted text-sm">Немає статей.</p>';
  } else {
    articles.sort((a, b) => b.date.localeCompare(a.date));
    body.innerHTML = articles.map((a) => renderArticleRow(a, focusNid)).join("");
  }

  const modal = document.getElementById("modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  modalState = null;
}

function renderArticleRow(a, focusNid) {
  const toneClass = `tone-${(a.tone || "neutral").toLowerCase()}`;
  const narrPills = a.narratives.map((n) => {
    const isFocus = n === focusNid;
    return `<span class="badge" style="background:${isFocus ? '#6D5BFF' : '#E6E7EF'};color:${isFocus ? '#FFFFFF' : '#475569'}" data-tip="${escapeHtml(narratives.find(x=>x.id===n)?.title || '')}">${n}</span>`;
  }).join(" ");

  const evidence = focusNid && a.evidence[focusNid]
    ? `<div class="evidence-block"><div class="evidence-label">Evidence — ${focusNid}</div>«${escapeHtml(a.evidence[focusNid])}»</div>`
    : "";

  return `
    <div class="article-row">
      <div class="headline">
        <a href="${a.url}" target="_blank" rel="noopener" class="hover:text-primary">${escapeHtml(a.headline)} ↗</a>
      </div>
      <div class="meta-line">
        <span>📅 ${a.date}</span>
        <span>🌐 ${escapeHtml(a.domain)}</span>
        <span>📊 ${escapeHtml(a.tier)}</span>
        <span>📄 ${escapeHtml(COVERAGE_LABELS[a.coverage_type] || a.coverage_type)}</span>
        <span class="badge ${toneClass}">${TONE_LABELS[a.tone] || a.tone}</span>
        ${a.entities.map((e) => `<span class="badge" style="background:${ENTITY_COLORS[e]}30;color:${ENTITY_COLORS[e] === '#C8FF61' ? '#3F6212' : ENTITY_COLORS[e]}">${e}</span>`).join("")}
      </div>
      ${a.narratives.length ? `<div class="mt-2 flex flex-wrap gap-1">${narrPills}</div>` : ""}
      ${evidence}
    </div>
  `;
}

function exportArticlesCsv(arts, title) {
  const headers = ["date", "headline", "domain", "url", "tier", "tone", "coverage_type", "entities", "campaign_name", "narratives"];
  const rows = [headers.join(",")];
  arts.forEach((a) => {
    rows.push(headers.map((h) => {
      let v = a[h];
      if (Array.isArray(v)) v = v.join(";");
      v = (v ?? "").toString().replace(/"/g, '""');
      return `"${v}"`;
    }).join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Expose for inline onclick
window.openNarrativeModal = openNarrativeModal;

boot().catch((e) => {
  console.error(e);
  document.body.innerHTML = `<div class="p-8 text-danger">Помилка завантаження даних: ${e.message}<br>Запусти <code>python3 -m http.server 8000</code> у папці <code>viz/</code></div>`;
});
