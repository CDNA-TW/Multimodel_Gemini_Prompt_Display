import os
import json
import pandas as pd
import numpy as np
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk import pos_tag
import config_04 as cfg

# 第一次執行需下載 NLTK 必要模型
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('averaged_perceptron_tagger_eng')
nltk.download('stopwords')
nltk.download('punkt_tab')

# ==========================================
# 1. 參數配置區域
# ==========================================

# 目前正在分析的 type
model_type = "mix"

# 資料夾路徑

inputdir1 = r'./ignore/videos_output/@mvp_test/analysis'           # 原始影片描述 JSON 資料夾
inputdir2 = r'./output/mix_cluster_pca-umap-8.csv'  # Cluster 分群結果 CSV
outputpath = rf'./output/cluster_analysis_output_{model_type}'  # 輸出路徑



# ==========================================
# 2. 核心統計邏輯工具
# ==========================================

def get_nested_value(data, path):
    """根據路徑取得巢狀字典的值"""
    keys = path.split('.')
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key)
        else:
            return None
    return data

def english_nlp_processor(text):
    """英文斷詞處理器：保留名詞、形容詞、動詞"""
    if not text or not isinstance(text, str):
        return []
    
    stop_words = set(stopwords.words('english'))
    tokens = word_tokenize(text.lower())
    # 詞性標註
    tagged = pos_tag(tokens)
    
    # 篩選保留詞性：NN (名詞), JJ (形容詞), VB (動詞)
    allowed_postags = ['NN', 'NNS', 'NNP', 'NNPS', 'JJ', 'JJR', 'JJS', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']
    
    keywords = [
        word for word, tag in tagged 
        if word.isalpha() and word not in stop_words and any(tag.startswith(p) for p in ['NN', 'JJ', 'VB'])
    ]
    return keywords

def calculate_stats(val_list):
    """計算數值型統計"""
    if not val_list: return None
    arr = np.array(val_list)
    return {
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "mean": round(float(np.mean(arr)), 2),
        "avg": round(float(np.mean(arr)), 2),
        "std": round(float(np.std(arr)), 2)
    }

def process_recursive_stats(all_data, current_schema_node, current_path=""):
    """
    遞迴遍歷 JSON 結構並根據規則進行聚合
    all_data: 該 Cluster 下所有影片 JSON 的 List
    """
    results = {}
    
    # 使用第一個 JSON 作為結構模板
    template = all_data[0]
    
    for key, value in template.items():
        new_path = f"{current_path}.{key}" if current_path else key
        
        # 1. 處理排除欄位
        if new_path in cfg.EXCLUDE_FIELDS:
            continue
            
        # 2. 處理巢狀結構
        if isinstance(value, dict):
            # 深入下一層，過濾掉該路徑下所有影片的對應子集
            sub_data = [d.get(key) for d in all_data if d and d.get(key)]
            if sub_data:
                results[key] = process_recursive_stats(sub_data, value, new_path)
            continue

        # 3. 收集該欄位在所有影片中的值
        field_values = [d.get(key) for d in all_data if key in d and d.get(key) is not None]
        if not field_values:
            results[key] = None
            continue

        # 4. 判斷統計類別
        # A. 數值統計 (int, float)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            results[key] = calculate_stats(field_values)
            
        # B. NLP 斷詞計數
        elif new_path in cfg.NLP_FIELDS:
            words = []
            for text in field_values:
                words.extend(english_nlp_processor(text))
            results[key] = dict(Counter(words).most_common())
            
        # C. 計數統計 (Array, Boolean, String)
        else:
            counts = []
            for item in field_values:
                if isinstance(item, list): # 攤平陣列
                    counts.extend([str(i) for i in item])
                else:
                    counts.append(str(item))
            # 排序後的計數結果
            results[key] = dict(Counter(counts).most_common())
            
    return results

# ==========================================
# 3. 主執行流程
# ==========================================

import os
import json
import pandas as pd
import numpy as np
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk import pos_tag

# 引入配置檔
import config_04 as cfg

# 下載 NLTK 必要模型 (僅需執行一次)
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('stopwords')
nltk.download('punkt_tab')

# ... (保留上一版的 get_nested_value, english_nlp_processor, calculate_stats, process_recursive_stats 函式內容) ...

def main():
    if not os.path.exists(outputpath):
        os.makedirs(outputpath)

    # --- 修正點 1: 建立全局 JSON 路徑索引 (遞迴掃描子資料夾) ---
    print(f"正在掃描資料夾: {inputdir1} ...")
    json_path_map = {}
    for root, dirs, files in os.walk(inputdir1):
        for file in files:
            if file.endswith('.json'):
                # 取得不含附檔名的名稱作為 Key (例如: 2uncle987-xxxx)
                vid_name = os.path.splitext(file)[0]
                json_path_map[vid_name] = os.path.join(root, file)
    
    print(f"掃描完成！共找到 {len(json_path_map)} 個 JSON 檔案。")

    # 讀取 Cluster CSV
    df_cluster = pd.read_csv(inputdir2)
    cluster_groups = df_cluster.groupby('cluster_label')['videoName'].apply(list).to_dict()

    final_compare_json = {}
    comparison_rows = []

    for cluster_id, video_list in cluster_groups.items():
        print(f"正在處理 Cluster: {cluster_id} (樣本數: {len(video_list)})")
        
        cluster_jsons = []
        for vid in video_list:
            # --- 修正點 2: 從全局索引獲取檔案完整路徑 ---
            full_path = json_path_map.get(vid)
            if full_path and os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    try:
                        cluster_jsons.append(json.load(f))
                    except Exception as e:
                        print(f"JSON 讀取失敗: {vid}, Error: {e}")
        
        if not cluster_jsons:
            print(f"警告: Cluster {cluster_id} 找不到任何匹配的 JSON 檔案，跳過統計。")
            continue

        # 執行統計
        cluster_stats = process_recursive_stats(cluster_jsons, cluster_jsons[0])
        
        final_compare_json[f"cluster_{cluster_id}"] = {
            "metadata": {"cluster_label": str(cluster_id), "video_count": len(video_list)},
            "statistics": cluster_stats
        }

        # CSV 比較行 (範例)
        comparison_rows.append({
            "cluster_label": cluster_id,
            "sample_size": len(video_list),
            "avg_duration": get_nested_value(cluster_stats, "low_inference_observations.basic_metadata.videoDuration.avg"),
            "top_color": list(get_nested_value(cluster_stats, "low_inference_observations.visual_scene_and_style.colorTone").keys())[0:2] if get_nested_value(cluster_stats, "low_inference_observations.visual_scene_and_style.colorTone") else None
        })

    # --- 修正點 3: 修正 open 模式與編格報錯 ---
    output_filename = os.path.join(outputpath, f'cluster_compare_{model_type}.json')
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(final_compare_json, f, ensure_ascii=False, indent=2)

    pd.DataFrame(comparison_rows).to_csv(os.path.join(outputpath, f'cluster_comparison_{model_type}.csv'), index=False, encoding='utf-8-sig')

    print(f"分析完成！結果已儲存至 {outputpath}")

if __name__ == "__main__":
    main()

