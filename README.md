# DEADHAUL Build 2.6.3 — Anatomical Ragdolls + Split Safehouse UI

Build 2.6.3 keeps the split safehouse/persistent inventory systems and rebuilds enemy death physics around anatomically limited Havok joints instead of the unrestricted Babylon Ragdoll helper joints.

## Safehouse stations

### Quartermaster — Stash & Display
Interact with the storage shelves on the right side of NODE 17, or press TAB while in the bunker. This UI handles:

- persistent recovered raid inventory
- item thumbnails
- equip / unequip gear
- primary and secondary weapon loadout
- prepared next-raid backpack
- display / remove display for recovered loot
- automatic best-loot display selection

Items successfully extracted from raids remain in the stash and can be equipped, packed, displayed, or moved later.

### Workbench — Bunker Customization
Interact with the workbench on the left side of NODE 17. This opens a completely separate UI for the bunker itself:

- wall finish
- floor finish
- utility light color
- light intensity
- furnishing preset: Survival / Workshop / Armory / Minimal
- clutter density: Sparse / Normal / Dense

The choices are persisted locally per survivor and update the visible bunker immediately. Stash/display management is not mixed into this screen.

## Anatomical enemy physics ragdolls

Ch18, Ch35 and SWAT still use their real skinned skeletons, but Build 2.6.3 replaces the loose default runtime joints with custom Havok 6DOF constraints:

- heavy pelvis/chest mass distribution; no tiny hand/foot rigid bodies
- explicit human-like limits for torso, head/neck, shoulders, elbows, hips and knees
- all connected ragdoll bodies have self-collision disabled so adjacent limbs do not fight each other
- zero restitution, high ground friction and moderate damping
- no artificial launch velocity; the bullet adds only a tiny directional torso nudge
- only the first 0.18 seconds are velocity-capped to reject solver spikes
- after that, gravity and joint limits drive the collapse normally
- once a corpse has genuinely settled, its rigid bodies freeze to remove endless micro-jitter
- the real enemy mesh and held weapon continue following the simulated skeleton
- corpse search interaction follows the physical pelvis/root

The old procedural death path remains only as a failure-safe when Havok cannot initialize.

## Testing

Run `PLAY-TEST.bat` or `START-DEMO.bat`.

Local port: **8807**

Confirm the HUD says **BUILD 2.6.3**.
