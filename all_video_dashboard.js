import { APP_CONFIG } from "./config.js";

/**
 * 渲染影片儀表板：Metadata + Description + JSON Table。
 */
export function renderVideoDashboard(
    container,
    ig_id,
    media_id,
    csv,
    json,
    jsonError = null,
    nameMapping = {},
) {
    let tagNames = [];
    if (csv.tags) {
        const valueMatches = csv.tags.match(/(?<=:\s*['"])\d+/g) || [];
        tagNames = valueMatches.map((id) => nameMapping[id] || id);
    }

    const timeKey = (csv.modified_time_tw || "")
        .replace(/[- :+]/g, "")
        .substring(0, 14);
    const videoName = `${ig_id}-${timeKey}-${media_id}.mp4`;
    const videoUrl = `${APP_CONFIG.VIDEO_API_BASE}/${ig_id}/${videoName}?token=${APP_CONFIG.VIDEO_TOKEN}`;

    const hasJson = json && !jsonError;
    const logs = hasJson ? json.low_inference : null;

    const outerLink = csv.short_code
        ? `https://www.instagram.com/reel/${csv.short_code}`
        : null;

    container.innerHTML = `
        <div class="max-h-[80vh] flex flex-col overflow-y-auto custom-scrollbar text-slate-200 bg-[#0f172a]">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-800 shrink-0">
                <div class="bg-[#0f172a] p-6 border-b border-slate-800 md:border-b-0">
                    <h4 class="text-blue-500 font-bold mb-4 flex items-center gap-2">
                        <span class="w-1 h-4 bg-blue-500 rounded-full"></span> Metadata
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex border-b border-slate-800/50 py-1">
                            <span class="text-slate-500 w-24 shrink-0">外部連結：</span>
                            ${
                                outerLink
                                    ? `<a href="${outerLink}" target="_blank" class="text-blue-400 hover:underline truncate">link</a>`
                                    : ""
                            }
                        </div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">內部連結：</span><a href="${videoUrl}" target="_blank" class="text-blue-400 hover:underline truncate">link</a></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">建立日期：</span><span class="font-mono text-slate-300">${csv.creation_time_tw || ""}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">最後更新：</span><span class="font-mono text-slate-300">${csv.modified_time_tw || ""}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">留言數量：</span><span class="font-mono text-emerald-400">${Math.floor(csv["statistics.comment_count"] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) || 0}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">按讚數量：</span><span class="font-mono text-emerald-400">${Math.floor(csv["statistics.like_count"] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) || 0}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">觀看次數：</span><span class="font-mono text-emerald-400">${Math.floor(csv["statistics.views"] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) || 0}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">影片長度：</span><span class="font-mono">${csv.duration || ""}s</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">標記數量：</span><span>${tagNames.length}</span></div>
                        <div class="flex border-b border-slate-800/50 py-1"><span class="text-slate-500 w-24 shrink-0">標記網紅：</span><div class="flex flex-wrap gap-1">${tagNames.map((t) => `<span class="bg-blue-900/30 text-blue-300 px-1.5 rounded text-xs border border-blue-800/50">${t}</span>`).join("")}</div></div>
                        <div class="pt-3">
                            <span class="text-slate-500 block text-xs mb-1">文字內容：</span>
                            <p class="text-slate-300 leading-relaxed whitespace-pre-wrap text-s bg-slate-950/50 p-3 rounded border border-slate-800">${csv.text || "(無內文)"}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-[#0f172a] p-6 border-l border-slate-800">
                    <h4 class="text-blue-500 font-bold mb-4 flex items-center gap-2">
                        <span class="w-1 h-4 bg-blue-500 rounded-full"></span> Description
                    </h4>
                    ${
                        hasJson
                            ? `
                        <div class="space-y-5 text-sm">
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Visual Narrative</span>
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.visual_base.visual_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Audio Narrative</span>
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.audio_base.audio_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Text Narrative</span>
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.visual_base.text_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Main Purpose</span>
                                <p class="text-blue-200/80 italic bg-blue-900/10 p-2 rounded border border-blue-900/20">${json.high_inference.narrative_and_purpose.mainPurpose}</p>
                            </div>
                        </div>
                    `
                            : `
                        <div class="p-10 border border-dashed border-slate-800 rounded text-center text-slate-600 italic text-sm">
                            JSON 解析錯誤: ${jsonError || "無資料"}
                        </div>
                    `
                    }
                </div>
            </div>

            <div class="p-6 bg-[#0f172a] border-t border-slate-800">
                <h4 class="text-blue-500 font-bold mb-4 flex items-center gap-2">
                    <span class="w-1 h-4 bg-blue-500 rounded-full"></span> Json Description
                </h4>
                ${
                    hasJson
                        ? `
                    <div class="border border-slate-800 rounded overflow-hidden">
                        <table class="w-full border-collapse">
                            <thead class="bg-slate-900 shadow-md">
                                <tr class="text-left text-[10px] uppercase tracking-tighter text-slate-500 border-b border-slate-800">
                                    <th class="p-3 w-[10%] border-r border-slate-800/50">L1</th>
                                    <th class="p-3 w-[10%] border-r border-slate-800/50">L2</th>
                                    <th class="p-3 w-[10%] border-r border-slate-800/50">L3</th>
                                    <th class="p-3 w-[10%] border-r border-slate-800/50">L4</th>
                                    <th class="p-3 w-[60%]">Value</th>
                                </tr>
                            </thead>
                            <tbody class="text-xs font-mono">
                                ${renderJsonTableRows(json)}
                            </tbody>
                        </table>
                    </div>
                `
                        : `
                    <div class="p-10 border border-dashed border-slate-800 rounded text-center text-slate-600 italic text-sm">
                        JSON 表格資料載入失敗
                    </div>
                `
                }
            </div>
        </div>
    `;
}

/**
 * 展平 JSON 並產出表格行。
 */
function renderJsonTableRows(json) {
    let rows = [];

    function flatten(obj, path = []) {
        for (let key in obj) {
            const currentPath = [...path, key];
            const value = obj[key];

            if (
                value !== null &&
                typeof value === "object" &&
                !Array.isArray(value)
            ) {
                flatten(value, currentPath);
            } else {
                rows.push({
                    l1: currentPath[0] || "",
                    l2: currentPath[1] || "",
                    l3: currentPath[2] || "",
                    l4: currentPath[3] || "",
                    value: value,
                });
            }
        }
    }

    flatten(json);

    return rows
        .map(
            (r) => `
        <tr class="border-b border-slate-800/30 hover:bg-blue-500/5 transition-colors group">
            <td class="p-2 border-r border-slate-800/50 text-slate-500">${r.l1}</td>
            <td class="p-2 border-r border-slate-800/50 text-slate-400">${r.l2}</td>
            <td class="p-2 border-r border-slate-800/50 text-slate-300">${r.l3}</td>
            <td class="p-2 border-r border-slate-800/50 text-slate-200">${r.l4}</td>
            <td class="p-2 group-hover:text-blue-300 transition-colors">${formatValue(r.value)}</td>
        </tr>
    `,
        )
        .join("");
}

/**
 * 格式化表格中的 Value。
 */
function formatValue(val) {
    if (val === undefined || val === null)
        return `<span class="text-slate-700">—</span>`;
    if (typeof val === "boolean") {
        return val
            ? `<span class="text-emerald-500 font-bold">YES</span>`
            : `<span class="text-rose-500 font-bold">NO</span>`;
    }
    if (Array.isArray(val)) {
        if (val.length === 0)
            return `<span class="text-slate-700">Empty</span>`;
        return val
            .map(
                (v) =>
                    `<span class="inline-block bg-slate-800 border border-slate-700 text-blue-200 px-1.5 py-0.5 rounded-sm m-0.5 text-[10px]">${v}</span>`,
            )
            .join("");
    }
    return `<span class="text-slate-300 break-all">${val}</span>`;
}
