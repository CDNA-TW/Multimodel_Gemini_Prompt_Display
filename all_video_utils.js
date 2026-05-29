/**
 * 清除 CSV header 可能出現的 BOM、引號與空白。
 */
export function cleanHeader(header) {
    return String(header || "")
        .replace(/^[\uFEFF\xEF\xBB\xBF]+/, "")
        .replace(/^uFEFF/, "")
        .trim()
        .replace(/"/g, "");
}

/**
 * 簡易 CSV row parser：保留原本專案使用的正則切法，處理欄位內逗號。
 */
export function splitCsvRow(row) {
    return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
}

/**
 * 讓出主執行緒給瀏覽器。
 *
 * 用於大量 CSV parsing 時，避免長時間卡住 UI，
 * 讓使用者仍然可以點擊下方手風琴。
 */
export function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 等第一畫面真正 paint 出來後，再開始背景處理大型 CSV。
 * 這可以避免「手風琴剛出現但點不動」的感覺。
 */
export function runAfterFirstPaint(callback) {
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
 * CSS selector escape。
 */
export function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(String(value));
    }
    return String(value).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
}
