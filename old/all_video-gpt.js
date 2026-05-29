// all_video.js
import { APP_CONFIG } from "./config.js";

const container = document.getElementById("cluster-container");

// ==========================================
// 原本資料狀態
// ==========================================
let influencerData = [];
let nameMapping = {}; // 儲存 ig_id / tag_id -> person_name 的對照
let cachedDetails = {}; // 快取已下載的網紅影片詳情：{ ig_id: mergedJson }

// ==========================================
// 搜尋 / 篩選功能狀態
// ==========================================
let globalMediaData = []; // all_infleuncer_media_id.csv 解析後的全量影片資料
let mediaIdIndex = new Map(); // media_id -> media record，用於模式 1 O(1) 搜尋
let isFilterActive = false; // 是否正在套用模式 2 條件篩選
let matchedMediaIds = new Set(); // 模式 2：符合條件的 media_id
let matchedInfluencerIds = new Set(); // 模式 2：符合條件的 post_owner.username；對應 influencer_all_info.csv 的 ig_id

// ==========================================
// 效能優化：模組層級快取
// ==========================================
let isBaseDataLoaded = false; // influencer_all_info.csv + ownerid_mapping.csv 是否已載入
let baseDataLoadPromise = null; // 避免短時間重複呼叫 renderVideoView 時重複 fetch

let isGlobalMediaDataLoaded = false; // all_infleuncer_media_id.csv 是否已載入
let globalMediaDataLoadPromise = null; // 避免搜尋 / 篩選時重複 fetch
let globalMediaDataLoadError = null; // 背景載入失敗時保留錯誤訊息

let cachedVideoViewHTML = ""; // 保存 Videos 頁籤目前 DOM，用於切回頁籤時還原
let videoSnapshotObserver = null; // 監聽 Videos DOM 變化，自動更新 cachedVideoViewHTML
let videoSnapshotTimer = null; // 避免 MutationObserver 連續觸發時大量 outerHTML 序列化

let videoCsvCache = {}; // 快取第二層單一網紅影片 CSV 解析結果：{ ig_id: videos[] }

/**
 * 清除 CSV header 可能出現的 BOM、引號與空白。
 */
function cleanHeader(header) {
    return String(header || "")
        .replace(/^[\uFEFF\xEF\xBB\xBF]+/, "")
        .replace(/^uFEFF/, "")
        .trim()
        .replace(/"/g, "");
}

/**
 * 簡易 CSV row parser：保留原本專案使用的正則切法，處理欄位內逗號。
 */
function splitCsvRow(row) {
    return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
}

/**
 * 讓出主執行緒給瀏覽器。
 *
 * 用於大量 CSV parsing 時，避免長時間卡住 UI，
 * 讓使用者仍然可以點擊下方手風琴。
 */
function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 等第一畫面真正 paint 出來後，再開始背景處理大型 CSV。
 * 這可以避免「手風琴剛出現但點不動」的感覺。
 */
function runAfterFirstPaint(callback) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(callback, { timeout: 1200 });
            } else {
                setTimeout(callback, 80);
            }
        });
    });
}

/**
 * 核心進入點：渲染網紅列表視圖。
 *
 * 效能優化重點：
 * 1. 第一次進入 Videos：只等待必要資料，也就是 influencer_all_info.csv 與 ownerid_mapping.csv。
 * 2. all_infleuncer_media_id.csv 改成背景載入，不阻塞初始畫面。
 * 3. 從其他頁籤切回 Videos：若已有 cachedVideoViewHTML，直接還原 DOM，不重新 fetch / parse / render。
 */
export async function renderVideoView() {
    // 若先前已經渲染過 Videos，而且 DOM 快照存在，直接還原。
    // 這樣從 Cluster / Contents 切回 Videos 時，不會重新載入，也不會重置展開狀態。
    if (cachedVideoViewHTML && isBaseDataLoaded) {
        container.innerHTML = cachedVideoViewHTML;

        // innerHTML 還原後，addEventListener 綁定會消失，因此需要重新綁定搜尋 / 篩選 UI。
        bindSearchEvents();

        // 重新啟動 DOM 快照監聽，確保後續展開手風琴、篩選、搜尋後都能保存狀態。
        startVideoDomSnapshotObserver();

        // 若全量 media 資料尚未完成，繼續背景載入。
        loadGlobalMediaDataInBackground();

        return;
    }

    container.innerHTML = `<div class="p-10 text-center animate-pulse text-slate-500 font-mono">LOADING INFLUENCER DATA...</div>`;

    try {
        // 第一次進入只等待必要資料，讓 200 個網紅手風琴先顯示。
        await loadBaseVideoData();

        // 第一次進入 Videos 時，回到初始搜尋狀態。
        resetSearchStateOnly();

        renderMainLayout();
        startVideoDomSnapshotObserver();

        // 全量 media_id 對照表改成背景載入，不阻塞第一畫面。
        loadGlobalMediaDataInBackground();
    } catch (err) {
        console.error("[VideoView 渲染出錯]", err);
        container.innerHTML = `<div class="p-10 text-red-400">載入失敗: ${err.message}</div>`;
    }
}

