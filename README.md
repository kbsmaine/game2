# DEADHAUL Build 2.6.6 — Authored Death Animations + Soft Settle

This build replaces both extremes from the previous attempts: enemies no longer explode under a full Havok skeleton, and they no longer freeze in the exact running frame. Deaths use a low-energy soft-ragdoll simulation aimed at an extraction-shooter feel.

## Enemy death behavior
- AI stops immediately on the kill frame.
- A very short (~0.1 s) blend moves the skeleton out of run/aim into its stable rifle/pistol idle pose.
- Knees buckle first instead of the character falling like a rigid tree.
- The torso then drops with no world-space launch impulse.
- Arms, forearms, hands, head, legs and feet continue with independent damped spring motion for soft secondary movement.
- Limb motion has small variation per corpse but no endless spinning or solver explosions.
- The body settles after roughly 1.5 seconds and then stops updating independently.
- Killing another enemy cannot freeze or alter older corpses.
- SEARCH BODY follows the fallen torso.
- Enemy weapon remains attached to the animated hand throughout the collapse.

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

Local test port: **8810**

Confirm the HUD says **BUILD 2.6.6**.

Enemy deaths now use the supplied Mixamo clips (`death_forward`, `death_generic`, `death_front_hit`) on Ch18, Ch35, and SWAT. The authored animation drives the fall; only restrained damped secondary bone motion is layered near impact and after landing.
