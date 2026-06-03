// cluster.js
import { APP_CONFIG } from "./config.js";

// ─── Cache ────────────────────────────────────────────────────────────────────
const _cache = {};

// ─── Path builder ─────────────────────────────────────────────────────────────
function paths(expId, type) {
    const base = `./data/experiments/${expId}`;
    const tb   = `${base}/${type}`;
    return {
        lasso_csv:     `${tb}/cluster_result.csv`,
        compare:       `${tb}/cluster_compare.json`,
        lasso_features:`${base}/lasso_features.json`,
        group_names:   `${tb}/group_names.json`,
        wordcloud:     `${tb}/wordcloud`,
    };
}

// ─── Data Loaders ─────────────────────────────────────────────────────────────

async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.json();
}

async function fetchCSVRows(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    const text = await r.text();
    const rows = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = rows[0]
        .replace(/^﻿/, "")
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
    return rows.slice(1).map((row) => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim().replace(/"/g, ""); });
        return obj;
    });
}

async function getNameMapping() {
    if (_cache.names) return _cache.names;
    const rows = await fetchCSVRows(APP_CONFIG.DATA_PATHS.ig_names);
    const map = {};
    rows.forEach((r) => { if (r.ig_id) map[r.ig_id] = r.person_name || r.ig_id; });
    _cache.names = map;
    return map;
}

async function getClusterGroups(expId, type) {
    const key = `groups_${expId}_${type}`;
    if (_cache[key]) return _cache[key];

    const p = paths(expId, type);
    const labelCol = type === "audio" ? "audio_kmeans_lables" : "visual_kmeans_lables";

    const [rows, nameMap] = await Promise.all([fetchCSVRows(p.lasso_csv), getNameMapping()]);
    const groups = {};
    rows.forEach((r) => {
        const label = r[labelCol];
        if (!label) return;
        if (!groups[label]) groups[label] = { creatorVideos: new Map(), videoCount: 0 };
        if (r.id) {
            const name = nameMap[r.id] || r.id;
            groups[label].creatorVideos.set(name, (groups[label].creatorVideos.get(name) || 0) + 1);
        }
        groups[label].videoCount++;
    });

    const clusterIds = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
    _cache[key] = { clusterIds, groups };
    return _cache[key];
}

async function getLassoFeatures(expId, type) {
    const key = `lasso_${expId}`;
    if (!_cache[key]) _cache[key] = await fetchJson(paths(expId, type).lasso_features);
    return _cache[key][type] || {};
}

async function getStatsData(expId, type) {
    const key = `stats_${expId}_${type}`;
    if (_cache[key] !== undefined) return _cache[key];
    try {
        _cache[key] = await fetchJson(paths(expId, type).compare);
    } catch { _cache[key] = null; }
    return _cache[key];
}

async function getGroupNames(expId, type) {
    const key = `groupNames_${expId}_${type}`;
    if (_cache[key] !== undefined) return _cache[key];
    try {
        _cache[key] = await fetchJson(paths(expId, type).group_names);
    } catch { _cache[key] = null; }
    return _cache[key];
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderNumeric(d) {
    if (!d?.avg) return `<span class="text-slate-600 italic text-xs">-</span>`;
    return `<div class="p-2 bg-slate-800/40 rounded border border-slate-800/50">
        <table class="w-full font-mono text-[12px]">
            <tr><td class="text-blue-300">avg</td><td class="text-right text-emerald-400 font-bold">${Number(d.avg).toFixed(2)}</td></tr>
            <tr><td class="text-blue-300">range</td><td class="text-right text-slate-300">${d.min} – ${d.max}</td></tr>
        </table>
    </div>`;
}

function renderCategorical(d) {
    if (!d || typeof d !== "object") return `<span class="text-slate-600 italic text-xs">-</span>`;
    const items = Object.entries(d)
        .filter(([k]) => !["None","Unknown","none","false","False"].includes(k))
        .sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!items.length) return `<span class="text-slate-600 italic text-xs">-</span>`;
    return `<table class="w-full text-[12px]">` +
        items.map(([label, count]) =>
            `<tr class="border-b border-slate-800/20 last:border-0">
                <td class="py-0.5 text-blue-300 truncate max-w-[170px]" title="${label}">${label}</td>
                <td class="text-right text-slate-200 font-mono pl-1 shrink-0">${count}</td>
            </tr>`
        ).join("") + `</table>`;
}

function isNumeric(val) {
    return val !== null && typeof val === "object" && val.avg !== undefined;
}

