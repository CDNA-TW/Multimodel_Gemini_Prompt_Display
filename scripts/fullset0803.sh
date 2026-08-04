#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python3 setup_experiment.py \
    --name 19101fullset \
    --label "19101fullset" \
    --visual_csv /home/hthung/multimodal-analysis/exp/res/19101fullset/cluster_result_visual.csv \
    --audio_csv  /home/hthung/multimodal-analysis/exp/res/19101fullset/cluster_result_audio.csv \
    --lasso_audio  /home/hthung/multimodal-analysis/exp/res/19101fullset/lasso/lasso_v20_audio-only_result.xlsx \
    --lasso_visual /home/hthung/multimodal-analysis/exp/res/19101fullset/lasso/lasso_v20_visual-shared_result.xlsx \
    --group_name_visual /home/hthung/multimodal-analysis/exp/res/19101fullset/group_name_visual_top350.xlsx \
    --group_name_audio  /home/hthung/multimodal-analysis/exp/res/19101fullset/group_name_audio_top350.xlsx \
    --wordcloud_dir /home/hthung/multimodal-analysis/exp/res/19101fullset/keywords_wordcloud/wordcloud \
    --json_desc ./data/json_description_v20