/**
 * 載入 Videos 第一畫面必要資料。
 *
 * 只包含：
 * - influencer_all_info.csv
 * - ownerid_mapping.csv
 *
 * 不包含 all_infleuncer_media_id.csv，因為初始畫面不需要用到它。
 */
async function loadBaseVideoData() {
    if (isBaseDataLoaded) return;

    if (baseDataLoadPromise) {
        await baseDataLoadPromise;
        return;
    }

    baseDataLoadPromise = (async () => {
        const [infRes, mapRes] = await Promise.all([
            fetch(APP_CONFIG.DATA_PATHS.all_influencers),
            fetch(APP_CONFIG.DATA_PATHS.ig_names),
        ]);

        if (!infRes.ok) throw new Error("找不到 influencer_all_info.csv");
        if (!mapRes.ok) throw new Error("找不到 ownerid_mapping.csv");

        const infText = await infRes.text();
        const mapText = await mapRes.text();

        // 避免熱重載或重複呼叫時殘留舊資料。
        nameMapping = {};
        influencerData = [];

        parseNameMapping(mapText);
        parseInfluencerData(infText);

        isBaseDataLoaded = true;
    })();

    try {
        await baseDataLoadPromise;
    } finally {
        baseDataLoadPromise = null;
    }
}

/**
 * 背景載入 all_infleuncer_media_id.csv。
 *
 * 載入期間搜尋 / 篩選區塊顯示 loading。
 * 載入完成後自動換回正式搜尋 / 篩選 UI。
 */
function loadGlobalMediaDataInBackground() {
    // 若已載入完成，直接確保畫面是正式表單。
    if (isGlobalMediaDataLoaded) {
        refreshSearchFilterPanel();
        return;
    }

    // 只要還沒完成，就確保目前顯示 loading panel。
    refreshSearchFilterPanel();

    // 不要在第一層手風琴剛 render 完就立刻解析大型 CSV。
    // 先讓瀏覽器完成 paint 與使用者點擊事件，再利用 idle time 背景載入。
    runAfterFirstPaint(() => {
        ensureGlobalMediaDataLoaded({ showMessage: false })
            .then(() => {
                refreshSearchFilterPanel();
            })
            .catch((err) => {
                console.warn(
                    "[背景載入 all_infleuncer_media_id.csv 失敗]",
                    err,
                );
                refreshSearchFilterPanel();
            });
    });
}

/**
 * 確保 all_infleuncer_media_id.csv 已載入。
 *
 * 搜尋與篩選會 await 這個函式。
 * 若背景資料尚未完成，會等待同一個 globalMediaDataLoadPromise，
 * 不會重複 fetch。
 */
async function ensureGlobalMediaDataLoaded({ showMessage = false } = {}) {
    if (isGlobalMediaDataLoaded) return;

    if (globalMediaDataLoadError) {
        throw globalMediaDataLoadError;
    }

    if (globalMediaDataLoadPromise) {
        if (showMessage) setSearchMessage("搜尋資料載入中，請稍候...", "info");
        await globalMediaDataLoadPromise;
        if (showMessage) clearSearchMessage();
        return;
    }

    if (showMessage) setSearchMessage("搜尋資料載入中，請稍候...", "info");

    globalMediaDataLoadPromise = (async () => {
        try {
            const mediaRes = await fetch(
                APP_CONFIG.DATA_PATHS.all_media_ids ||
                    "./input/all_infleuncer_media_id.csv",
            );

            if (!mediaRes.ok) {
                throw new Error("找不到 all_infleuncer_media_id.csv");
            }

            const mediaText = await mediaRes.text();

            // 關鍵修正：
            // 使用 async 分批解析，避免長時間佔用主執行緒，讓下方手風琴仍可互動。
            await parseGlobalMediaData(mediaText);

            isGlobalMediaDataLoaded = true;
            globalMediaDataLoadError = null;
        } catch (err) {
            globalMediaDataLoadError = err;
            throw err;
        }
    })();

    try {
        await globalMediaDataLoadPromise;
    } finally {
        globalMediaDataLoadPromise = null;
        if (showMessage) clearSearchMessage();

        // 成功：loading -> 正式表單
        // 失敗：loading -> 錯誤提示
        refreshSearchFilterPanel();
    }
}

