# Chronicles of the Valley

An action RPG prototype built with the included Tiny Swords assets. Choose a hero, defend the valley, and defeat all nineteen invaders across four waves. No dependencies need to be installed.

## Running the game

Run this command from the project directory:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Controls

- `1`–`4` or click a card: select a character class.
- `1`–`3` or click a card: choose an upgrade when leveling up.
- `WASD` or arrow keys: move the hero.
- `Space` (hold to repeat) or click: use the selected class ability. Clicking also turns the hero toward the cursor.
- `P` or `Esc`: pause and resume. The game also pauses automatically when the window loses focus.
- `M`: toggle sound effects (the setting is remembered).
- `Enter`: fight again with the same hero after a battle ends.
- `R` or click: return to class selection after winning or losing.

### Touch controls

On phones and tablets, drag on the left half of the screen to move with a virtual joystick and tap the right half (or the **Attack** button) to use your ability. The round button above it pauses the game, and the pause menu has a sound toggle.

## Character classes

- **Warrior:** balanced melee fighter with a strong sword strike.
- **Archer:** fast ranged attacker who fires arrows.
- **Lancer:** durable melee fighter with greater reach.
- **Monk:** releases an area pulse that damages enemies and restores health.

## The world

The valley is a tile-built island on animated water, assembled from the Tiny Swords tilemaps instead of hand-drawn shapes. The flat ground uses 9-slice autotiling, so every coast picks the correct edge, strip, or single piece, and its shore lip; animated foam from the `Water_FlatGround` sheets lines every shore, turned to face the land. The coastline forms bays and headlands, with a northern bay, a southern cove, and an inland lake. Raised terraces built from the *Elevation On Land* tiles add cliffs and height: the blue castle (color 1 grass) and the red castle (color 2 grass) each crown their own terrace, and three wooded hills frame the battlefield. Water and terraces are solid, arrows stop at cliffs, and scenery that would fall in the water or on a cliff is skipped automatically. The world also uses houses, towers, bushes, sheep, hazardous campfires, four tree types, and four rock types from the pack, all sharing global depth sorting with the characters.

The island is alive. Sheep and villagers have real bodies: the hero and the invaders cannot walk through them, and they collide with water, cliffs, and scenery. The flock grazes and wanders around its meadow; when the hero or an invader comes close, each sheep scores sixteen escape headings (away from the threat, toward open ground, never into a dead end or close past the threat) and bolts away bleating, slipping around the hero when cornered. At the village work site, Pawn villagers from the pack chop a tree (with flying wood chips), hammer at a house under construction, and carry timber between the two. They plan routes on a navigation grid that avoids water, cliffs, and obstacles, re-plan around anyone blocking the way, and run to shelter by the blue tower when invaders come near, returning to work once it is safe. The middle of the valley holds the smouldering ruins of an old watch, and a lookout tower watches the red houses. Subtle ambience completes the scene: swaying grass tufts, fluttering butterflies, a flock of birds with ground shadows, drifting cloud shadows, and glints twinkling on the water.

Combat uses directional hitboxes, timed attack animations, projectiles that stop at buildings, trees, and rocks, collision-aware knockback, invulnerability frames, enemy attack windups, and death effects. Enemies keep their spacing instead of stacking, floating numbers show damage and healing, the screen shakes on heavy hits, and a pulsing arrow at the screen edge points to the nearest invader whenever none are in view. Sound effects are synthesized with the Web Audio API, so the game still needs no audio files.

The static ground is painted once into an offscreen canvas and only the visible slice is copied each frame; just the shoreline water is animated per frame.

The interface is a pixel-art UI kit drawn entirely in code, since the asset pack has no UI sprites: wooden frames with chamfered ink outlines, wood grain and iron or gold corner plates; parchment and slate interiors; cloth ribbons with notched tails for titles; bevelled buttons with hover states; glossy segmented bars; and small pixel icons (heart, gem, bolt, sword, boot, arrow, hourglass, skull). Text uses the Pixelify Sans pixel font from Google Fonts, falling back to Georgia when offline. The Hall of Heroes shows the village behind a vignette, with hero cards that preview each class on a small stage, stat pips, and a number badge for its keyboard key; hovered cards glow and the hero starts running. During battle, a framed HUD shows the hero's portrait and level badge with health, experience, and ability bars, plus a battle plate with wave and kill progress. Wave announcements are animated ribbons, the Flame Warden has an ornate health bar, and the controls hint uses keycaps. Pause and results screens use real buttons. Desktop, compact, and mobile layouts reflow class cards into a 2×2 grid and turn upgrade cards into rows.

## Fire

- **The village hearth** burns inside a ring of stones beside the starting point. Resting within its warm circle restores 1 health about every second while no invader is within range, so returning to the village between waves is a real choice.
- **The goblin bonfire** sits at the heart of the goblin camp, between two watchtowers and a hut. It burns anyone who touches it, invaders included: they take heavy damage and keep burning for a moment, so luring or knocking them into it is a valid tactic.
- **The Flame Warden** rises from that bonfire, which flares higher while he lives. Every swing leaves a line of flames on the ground, and every few seconds he calls fire down on the hero's position after a short warning ring. When he falls, his flames gutter out and the bonfire goes cold, leaving only smoking embers.
- **The ruins** of the old watch still smoulder, with small fires and smoke rising from the rubble.

## Battle progression

The battle contains three increasingly difficult enemy waves followed by the Flame Warden, a goblin boss with high health, extended attack range, and heavy knockback. Defeated enemies grant experience. Leveling pauses the battle and offers three random blessings out of five: damage, health, movement speed, attack range (which also extends the archer's arrows), or faster ability recharge. Every level earned is kept, so crossing two thresholds at once grants two choices. Clearing a wave restores up to 2 health.

The results screen shows battle time, level, kills, and damage taken. Your fastest victory for each class is saved in the browser.
