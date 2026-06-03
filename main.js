// main.js
import { APP_CONFIG } from "./config.js";
import { renderClusterView } from "./cluster.js";

document.addEventListener("DOMContentLoaded", async () => {
    const typeSelector = document.getElementById("type-selector");
    const expSelector  = document.getElementById("exp-selector");

    // Populate type selector
    APP_CONFIG.MODES.forEach((mode) => {
        const opt = document.createElement("option");
        opt.value = mode.key;
        opt.innerText = mode.label;
        typeSelector.appendChild(opt);
    });

    // Load experiment manifest and populate exp selector
    try {
        const manifest = await fetch(APP_CONFIG.DATA_PATHS.manifest).then((r) => r.json());
        manifest.experiments.forEach((exp) => {
            const opt = document.createElement("option");
            opt.value = exp.id;
            opt.innerText = exp.label;
            expSelector.appendChild(opt);
        });
        if (manifest.default) expSelector.value = manifest.default;
    } catch (e) {
        console.warn("Could not load manifest:", e);
        const opt = document.createElement("option");
        opt.value = "";
        opt.innerText = "No experiments";
        expSelector.appendChild(opt);
    }

    const render = () => renderClusterView(typeSelector.value, expSelector.value);

    typeSelector.addEventListener("change", render);
    expSelector.addEventListener("change", render);

    render();
});