/**
 * 解析 influencer_all_info.csv。
 */
function parseInfluencerData(infText) {
    const rows = infText
        .split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .filter((r) => r.trim() !== "");

    if (rows.length < 2) {
        influencerData = [];
        return;
    }

    const headers = rows[0].split(",").map(cleanHeader);

    influencerData = rows
        .slice(1)
        .map((row) => {
            const cols = splitCsvRow(row);
            let obj = {};
            headers.forEach((h, i) => {
                let val = (cols[i] || "").trim();
                obj[h] = val.replace(/^"|"$/g, "");
            });
            return obj;
        })
        .filter((obj) => obj.ig_id)
        .sort(
            (a, b) =>
                parseInt(a.Aisa_Order || 999, 10) -
                parseInt(b.Aisa_Order || 999, 10),
        );
}

/**
 * 解析 Mapping CSV。
 */
function parseNameMapping(csvText) {
    const rows = csvText
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((r) => r.trim() !== "");
    if (rows.length < 2) return;

    const headers = rows[0].split(",").map(cleanHeader);
    const idIdx = headers.indexOf("ig_id");
    const tagIdIdx = headers.indexOf("tag_id");
    const nameIdx = headers.indexOf("person_name");

    rows.slice(1).forEach((row) => {
        const cols = splitCsvRow(row).map((v) =>
            v.trim().replace(/^"|"$/g, ""),
        );
        const name = cols[nameIdx];
        if (idIdx !== -1 && cols[idIdx]) nameMapping[cols[idIdx]] = name;
        if (tagIdIdx !== -1 && cols[tagIdIdx])
            nameMapping[cols[tagIdIdx]] = name;
    });
}

/**
 * 解析 all_infleuncer_media_id.csv。
 */
async function parseGlobalMediaData(csvText) {
    const rows = csvText
        .replace(/^\uFEFF/, "")
        .split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .filter((r) => r.trim() !== "");

    if (rows.length < 2) {
        globalMediaData = [];
        mediaIdIndex = new Map();
        return;
    }

    const headers = rows[0].split(",").map(cleanHeader);
    const ownerIdx = headers.indexOf("post_owner.username");
    const mediaIdx = headers.indexOf("media_id");
    const commentIdx = headers.indexOf("statistics.comment_count");
    const likeIdx = headers.indexOf("statistics.like_count");
    const durationIdx = headers.indexOf("duration");
    const createIdx = headers.indexOf("creation_time_tw");
    const modifyIdx = headers.indexOf("modified_time_tw");

    if (ownerIdx === -1 || mediaIdx === -1) {
        console.error("all_infleuncer_media_id.csv 缺少必要欄位", headers);
        globalMediaData = [];
        mediaIdIndex = new Map();
        return;
    }

    const parsed = [];
    const nextMediaIdIndex = new Map();
    const dataRows = rows.slice(1);

    // 每批處理筆數。
    // 若你覺得仍然卡，可以改小，例如 100。
    // 若你覺得載入太慢，可以改大，例如 500 或 1000。
    const CHUNK_SIZE = 200;

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const cols = splitCsvRow(row);

        const item = {
            owner_ig_id: (cols[ownerIdx] || "").trim().replace(/^"|"$/g, ""),
            media_id: (cols[mediaIdx] || "").trim().replace(/^"|"$/g, ""),
            comment_count:
                parseInt(
                    (cols[commentIdx] || "0").trim().replace(/^"|"$/g, ""),
                    10,
                ) || 0,
            like_count:
                parseFloat(
                    (cols[likeIdx] || "0").trim().replace(/^"|"$/g, ""),
                ) || 0,
            duration:
                parseFloat(
                    (cols[durationIdx] || "0").trim().replace(/^"|"$/g, ""),
                ) || 0,
            creation_time_tw: (cols[createIdx] || "")
                .trim()
                .replace(/^"|"$/g, ""),
            modified_time_tw: (cols[modifyIdx] || "")
                .trim()
                .replace(/^"|"$/g, ""),
        };

        if (item.owner_ig_id && item.media_id) {
            parsed.push(item);
            nextMediaIdIndex.set(String(item.media_id), item);
        }

        if (i > 0 && i % CHUNK_SIZE === 0) {
            await yieldToBrowser();
        }
    }

    globalMediaData = parsed;
    mediaIdIndex = nextMediaIdIndex;
}

