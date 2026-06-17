import json, os, glob, pickle
from typing import Any, Dict, List
from utils.FEATURE_FORMAT_TABLE import FEATURE_FORMAT_TABLE_v20
FEATURE_FORMAT_TABLE = FEATURE_FORMAT_TABLE_v20
def safe_list(v):
    if v is None: return []
    if isinstance(v, list): return [str(x).strip().lower() for x in v if x and str(x).strip().lower() != 'none']
    s = str(v).strip().lower()
    return [s] if s != 'none' else []

def get_by_path(d: Dict[str, Any], path: str, default=None):
    """
    根據 'a.b.c' 形式的 path 從 nested dict 取值。
    若中途不存在，回傳 default。
    """
    cur = d
    for key in path.split("."):
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key, default)
        if cur is default:
            return default
    return cur

def cast_value(value, feature_type: str, default=None):
    """
    根據欄位型別轉換資料。
    """
    if feature_type == "numerical":
        if value is None:
            return default if default is not None else 0
        try:
            return float(value)
        except (ValueError, TypeError):
            return default if default is not None else 0

    elif feature_type == "boolean":
        return int(bool(value))

    elif feature_type == "single_cat":
        if value is None or str(value).strip() == "":
            return default if default is not None else "Unknown"
        return str(value).strip()

    elif feature_type == "multi_label":
        return safe_list(value)

    else:
        return value

def build_feature_type_index(format_table=FEATURE_FORMAT_TABLE):
    numerical_cols = []
    boolean_cols = []
    single_cat_cols = []
    multi_label_cols = []
    for spec in format_table:
        feature_type = spec["type"]
        if feature_type == "numerical":
            numerical_cols.append(spec['name'])
        elif feature_type == "boolean":
            boolean_cols.append(spec['name'])
        elif feature_type == "single_cat":
            single_cat_cols.append(spec['name'])
        elif feature_type == "multi_label":
            multi_label_cols.append(spec['name'])
    feature_type_index = {
        'numerical_cols': numerical_cols,
        'boolean_cols': boolean_cols,
        'single_cat_cols': single_cat_cols,
        'multi_label_cols': multi_label_cols
    }
    return feature_type_index

def build_source_feature_index(format_table=FEATURE_FORMAT_TABLE):
    #_AUDIO_NUMERICAL
    a_numerical_cols = []
    a_boolean_cols = []
    a_single_cat_cols = []
    a_multi_label_cols = []

    v_numerical_cols = []
    v_boolean_cols = []
    v_single_cat_cols = []
    v_multi_label_cols = []
    
    s_numerical_cols = []
    s_boolean_cols = []
    s_single_cat_cols = []
    s_multi_label_cols = []


    for spec in format_table:
        modality = spec["modality"]
        feature_type = spec["type"]
        if modality == 'audio':
            if feature_type == "numerical":
                a_numerical_cols.append(spec['name'])
            elif feature_type == "boolean":
                a_boolean_cols.append(spec['name'])
            elif feature_type == "single_cat":
                a_single_cat_cols.append(spec['name'])
            elif feature_type == "multi_label":
                a_multi_label_cols.append(spec['name'])
        elif modality == 'visual':
            if feature_type == "numerical":
                v_numerical_cols.append(spec['name'])
            elif feature_type == "boolean":
                v_boolean_cols.append(spec['name'])
            elif feature_type == "single_cat":
                v_single_cat_cols.append(spec['name'])
            elif feature_type == "multi_label":
                v_multi_label_cols.append(spec['name'])
        elif modality == 'shared':
            if feature_type == "numerical":
                s_numerical_cols.append(spec['name'])
            elif feature_type == "boolean":
                s_boolean_cols.append(spec['name'])
            elif feature_type == "single_cat":
                s_single_cat_cols.append(spec['name'])
            elif feature_type == "multi_label":
                s_multi_label_cols.append(spec['name'])

    source_feature_inde = {
        '_AUDIO_NUMERICAL': a_numerical_cols,
        '_AUDIO_BOOLEAN': a_boolean_cols,
        '_AUDIO_SINGLE': a_single_cat_cols,
        '_AUDIO_MULTI': a_multi_label_cols,

        '_VISUAL_NUMERICAL': v_numerical_cols,
        '_VISUAL_BOOLEAN': v_boolean_cols,
        '_VISUAL_SINGLE': v_single_cat_cols,
        '_VISUAL_MULTI': v_multi_label_cols,

        '_SHARED_NUMERICAL': s_numerical_cols,
        '_SHARED_BOOLEAN': s_boolean_cols,
        '_SHARED_SINGLE': s_single_cat_cols,
        '_SHARED_MULTI': s_multi_label_cols,
    }
    return source_feature_inde


def parse_record(path: str, format_table=FEATURE_FORMAT_TABLE):
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)

    video_id = os.path.splitext(os.path.basename(path))[0]

    record = {
        "video_id": video_id
    }

    for spec in format_table:
        name = spec["name"]
        json_path = spec["path"]
        feature_type = spec["type"]
        default = spec.get("default")

        raw_value = get_by_path(d, json_path, default)
        record[name] = cast_value(raw_value, feature_type, default)

    return record

def main():
    test_path = f'F:/test_cluster/clear_test/v20_data/mvp_test_v20/yga0721/yga0721-20250213170746-908739578298355.json'
    record = parse_record(test_path)
    for key in record.keys():
        print(key,':',record[key], 'type:',type(record[key]))
    print(build_feature_type_index())
    print(build_source_feature_index())
    
if __name__ == '__main__':
    main()