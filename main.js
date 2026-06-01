// main.js
import { APP_CONFIG } from "./config.js";
import { renderClusterView } from "./cluster.js";

document.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("type-selector");

    APP_CONFIG.MODES.forEach((mode) => {
        const opt = document.createElement("option");
        opt.value = mode.key;
        opt.innerText = mode.label;
        selector.appendChild(opt);
    });

    selector.addEventListener("change", () => {
        renderClusterView(selector.value);
    });

    renderClusterView(selector.value);
});