/**
 * 渲染主 Layout。
 */
function renderMainLayout() {
    container.innerHTML = `
    <div id="video-view-root" class="w-full p-6 space-y-6">
        ${renderSearchFilterPanel()}
        <div id="influencer-list-container"></div>
    </div>`;

    if (isGlobalMediaDataLoaded) {
        bindSearchEvents();
    }

    renderInfluencerList();
    cacheVideoViewSnapshot();
}

/**
 * 渲染上方搜尋 / 篩選區塊。
 */
function renderSearchFilterPanel() {
    if (globalMediaDataLoadError) {
        return `
        <div id="search-filter-panel" class="bg-slate-950/60 border border-rose-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
            <div class="flex items-center gap-4">
                <div class="w-5 h-5 rounded-full border-2 border-rose-500/30 border-t-rose-500"></div>
                <div>
                    <div class="text-rose-400 font-bold text-sm">條件篩選資料載入失敗</div>
                    <div class="text-slate-400 text-xs mt-1">${globalMediaDataLoadError.message || "請確認 all_infleuncer_media_id.csv 路徑與檔案是否正確。"}</div>
                </div>
            </div>
        </div>`;
    }

    if (!isGlobalMediaDataLoaded) {
        return `
        <div id="search-filter-panel" class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-md">
            <div class="flex items-center justify-center gap-4 min-h-[96px]">
                <div class="w-7 h-7 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin"></div>
                <div>
                    <div class="text-slate-200 font-bold text-sm">資料載入中，請稍後...</div>
                    <div class="text-slate-500 text-xs mt-1">大約等個十幾秒，手風琴稍後才能展開</div>
                </div>
            </div>
        </div>`;
    }

    return `
        <div id="search-filter-panel" class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-xl backdrop-blur-md">
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
                
                <span id="search-error-msg" class="text-rose-500 font-bold text-sm hidden">⚠️ 查無結果</span>
            </div>
        </div>`;
}

/**
 * 重新整理上方搜尋 / 篩選區塊。
 */
function refreshSearchFilterPanel() {
    const panel = document.getElementById("search-filter-panel");
    if (!panel) return;

    panel.outerHTML = renderSearchFilterPanel();

    if (isGlobalMediaDataLoaded) {
        bindSearchEvents();
    }

    cacheVideoViewSnapshot();
}

/**
 * 啟動 Videos DOM 快照監聽。
 */
function startVideoDomSnapshotObserver() {
    if (videoSnapshotObserver) {
        videoSnapshotObserver.disconnect();
        videoSnapshotObserver = null;
    }

    const root = document.getElementById("video-view-root");
    if (!root) return;

    videoSnapshotObserver = new MutationObserver(() => {
        scheduleVideoViewSnapshot();
    });

    videoSnapshotObserver.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });

    cacheVideoViewSnapshot();
}

/**
 * 延遲保存目前 Videos DOM。
 */
function scheduleVideoViewSnapshot() {
    if (videoSnapshotTimer) {
        clearTimeout(videoSnapshotTimer);
    }

    videoSnapshotTimer = setTimeout(() => {
        videoSnapshotTimer = null;
        cacheVideoViewSnapshot();
    }, 250);
}

/**
 * 保存目前 Videos DOM。
 */
function cacheVideoViewSnapshot() {
    const root = document.getElementById("video-view-root");
    if (!root) return;
    cachedVideoViewHTML = root.outerHTML;
}

/**
 * 綁定搜尋 / 篩選 UI 的事件。
 */
