# DEADHAUL Enemy Character / Animation Workflow

Build 2.5.9 uses real skinned Mixamo-compatible enemy characters.

## Current enemy variants

- `enemy_ch18.glb` — Scav Raider
- `enemy_ch35.glb` — Contract Raider
- `enemy_swat.glb` — Armored SWAT Raider

The browser build does not ship the raw FBXs. `tools/import_enemy_models.py` converts compatible binary Mixamo FBXs, compresses their diffuse textures, preserves skin weights/bind poses, and retargets the current Ch15 authored animation library by bone name and rest-pose delta.

## Current authored enemy states

Long guns:
- `rifle_idle`
- `rifle_aim_idle`
- `rifle_walk`
- `rifle_run`
- `rifle_sprint` (available; AI currently uses run while closing distance)

Pistols:
- `pistol_idle`
- `pistol_aim_idle`
- `pistol_walk`
- `pistol_run`
- `pistol_sprint`

The enemy weapon remains attached to the animated `mixamorig:RightHand` bone. No IK is used for the imported enemies.

## Next dedicated enemy clips

Dedicated enemy clips can be added later for firing, reloading, hit reactions, crouching, searching, and deaths. Until those are supplied, existing AI behavior remains unchanged and the current DEADHAUL fall/death pose takes over after authored locomotion is stopped.
