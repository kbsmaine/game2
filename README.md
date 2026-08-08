# DEADHAUL Build 2.6.1 — Physics Ragdolls + Split Safehouse UI

Build 2.6.1 keeps the 2.6.0 persistence/inventory pass and separates the safehouse into two real gameplay stations while replacing the fake enemy death flop with Babylon Physics V2/Havok ragdolls.

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

## Real enemy physics ragdolls

Ch18, Ch35 and SWAT enemies now prepare Babylon `Ragdoll` bodies while alive. On death, their authored animation stops and the real skinned skeleton is handed to Havok Physics V2:

- physics boxes are attached to hips, spine, chest, head, upper/lower arms and upper/lower legs
- joints connect the bodies through the skeleton hierarchy
- the death shot adds physical linear/angular impulse
- the actual character mesh follows the physics-driven bones
- the attached weapon stays on the animated/ragdolled hand
- corpse search interaction follows the ragdoll's physical root
- raid terrain, walls and collision proxies are registered as static Havok bodies so corpses collide with the environment

If Havok cannot initialize, the older procedural fallback remains only as a failure-safe.

## Testing

Run `PLAY-TEST.bat` or `START-DEMO.bat`.

Local port: **8805**

Confirm the HUD says **BUILD 2.6.1**.
