# DEADHAUL Build 2.6.4 — Shooter-Style Enemy Deaths

This build replaces the unstable Havok skeletal ragdoll activation used in 2.6.1–2.6.3. Enemies now die with a controlled, grounded collapse designed to look like a modern extraction shooter: no launch force, no endless flopping, and no physics interaction between separate corpses.

## Enemy death behavior
- Keeps the exact Mixamo pose from the frame the enemy is killed.
- Stops AI and authored locomotion immediately.
- Brief knee buckle, followed by a gravity-like forward/back fall.
- Only a very small side variation; bullets do not throw bodies.
- No Havok skeletal constraint solver is activated at impact.
- Corpse finishes settling in under one second and then stops updating.
- Killing another enemy cannot freeze or alter older corpses.
- SEARCH BODY follows the fallen torso.
- Enemy weapon remains attached to the animated hand through the collapse.

## Retained systems
- Ch18 / Ch35 / SWAT animated enemy models.
- Rifle and pistol animation sets.
- Persistent extracted-loot stash.
- Separate Quartermaster stash/display UI and bunker customization UI.
- Equip/unequip/drop inventory actions and item icons.
- Safehouse displays and bunker customization.
- Footstep and tactile UI audio.
- Ch15 first-person body-awareness / weapon alignment systems.

## Local test
Run `START-DEMO.bat` or `PLAY-TEST.bat`.

Local test port: **8808**

Confirm the HUD says **BUILD 2.6.4**.