function lassoFieldSet(lassoFeatures) {
    const names = new Set();
    for (const clusterFeats of Object.values(lassoFeatures)) {
        for (const feat of [...(clusterFeats.pos || []), ...(clusterFeats.neg || [])]) {
            names.add(feat.split("=")[0].split(" (")[0].trim().toLowerCase());
        }
    }
    return names;
}

function matchesLasso(fieldName, lassoNames) {
    const f = fieldName.toLowerCase();
    if (lassoNames.has(f)) return true;
    for (const ln of lassoNames) { if (ln.endsWith(f)) return true; }
    return false;
}

function collectLeafPaths(statsData, clusterIds, lassoFeatures) {
    const all = {};
    clusterIds.forEach((cid) => {
        const stats = statsData?.[`cluster_${cid}`]?.statistics || {};
        for (const [section, fields] of Object.entries(stats)) {
            for (const [field, val] of Object.entries(fields)) {
                const path = `${section}.${field}`;
                if (!all[path]) all[path] = { section, field, type: isNumeric(val) ? "numeric" : "categorical" };
            }
        }
    });
    const lassoNames = lassoFieldSet(lassoFeatures);
    return Object.fromEntries(
        Object.entries(all).filter(([, info]) => matchesLasso(info.field, lassoNames))
    );
}

// ─── Main render ──────────────────────────────────────────────────────────────