function bindSearchEvents() {
    const condSelect = document.getElementById("filter-condition-select");
    const inputWrapper = document.getElementById("filter-input-wrapper");
    const errorMsg = document.getElementById("search-error-msg");
    const btnMode1 = document.getElementById("btn-mode1-search");
    const searchInput = document.getElementById("search-media-id");
    const btnMode2 = document.getElementById("btn-mode2-filter");
    const btnReset = document.getElementById("btn-search-reset");

    if (!condSelect || !inputWrapper || !errorMsg) return;

    condSelect.addEventListener("change", () => {
        const val = condSelect.value;
        clearSearchMessage();

        if (!val) {
            inputWrapper.innerHTML = "";
            cacheVideoViewSnapshot();
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

        cacheVideoViewSnapshot();
    });

    if (btnMode1) {
        btnMode1.addEventListener("click", handleMediaIdSearch);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") handleMediaIdSearch();
        });
    }

    if (btnMode2) {
        btnMode2.addEventListener("click", handleConditionFilter);
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            const searchInputNow = document.getElementById("search-media-id");
            const condSelectNow = document.getElementById(
                "filter-condition-select",
            );
            const inputWrapperNow = document.getElementById(
                "filter-input-wrapper",
            );

            if (searchInputNow) searchInputNow.value = "";
            if (condSelectNow) condSelectNow.value = "";
            if (inputWrapperNow) inputWrapperNow.innerHTML = "";

            clearSearchMessage();

            resetSearchStateOnly();
            renderInfluencerList();
            cacheVideoViewSnapshot();
        });
    }
}

/**
 * 清空搜尋狀態，但不動到 DOM 欄位。
 */
function resetSearchStateOnly() {
    isFilterActive = false;
    matchedMediaIds.clear();
    matchedInfluencerIds.clear();
}

/**
 * 顯示搜尋 / 篩選訊息。
 */
function setSearchMessage(message, type = "error") {
    const msg = document.getElementById("search-error-msg");
    if (!msg) return;

    msg.textContent = message;
    msg.classList.remove("hidden", "text-rose-500", "text-blue-400");

    if (type === "info") {
        msg.classList.add("text-blue-400");
    } else {
        msg.classList.add("text-rose-500");
    }

    cacheVideoViewSnapshot();
}

/**
 * 清除搜尋 / 篩選訊息。
 */
function clearSearchMessage() {
    const msg = document.getElementById("search-error-msg");
    if (!msg) return;

    msg.textContent = "⚠️ 查無結果";
    msg.classList.add("hidden");
    msg.classList.remove("text-blue-400");
    msg.classList.add("text-rose-500");

    cacheVideoViewSnapshot();
}

/**
 * 顯示或隱藏「查無結果」。
 */
function setSearchErrorVisible(isVisible) {
    if (isVisible) {
        setSearchMessage("⚠️ 查無結果", "error");
    } else {
        clearSearchMessage();
    }
}

/**
 * 模式 1：media_id 精確搜尋。
 */
async function handleMediaIdSearch() {
    clearSearchMessage();

    const mediaIdInput = document
        .getElementById("search-media-id")
        ?.value.trim();

    if (!mediaIdInput) return;

    try {
        await ensureGlobalMediaDataLoaded({ showMessage: true });
    } catch (err) {
        console.error("[media_id 搜尋資料載入失敗]", err);
        setSearchMessage(`⚠️ 搜尋資料載入失敗：${err.message}`, "error");
        return;
    }

    const matchedRecord = mediaIdIndex.get(String(mediaIdInput));

    if (!matchedRecord) {
        setSearchErrorVisible(true);
        return;
    }

    resetSearchStateOnly();
    renderInfluencerList();
    cacheVideoViewSnapshot();

    setTimeout(() => {
        const targetHeader = document.querySelector(
            `.accordion-header[data-ig-id="${cssEscape(matchedRecord.owner_ig_id)}"]`,
        );

        if (!targetHeader) {
            setSearchErrorVisible(true);
            return;
        }

        const targetContent = document.getElementById(
            `content-${matchedRecord.owner_ig_id}`,
        );

        if (targetContent && targetContent.classList.contains("hidden")) {
            window.toggleInfluencer(matchedRecord.owner_ig_id, targetHeader);
        }

        targetHeader.scrollIntoView({ behavior: "smooth", block: "center" });

        let checkTicks = 0;
        const timer = setInterval(() => {
            const videoItem = document.querySelector(
                `.video-item[data-media-id="${cssEscape(mediaIdInput)}"]`,
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

                const videoHeader =
                    videoItem.querySelector(".video-row-header");
                const detailBox = videoItem.querySelector(".video-detail-box");

                if (videoHeader && detailBox?.classList.contains("hidden")) {
                    videoHeader.click();
                }

                setTimeout(() => {
                    videoItem.classList.remove(
                        "ring-2",
                        "ring-blue-500",
                        "bg-blue-500/10",
                    );
                    cacheVideoViewSnapshot();
                }, 2500);

                cacheVideoViewSnapshot();
                return;
            }

            if (++checkTicks > 60) {
                clearInterval(timer);
                setSearchErrorVisible(true);
            }
        }, 100);
    }, 80);
}

