import argparse, json, os, glob
import numpy as np
import pandas as pd
from utils.FEATURE_FORMAT_TABLE import FEATURE_FORMAT_TABLE_v7, FEATURE_FORMAT_TABLE_v20
from utils.parse_record import parse_record, build_feature_type_index, build_source_feature_index
from sklearn.preprocessing import LabelBinarizer, MultiLabelBinarizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


# ── Functions ─────────────────────────────────────────────────────────────────
def load_labels_csv(path):
    """Load cluster labels from CSV.

    Supports:
      old  — file/id, {type}_kmeans_lables  (integer labels)
      new  — file_id, label_id              (integer labels)
      new  — file_id, label                 (string labels, encoded to int)
    """
    df = pd.read_csv(path)

    # Detect id column
    for candidate in ('file_id', 'file', 'id'):
        if candidate in df.columns:
            id_col = candidate
            break
    else:
        raise ValueError(f'No id column found. Columns: {list(df.columns)}')

    # Detect label column: prefer *_kmeans_lables, then label_id, then label
    kmeans_cols = [c for c in df.columns if c.endswith('kmeans_lables') or c.endswith('kmeans_labels')]
    if kmeans_cols:
        label_col = kmeans_cols[0]
    elif 'label_id' in df.columns:
        label_col = 'label_id'
    elif 'label' in df.columns:
        label_col = 'label'
    else:
        raise ValueError(f'No label column found. Columns: {list(df.columns)}')

    labels = df[label_col]
    if not pd.api.types.is_numeric_dtype(labels):
        labels = labels.astype('category').cat.codes
    return dict(zip(df[id_col], labels.astype(int)))


def load_json_df(base, FEATURE_FORMAT_TABLE):
    files = glob.glob(os.path.join(base, '*', '*.json'))
    records = []
    for f in files:
        try:
            records.append(parse_record(f, FEATURE_FORMAT_TABLE))
        except Exception as e:
            print(f'Error: {os.path.basename(f)}: {e}')
    df = pd.DataFrame(records)
    print(f'Loaded {len(df)} records')
    return df


def build_feature_matrix(df, num_cols, bool_cols, single_cols, multi_cols):
    feat_parts = []
    feat_names = []

    feat_parts.append(df[num_cols].fillna(0).values.astype(float))
    feat_names.extend(num_cols)

    feat_parts.append(df[bool_cols].fillna(0).values.astype(float))
    feat_names.extend(bool_cols)

    for col in single_cols:
        vals = df[col].fillna('Unknown').astype(str).values
        counts = pd.Series(vals).value_counts()
        if len(counts) > 30:
            top = counts.index[:29].tolist()
            vals = np.where(np.isin(vals, top), vals, 'Other')
        lb = LabelBinarizer()
        enc = lb.fit_transform(vals)
        if enc.shape[1] == 1:
            feat_parts.append(enc)
            feat_names.append(f'{col}={lb.classes_[1]}')
        else:
            feat_parts.append(enc)
            feat_names.extend([f'{col}={c}' for c in lb.classes_])

    for col in multi_cols:
        lists = df[col].tolist()
        mlb = MultiLabelBinarizer()
        enc = mlb.fit_transform(lists)
        keep = enc.sum(axis=0) >= 5
        enc  = enc[:, keep]
        classes = np.array(mlb.classes_)[keep]
        feat_parts.append(enc)
        feat_names.extend([f'{col}={c}' for c in classes])

    return np.hstack(feat_parts).astype(float), np.array(feat_names)


def run_lasso(X, y, feature_names, mode_name, top_n=15):
    print(f'\nFitting {mode_name} ...', flush=True)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    base = LogisticRegression(penalty='l1', solver='liblinear', C=0.3,
                               max_iter=1000, random_state=42)
    model = OneVsRestClassifier(base)
    model.fit(Xs, y)
    classes = np.unique(y)
    print(f'\n{"="*65}')
    print(f'{mode_name} — {len(classes)} clusters')
    print(f'{"="*65}')
    results = {}
    n_videos_map = {}
    for i, cls in enumerate(classes):
        coefs = model.estimators_[i].coef_[0]
        nonzero_idx = np.where(coefs != 0)[0]
        order = nonzero_idx[np.argsort(np.abs(coefs[nonzero_idx]))[::-1]]
        nv = int((y == cls).sum())
        n_videos_map[int(cls)] = nv
        print(f'\n  Cluster {cls}  ({nv} videos)  —  {len(nonzero_idx)} non-zero features')
        rows = [{'feature': feature_names[idx], 'coef': round(float(coefs[idx]), 4)}
                for idx in order[:top_n]]
        tdf = pd.DataFrame(rows)
        print(tdf.to_string(index=False))
        results[int(cls)] = tdf
    return results, n_videos_map


