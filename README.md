# Multimodal Cluster Analysis Dashboard

互動式分群分析結果展示頁面，支援多個實驗結果切換。

---

## 本地預覽

```bash
python3 -m http.server 8000
# 瀏覽器開啟 http://localhost:8000
```

> 必須透過 HTTP server 開啟，不能直接雙擊 `index.html`（ES module 限制）

---

## 新增實驗結果

### 所需資料（4 種）

| 檔案 | 說明 | 範例檔名 |
|------|------|----------|
| **cluster_result CSV** | 每部影片的分群結果，每種 type (audio/visual) 一份 | `cluster_result_visual_HT0601.csv` |
| **lasso xlsx** | Lasso 特徵選取結果，包含 audio/visual 兩個 sheet | `lasso_optuna_result_260601.xlsx` |
| **group_name xlsx** | 每個 group 的 GPT/Gemini 命名與描述 | `group_name_visual_HT_20260601.xlsx` |
| **wordcloud 圖片** | KeyBERT 和 TF-IDF 文字雲，每個 cluster 各一張 | `*keybert*cluster_0.png`, `*tfidf*cluster_0.png` |

#### cluster_result CSV 欄位需求

| 欄位名稱 | 說明 |
|----------|------|
| `file` | 影片檔名，格式：`{ig_id}-{datetime}-{video_id}` |
| `id` | 創作者 ig_id |
| `audio_kmeans_lables` | audio 分群編號（audio CSV 用） |
| `visual_kmeans_lables` | visual 分群編號（visual CSV 用） |

#### lasso xlsx 欄位需求（每個 sheet）

| 欄位名稱 | 說明 |
|----------|------|
| `cluster` | 群組編號 |
| `pos_1` ~ `pos_5` | 正向特徵（含係數，例如 `videoGenre=tech review (+0.967)`） |
| `neg_1` ~ `neg_5` | 負向特徵 |

#### group_name xlsx 欄位需求

| 欄位名稱 | 說明 |
|----------|------|
| `group_label` | 群組編號 |
| `group_name-GPT` | GPT 命名 |
| `group_des-GPT` | GPT 描述 |
| `group_name-Gemini` | Gemini 命名 |
| `group_des-Gemini` | Gemini 描述 |

---

### 執行步驟

#### 1. 確認 `data/json_description/` 已有影片分析資料

每個 influencer 一個 JSON 檔案，key 為影片 ID 末段數字，value 包含 `low_inference_observations` 等分析結果：

```
data/json_description/
├── yga0721.json
├── cocowine0205.json
└── ...
```

若要從原始 per-video JSON 重新產生，可執行：

```bash
# 將 mvp_test_v07 裡的個別影片 JSON 合併成 per-influencer 檔案
python3 - << 'EOF'
import json, glob, os

SRC = '/path/to/mvp_test_v07'   # 修改為實際路徑
DST = './data/json_description'

for ig_dir in sorted(os.listdir(SRC)):
    full_dir = os.path.join(SRC, ig_dir)
    if not os.path.isdir(full_dir): continue
    merged = {}
    for jf in glob.glob(os.path.join(full_dir, '*.json')):
        last_id = os.path.basename(jf).replace('.json','').split('-')[-1]
        with open(jf, encoding='utf-8') as fp:
            merged[last_id] = json.load(fp)
    with open(os.path.join(DST, f'{ig_dir}.json'), 'w', encoding='utf-8') as fp:
        json.dump(merged, fp, ensure_ascii=False)
    print(f'{ig_dir}: {len(merged)} videos')
EOF
```

#### 2. 執行 setup_experiment.py

```bash
python3 setup_experiment.py \
    --name  HT0601 \
    --label "HT 2026-06-01" \
    --visual_csv  path/to/cluster_result_visual_HT0601.csv \
    --audio_csv   path/to/cluster_result_audio_HT0601.csv \
    --lasso       path/to/lasso_optuna_result_260601.xlsx \
    --group_name_visual path/to/group_name_visual_HT_20260601.xlsx \
    --wordcloud_dir     path/to/wordcloud/
```

> 只有 visual 時可省略 `--audio_csv`，反之亦然

腳本會自動：
- 產生 `data/experiments/{name}/lasso_features.json`
- 產生 `data/experiments/{name}/{type}/cluster_compare.json`（統計每個 group 的 feature 分布）
- 產生 `data/experiments/{name}/{type}/group_names.json`
- 複製 wordcloud 圖片並重新命名為 `keybert_cluster_{n}.png` / `tfidf_cluster_{n}.png`
- 更新 `data/experiments/manifest.json`

#### 3. 重新整理頁面

```bash
python3 -m http.server 8000
```

瀏覽器重整後，右上角 **Exp** 選單會出現新增的實驗。

---

## 資料夾結構

```
.
├── index.html
├── main.js
├── cluster.js
├── config.js
├── style.css
├── setup_experiment.py          # 新增實驗用的主腳本
├── data/
│   ├── ownerid_mapping.csv      # ig_id → person_name 對照表
│   ├── json_description/        # per-influencer 合併 JSON（generate 用）
│   │   ├── yga0721.json
│   │   └── ...
│   └── experiments/
│       ├── manifest.json        # 實驗清單（UI 自動讀取）
│       └── HT0601/
│           ├── lasso_features.json
│           ├── audio/
│           │   ├── cluster_result.csv
│           │   ├── cluster_compare.json
│           │   └── wordcloud/
│           │       ├── keybert_cluster_0.png
│           │       └── ...
│           └── visual/
│               ├── cluster_result.csv
│               ├── cluster_compare.json
│               ├── group_names.json
│               └── wordcloud/
│                   ├── keybert_cluster_0.png
│                   └── ...
```

---

## GitHub Pages

網址：https://CDNA-TW.github.io/Multimodel_Gemini_Prompt_Display/