/**
 * 模式 2：條件式篩選。
 */
async function handleConditionFilter() {
    clearSearchMessage();

    const condSelect = document.getElementById("filter-condition-select");
    const activeKey = condSelect?.value;

    if (!activeKey) return;

    try {
        await ensureGlobalMediaDataLoaded({ showMessage: true });
    } catch (err) {
        console.error("[條件篩選資料載入失敗]", err);
        setSearchMessage(`⚠️ 篩選資料載入失敗：${err.message}`, "error");
        return;
    }

    matchedMediaIds.clear();
    matchedInfluencerIds.clear();

    if (activeKey === "creation_time_tw" || activeKey === "modified_time_tw") {
        const startInput =
            document.getElementById("filter-date-start")?.value || "";
        const endInput =
            document.getElementById("filter-date-end")?.value || "";

        if (!startInput && !endInput) return;

        globalMediaData.forEach((item) => {
            const rowDate = String(item[activeKey] || "").substring(0, 10);
            if (!rowDate) return;

            let isMatch = true;
            if (startInput && rowDate < startInput) isMatch = false;
            if (endInput && rowDate > endInput) isMatch = false;

            if (isMatch) {
                matchedMediaIds.add(String(item.media_id));
                matchedInfluencerIds.add(String(item.owner_ig_id));
            }
        });
    } else {
        const minInput = document.getElementById("filter-val-min")?.value || "";
        const maxInput = document.getElementById("filter-val-max")?.value || "";

        if (minInput === "" && maxInput === "") return;

        const minBound = minInput !== "" ? parseFloat(minInput) : -Infinity;
        const maxBound = maxInput !== "" ? parseFloat(maxInput) : Infinity;

        globalMediaData.forEach((item) => {
            const currentNum = parseFloat(item[activeKey]);
            if (Number.isNaN(currentNum)) return;

            if (currentNum >= minBound && currentNum <= maxBound) {
                matchedMediaIds.add(String(item.media_id));
                matchedInfluencerIds.add(String(item.owner_ig_id));
            }
        });
    }

    if (matchedMediaIds.size === 0) {
        isFilterActive = false;
        setSearchErrorVisible(true);
    } else {
        isFilterActive = true;
    }

    renderInfluencerList();
    cacheVideoViewSnapshot();
}

/**
 * CSS selector escape。
 */
function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(String(value));
    }
    return String(value).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
}

/**
 * 第一層：渲染網紅手風琴清單。
 */
