#!/usr/bin/env python3
"""
Setup a new clustering experiment for the UI.

Usage:
    python3 setup_experiment.py \
        --name HT0601 \
        --label "HT 2026-06-01" \
        --visual_csv path/to/cluster_result_visual.csv \
        --audio_csv  path/to/cluster_result_audio.csv \
        --lasso      path/to/lasso_optuna_result.xlsx \
        --group_name_visual path/to/group_name_visual.xlsx \
        --wordcloud_dir     path/to/wordcloud/ \
        [--json_desc ./data/json_description]   # default
        [--output_base ./data/experiments]       # default
"""

import argparse, json, glob, os, shutil, re
import numpy as np
import pandas as pd
from collections import Counter


# ── Helpers ───────────────────────────────────────────────────────────────────

def last_seg(s):
    return str(s).split("-")[-1].replace(".mp4", "").strip()


def agg_numeric(vals):
    arr = [v for v in vals if isinstance(v, (int, float)) and v is not None]
    if not arr:
        return None
    return {
        "min":  float(np.min(arr)),
        "max":  float(np.max(arr)),
        "mean": round(float(np.mean(arr)), 2),
        "avg":  round(float(np.mean(arr)), 2),
        "std":  round(float(np.std(arr)), 2),
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
        else:
            counts[str(v)] += 1
    return dict(counts.most_common(20))


def is_scale_int(vals):
    nums = [v for v in vals if isinstance(v, (int, float)) and not isinstance(v, bool)]
    return len(nums) > len(vals) * 0.5


def aggregate_section(videos_data, section_path):
    parts = section_path.split(".")
    samples = []
    for vd in videos_data:
        node = vd
        for p in parts:
            node = node.get(p) if isinstance(node, dict) else None
        if isinstance(node, dict):
            samples.append(node)
    if not samples:
        return {}
    all_keys = {k for s in samples for k in s}
    result = {}
    for key in all_keys:
        vals = [s[key] for s in samples if key in s]
        if not vals:
            continue
        result[key] = agg_numeric(vals) if is_scale_int(vals) else agg_categorical(vals)
    return {k: v for k, v in result.items() if v is not None}


SECTIONS = {
    "basic_metadata":          "low_inference_observations.basic_metadata",
    "temporal_pacing":         "low_inference_observations.temporal_pacing_summary",
    "visual_human_presence":   "low_inference_observations.visual_human_presence",
    "visual_scene_and_style":  "low_inference_observations.visual_scene_and_style",
    "visual_objects_and_brands": "low_inference_observations.visual_objects_and_brands",
    "audio_production_style":  "low_inference_observations.audio_production_style",
    "audio_vocal":             "low_inference_observations.audio_vocal_characterization.vocal_qualities",
    "audio_music":             "low_inference_observations.audio_music_and_environment",
}


# ── Core converters ───────────────────────────────────────────────────────────

def build_media_map(json_desc_dir):
    media_map = {}
    for f in glob.glob(os.path.join(json_desc_dir, "*.json")):
        with open(f, encoding="utf-8") as fp:
            d = json.load(fp)
        for key, val in d.items():
            if isinstance(val, dict):
                lid = last_seg(val.get("videoName", key))
                media_map[lid] = val
    return media_map


def generate_cluster_compare(csv_path, label_col, media_map):
    df = pd.read_csv(csv_path)
    df["_lid"] = df["file"].apply(last_seg)
    output = {}
    for label in sorted(df[label_col].unique()):
        group_df = df[df[label_col] == label]
        videos = [media_map[lid] for lid in group_df["_lid"] if lid in media_map]
        n_total, n_matched = len(group_df), len(videos)
        print(f"    cluster {label}: {n_total} videos, {n_matched} matched")
        stats = {k: v for k, v in
                 ((k, aggregate_section(videos, p)) for k, p in SECTIONS.items()) if v}
        output[f"cluster_{label}"] = {
            "metadata": {"cluster_label": str(label),
                         "video_count": n_total, "matched_count": n_matched},
            "statistics": stats,
        }
    return output


def convert_lasso_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path)
    result = {}
    for sheet in wb.sheetnames:
        ws = wb[sheet]
        headers = [c.value for c in ws[1]]
        result[sheet] = {}
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[0] is None:
                continue
            d = dict(zip(headers, row))
            cid = str(d["cluster"])
            result[sheet][cid] = {
                "pos": [d.get(f"pos_{i}") for i in range(1, 6) if d.get(f"pos_{i}")],
                "neg": [d.get(f"neg_{i}") for i in range(1, 6) if d.get(f"neg_{i}")],
            }
    return result


def convert_group_name_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    result = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        d = dict(zip(headers, row))
        label = str(d["group_label"])
        result[label] = {
            "group_name_GPT":    d.get("group_name-GPT") or "",
            "group_des_GPT":     d.get("group_des-GPT") or "",
            "group_name_Gemini": d.get("group_name-Gemini") or "",
            "group_des_Gemini":  d.get("group_des-Gemini") or "",
        }
    return result


