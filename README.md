# DEADHAUL Build 2.6.0 — Safehouse / Stash / Body Pass

Build 2.6.0 turns extracted loot into usable progression instead of a throwaway summary.

## New in this build

- Persistent safehouse stash after extraction.
- In-bunker stash/loadout panel. Press **TAB** in the safehouse or interact with the stash shelves.
- Equip and unequip helmets, armor, rigs, backpacks, primary weapons and sidearms.
- Prepare a raid backpack from the stash before deploying.
- Drop backpack items during raids and pick them back up from the world.
- Item thumbnails/icons throughout inventory and looting UI.
- Safehouse display slots for recovered items.
- Safehouse customization: theme, lighting and display wall controls.
- First-person body/chest awareness improvements.
- Downward look is clamped to a more normal shooter range.
- UI click/confirm sounds.
- Concrete/metal footstep sounds.
- Improved ragdoll-style enemy death physics.

## Controls

- **WASD** move
- **Shift** sprint
- **Space** jump
- **LMB** fire
- **RMB** aim
- **R** reload
- **E** interact/search/open container
- **TAB** inventory in raid / safehouse stash in bunker
- **G** grenade
- **T** flashlight
- **F6** weapon alignment editor
- **ESC** settings

## Safehouse flow

1. Extract from a raid.
2. Recovered items are committed to your safehouse stash.
3. Return to the bunker.
4. Press **TAB** or use the stash shelves.
5. Equip gear, unequip gear, move items into your prepared raid backpack, or display favorite finds in the safehouse.
6. Deploy again with the prepared backpack.

## Local testing

Run:

```text
START-DEMO.bat
```

or jump straight into the game with:

```text
PLAY-TEST.bat
```

Local port: **8804**

Confirm the HUD says **BUILD 2.6.0**.

## Supabase note

If you already connected real Supabase credentials, keep your existing `config.js` when overwriting a previous GitHub build.

Build 2.6.0 adds inventory insert/delete RLS policies in `sql/schema.sql` so connected accounts can move stash items into equipment and prepared bags.