function renderInfluencerList() {
    const listContainer = document.getElementById("influencer-list-container");
    if (!listContainer) return;

    let html = `<div class="p-6 space-y-4 max-w-7xl mx-auto">`;
    let visibleCount = 0;

    influencerData.forEach((inf) => {
        if (isFilterActive && !matchedInfluencerIds.has(String(inf.ig_id))) {
            return;
        }

        visibleCount++;

        const categoryHtml = String(inf.category || "未分類")
            .split(",")
            .filter((c) => c.trim() !== "")
            .map((cat) => {
                const cleanCat = cat.trim();
                const color =
                    APP_CONFIG.CATEGORY_COLORS[cleanCat] ||
                    APP_CONFIG.CATEGORY_COLORS["default"];

                return `
                <span class="px-2 py-0.5 rounded-full border text-[12px] whitespace-nowrap transition-all" 
                    style="border-color: ${color}; color: ${color};">
                    ${cleanCat}
                </span>`;
            })
            .join("");

        html += `
            <div class="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50 shadow-sm">
                <div class="accordion-header flex justify-between items-center p-4 cursor-pointer hover:bg-slate-800/80 transition" 
                     data-ig-id="${inf.ig_id}"
                     onclick="toggleInfluencer('${inf.ig_id}', this)">
                    <div class="flex items-center gap-4">
                        <span class="text-blue-500 font-mono font-bold">${inf.Aisa_Order}</span>
                        <span class="font-bold text-blue-300 text-lg">${inf.person_name}</span>
                        <a href="${inf.ig_url}" target="_blank" class="text-slate-300 hover:text-blue-400 text-sm transition" onclick="event.stopPropagation()">
                            ${inf.ig_id}
                        </a>
                        <div class="flex gap-1 items-center">
                            ${categoryHtml}
                        </div>
                    </div>
                    <div class="text-slate-300 text-sm flex items-center gap-2">
                        <span> ${Math.floor(inf.posts || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} 貼文, </span>
                        <span>${Math.floor(inf.Followers || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} 粉絲, </span>
                        <span>${Math.floor(inf.Following || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}追蹤</span>
                        <svg class="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                </div>
                <div id="content-${inf.ig_id}" class="hidden bg-[#213815] border-t border-slate-800 p-4">
                    <div class="loading-status text-slate-200 text-sm mb-4 italic"></div>
                    <div class="video-list space-y-3"></div>
                </div>
            </div>
        `;
    });

    if (visibleCount === 0) {
        html += `<div class="p-10 text-center text-slate-500 font-mono">查無任何網紅符合此過濾條件。</div>`;
    }

    html += `</div>`;
    listContainer.innerHTML = html;
    cacheVideoViewSnapshot();
}

/**
 * 第二層：展開網紅，載入影片 CSV。
 */
