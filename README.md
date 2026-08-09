# DEADHAUL Build 2.6.12 — Persistent Magazines + Loose Ammunition

Build 2.6.12 upgrades the weapon feed system to per-instance magazines and ammunition. Magazines are no longer abstract full-mag tokens: each magazine has its own capacity, current contents, unique ID, and loaded ammunition order.

## New in 2.6.12

- Detachable magazines must contain real loose rounds before they can feed a weapon.
- Inventory shows the magazine currently inserted in the active weapon.
- **EJECT MAG** removes it to your rig/pockets/backpack.
- **EJECT + MANAGE** removes it and opens the magazine workbench immediately.
- Magazine workbench supports Load 1, Load 5, Fill, Unload 1, Unload 5, and Unload All.
- Reload (`R`) selects a compatible **loaded** spare magazine and preserves the old magazine's remaining rounds.
- Standard, extended, and drum magazines can have different capacities and cell footprints.
- 12 gauge now supports 00 buckshot, rifled slugs, and flechettes. Saiga magazines can mix shell types.
- Pump shotgun loads loose shells one at a time; shell sequence is retained.
- Dropped magazines/ammo preserve their remaining contents when picked back up.
- Ammo and loaded-mag weight/value are calculated from their actual contents.
- F7 admin panel automatically exposes all new magazines and ammunition.

## Included magazine families

PM 8 · Glock 17/33 · 1911 8/15 · MP5 30/50 drum · AK-74 30/45/75 drum · STANAG 30/40/60 drum · Saiga-12 8/12/20 drum · Vector 25/40/50 drum.

## Supabase migration

If you use the real Supabase backend, run `sql/MIGRATION-2.6.12.sql` once. It adds `inventory.item_data` so partially loaded magazines and loose-ammo stack counts persist in the stash and through extraction. Offline Demo mode needs no database migration.

## Test

Run `START-DEMO.bat` or `PLAY-TEST.bat`. Local port: **8815**. The HUD should show **BUILD 2.6.12**.

---

# DEADHAUL Build 2.6.10 — Tarkov-Style Tactical Inventory

Field inventory and safehouse loadout preparation now use separate tactical-rig, pocket, and backpack cells. Compatible magazines stored in those containers are the reload supply for detachable-magazine weapons.

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


## Build 2.6.10 — Armor and Storage

This build adds front/back armor plate slots, functional helmets, plate carriers, non-armored chest rigs, and multiple backpack/storage capacities. Chest rigs increase carrying capacity only; plate carriers accept front/back plates; helmets and plates now reduce real incoming damage based on hit location.


## Build 2.6.10
TAB inventory now uses tactical container cells. Magazines/ammo/meds/grenades can be kept in chest rigs, pockets or backpacks. Drag items between containers; compatible spare magazines are consumed when reloading.


## Build 2.6.10 — Admin Test Panel
- Press **F7** or click **ADMIN [F7]** to open the developer item spawner.
- Search/filter the live item catalog and add x1/x5/x10 copies to your persistent safehouse stash.
- Quick actions: one of everything, all weapons, all gear/armor, combat restock, and medical restock.
- During a raid, individual items can optionally be injected into available rig/pocket/backpack space for immediate testing.
- The panel is driven directly from `DeadhaulAuth.catalog`, so future catalog items appear automatically.
- `config.js -> adminPanelEnabled` is **true in this test build**. Set it to `false` before a public release.