def copy_wordcloud(wc_dir, dest_dir):
    """
    Detect keybert / tfidf PNGs by regex, copy to dest_dir as
    keybert_cluster_{n}.png / tfidf_cluster_{n}.png
    """
    os.makedirs(dest_dir, exist_ok=True)
    copied = 0
    for f in glob.glob(os.path.join(wc_dir, "*.png")):
        fname = os.path.basename(f).lower()
        for method in ("keybert", "tfidf"):
            if method in fname:
                m = re.search(r"cluster[_\-]?(\d+)", fname)
                if m:
                    dst = os.path.join(dest_dir, f"{method}_cluster_{m.group(1)}.png")
                    shutil.copy2(f, dst)
                    copied += 1
    return copied


def update_manifest(manifest_path, exp_id, label, types):
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as fp:
            manifest = json.load(fp)
    else:
        manifest = {"experiments": [], "default": exp_id}

    existing = next((e for e in manifest["experiments"] if e["id"] == exp_id), None)
    if existing:
        existing["label"] = label
        existing["types"] = types
    else:
        manifest["experiments"].append({"id": exp_id, "label": label, "types": types})

    if not manifest.get("default"):
        manifest["default"] = exp_id

    with open(manifest_path, "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=2)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Setup clustering experiment for UI")
    parser.add_argument("--name",   required=True, help="Experiment ID, e.g. HT0601")
    parser.add_argument("--label",  default=None,  help='Display label, e.g. "HT 2026-06-01"')
    parser.add_argument("--visual_csv",        default=None)
    parser.add_argument("--audio_csv",         default=None)
    parser.add_argument("--lasso",             default=None, help="lasso_optuna_result.xlsx")
    parser.add_argument("--group_name_visual", default=None)
    parser.add_argument("--group_name_audio",  default=None)
    parser.add_argument("--wordcloud_dir",     default=None)
    parser.add_argument("--json_desc",   default="./data/json_description")
    parser.add_argument("--output_base", default="./data/experiments")
    args = parser.parse_args()

    exp_id   = args.name
    label    = args.label or exp_id
    exp_dir  = os.path.join(args.output_base, exp_id)
    os.makedirs(exp_dir, exist_ok=True)

    # Build media map
    print(f"Loading json_description from {args.json_desc} ...")
    media_map = build_media_map(args.json_desc)
    print(f"  {len(media_map)} videos loaded")

    # Convert lasso xlsx → shared lasso_features.json
    if args.lasso:
        print(f"\nConverting lasso xlsx: {args.lasso}")
        lasso_data = convert_lasso_xlsx(args.lasso)
        out = os.path.join(exp_dir, "lasso_features.json")
        with open(out, "w", encoding="utf-8") as fp:
            json.dump(lasso_data, fp, ensure_ascii=False, indent=2)
        print(f"  → {out}")

    # Process each type
    type_cfgs = []
    if args.visual_csv:
        type_cfgs.append(("visual", args.visual_csv, "visual_kmeans_lables", args.group_name_visual))
    if args.audio_csv:
        type_cfgs.append(("audio",  args.audio_csv,  "audio_kmeans_lables",  args.group_name_audio))

    available_types = []
    for type_name, csv_path, label_col, group_name_path in type_cfgs:
        print(f"\nProcessing {type_name} ...")
        type_dir = os.path.join(exp_dir, type_name)
        os.makedirs(type_dir, exist_ok=True)

        # Copy cluster CSV
        dst = os.path.join(type_dir, "cluster_result.csv")
        shutil.copy2(csv_path, dst)
        print(f"  Copied cluster CSV → {dst}")

        # Generate cluster_compare.json
        print(f"  Generating cluster_compare.json ...")
        compare = generate_cluster_compare(csv_path, label_col, media_map)
        out = os.path.join(type_dir, "cluster_compare.json")
        with open(out, "w", encoding="utf-8") as fp:
            json.dump(compare, fp, ensure_ascii=False, indent=2)
        print(f"  → {out}")

        # Convert group_name xlsx
        if group_name_path:
            group_names = convert_group_name_xlsx(group_name_path)
            out = os.path.join(type_dir, "group_names.json")
            with open(out, "w", encoding="utf-8") as fp:
                json.dump(group_names, fp, ensure_ascii=False, indent=2)
            print(f"  → group_names: {out}")

        # Copy wordcloud images
        if args.wordcloud_dir:
            wc_dest = os.path.join(type_dir, "wordcloud")
            n = copy_wordcloud(args.wordcloud_dir, wc_dest)
            print(f"  → wordcloud: {n} images → {wc_dest}")

        available_types.append(type_name)

    # Update manifest
    manifest_path = os.path.join(args.output_base, "manifest.json")
    update_manifest(manifest_path, exp_id, label, available_types)
    print(f"\n✓ Manifest updated: {manifest_path}")
    print(f"✓ Experiment '{exp_id}' ready at {exp_dir}")
    print(f"  Types: {available_types}")


if __name__ == "__main__":
    main()