window.toggleInfluencer = async (ig_id, el) => {
    const content = document.getElementById(`content-${ig_id}`);
    if (!content) return;

    const icon = el.querySelector("svg");
    const isHidden = content.classList.contains("hidden");

    if (isHidden) {
        content.classList.remove("hidden");
        if (icon) icon.classList.add("rotate-180");

        const listDiv = content.querySelector(".video-list");

        if (listDiv && listDiv.innerHTML === "") {
            try {
                const videos = await getVideosForInfluencer(ig_id);

                let displayVideos = videos;

                if (isFilterActive) {
                    displayVideos = videos.filter((v) =>
                        matchedMediaIds.has(String(v.media_id)),
                    );
                }

                content.querySelector(".loading-status").innerHTML =
                    `Found ${displayVideos.length} videos`;

                if (displayVideos.length === 0) {
                    listDiv.innerHTML = `<div class="text-rose-400 text-sm italic p-2">該網紅下無符合篩選條件的影片。</div>`;
                    cacheVideoViewSnapshot();
                    return;
                }

                listDiv.innerHTML = displayVideos
                    .map((v) => {
                        const previewText = v.text
                            ? v.text.length > 50
                                ? v.text.substring(0, 50) + "..."
                                : v.text
                            : "(無文字內容)";

                        return `
                    <div class="video-item border border-slate-800/40 rounded-md bg-slate-900" data-media-id="${v.media_id}">
                        <div class="video-row-header p-3 cursor-pointer hover:bg-slate-800/40 flex justify-between items-center text-sm transition" 
                             onclick="toggleVideoDetail('${ig_id}', '${v.media_id}', '${v.modified_time_tw}', this)">
                            <div class="flex items-center gap-6 overflow-hidden">
                                <span class="text-slate-300 font-mono shrink-0">${(v.creation_time_tw || "").split("+")[0]}</span>
                                <span class="text-blue-300 font-mono shrink-0">${v.media_id}</span>
                                <span class="text-slate-300 shrink-0 ">${v.duration}s</span>
                                ${isFilterActive ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 shrink-0">符合篩選</span>` : ""}
                                <span class="text-slate-200 truncate italic">| ${previewText.replace(/\n/g, " ")}</span>
                            </div>
                            <svg class="w-4 h-4 text-slate-600 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="detail-${v.media_id}" class="video-detail-box hidden bg-slate-900/40 border-t border-slate-800/60 overflow-hidden">
                            <div class="animate-pulse p-10 text-center text-slate-700 font-mono">FETCHING JSON...</div>
                        </div>
                    </div>
                `;
                    })
                    .join("");

                cacheVideoViewSnapshot();
            } catch (err) {
                content.querySelector(".loading-status").innerHTML =
                    `<span class="text-rose-900 font-bold">Error: ${err.message}</span>`;
                cacheVideoViewSnapshot();
            }
        }
    } else {
        content.classList.add("hidden");
        if (icon) icon.classList.remove("rotate-180");
        cacheVideoViewSnapshot();
    }
};

/**
 * 取得單一網紅的影片清單。
 */
async function getVideosForInfluencer(ig_id) {
    if (videoCsvCache[ig_id]) {
        return videoCsvCache[ig_id];
    }

    const res = await fetch(
        `${APP_CONFIG.DATA_PATHS.video_info_dir}/${ig_id}-FullVideoInfo.csv`,
    );

    if (!res.ok) throw new Error("找不到影片資訊檔案");

    const csvText = await res.text();

    const csvRows = csvText
        .replace(/^\uFEFF/, "")
        .split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .filter((r) => r.trim() !== "");

    if (csvRows.length < 2) {
        videoCsvCache[ig_id] = [];
        return [];
    }

    const headers = csvRows[0].split(",").map(cleanHeader);

    const videos = csvRows
        .slice(1)
        .map((row) => {
            const cols = splitCsvRow(row);
            let obj = {};
            headers.forEach(
                (h, i) => (obj[h] = (cols[i] || "").replace(/^"|"$/g, "")),
            );
            return obj;
        })
        .filter((v) => v.media_id)
        .sort(
            (a, b) =>
                new Date(a.creation_time_tw) - new Date(b.creation_time_tw),
        );

    videoCsvCache[ig_id] = videos;
    return videos;
}

/**
 * 第三層：展開影片詳情 Dashboard。
 */
window.toggleVideoDetail = async (ig_id, media_id, modified_time_tw, el) => {
    const detailDiv = document.getElementById(`detail-${media_id}`);
    if (!detailDiv) return;

    const icon = el.querySelector("svg");
    const isHidden = detailDiv.classList.contains("hidden");

    if (isHidden) {
        detailDiv.classList.remove("hidden");
        if (icon) icon.classList.add("rotate-180");

        let csvInfo = {};
        let jsonData = null;
        let jsonError = null;

        try {
            csvInfo = await getCsvInfo(ig_id, media_id);
        } catch (csvErr) {
            console.error("CSV Metadata 載入失敗", csvErr);
        }

        try {
            if (!cachedDetails[ig_id]) {
                const res = await fetch(
                    `${APP_CONFIG.DATA_PATHS.video_details_dir}/${ig_id}.json`,
                );
                if (!res.ok) throw new Error("找不到合併 JSON 檔案");
                cachedDetails[ig_id] = await res.json();
            }
            jsonData = cachedDetails[ig_id][media_id];
            if (!jsonData) throw new Error("JSON 內缺少此影片數據");
        } catch (err) {
            jsonError = err.message;
        }

        renderVideoDashboard(
            detailDiv,
            ig_id,
            media_id,
            csvInfo,
            jsonData,
            jsonError,
        );

        cacheVideoViewSnapshot();
    } else {
        detailDiv.classList.add("hidden");
        if (icon) icon.classList.remove("rotate-180");
        cacheVideoViewSnapshot();
    }
};

/**
 * 從單一網紅 CSV 取得指定 media_id 的原始 metadata 欄位。
 */
async function getCsvInfo(ig_id, media_id) {
    try {
        const videos = await getVideosForInfluencer(ig_id);
        const target = videos.find(
            (v) => String(v.media_id) === String(media_id),
        );
        return target || {};
    } catch (e) {
        console.warn("getCsvInfo error:", e);
        return {};
    }
}

/**
 * 渲染影片儀表板：Metadata + Description + JSON Table。
 */
function renderVideoDashboard(
    container,
    ig_id,
    media_id,
    csv,
    json,
    jsonError = null,
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
    const logs = hasJson
        ? json.low_inference_observations.perceptual_narrative_logs
        : null;

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
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.visual_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Audio Narrative</span>
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.audio_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Text Narrative</span>
                                <p class="text-slate-200 leading-relaxed pl-3 border-l border-slate-800">${logs.text_narrative_log}</p>
                            </div>
                            <div class="group">
                                <span class="text-slate-500 block text-[10px] uppercase tracking-widest mb-1">Main Purpose</span>
                                <p class="text-blue-200/80 italic bg-blue-900/10 p-2 rounded border border-blue-900/20">${json.high_inference_interpretations.narrative_and_purpose.mainPurpose}</p>
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
