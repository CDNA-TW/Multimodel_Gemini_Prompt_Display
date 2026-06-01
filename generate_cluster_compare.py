"""
Generate data/lasso/cluster_compare_{type}.json from json_description + lasso cluster CSVs.
"""

import json, glob, os, pandas as pd, numpy as np
from collections import Counter

DATA_DIR = "./data"
LASSO_DIR = "./data/lasso"

# ── 1. Build media_id-last-segment → video data map ──────────────────────────
def last_seg(s):
    return str(s).split("-")[-1].replace(".mp4", "").strip()

media_map = {}
for f in glob.glob(f"{DATA_DIR}/json_description/*.json"):
    with open(f, encoding="utf-8") as fp:
        d = json.load(fp)
    for key, val in d.items():
        if isinstance(val, dict):
            lid = last_seg(val.get("videoName", key))
            media_map[lid] = val

print(f"media_map: {len(media_map)} videos")

# ── 2. Aggregation helpers ────────────────────────────────────────────────────
def agg_numeric(vals):
    arr = [v for v in vals if isinstance(v, (int, float)) and v is not None]
    if not arr:
        return None
    return {
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "mean": round(float(np.mean(arr)), 2),
        "avg": round(float(np.mean(arr)), 2),
        "std": round(float(np.std(arr)), 2),
    }

def agg_categorical(vals):
    counts = Counter()
    for v in vals:
        if v is None:
            continue
        if isinstance(v, list):
            for item in v:
                if item:
                    counts[str(item)] += 1
        elif isinstance(v, bool):
            counts[str(v)] += 1
        else:
            counts[str(v)] += 1
    return dict(counts.most_common(20))

def is_scale_int(vals):
    """Treat as numeric if all non-null values are integers in 0-100 range."""
    nums = [v for v in vals if isinstance(v, (int, float)) and not isinstance(v, bool)]
    return len(nums) > len(vals) * 0.5

def aggregate_section(videos_data, section_path):
    """
    section_path: e.g. "low_inference.audio_base.vocal_census"
    Returns aggregated dict for all fields in that section.
    """
    # Collect per-field values across all videos
    parts = section_path.split(".")
    samples = []
    for vd in videos_data:
        node = vd
        for p in parts:
            if isinstance(node, dict):
                node = node.get(p)
            else:
                node = None
                break
        if isinstance(node, dict):
            samples.append(node)

    if not samples:
        return {}

    # Get all field keys from first sample
    all_keys = set()
    for s in samples:
        all_keys.update(s.keys())

    result = {}
    for key in all_keys:
        vals = [s.get(key) for s in samples if key in s]
        if not vals:
            continue
        if is_scale_int(vals):
            agg = agg_numeric(vals)
            if agg:
                result[key] = agg
        else:
            result[key] = agg_categorical(vals)
    return result


# ── 3. Generate per-type JSONs ────────────────────────────────────────────────
SECTIONS = {
    "basic_metadata": "low_inference_observations.basic_metadata",
    "temporal_pacing": "low_inference_observations.temporal_pacing_summary",
    "visual_human_presence": "low_inference_observations.visual_human_presence",
    "visual_scene_and_style": "low_inference_observations.visual_scene_and_style",
    "visual_objects_and_brands": "low_inference_observations.visual_objects_and_brands",
    "audio_production_style": "low_inference_observations.audio_production_style",
    "audio_vocal": "low_inference_observations.audio_vocal_characterization.vocal_qualities",
    "audio_music": "low_inference_observations.audio_music_and_environment",
}

CONFIGS = {
    "audio": {
        "csv": f"{LASSO_DIR}/cluster_result_audio_HT0601.csv",
        "label_col": "audio_kmeans_lables",
        "out": f"{LASSO_DIR}/cluster_compare_audio.json",
    },
    "visual": {
        "csv": f"{LASSO_DIR}/cluster_result_visual_HT0601.csv",
        "label_col": "visual_kmeans_lables",
        "out": f"{LASSO_DIR}/cluster_compare_visual.json",
    },
}

for model_type, cfg in CONFIGS.items():
    print(f"\nProcessing {model_type}...")
    df = pd.read_csv(cfg["csv"])
    df["_lid"] = df["file"].apply(last_seg)

    output = {}
    for label in sorted(df[cfg["label_col"]].unique()):
        group_df = df[df[cfg["label_col"]] == label]
        video_data = [media_map[lid] for lid in group_df["_lid"] if lid in media_map]
        n_matched = len(video_data)
        n_total = len(group_df)
        print(f"  cluster {label}: {n_total} videos, {n_matched} matched")

        stats = {}
        for sec_name, sec_path in SECTIONS.items():
            agg = aggregate_section(video_data, sec_path)
            if agg:
                stats[sec_name] = agg

        output[f"cluster_{label}"] = {
            "metadata": {
                "cluster_label": str(label),
                "video_count": n_total,
                "matched_count": n_matched,
            },
            "statistics": stats,
        }

    with open(cfg["out"], "w", encoding="utf-8") as fp:
        json.dump(output, fp, ensure_ascii=False, indent=2)
    print(f"  → saved to {cfg['out']}")

print("\nDone.")
