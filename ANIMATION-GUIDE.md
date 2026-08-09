# DEADHAUL 2.3 — Animation Guide

You no longer need Blender animation work to make the included arms hold and operate the current weapons. Build 2.3 ships with a complete procedural first-person animation layer in `data/animations.json`.

## What is already animated

Every current weapon gets a persistent two-hand grip, idle breathing, movement sway, ADS, sprint/lowered pose, equip/raise motion and an appropriate reload/action family.

Current weapons:

- Makarov
- Glock 17
- 1911
- MP5
- Vector
- AK-74
- M4A1
- SKS
- Mosin
- R700
- Pump-12
- Saiga-12

Shared character actions include grenade throwing, medkit treatment, bandaging and container searching.

## Files you normally edit

`data/animations.json`
Controls arm bone poses and procedural action keyframes.

`data/models.json`
Controls the actual weapon model attachment position, rotation and scale at `Hand_R`.

`data/weapons.json`
Controls per-gun MP3 files and which animation events/presets are requested.

## Arm bones

Custom `fp_arms.glb` models should keep these names:

- UpperArm_L
- LowerArm_L
- Hand_L
- UpperArm_R
- LowerArm_R
- Hand_R

The weapon is attached to `Hand_R`.

## If you later make Blender animation clips

Build 2.3 still supports authored GLB clips. If the requested clip is present in `fp_arms.glb`, DEADHAUL plays it instead of the procedural arm action for that event.

Examples:

- `reload_ak74`
- `reload_m4a1`
- `reload_glock17`
- `equip_ak74`
- `action_mosin`
- `throw_grenade`
- `use_medkit`
- `use_bandage`
- `search_container`

This means the procedural set is the built-in fallback, not a dead end. You can replace one animation at a time later without losing the rest.

## Weapon mechanical pieces

The runtime recognizes child meshes with names such as:

- `mag_*`
- `pump_*`
- `bolt_*`
- `receiver_*`
- `slide_*`

Magazine meshes move during detachable-magazine reloads. Pump meshes move during pump-action cycling. If a custom weapon uses these names, it can participate in those effects automatically.

## Custom MP3 audio

Put files under `assets/audio/weapons/` and edit `data/weapons.json`. Each gun supports separate events including fire, suppressed fire, reload, dry fire, equip and action/mechanical audio. An event can be one path or multiple paths for random variants.

## Build 2.5.8 pistol locomotion

Ch15 now has a separate pistol animation class. Makarov, Glock 17, and 1911 automatically use `pistol_idle`, `pistol_aim_idle`, `pistol_walk`, and `pistol_run` rather than the rifle-hold clips. The source FBXs are converted/injected by `tools/import_pistol_mixamo.py`; forward FBX root motion is removed because the game controller already handles player translation.
