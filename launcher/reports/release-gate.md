# cfs_zockt Creator Suite — Release Gate

Generated: 2026-09-15T17:34:38.170872+00:00
Launcher: 0.42.0
Result: **PASS (98/98)**

> Der Lauf wurde wegen eines äußeren Tool-Zeitlimits segmentiert ausgeführt. Alle 98 Gates wurden vollständig ausgeführt; keine Gate-Logik wurde übersprungen.

| Gate | Status | Dauer |
|---|---:|---:|
| static | PASS | 1289 ms |
| bridge | PASS | 365 ms |
| spool | PASS | 211 ms |
| preflight | PASS | 169 ms |
| gifts | PASS | 863 ms |
| monitor | PASS | 143 ms |
| obs_doctor | PASS | 443 ms |
| shutdown | PASS | 408 ms |
| backup | PASS | 377 ms |
| recovery | PASS | 181 ms |
| health | PASS | 235 ms |
| manifest | PASS | 177 ms |
| version_policy | PASS | 585 ms |
| release_safety | PASS | 138 ms |
| creator_profile | PASS | 472 ms |
| device_link | PASS | 539 ms |
| device_config | PASS | 142 ms |
| output_window | PASS | 161 ms |
| output_gate | PASS | 131 ms |
| stream_deck_store | PASS | 134 ms |
| stream_deck_actions | PASS | 118 ms |
| entitlement_guard | PASS | 129 ms |
| entitlement_preflight | PASS | 172 ms |
| beta_session_store | PASS | 167 ms |
| beta_feedback_bridge | PASS | 365 ms |
| creator_tools | PASS | 345 ms |
| game_live_rules | PASS | 411 ms |
| cut_jobs | PASS | 365 ms |
| flush_serialization | PASS | 632 ms |
| media_source | PASS | 161 ms |
| media_engine | PASS | 140 ms |
| cut_job_retry | PASS | 371 ms |
| cut_timeline | PASS | 136 ms |
| cut_caption_reel | PASS | 168 ms |
| cut_audio_model | PASS | 129 ms |
| cut_transition_engine | PASS | 154 ms |
| ffmpeg_bundle_prep | PASS | 124 ms |
| cut_music_model | PASS | 174 ms |
| media_source_music | PASS | 121 ms |
| cut_music_keyframes | PASS | 139 ms |
| cut_music_static | PASS | 135 ms |
| cut_free_keyframes | PASS | 124 ms |
| media_source_multitrack | PASS | 142 ms |
| cut_multitrack_engine | PASS | 142 ms |
| cut_multitrack_static | PASS | 148 ms |
| cut_curve_mixer_model | PASS | 181 ms |
| cut_curve_mixer_engine | PASS | 162 ms |
| cut_curve_mixer_static | PASS | 128 ms |
| cut_curve_mixer_real | PASS | 9291 ms |
| cut_final_model | PASS | 136 ms |
| media_source_v36 | PASS | 145 ms |
| cut_final_engine | PASS | 185 ms |
| cut_final_static | PASS | 137 ms |
| cut_final_real | PASS | 9731 ms |
| billing_policy | PASS | 198 ms |
| production_readiness | PASS | 124 ms |
| billing_static | PASS | 168 ms |
| billing_launcher | PASS | 121 ms |
| production_evidence | PASS | 125 ms |
| stripe_testmode_e2e | PASS | 129 ms |
| windows_build_evidence | PASS | 171 ms |
| production_canary | PASS | 408 ms |
| production_v38_static | PASS | 173 ms |
| release_acceptance_v39 | PASS | 125 ms |
| beta_cohort_v39 | PASS | 128 ms |
| go_no_go_v39 | PASS | 136 ms |
| release_ops_admin_v39 | PASS | 151 ms |
| release_ops_static_v39 | PASS | 157 ms |
| acceptance_template_v39 | PASS | 408 ms |
| repo_hygiene_v40 | PASS | 165 ms |
| github_setup_v40 | PASS | 180 ms |
| deployment_flow_v40 | PASS | 140 ms |
| legacy_flags_v40 | PASS | 164 ms |
| file_placement_v40 | PASS | 159 ms |
| config_doctor_v41 | PASS | 128 ms |
| github_bootstrap_v41 | PASS | 127 ms |
| configuration_workflow_v41 | PASS | 157 ms |
| admin_config_doctor_v41 | PASS | 181 ms |
| github_labels_v41 | PASS | 135 ms |
| final_test_plan_v42 | PASS | 124 ms |
| final_verification_v42 | PASS | 117 ms |
| final_test_files_v42 | PASS | 310 ms |
| server_runtime_symbols_v42 | PASS | 297 ms |
| post_v42_bridge_controls | PASS | 383 ms |
| acceptance_part2_provider | PASS | 128 ms |
| acceptance_part2_live | PASS | 441 ms |
| acceptance_part2_audio | PASS | 125 ms |
| beta_profile | PASS | 263 ms |
| session_store | PASS | 137 ms |
| resume_protocol | PASS | 335 ms |
| action_lease | PASS | 259 ms |
| provider_switch | PASS | 190 ms |
| logger_tail | PASS | 167 ms |
| scenes | PASS | 276 ms |
| e2e | PASS | 1160 ms |
| stress | PASS | 1040 ms |
| obs | PASS | 4420 ms |
| release | PASS | 145 ms |

## Ergebnis

Alle 98 automatisierten Launcher-/Release-Gates sind bestanden. Externe Real-World-/Deployment-Gates bleiben separat zu erfüllen.