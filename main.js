// main.js
import { APP_CONFIG } from "./config.js";
import { renderClusterView } from "./cluster.js";
import { renderFeaturesView } from "./cluster_text.js";
import { renderVideoView } from "./all_video.js"; // 新增載入

document.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("type-selector");
    const navCluster = document.getElementById("nav-cluster");
    const navFeatures = document.getElementById("nav-features");
    const navVideo = document.getElementById("nav-video");

    let currentView = "video";

    /**
     * 初始化 Type 下拉選單。
     * 注意：這件事只能做一次，不可以放在 refreshContent() 裡。
     */
    function initTypeSelector() {
        selector.innerHTML = "";

        APP_CONFIG.MODES.forEach((mode) => {
            const opt = document.createElement("option");
            opt.value = mode.key;
            opt.innerText = mode.label;
            selector.appendChild(opt);
        });
    }

    /**
     * 更新上方頁籤按鈕樣式。
     */
    function updateNavUI() {
        [navCluster, navFeatures, navVideo].forEach((btn) => {
            btn.classList.remove("bg-blue-600", "text-white", "shadow-lg");
            btn.classList.add("text-slate-400");
        });

        const activeBtn = document.getElementById(`nav-${currentView}`);
        if (activeBtn) {
            activeBtn.classList.add("bg-blue-600", "text-white", "shadow-lg");
            activeBtn.classList.remove("text-slate-400");
        }
    }

    /**
     * 只負責依照目前狀態渲染內容。
     * 不在這裡初始化 option，也不在這裡綁定事件，避免重複綁定造成效能問題。
     */
    function refreshContent() {
        const type = selector.value;

        if (currentView === "cluster") {
            renderClusterView(type);
        } else if (currentView === "features") {
            renderFeaturesView(type);
        } else if (currentView === "video") {
            renderVideoView();
        }
    }

    /**
     * 初始化所有事件。
     * 注意：事件只綁定一次。
     */
    function bindGlobalEvents() {
        selector.addEventListener("change", () => {
            refreshContent();
        });

        navCluster.addEventListener("click", () => {
            if (currentView === "cluster") return;
            currentView = "cluster";
            updateNavUI();
            refreshContent();
        });

        navFeatures.addEventListener("click", () => {
            if (currentView === "features") return;
            currentView = "features";
            updateNavUI();
            refreshContent();
        });

        navVideo.addEventListener("click", () => {
            if (currentView === "video") return;
            currentView = "video";
            updateNavUI();
            refreshContent();
        });
    }

    initTypeSelector();
    bindGlobalEvents();
    updateNavUI();
    refreshContent();
});
