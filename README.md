# Chronicles of the Valley

An action RPG prototype built with the included Tiny Swords assets. Choose a hero, defend the valley, and defeat all nine invaders. No dependencies need to be installed.

## Running the game

Run this command from the project directory:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Controls

- `1`–`4` or click a card: select a character class.
- `1`–`3` or click a card: choose an upgrade when leveling up.
- `WASD` or arrow keys: move the knight.
- `Space` or click: use the selected class ability.
- `R`: return to class selection after winning or losing.

## Character classes

- **Warrior:** balanced melee fighter with a strong sword strike.
- **Archer:** fast ranged attacker who fires arrows.
- **Lancer:** durable melee fighter with greater reach.
- **Monk:** releases an area pulse that damages enemies and restores health.

## The world

The map is divided into a blue village, a central battlefield, forest belts, a northern animated shoreline, and a red stronghold. Its ground uses repeatable 64×64 interior tiles from all three `Tilemap_color` sheets: color 3 for the valley, color 1 for the village, and color 2 for the enemy stronghold. Both settlement clearings and the bordered network of worn grass use irregular, pixel-aligned silhouettes instead of geometric shapes. The world also uses houses, towers, castles, bushes, sheep, hazardous campfires, four tree types, and four rock types from the Tiny Swords pack. Buildings, decorations, and characters share global depth sorting, while solid environmental objects and water have matching collisions.

Combat uses directional hitboxes, timed attack animations, projectiles, knockback, invulnerability frames, enemy attack windups, and death effects.

The interface uses pixel-aligned wood-and-stone panels across character selection, upgrades, gameplay, wave announcements, and results. During gameplay, a minimal translucent HUD combines health, experience, and ability cooldown in one small plate, while battle progress uses a second compact plate. Control hints fade out after five seconds and no permanent interface occupies the bottom of the screen. Desktop, compact, and mobile layouts progressively hide secondary information, reflow class cards into a 2×2 grid, and stack upgrade choices to preserve the playable view.

## Battle progression

The battle contains three increasingly difficult enemy waves followed by the Flame Warden, a goblin boss with high health, extended attack range, and heavy knockback. Defeated enemies grant experience. Leveling pauses the battle and lets you choose improvements to damage, health, movement speed, or attack range.
