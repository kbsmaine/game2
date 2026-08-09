DEADHAUL custom weapon audio

Put MP3 files anywhere under assets/audio/weapons/ and point data/weapons.json at them.
Each weapon has its own independent events:
  fire       normal gunshot
  suppressed suppressed gunshot (reserved for suppressor gameplay)
  reload     complete reload sound
  dry        empty trigger click
  equip      draw/raise weapon
  action     pump, bolt, charging handle, slide or other mechanical action

An event can be one path or an array of paths. Arrays choose a random variant each time.
Example:
  "fire": [
    "assets/audio/weapons/ak74/fire_01.mp3",
    "assets/audio/weapons/ak74/fire_02.mp3"
  ],
  "reload": "assets/audio/weapons/ak74/reload.mp3"

Blank or unavailable paths automatically use the synthesized fallback sound.
Empty weapons produce exactly ONE dry click per trigger pull; holding LMB does not spam clicks.