def build_summary_df(results, n_videos_map, total_videos):
    k = len(results)
    out_rows = []
    for cls in sorted(results.keys()):
        tdf = results[cls]
        nv = n_videos_map[cls]
        pos = tdf[tdf['coef'] > 0].nlargest(5, 'coef')
        neg = tdf[tdf['coef'] < 0].nsmallest(5, 'coef')
        row = {'k': k, 'cluster': cls, 'n_videos': nv,
               'pct': f'{nv / total_videos * 100:.1f}%'}
        for i, (_, r) in enumerate(pos.iterrows(), 1):
            row[f'pos_{i}'] = f"{r['feature']} (+{r['coef']:.3f})"
        for i in range(len(pos) + 1, 6):
            row[f'pos_{i}'] = None
        for i, (_, r) in enumerate(neg.iterrows(), 1):
            row[f'neg_{i}'] = f"{r['feature']} ({r['coef']:.3f})"
        for i in range(len(neg) + 1, 6):
            row[f'neg_{i}'] = None
        out_rows.append(row)
    return pd.DataFrame(out_rows)


# ── Helpers ───────────────────────────────────────────────────────────────────
_MODALITY_SETS = {
    'audio-only':   {'audio'},
    'audio-shared': {'audio', 'shared'},
    'visual-only':  {'visual'},
    'visual-shared': {'visual', 'shared'},
}

def filter_table_by_modality(table, mode):
    keep = _MODALITY_SETS[mode]
    return [e for e in table if e['modality'] in keep]


# ── Entry point ───────────────────────────────────────────────────────────────
def run_lasso_cluster_analysis(base, out_dir, FEATURE_FORMAT_TABLE,
                                label_csv_path=None,
                                feature_modality='audio-shared'):
    feature_type_matrix = build_feature_type_index(FEATURE_FORMAT_TABLE)

    labels = load_labels_csv(label_csv_path)

    df    = load_json_df(base, FEATURE_FORMAT_TABLE)
    total = len(df)

    X, feat_names = build_feature_matrix(
        df, feature_type_matrix['numerical_cols'], feature_type_matrix['boolean_cols'],
        feature_type_matrix['single_cat_cols'], feature_type_matrix['multi_label_cols'])
    print(f'Feature matrix: {X.shape}')

    df['label'] = df['video_id'].map(labels)
    mask = df['label'].notna()
    print(f'Videos with label: {mask.sum()}')
    if mask.sum() == 0:
        print('  [ERROR] No video IDs matched. Sample video_ids from JSON:')
        print('  ', df['video_id'].head(5).tolist())
        print('  Sample keys from CSV:')
        print('  ', list(labels.keys())[:5])
        return
    idx = np.where(mask.values)[0]
    y   = df.loc[mask, 'label'].values.astype(int)
    k   = len(np.unique(y))

    results, n_videos_map = run_lasso(X[idx], y, feat_names,
                                      f'{feature_modality} clustering (k={k})')

    os.makedirs(out_dir, exist_ok=True)
    excel_path = os.path.join(out_dir, f'lasso_v20_{feature_modality}_result.xlsx')
    summary = build_summary_df(results, n_videos_map, total)
    sheet_name = feature_modality.split('-')[0]  # 'audio' or 'visual'
    summary.to_excel(excel_path, sheet_name=sheet_name, index=False)

    print(f'\nResults saved to {excel_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--label_csv', required=True,
                        help='Cluster label CSV (auto-detects: file/id/file_id + *_kmeans_lables/label_id/label)')
    parser.add_argument('--base', default='/home/ftp_246/data_5/tiffany/multimodal_2026/ig_video_prompt/mvp_test_v20')
    parser.add_argument('--out_dir', default='/home/hthung/multimodal-analysis/exp/res/lasso_out')
    parser.add_argument('--feature_modality', default='audio-shared',
                        choices=['audio-only', 'audio-shared', 'visual-only', 'visual-shared'],
                        help='Which modalities to include as features (default: audio-shared)')
    args = parser.parse_args()

    table = filter_table_by_modality(FEATURE_FORMAT_TABLE_v20, args.feature_modality)
    print(f'Feature modality: {args.feature_modality} — {len(table)} features')

    run_lasso_cluster_analysis(
        base=args.base,
        label_csv_path=args.label_csv,
        out_dir=args.out_dir,
        FEATURE_FORMAT_TABLE=table,
        feature_modality=args.feature_modality,
    )