export async function renderClusterView(type, expId) {
    const container = document.getElementById("cluster-container");
    container.innerHTML = `<div class="p-20 text-slate-500 animate-pulse text-center">正在載入分群資料...</div>`;

    if (!expId) {
        container.innerHTML = `<div class="p-20 text-slate-500 text-center">請先選擇實驗結果</div>`;
        return;
    }
    if (type !== "audio" && type !== "visual") {
        container.innerHTML = `<div class="p-20 text-slate-500 text-center">Lasso 分群結果僅支援 Audio / Visual</div>`;
        return;
    }

    try {
        const [clusterData, lassoFeatures, statsData, groupNames] = await Promise.all([
            getClusterGroups(expId, type),
            getLassoFeatures(expId, type),
            getStatsData(expId, type),
            getGroupNames(expId, type),
        ]);

        if (!clusterData) throw new Error("無法載入分群 CSV");
        const { clusterIds, groups } = clusterData;
        const leafPaths = statsData ? collectLeafPaths(statsData, clusterIds, lassoFeatures) : {};
        const p = paths(expId, type);

        // ── Header ──────────────────────────────────────────────────────────
        let html = `<div class="inline-block min-w-full">`;
        html += `<div class="flex sticky-row-header bg-slate-950 border-b border-slate-700 shadow-xl">
            <div class="w-[130px] shrink-0 p-4 font-bold text-slate-500 uppercase text-[12px] flex items-end">Feature</div>`;

        clusterIds.forEach((cid) => {
            const g = groups[cid];
            html += `<div class="w-[240px] shrink-0 p-4 border-l border-slate-800">
                <div class="text-blue-400 font-bold text-base">Group ${cid}</div>
                <div class="text-[12px] text-slate-400">${g?.videoCount ?? 0} 支影片 / ${g?.creatorVideos?.size ?? 0} 位創作者</div>
            </div>`;
        });
        html += `</div>`;

        // ── Row: 創作者 ──────────────────────────────────────────────────────
        html += `<div class="flex border-b border-slate-700 hover:bg-slate-800/20 transition">
            <div class="w-[130px] shrink-0 p-3 sticky-col-header font-semibold text-sky-300 text-[13px] border-r border-slate-800 bg-slate-900/90 shadow-sm flex items-start">創作者</div>`;
        clusterIds.forEach((cid) => {
            const entries = [...(groups[cid]?.creatorVideos?.entries() || [])].sort((a, b) => b[1] - a[1]);
            html += `<div class="w-[240px] shrink-0 p-2 border-l border-slate-800/30">`;
            if (!entries.length) { html += `<span class="text-slate-600 italic text-xs">-</span>`; }
            else {
                html += `<table class="w-full text-[12px]">`;
                entries.forEach(([name, count]) => {
                    html += `<tr class="border-b border-slate-800/20 last:border-0">
                        <td class="py-0.5 text-slate-200 truncate max-w-[180px]" title="${name}">${name}</td>
                        <td class="text-right text-blue-300 font-mono pl-1 shrink-0">${count}</td>
                    </tr>`;
                });
                html += `</table>`;
            }
            html += `</div>`;
        });
        html += `</div>`;

        // ── Row: Lasso 特徵 ──────────────────────────────────────────────────
        html += `<div class="flex border-b border-slate-700 hover:bg-slate-800/20 transition">
            <div class="w-[130px] shrink-0 p-3 sticky-col-header font-semibold text-amber-300 text-[13px] border-r border-slate-800 bg-slate-900/90 shadow-sm flex items-start">Lasso 特徵</div>`;
        clusterIds.forEach((cid) => {
            const entry = lassoFeatures[cid];
            if (!entry) {
                html += `<div class="w-[240px] shrink-0 p-3 border-l border-slate-800/30"><span class="text-slate-600 italic text-xs">-</span></div>`;
                return;
            }
            const parseCoef = (s) => parseFloat(s.match(/\(([+-]?\d+\.?\d*)\)\s*$/)?.[1] ?? "0");
            const all = [
                ...(entry.pos || []).map((f) => ({ f, coef: parseCoef(f) })),
                ...(entry.neg || []).map((f) => ({ f, coef: parseCoef(f) })),
            ].sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
            html += `<div class="w-[240px] shrink-0 p-3 border-l border-slate-800/30"><div class="text-[12px] space-y-0.5">`;
            all.forEach(({ f, coef }) => {
                const cls   = coef >= 0 ? "text-emerald-400" : "text-rose-400";
                const arrow = coef >= 0 ? "▲" : "▼";
                html += `<div class="${cls}">${arrow} ${f}</div>`;
            });
            html += `</div></div>`;
        });
        html += `</div>`;

        // ── Rows: Group names ────────────────────────────────────────────────
        if (groupNames) {
            [
                { label: "Group Name\n(GPT)",    field: "group_name_GPT",    color: "text-pink-300" },
                { label: "Group Desc\n(GPT)",    field: "group_des_GPT",     color: "text-pink-300" },
                { label: "Group Name\n(Gemini)", field: "group_name_Gemini", color: "text-teal-300" },
                { label: "Group Desc\n(Gemini)", field: "group_des_Gemini",  color: "text-teal-300" },
            ].forEach(({ label, field, color }) => {
                html += `<div class="flex border-b border-slate-700 hover:bg-slate-800/20 transition">
                    <div class="w-[130px] shrink-0 p-3 sticky-col-header font-semibold ${color} text-[12px] border-r border-slate-800 bg-slate-900/90 shadow-sm flex items-start whitespace-pre-line">${label}</div>`;
                clusterIds.forEach((cid) => {
                    const val = groupNames[cid]?.[field] || "";
                    html += `<div class="w-[240px] shrink-0 p-3 border-l border-slate-800/30 text-[12px] text-slate-200 leading-relaxed">
                        ${val || '<span class="text-slate-600 italic">-</span>'}
                    </div>`;
                });
                html += `</div>`;
            });
        }

        // ── Rows: KeyBERT / TF-IDF ───────────────────────────────────────────
        [{ label: "KeyBERT", key: "keybert" }, { label: "TF-IDF", key: "tfidf" }].forEach(({ label, key }) => {
            html += `<div class="flex border-b border-slate-700 hover:bg-slate-800/20 transition">
                <div class="w-[130px] shrink-0 p-3 sticky-col-header font-semibold text-violet-300 text-[13px] border-r border-slate-800 bg-slate-900/90 shadow-sm flex items-start">${label}</div>`;
            clusterIds.forEach((cid) => {
                const src = `${p.wordcloud}/${key}_cluster_${cid}.png`;
                html += `<div class="w-[240px] shrink-0 p-2 border-l border-slate-800/30">
                    <img src="${src}" alt="${label} cluster ${cid}" class="w-full rounded"
                         onerror="this.parentElement.innerHTML='<span class=\\'text-slate-600 italic text-xs\\'>-</span>'" />
                </div>`;
            });
            html += `</div>`;
        });

        // ── Rows: Feature stats ──────────────────────────────────────────────
        for (const [, info] of Object.entries(leafPaths)) {
            html += `<div class="flex border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                <div class="w-[130px] shrink-0 p-3 sticky-col-header break-words font-medium text-slate-300 text-[12px] border-r border-slate-800 bg-slate-900/90 shadow-sm">
                    <div class="text-[10px] text-slate-500 mb-0.5">${info.section}</div>
                    ${info.field}
                </div>`;
            clusterIds.forEach((cid) => {
                const val = statsData?.[`cluster_${cid}`]?.statistics?.[info.section]?.[info.field];
                html += `<div class="w-[240px] shrink-0 p-2 border-l border-slate-800/30">
                    ${info.type === "numeric" ? renderNumeric(val) : renderCategorical(val)}
                </div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    } catch (err) {
        console.error("[cluster.js]", err);
        container.innerHTML = `<div class="p-20 text-red-500 text-center font-mono">載入失敗: ${err.message}</div>`;
    }
}
