FEATURE_FORMAT_TABLE_v20 = [
    # =========================================================
    # shared / basic metadata
    # =========================================================
    {
        "name": "videoDuration",
        "path": "low_inference.basic_metadata.videoDuration",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },
    {
        "name": "aspectRatio",
        "path": "low_inference.basic_metadata.aspectRatio",
        "type": "single_cat",
        "modality": "shared",
        "default": "Unknown",
    },

    # =========================================================
    # visual_base
    # =========================================================
    {
        "name": "withRealPeople",
        "path": "low_inference.visual_base.withRealPeople",
        "type": "boolean",
        "modality": "visual",
        "default": False,
    },

    # -------------------------
    # visual_human_presence
    # -------------------------
    {
        "name": "totalHumanCount",
        "path": "low_inference.visual_base.visual_human_presence.totalHumanCount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "maleDetectAmount",
        "path": "low_inference.visual_base.visual_human_presence.maleDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "femaleDetectAmount",
        "path": "low_inference.visual_base.visual_human_presence.femaleDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "kidsDetectAmount",
        "path": "low_inference.visual_base.visual_human_presence.kidsDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "mainCharacterCount",
        "path": "low_inference.visual_base.visual_human_presence.mainCharacterCount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "bodyPartVisibility",
        "path": "low_inference.visual_base.visual_human_presence.bodyPartVisibility",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "crowdLevel",
        "path": "low_inference.visual_base.visual_human_presence.crowdLevel",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },

    # -------------------------
    # visual_scene_and_style
    # -------------------------
    {
        "name": "locationCategory",
        "path": "low_inference.visual_base.visual_scene_and_style.locationCategory",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "locationTopography",
        "path": "low_inference.visual_base.visual_scene_and_style.locationTopography",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "isMultipleBackground",
        "path": "low_inference.visual_base.visual_scene_and_style.isMultipleBackground",
        "type": "boolean",
        "modality": "visual",
        "default": False,
    },
    {
        "name": "lightingStyle",
        "path": "low_inference.visual_base.visual_scene_and_style.lightingStyle",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "weather",
        "path": "low_inference.visual_base.visual_scene_and_style.weather",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "season",
        "path": "low_inference.visual_base.visual_scene_and_style.season",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "colorTone",
        "path": "low_inference.visual_base.visual_scene_and_style.colorTone",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },

    # -------------------------
    # visual_filming_and_editing
    # -------------------------
    {
        "name": "cameraMovement",
        "path": "low_inference.visual_base.visual_filming_and_editing.cameraMovement",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "shotSize",
        "path": "low_inference.visual_base.visual_filming_and_editing.shotSize",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "cameraAngles",
        "path": "low_inference.visual_base.visual_filming_and_editing.cameraAngles",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "editingTechniques",
        "path": "low_inference.visual_base.visual_filming_and_editing.editingTechniques",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "visualRhythm",
        "path": "low_inference.visual_base.visual_filming_and_editing.visualRhythm",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "takeStructure",
        "path": "low_inference.visual_base.visual_filming_and_editing.takeStructure",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },

    # -------------------------
    # visual_text_overlay
    # -------------------------
    {
        "name": "textDensity",
        "path": "low_inference.visual_base.visual_text_overlay.density",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "textLanguage",
        "path": "low_inference.visual_base.visual_text_overlay.textLanguage",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "isSubtitled",
        "path": "low_inference.visual_base.visual_text_overlay.isSubtitled",
        "type": "boolean",
        "modality": "visual",
        "default": False,
    },

    # -------------------------
    # visual_objects_and_brands
    # -------------------------
    {
        "name": "animalDetect",
        "path": "low_inference.visual_base.visual_objects_and_brands.animalDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "foodsDetect",
        "path": "low_inference.visual_base.visual_objects_and_brands.foodsDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "trafficDetect",
        "path": "low_inference.visual_base.visual_objects_and_brands.trafficDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "techDetect",
        "path": "low_inference.visual_base.visual_objects_and_brands.techDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "landmark",
        "path": "low_inference.visual_base.visual_objects_and_brands.landmark",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "brandLogos",
        "path": "low_inference.visual_base.visual_objects_and_brands.brandLogos",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "instrumentsVisible",
        "path": "low_inference.visual_base.visual_objects_and_brands.instrumentsVisible",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },

    # =========================================================
    # audio_base
    # =========================================================

    # -------------------------
    # vocal_census
    # -------------------------
    {
        "name": "dominant_speakers_count",
        "path": "low_inference.audio_base.vocal_census.dominant_speakers_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "total_distinct_voices",
        "path": "low_inference.audio_base.vocal_census.total_distinct_voices",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "male_vocal_count",
        "path": "low_inference.audio_base.vocal_census.male_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "female_vocal_count",
        "path": "low_inference.audio_base.vocal_census.female_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "kids_vocal_count",
        "path": "low_inference.audio_base.vocal_census.kids_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # -------------------------
    # vocal_prosody
    # -------------------------
    {
        "name": "pitchLevel",
        "path": "low_inference.audio_base.vocal_prosody.pitchLevel",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "pitchVariability",
        "path": "low_inference.audio_base.vocal_prosody.pitchVariability",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "intensityAndLoudness",
        "path": "low_inference.audio_base.vocal_prosody.intensityAndLoudness",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "speechRate",
        "path": "low_inference.audio_base.vocal_prosody.speechRate",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "speechPauseDensity",
        "path": "low_inference.audio_base.vocal_prosody.speechPauseDensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # -------------------------
    # vocal_voice_quality
    # -------------------------
    {
        "name": "vocalTone",
        "path": "low_inference.audio_base.vocal_voice_quality.tone",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "vocalLanguage",
        "path": "low_inference.audio_base.vocal_voice_quality.vocalLanguage",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "hasBreathiness",
        "path": "low_inference.audio_base.vocal_voice_quality.hasBreathiness",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "hasRoughness",
        "path": "low_inference.audio_base.vocal_voice_quality.hasRoughness",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "hasStrain",
        "path": "low_inference.audio_base.vocal_voice_quality.hasStrain",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "articulationClarity",
        "path": "low_inference.audio_base.vocal_voice_quality.articulationClarity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "intonationAndContour",
        "path": "low_inference.audio_base.vocal_voice_quality.intonationAndContour",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "speakingRisingRatio",
        "path": "low_inference.audio_base.vocal_voice_quality.speakingRisingRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "speakingFallingRatio",
        "path": "low_inference.audio_base.vocal_voice_quality.speakingFallingRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # -------------------------
    # vocal_affective
    # -------------------------
    {
        "name": "arousal",
        "path": "low_inference.audio_base.vocal_affective.arousal",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "valence",
        "path": "low_inference.audio_base.vocal_affective.valence",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "dominance",
        "path": "low_inference.audio_base.vocal_affective.dominance",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "hasVocalTension",
        "path": "low_inference.audio_base.vocal_affective.hasVocalTension",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },

    # -------------------------
    # music_basic_features
    # -------------------------
    {
        "name": "musicPresence",
        "path": "low_inference.audio_base.music_basic_features.musicPresence",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "bgmGenre",
        "path": "low_inference.audio_base.music_basic_features.bgmGenre",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "tempoBPM",
        "path": "low_inference.audio_base.music_basic_features.tempoBPM",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "musicMode",
        "path": "low_inference.audio_base.music_basic_features.mode",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },

    # -------------------------
    # music_vocal_census
    # -------------------------
    {
        "name": "total_singer_count",
        "path": "low_inference.audio_base.music_vocal_census.total_singer_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "male_singer_count",
        "path": "low_inference.audio_base.music_vocal_census.male_singer_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "female_singer_count",
        "path": "low_inference.audio_base.music_vocal_census.female_singer_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "kids_singer_count",
        "path": "low_inference.audio_base.music_vocal_census.kids_singer_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "bgmLanguage",
        "path": "low_inference.audio_base.music_vocal_census.bgmLanguage",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },

    # -------------------------
    # music_structures
    # -------------------------
    {
        "name": "musicPauseDensity",
        "path": "low_inference.audio_base.music_structures.musicPauseDensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "beatStrength",
        "path": "low_inference.audio_base.music_structures.beatStrength",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "instrumentFamiliesAudible",
        "path": "low_inference.audio_base.music_structures.instrumentFamiliesAudible",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "instrumentsAudible",
        "path": "low_inference.audio_base.music_structures.instrumentsAudible",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "musicSourceType",
        "path": "low_inference.audio_base.music_structures.musicSourceType",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "harmonicTensionLevel",
        "path": "low_inference.audio_base.music_structures.harmonicTensionLevel",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # -------------------------
    # noise_and_SFX_detect
    # -------------------------
    {
        "name": "crowdNoiseDetails",
        "path": "low_inference.audio_base.noise_and_SFX_detect.crowdNoiseDetails",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "crowdNoiseIntensity",
        "path": "low_inference.audio_base.noise_and_SFX_detect.crowdNoiseIntensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "ambientNoiseDetails",
        "path": "low_inference.audio_base.noise_and_SFX_detect.ambientNoiseDetails",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "ambientNoiseIntensity",
        "path": "low_inference.audio_base.noise_and_SFX_detect.ambientNoiseIntensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "incidentalNoiseDetails",
        "path": "low_inference.audio_base.noise_and_SFX_detect.incidentalNoiseDetails",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "incidentalNoiseIntensity",
        "path": "low_inference.audio_base.noise_and_SFX_detect.incidentalNoiseIntensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "SignalToNoiseRatio",
        "path": "low_inference.audio_base.noise_and_SFX_detect.SignalToNoiseRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "soundEffectsDetails",
        "path": "low_inference.audio_base.noise_and_SFX_detect.soundEffectsDetails",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "soundEffectsIntensity",
        "path": "low_inference.audio_base.noise_and_SFX_detect.soundEffectsIntensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "soundEffectsCoverage",
        "path": "low_inference.audio_base.noise_and_SFX_detect.soundEffectsCoverage",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # -------------------------
    # spectral_and_acoustic
    # -------------------------
    {
        "name": "spectralCentroidBrightness",
        "path": "low_inference.audio_base.spectral_and_acoustic.spectralCentroidBrightness",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "acousticDynamism",
        "path": "low_inference.audio_base.spectral_and_acoustic.acousticDynamism",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "noisinessAndPercussiveness",
        "path": "low_inference.audio_base.spectral_and_acoustic.noisinessAndPercussiveness",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "harmonicsToNoiseRatio",
        "path": "low_inference.audio_base.spectral_and_acoustic.harmonicsToNoiseRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "hasAudioDistortion",
        "path": "low_inference.audio_base.spectral_and_acoustic.hasAudioDistortion",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },

    # -------------------------
    # editing_and_production_style
    # -------------------------
    {
        "name": "speechDensity",
        "path": "low_inference.audio_base.editing_and_production_style.speechDensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "vocalRatio",
        "path": "low_inference.audio_base.editing_and_production_style.vocalRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "musicToSpeechLoudRatio",
        "path": "low_inference.audio_base.editing_and_production_style.musicToSpeechLoudRatio",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "musicDuration",
        "path": "low_inference.audio_base.editing_and_production_style.musicDuration",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "speechMusicOverlap",
        "path": "low_inference.audio_base.editing_and_production_style.speechMusicOverlap",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "isAudioEditingFragmented",
        "path": "low_inference.audio_base.editing_and_production_style.isAudioEditingFragmented",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "hasStrategicSilence",
        "path": "low_inference.audio_base.editing_and_production_style.hasStrategicSilence",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },
    {
        "name": "audioTransition",
        "path": "low_inference.audio_base.editing_and_production_style.audioTransition",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "audioEventDensity",
        "path": "low_inference.audio_base.editing_and_production_style.audioEventDensity",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "audioCutFrequency",
        "path": "low_inference.audio_base.editing_and_production_style.audioCutFrequency",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "dynamicRange",
        "path": "low_inference.audio_base.editing_and_production_style.dynamicRange",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "audioQuality",
        "path": "low_inference.audio_base.editing_and_production_style.audioQuality",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },

    # =========================================================
    # high_inference
    # =========================================================

    # -------------------------
    # content_identity
    # -------------------------
    {
        "name": "videoGenre",
        "path": "high_inference.content_identity.videoGenre",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
    {
        "name": "country",
        "path": "high_inference.content_identity.location.country",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
    {
        "name": "city",
        "path": "high_inference.content_identity.location.city",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },

    # -------------------------
    # temporal_pacing_summary
    # -------------------------
    {
        "name": "sceneCutCount",
        "path": "high_inference.temporal_pacing_summary.sceneCutCount",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },
    {
        "name": "averageSceneDuration",
        "path": "high_inference.temporal_pacing_summary.averageSceneDuration",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },
    {
        "name": "editingPace",
        "path": "high_inference.temporal_pacing_summary.editingPace",
        "type": "single_cat",
        "modality": "shared",
        "default": "Unknown",
    },
    {
        "name": "isNarrativeShift",
        "path": "high_inference.temporal_pacing_summary.isNarrativeShift",
        "type": "boolean",
        "modality": "shared",
        "default": False,
    },

    # -------------------------
    # narrative_and_purpose
    # -------------------------
    {
        "name": "narrativeStructure",
        "path": "high_inference.narrative_and_purpose.narrativeStructure",
        "type": "single_cat",
        "modality": "shared",
        "default": "Unknown",
    },
    {
        "name": "visualEmotion",
        "path": "high_inference.narrative_and_purpose.visualEmotion",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },

    # -------------------------
    # endorsement_analysis
    # -------------------------
    {
        "name": "isEndorsement",
        "path": "high_inference.endorsement_analysis.isEndorsement",
        "type": "boolean",
        "modality": "shared",
        "default": False,
    },
    {
        "name": "endorsementMethod",
        "path": "high_inference.endorsement_analysis.endorsementMethod",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
    {
        "name": "endorsementObject",
        "path": "high_inference.endorsement_analysis.endorsementObject",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
]

FEATURE_FORMAT_TABLE_v7 = [
    # =========================================================
    # Shared / numerical
    # =========================================================
    {
        "name": "videoDuration",
        "path": "low_inference_observations.basic_metadata.videoDuration",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },
    {
        "name": "sceneCutCount",
        "path": "low_inference_observations.temporal_pacing_summary.sceneCutCount",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },
    {
        "name": "averageSceneDuration",
        "path": "low_inference_observations.temporal_pacing_summary.averageSceneDuration",
        "type": "numerical",
        "modality": "shared",
        "default": 0,
    },

    # =========================================================
    # Visual / numerical
    # =========================================================
    {
        "name": "totalHumanCount",
        "path": "low_inference_observations.visual_human_presence.totalHumanCount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "maleDetectAmount",
        "path": "low_inference_observations.visual_human_presence.maleDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "femaleDetectAmount",
        "path": "low_inference_observations.visual_human_presence.femaleDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "kidsDetectAmount",
        "path": "low_inference_observations.visual_human_presence.kidsDetectAmount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },
    {
        "name": "mainCharacterCount",
        "path": "low_inference_observations.visual_human_presence.mainCharacterCount",
        "type": "numerical",
        "modality": "visual",
        "default": 0,
    },

    # =========================================================
    # Audio / numerical
    # =========================================================
    {
        "name": "onscreen",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.onscreen",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "offscreen",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.offscreen",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "bgCrowdVoices",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.backgroundCrowdVoices",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "male_vocal_count",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.vocal_demographics.male_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "female_vocal_count",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.vocal_demographics.female_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "kids_vocal_count",
        "path": "low_inference_observations.audio_vocal_characterization.speaker_inventory.vocal_demographics.kids_vocal_count",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },
    {
        "name": "bgmBPM",
        "path": "low_inference_observations.audio_music_and_environment.bgmBPM",
        "type": "numerical",
        "modality": "audio",
        "default": 0,
    },

    # =========================================================
    # Shared / boolean
    # =========================================================
    {
        "name": "withRealPeople",
        "path": "low_inference_observations.basic_metadata.withRealPeople",
        "type": "boolean",
        "modality": "shared",
        "default": False,
    },
    {
        "name": "isNarrativeShift",
        "path": "low_inference_observations.temporal_pacing_summary.isNarrativeShift",
        "type": "boolean",
        "modality": "shared",
        "default": False,
    },
    {
        "name": "isEndorsement",
        "path": "high_inference_interpretations.endorsement_analysis.isEndorsement",
        "type": "boolean",
        "modality": "shared",
        "default": False,
    },

    # =========================================================
    # Visual / boolean
    # =========================================================
    {
        "name": "isMultipleBackground",
        "path": "low_inference_observations.visual_scene_and_style.isMultipleBackground",
        "type": "boolean",
        "modality": "visual",
        "default": False,
    },
    {
        "name": "isSubtitled",
        "path": "low_inference_observations.visual_scene_and_style.textOverlay.isSubtitled",
        "type": "boolean",
        "modality": "visual",
        "default": False,
    },

    # =========================================================
    # Audio / boolean
    # =========================================================
    {
        "name": "bgmPresence",
        "path": "low_inference_observations.audio_music_and_environment.bgmPresence",
        "type": "boolean",
        "modality": "audio",
        "default": False,
    },

    # =========================================================
    # Shared / single categorical
    # =========================================================
    {
        "name": "aspectRatio",
        "path": "low_inference_observations.basic_metadata.aspectRatio",
        "type": "single_cat",
        "modality": "shared",
        "default": "Unknown",
    },
    {
        "name": "visualEmotion",
        "path": "high_inference_interpretations.narrative_and_purpose.visualEmotion",
        "type": "single_cat",
        "modality": "shared",
        "default": "Unknown",
    },

    # =========================================================
    # Visual / single categorical
    # =========================================================
    {
        "name": "crowdLevel",
        "path": "low_inference_observations.visual_human_presence.crowdLevel",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "weather",
        "path": "low_inference_observations.visual_scene_and_style.weather",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "season",
        "path": "low_inference_observations.visual_scene_and_style.season",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "editingPace",
        "path": "low_inference_observations.visual_scene_and_style.editingPace",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "colorTone",
        "path": "low_inference_observations.visual_scene_and_style.colorTone",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },
    {
        "name": "textDensity",
        "path": "low_inference_observations.visual_scene_and_style.textOverlay.density",
        "type": "single_cat",
        "modality": "visual",
        "default": "Unknown",
    },

    # =========================================================
    # Audio / single categorical
    # =========================================================
    {
        "name": "audioContinuity",
        "path": "low_inference_observations.audio_production_style.audioContinuity",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "audioTransition",
        "path": "low_inference_observations.audio_production_style.audioTransition",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "vocalRatio",
        "path": "low_inference_observations.audio_production_style.vocalRatio",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "vocalPitch",
        "path": "low_inference_observations.audio_vocal_characterization.vocal_qualities.pitch",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "vocalLoudness",
        "path": "low_inference_observations.audio_vocal_characterization.vocal_qualities.loudness",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "vocalSpeed",
        "path": "low_inference_observations.audio_vocal_characterization.vocal_qualities.speed",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "speechDensity",
        "path": "low_inference_observations.audio_vocal_characterization.vocal_qualities.speechDensity",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "bgmGenre",
        "path": "low_inference_observations.audio_music_and_environment.bgmGenre",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "rhythmSync",
        "path": "low_inference_observations.audio_music_and_environment.rhythmSync",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },
    {
        "name": "audioQuality",
        "path": "low_inference_observations.audio_music_and_environment.audioQuality",
        "type": "single_cat",
        "modality": "audio",
        "default": "Unknown",
    },

    # =========================================================
    # Shared / multi-label
    # =========================================================
    {
        "name": "videoGenre",
        "path": "low_inference_observations.basic_metadata.videoGenre",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
    {
        "name": "country",
        "path": "low_inference_observations.basic_metadata.location.country",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },
    {
        "name": "endorsementMethod",
        "path": "high_inference_interpretations.endorsement_analysis.endorsementMethod",
        "type": "multi_label",
        "modality": "shared",
        "default": [],
    },

    # =========================================================
    # Visual / multi-label
    # =========================================================
    {
        "name": "bodyPartVisibility",
        "path": "low_inference_observations.visual_human_presence.bodyPartVisibility",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "locationCategory",
        "path": "low_inference_observations.visual_scene_and_style.locationCategory.category",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "cameraWork",
        "path": "low_inference_observations.visual_scene_and_style.cameraWork",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "animalDetect",
        "path": "low_inference_observations.visual_objects_and_brands.animalDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "foodsDetect",
        "path": "low_inference_observations.visual_objects_and_brands.foodsDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "trafficDetect",
        "path": "low_inference_observations.visual_objects_and_brands.trafficDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "techDetect",
        "path": "low_inference_observations.visual_objects_and_brands.techDetect",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "landmark",
        "path": "low_inference_observations.visual_objects_and_brands.landmark",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "brandLogos",
        "path": "low_inference_observations.visual_objects_and_brands.brandLogos",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "instrumentsVisible",
        "path": "low_inference_observations.visual_objects_and_brands.instrumentsVisible",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },
    {
        "name": "lightingStyle",
        "path": "low_inference_observations.visual_scene_and_style.lightingStyle",
        "type": "multi_label",
        "modality": "visual",
        "default": [],
    },

    # =========================================================
    # Audio / multi-label
    # =========================================================
    {
        "name": "soundEffects",
        "path": "low_inference_observations.audio_music_and_environment.soundEffects",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "ambientNoise",
        "path": "low_inference_observations.audio_music_and_environment.ambientNoise",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
    {
        "name": "vocalLanguage",
        "path": "low_inference_observations.audio_vocal_characterization.vocal_qualities.language",
        "type": "multi_label",
        "modality": "audio",
        "default": [],
    },
]