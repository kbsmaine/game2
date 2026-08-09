# DEADHAUL — Mixamo Weapon Pose Workflow (Build 2.5.2)

Ch15's first-person arms now use the authored Mixamo rifle animation as the source of truth.

## Workflow

1. Adjust the character/rifle-holding pose in Mixamo.
2. Export the animation on the Ch15/Mixamo skeleton.
3. Replace/reinject the corresponding DEADHAUL animation clip (`rifle_idle`, `rifle_aim_idle`, etc.).
4. Do **not** reposition the arms with IK.
5. Fine-tune the real weapon against the animated right hand in `data/models.json`.

## Per-weapon gun alignment

Each weapon now has a `mixamoFp` block:

```json
"ak74": {
  "mixamoFp": {
    "position": [0.0, -0.03, 0.03],
    "rotation": [0.02, 3.14159, 0.01],
    "scale": 0.72
  }
}
```

`position` is `[X, Y, Z]` relative to the animated right hand.

- X: side-to-side
- Y: up/down
- Z: forward/back relative to the hand attachment

`rotation` is `[X, Y, Z]` in radians.

Useful values:

- 15° = 0.262
- 30° = 0.524
- 45° = 0.785
- 90° = 1.571
- 180° = 3.142

`scale` changes only that weapon model.

## First-person arm placement

Overall Ch15 arm-view placement remains here:

```json
"firstPersonTransform": {
  "position": [0.0, -1.56, 0.055],
  "rotation": [0.0, 0.0, 0.0],
  "scale": 1.0
}
```

Use this only to move the **whole animated arm rig** in relation to the camera. Use `mixamoFp` for individual gun alignment.

## Re-enable IK

Not recommended for this workflow, but available:

```json
"firstPersonAuthoredWeaponPose": {
  "useIK": true
}
```

Build 2.5.2 defaults this to `false` so DEADHAUL does not fight the pose you authored in Mixamo.


## Build 2.5.2 alignment model

For Ch15 first person, the actual gun is **not parented to either hand**. Mixamo owns the arms. The gun is camera-mounted where the invisible/imaginary rifle from the animation would be.

Tune each weapon in `data/models.json` under `weapons.<id>.mixamoFp`:

```json
"mixamoFp": {
  "position": [0.085, -0.205, 0.76],
  "rotation": [0.0, 3.14159, 0.0],
  "scale": 0.68
}
```

`position`: X left/right, Y up/down, Z forward/back. `rotation` is radians.

Small wrist cleanup lives at `characters.player_ch15.firstPersonAuthoredWeaponPose.wristCorrection`. These are post-animation wrist rotations only; they do not use IK and will not force the arms straight.

## Build 2.5.8 — pistol animation set

Pistols now select a dedicated authored set instead of the rifle clips. The active model entry controls this with `animationSet` in `data/models.json`.

- `makarov` → `pistol`
- `glock17` → `pistol`
- `pistol1911` → `pistol`

The imported clip names embedded in all three Ch15 GLBs are `pistol_idle`, `pistol_aim_idle`, `pistol_walk`, `pistol_run`, and `pistol_sprint`. The supplied Mixamo motion included forward root translation, so the import tool strips Hips Z root motion; DEADHAUL's own movement controller remains authoritative.

The original FBXs do not need to ship with the browser build. To replace the pistol motions later, run `tools/import_pistol_mixamo.py` against compatible Mixamo FBXs and the three Ch15 GLBs.
