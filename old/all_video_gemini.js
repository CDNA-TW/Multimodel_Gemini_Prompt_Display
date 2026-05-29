// all_video.js
import { APP_CONFIG } from "./config.js";

const container = document.getElementById("cluster-container");
let influencerData = [];
let nameMapping = {}; // 用於儲存 ID -> person_name 的對照
let cachedDetails = {}; // 快取已下載的網紅影片詳情 (合併後的 JSON)

// ==========================================
// 擴充需求：條件搜尋與過濾狀態變數
// ==========================================
let globalMediaData = []; // 存放解析後的 all_infleuncer_media_id.csv 資料
let isFilterActive = false; // 是否啟動過濾條件
let currentFilterMode = null; // 'mode1' 或 'mode2'
let matchedMediaIds = new Set(); // 模式2：符合條件的影片 ID 集合
let matchedInfluencerUsernames = new Set(); // 模式2：符合條件的網紅 username 集合

/**
 * 通用輔助函式：強力清除 CSV 標題的隱形 BOM 亂碼與引號
 */
const cleanHeader = (h) =>
    h
        .replace(/^[\uFEFF\xEF\xBB\xBF]+/, "")
        .replace(/^uFEFF/, "")
        .trim()
        .replace(/"/g, "");

/**
 * 核心進入點：渲染網紅列表視圖
 */
export async function renderVideoView() {
    container.innerHTML = `<div class="p-10 text-center animate-pulse text-slate-500 font-mono">LOADING INFLUENCER DATA...</div>`;

    try {
        // 1. 同步抓取網紅總表、名稱對照表、以及全量媒體對照表
        const [infRes, mapRes, mediaRes] = await Promise.all([
            fetch(APP_CONFIG.DATA_PATHS.all_influencers),
            fetch(APP_CONFIG.DATA_PATHS.ig_names),
            fetch(
                APP_CONFIG.DATA_PATHS.all_media_ids ||
                    "./input/all_infleuncer_media_id.csv",
            ),
        ]);

        const infText = await infRes.text();
        const mapText = await mapRes.text();
        const mediaText = await mediaRes.text();

        // 2. 解析名稱對照表 (ownerid_mapping.csv)
        parseNameMapping(mapText);

        // 3. 解析全量媒體 CSV 檔案並快取
        parseGlobalMediaData(mediaText);

        // 4. 解析網紅清單
        const rows = infText
            .split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .filter((r) => r.trim() !== "");

        // 加入強制清除 BOM 的動作
        const headers = rows[0].split(",").map(cleanHeader);

        const usernameIdx = headers.indexOf("username");
        const igIdIdx = headers.indexOf("ig_id");
        const followersIdx = headers.indexOf("followers_count");
        const categoryIdx = headers.indexOf("category");

        influencerData = rows
            .slice(1)
            .map((row) => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const username = (cols[usernameIdx] || "")
                    .trim()
                    .replace(/"/g, "");
                const igId = (cols[igIdIdx] || "").trim().replace(/"/g, "");
                return {
                    username,
                    ig_id: igId,
                    followers_count: (cols[followersIdx] || "")
                        .trim()
                        .replace(/"/g, ""),
                    category: (cols[categoryIdx] || "")
                        .trim()
                        .replace(/"/g, ""),
                    displayName: nameMapping[igId] || username,
                };
            })
            .filter((item) => item.username);

        // 5. 渲染全新 Layout，在原本內容的頂部塞入兩列搜尋區
        renderMainLayout();
    } catch (error) {
        console.error("[影片頁籤載入出錯]", error);
        container.innerHTML = `<div class="p-20 text-red-500 text-center font-mono">載入失敗: ${error.message}</div>`;
    }
}

/**
 * 擴充功能：解析全量媒體 CSV
 */
function parseGlobalMediaData(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map(cleanHeader);
    const ownerIdx = headers.indexOf("post_owner.username");
    const mediaIdx = headers.indexOf("media_id");
    const commentIdx = headers.indexOf("statistics.comment_count");
    const likeIdx = headers.indexOf("statistics.like_count");
    const durationIdx = headers.indexOf("duration");
    const createIdx = headers.indexOf("creation_time_tw");
    const modifyIdx = headers.indexOf("modified_time_tw");

    globalMediaData = lines
        .slice(1)
        .map((line) => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                username: (cols[ownerIdx] || "").trim().replace(/"/g, ""),
                media_id: (cols[mediaIdx] || "").trim().replace(/"/g, ""),
                comment_count:
                    parseInt(
                        (cols[commentIdx] || "0").trim().replace(/"/g, ""),
                        10,
                    ) || 0,
                like_count:
                    parseFloat(
                        (cols[likeIdx] || "0").trim().replace(/"/g, ""),
                    ) || 0,
                duration:
                    parseFloat(
                        (cols[durationIdx] || "0").trim().replace(/"/g, ""),
                    ) || 0,
                creation_time_tw: (cols[createIdx] || "")
                    .trim()
                    .replace(/"/g, ""),
                modified_time_tw: (cols[modifyIdx] || "")
                    .trim()
                    .replace(/"/g, ""),
            };
        })
        .filter((m) => m.media_id !== "" && m.username !== "");
}

/**
 * 擴充功能：渲染頂部雙列條件搜尋區，並保留下方原本的渲染容器
 */
function renderMainLayout() {
    container.innerHTML = `
    <div class="w-full p-6 space-y-6">
        <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-xl backdrop-blur-md">
            <div class="flex flex-wrap items-center gap-4 border-b border-slate-800/40 pb-4">
                <div class="flex items-center gap-2 min-w-[130px]">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span class="text-sm font-bold text-slate-300">模式 1 (ID 搜尋)</span>
                </div>
                <input type="text" id="search-media-id" placeholder="請輸入完整的 media_id" 
                    class="bg-slate-900 border border-slate-700/80 rounded-lg px-4 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition w-64 font-mono">
                <button id="btn-mode1-search" class="bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-1.5 rounded-lg font-medium transition shadow-md shadow-blue-900/20">搜尋</button>
            </div>

            <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2 min-w-[130px]">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span class="text-sm font-bold text-slate-300">模式 2 (條件篩選)</span>
                </div>
                <select id="filter-condition-select" class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-emerald-400 outline-none focus:border-emerald-500 transition cursor-pointer">
                    <option value="" selected>-- 請選擇條件 --</option>
                    <option value="duration">條件1：依照 "影片長度" 篩選</option>
                    <option value="comment_count">條件2：依照 "留言數量" 篩選</option>
                    <option value="like_count">條件3：依照 "按讚數量" 篩選</option>
                    <option value="creation_time_tw">條件4：依照 "建立時間" 篩選</option>
                    <option value="modified_time_tw">條件5：依照 "修改時間" 篩選</option>
                </select>

                <div id="filter-input-wrapper" class="flex items-center gap-2"></div>

                <button id="btn-mode2-filter" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-5 py-1.5 rounded-lg font-medium transition shadow-md shadow-emerald-900/20">篩選</button>
                <button id="btn-search-reset" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-1.5 rounded-lg font-medium transition border border-slate-700">清除重設</button>
                
                <span id="search-error-msg" class="text-rose-500 font-bold text-sm hidden animate-pulse">⚠️ 查無結果</span>
            </div>
        </div>

        <div id="influencer-list-container" class="space-y-6 w-full"></div>
    </div>`;

    bindSearchEvents();
    renderInfluencerList();
}

/**
 * 擴充功能：條件控制與動態 DOM 事件切換監聽
 */
function bindSearchEvents() {
    const condSelect = document.getElementById("filter-condition-select");
    const inputWrapper = document.getElementById("filter-input-wrapper");
    const errorMsg = document.getElementById("search-error-msg");

    // 下拉選單切換，產生右側 Input
    condSelect.addEventListener("change", () => {
        const val = condSelect.value;
        if (!val) {
            inputWrapper.innerHTML = "";
            return;
        }

        if (val === "creation_time_tw" || val === "modified_time_tw") {
            inputWrapper.innerHTML = `
                <input type="date" id="filter-date-start" class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition w-36">
                <span class="text-slate-500 text-xs">到</span>
                <input type="date" id="filter-date-end" class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition w-36">
            `;
        } else {
            inputWrapper.innerHTML = `
                <input type="number" id="filter-val-min" placeholder="Min" class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition w-24">
                <span class="text-slate-500 text-xs">到</span>
                <input type="number" id="filter-val-max" placeholder="Max" class="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition w-24">
            `;
        }
    });

    // 模式 1：精確搜尋與 Zoom To (不隱藏網紅，純滾動與展開)
    document
        .getElementById("btn-mode1-search")
        .addEventListener("click", () => {
            errorMsg.classList.add("hidden");
            const mediaIdInput = document
                .getElementById("search-media-id")
                .value.trim();
            if (!mediaIdInput) return;

            const matchedRecord = globalMediaData.find(
                (v) => String(v.media_id) === mediaIdInput,
            );

            if (!matchedRecord || !matchedRecord.username) {
                errorMsg.classList.remove("hidden");
                return;
            }

            // 將清單重置為無過濾狀態 (能看見 200 個網紅) 以利後續定位
            isFilterActive = false;
            currentFilterMode = "mode1";
            renderInfluencerList();

            // 平滑滾動與展開流程
            setTimeout(() => {
                const targetHeader = document.querySelector(
                    `.influencer-header[data-username="${matchedRecord.username}"]`,
                );
                if (targetHeader) {
                    const contentBox = targetHeader.nextElementSibling;
                    // 自動點擊展開
                    if (contentBox.classList.contains("hidden")) {
                        targetHeader.click();
                    }
                    targetHeader.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });

                    // Polling 等待第二階段載入完畢，尋找精確影片並 HighLight
                    let checkTicks = 0;
                    const timer = setInterval(() => {
                        const videoItem = document.querySelector(
                            `.video-item[data-media-id="${mediaIdInput}"]`,
                        );
                        if (videoItem) {
                            clearInterval(timer);
                            videoItem.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                            videoItem.classList.add(
                                "ring-2",
                                "ring-blue-500",
                                "bg-blue-500/10",
                            );
                            setTimeout(() => {
                                videoItem.classList.remove(
                                    "ring-2",
                                    "ring-blue-500",
                                    "bg-blue-500/10",
                                );
                            }, 2500);
                        }
                        if (++checkTicks > 50) clearInterval(timer); // 等待上限 5 秒
                    }, 100);
                } else {
                    errorMsg.classList.remove("hidden");
                }
            }, 80);
        });

    // 模式 2：獨立條件篩選
    document
        .getElementById("btn-mode2-filter")
        .addEventListener("click", () => {
            errorMsg.classList.add("hidden");
            const activeKey = condSelect.value;
            if (!activeKey) return;

            matchedMediaIds.clear();
            matchedInfluencerUsernames.clear();

            if (
                activeKey === "creation_time_tw" ||
                activeKey === "modified_time_tw"
            ) {
                const startInput =
                    document.getElementById("filter-date-start")?.value || "";
                const endInput =
                    document.getElementById("filter-date-end")?.value || "";
                if (!startInput && !endInput) return;

                globalMediaData.forEach((item) => {
                    const rowDate = (item[activeKey] || "").substring(0, 10);
                    if (!rowDate) return;

                    let isMatch = true;
                    if (startInput && rowDate < startInput) isMatch = false;
                    if (endInput && rowDate > endInput) isMatch = false;

                    if (isMatch) {
                        matchedMediaIds.add(String(item.media_id));
                        matchedInfluencerUsernames.add(item.username);
                    }
                });
            } else {
                const minInput =
                    document.getElementById("filter-val-min")?.value || "";
                const maxInput =
                    document.getElementById("filter-val-max")?.value || "";
                if (minInput === "" && maxInput === "") return;

                const minBound =
                    minInput !== "" ? parseFloat(minInput) : -Infinity;
                const maxBound =
                    maxInput !== "" ? parseFloat(maxInput) : Infinity;

                globalMediaData.forEach((item) => {
                    const currentNum = parseFloat(item[activeKey]);
                    if (currentNum >= minBound && currentNum <= maxBound) {
                        matchedMediaIds.add(String(item.media_id));
                        matchedInfluencerUsernames.add(item.username);
                    }
                });
            }

            if (matchedMediaIds.size === 0) {
                errorMsg.classList.remove("hidden");
                isFilterActive = false;
                currentFilterMode = null;
            } else {
                isFilterActive = true;
                currentFilterMode = "mode2";
            }

            renderInfluencerList();
        });

    // 清除重設：清空所有欄位與過濾狀態
    document
        .getElementById("btn-search-reset")
        .addEventListener("click", () => {
            document.getElementById("search-media-id").value = "";
            condSelect.value = "";
            inputWrapper.innerHTML = "";
            errorMsg.classList.add("hidden");

            isFilterActive = false;
            currentFilterMode = null;
            matchedMediaIds.clear();
            matchedInfluencerUsernames.clear();

            renderInfluencerList();
        });
}

/**
 * 第一階段：渲染網紅列表 (結合原本結構與條件篩選)
 */
function renderInfluencerList() {
    const listContainer = document.getElementById("influencer-list-container");
    if (!listContainer) return;

    let html = "";
    let visibleCount = 0;

    influencerData.forEach((inf) => {
        // 如果正在執行模式2篩選，且這個網紅不具備條件內的影片，就直接跳過不渲染
        if (
            isFilterActive &&
            currentFilterMode === "mode2" &&
            !matchedInfluencerUsernames.has(inf.username)
        ) {
            return;
        }

        visibleCount++;
        // 以下保持您 old 版本的原始 HTML 結構
        html += `
            <div class="border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden backdrop-blur-sm hover:border-slate-700/60 transition shadow-sm">
                <div class="influencer-header flex justify-between items-center p-4 cursor-pointer select-none bg-slate-900/60 hover:bg-slate-800/40 transition" 
                     data-username="${inf.username}" data-igid="${inf.ig_id}">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2px]">
                            <div class="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">IG</div>
                        </div>
                        <div>
                            <h3 class="font-bold text-[16px] text-slate-100 flex items-center gap-2">
                                ${inf.displayName}
                                <span class="text-xs text-slate-500 font-normal font-mono">@${inf.username}</span>
                            </h3>
                            <p class="text-xs text-slate-400 mt-0.5">分類：<span class="text-blue-300">${inf.category || "未分類"}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-6 text-right">
                        <div>
                            <span class="text-xs text-slate-500 block uppercase tracking-wider">Followers</span>
                            <span class="font-mono text-slate-300 font-semibold text-sm">${formatFollowers(inf.followers_count)}</span>
                        </div>
                        <svg class="w-5 h-5 text-slate-500 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <div class="influencer-content hidden border-t border-slate-800/50 bg-slate-950/40 p-4">
                    <div class="text-center text-xs text-slate-600 font-mono py-2 animate-pulse">FETCHING VIDEOS...</div>
                </div>
            </div>
        `;
    });

    if (visibleCount === 0) {
        listContainer.innerHTML = `<div class="p-10 text-center text-slate-500 font-mono">查無任何網紅符合此過濾條件。</div>`;
        return;
    }

    listContainer.innerHTML = html;

    // 重新綁定您原版的事件監聽
    listContainer.querySelectorAll(".influencer-header").forEach((header) => {
        header.addEventListener("click", async () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector("svg");
            const isHidden = content.classList.contains("hidden");

            if (isHidden) {
                content.classList.remove("hidden");
                icon.classList.add("rotate-180");

                const username = header.getAttribute("data-username");
                const igId = header.getAttribute("data-igid");
                await loadVideoList(content, username, igId);
            } else {
                content.classList.add("hidden");
                icon.classList.remove("rotate-180");
            }
        });
    });
}

/**
 * 第二階段：載入展開指定網紅下的所有影片基本資訊 (並進行條件篩選過濾)
 */
async function loadVideoList(targetDom, username, igId) {
    try {
        const res = await fetch(
            `${APP_CONFIG.DATA_PATHS.video_info_dir}/${igId}-FullVideoInfo.csv`,
        );
        if (!res.ok) throw new Error("找不到該網紅的影片總表檔案");
        const text = await res.text();

        const lines = text
            .split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .filter((l) => l.trim() !== "");
        if (lines.length < 2) {
            targetDom.innerHTML = `<div class="text-xs text-slate-500 p-2">此網紅暫無有效影片。</div>`;
            return;
        }

        const headers = lines[0].split(",").map(cleanHeader);
        const mediaIdx = headers.indexOf("media_id");
        const titleIdx = headers.indexOf("title");
        const urlIdx = headers.indexOf("video_url");

        let videoRows = lines
            .slice(1)
            .map((line) => {
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                return {
                    media_id: (cols[mediaIdx] || "").trim().replace(/"/g, ""),
                    title:
                        (cols[titleIdx] || "").trim().replace(/"/g, "") ||
                        "未命名影片",
                    video_url: (cols[urlIdx] || "").trim().replace(/"/g, ""),
                };
            })
            .filter((v) => v.media_id !== "");

        // ==========================================
        // 模式 2 的精華：在此階段將不符合條件的影片剔除
        // ==========================================
        if (isFilterActive && currentFilterMode === "mode2") {
            videoRows = videoRows.filter((v) =>
                matchedMediaIds.has(String(v.media_id)),
            );
        }

        if (videoRows.length === 0) {
            targetDom.innerHTML = `<div class="text-xs text-rose-400 p-2 italic">該網紅下無符合篩選條件的影片項目。</div>`;
            return;
        }

        let listHtml = `<div class="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">`;
        videoRows.forEach((v) => {
            listHtml += `
                <div class="video-item border border-slate-800/60 bg-slate-900/20 rounded-lg p-3 hover:border-blue-500/30 transition shadow-sm" data-media-id="${v.media_id}">
                    <div class="flex justify-between items-center cursor-pointer video-sub-header" data-mediaid="${v.media_id}" data-igid="${igId}">
                        <div class="space-y-1 max-w-[85%]">
                            <h4 class="text-sm font-semibold text-slate-200 truncate" title="${v.title}">${v.title}</h4>
                            <p class="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                                <span>ID: <span class="text-slate-400">${v.media_id}</span></span>
                                ${isFilterActive && currentFilterMode === "mode2" ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">符合篩選</span>` : ""}
                            </p>
                        </div>
                        <span class="text-xs text-blue-400 hover:text-blue-300 font-medium shrink-0 flex items-center gap-1 bg-blue-500/5 px-2.5 py-1 rounded-md border border-blue-500/10">
                            詳細資訊
                            <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </span>
                    </div>
                    <div class="video-detail-box hidden mt-3 pt-3 border-t border-slate-800/40 text-xs text-slate-400"></div>
                </div>`;
        });
        listHtml += `</div>`;
        targetDom.innerHTML = listHtml;

        // 綁定第二階段影片點擊，載入第三階段 JSON
        targetDom.querySelectorAll(".video-sub-header").forEach((subHeader) => {
            subHeader.addEventListener("click", async () => {
                const itemContainer = subHeader.closest(".video-item");
                const detailBox =
                    itemContainer.querySelector(".video-detail-box");
                const iconSvg = subHeader.querySelector("svg");
                const isHidden = detailBox.classList.contains("hidden");

                if (isHidden) {
                    detailBox.classList.remove("hidden");
                    iconSvg.classList.add("rotate-180");

                    const mId = subHeader.getAttribute("data-mediaid");
                    const ownerId = subHeader.getAttribute("data-igid");
                    await loadVideoDetails(detailBox, ownerId, mId);
                } else {
                    detailBox.classList.add("hidden");
                    iconSvg.classList.remove("rotate-180");
                }
            });
        });
    } catch (err) {
        targetDom.innerHTML = `<div class="text-xs text-red-400 p-2">影片基本資訊載入失敗: ${err.message}</div>`;
    }
}

/**
 * 第三階段：點擊指定影片，載入展開 JSON 詳細資訊 (原廠完美保留)
 */
async function loadVideoDetails(targetDom, igId, mediaId) {
    const cacheKey = `${igId}_${mediaId}`;
    if (cachedDetails[cacheKey]) {
        renderDetailsHtml(targetDom, cachedDetails[cacheKey]);
        return;
    }

    targetDom.innerHTML = `<div class="py-4 text-center font-mono text-slate-600 animate-pulse text-[11px]">PARSING JSON DESCRIPTION...</div>`;

    try {
        const res = await fetch(
            `${APP_CONFIG.DATA_PATHS.video_details_dir}/${igId}-FullVideoInfo.json`,
        );
        if (!res.ok) throw new Error("影片詳情描述檔不存在");
        const jsonList = await res.json();

        const videoJson = jsonList.find(
            (item) => String(item.media_id) === String(mediaId),
        );
        if (!videoJson) throw new Error("JSON 中查無此影片 ID 節點");

        cachedDetails[cacheKey] = videoJson;
        renderDetailsHtml(targetDom, videoJson);
    } catch (err) {
        console.warn(`[詳情缺失] ${igId} - ${mediaId}:`, err.message);
        targetDom.innerHTML = `
            <div class="p-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-xs">
                ⚠️ 無法讀取 AI 結構化描述文本 (${err.message})。
            </div>`;
    }
}

/**
 * 原廠美化渲染表格
 */
function renderDetailsHtml(targetDom, data) {
    const rows = [];

    function traverse(obj, path = []) {
        if (obj === null || obj === undefined) return;
        const pathStr = path.join(".");
        if (
            pathStr.includes("narrative_log") ||
            pathStr.includes("Describe") ||
            pathStr.includes("Description")
        ) {
            return;
        }

        if (typeof obj !== "object") {
            const l = path.length;
            rows.push({
                l1: path[0] || "",
                l2: path[1] || "",
                l3: path[2] || "",
                l4: path.slice(3, l - 1).join(".") || path[l - 2] || "",
                l5: path[l - 1] || "",
                value: obj,
            });
            return;
        }

        if (Array.isArray(obj)) {
            const l = path.length;
            rows.push({
                l1: path[0] || "",
                l2: path[1] || "",
                l3: path[2] || "",
                l4: path.slice(3, l - 1).join(".") || path[l - 2] || "",
                l5: path[l - 1] || "",
                value: obj.join(", "),
            });
            return;
        }

        for (const key in obj) traverse(obj[key], [...path, key]);
    }

    traverse(data);

    let tableHtml = `
        <div class="bg-slate-950/80 border border-slate-800/60 rounded-xl overflow-hidden shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
            <table class="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                    <tr class="bg-slate-900 border-b stroke-slate-800 text-slate-400 font-sans">
                        <th class="p-2 border-r border-slate-800/80 font-semibold w-[15%]">L1</th>
                        <th class="p-2 border-r border-slate-800/80 font-semibold w-[15%]">L2</th>
                        <th class="p-2 border-r border-slate-800/80 font-semibold w-[15%]">L3</th>
                        <th class="p-2 border-r border-slate-800/80 font-semibold w-[20%]">L4</th>
                        <th class="p-2 font-semibold text-blue-400 w-[35%]">欄位值 (Value)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows
                        .map(
                            (r) => `
                        <tr class="border-b border-slate-800/30 hover:bg-blue-500/5 transition-colors group">
                            <td class="p-2 border-r border-slate-800/50 text-slate-500 truncate" title="${r.l1}">${r.l1}</td>
                            <td class="p-2 border-r border-slate-800/50 text-slate-400 truncate" title="${r.l2}">${r.l2}</td>
                            <td class="p-2 border-r border-slate-800/50 text-slate-300 truncate" title="${r.l3}">${r.l3}</td>
                            <td class="p-2 border-r border-slate-800/50 text-slate-200 truncate" title="${r.l4}">${r.l4}</td>
                            <td class="p-2 group-hover:text-blue-300 transition-colors break-all font-sans">${formatValue(r.value)}</td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>
        </div>`;

    targetDom.innerHTML = tableHtml;
}

function formatValue(val) {
    if (val === undefined || val === null)
        return `<span class="text-slate-700">—</span>`;
    if (typeof val === "boolean")
        return val
            ? `<span class="text-emerald-500 font-bold">YES</span>`
            : `<span class="text-rose-500 font-bold">NO</span>`;
    return String(val);
}

function parseNameMapping(csvText) {
    const lines = csvText.split(/\r?\n/).filter((r) => r.trim() !== "");
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map(cleanHeader);
    const igIdIdx = headers.indexOf("ig_id");
    const nameIdx = headers.indexOf("person_name");

    if (igIdIdx === -1 || nameIdx === -1) return;

    lines.slice(1).forEach((line) => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const igId = (cols[igIdIdx] || "").trim().replace(/"/g, "");
        const name = (cols[nameIdx] || "").trim().replace(/"/g, "");
        if (igId && name) nameMapping[igId] = name;
    });
}

function formatFollowers(numStr) {
    const val = parseInt(numStr, 10);
    if (isNaN(val)) return numStr || "0";
    if (val >= 10000) return (val / 10000).toFixed(1) + " 萬";
    if (val >= 1000) return (val / 1000).toFixed(1) + " K";
    return val.toLocaleString();
}
