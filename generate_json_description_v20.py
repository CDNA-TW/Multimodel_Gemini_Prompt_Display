import json
import glob
import os

SRC = '/home/ftp_246/data_5/tiffany/multimodal_2026/ig_video_prompt/mvp_test_v20'
DST = './data/json_description_v20'

os.makedirs(DST, exist_ok=True)

for ig_dir in sorted(os.listdir(SRC)):
    full_dir = os.path.join(SRC, ig_dir)
    if not os.path.isdir(full_dir):
        continue
    merged = {}
    for jf in glob.glob(os.path.join(full_dir, '*.json')):
        last_id = os.path.basename(jf).replace('.json', '').split('-')[-1]
        with open(jf, encoding='utf-8') as fp:
            merged[last_id] = json.load(fp)
    with open(os.path.join(DST, f'{ig_dir}.json'), 'w', encoding='utf-8') as fp:
        json.dump(merged, fp, ensure_ascii=False)
    print(f'{ig_dir}: {len(merged)} videos')

print(f'\n完成，共處理 {len(os.listdir(DST))} 個 influencer，輸出至 {DST}')
