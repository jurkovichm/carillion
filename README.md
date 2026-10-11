# CARILLION — the daily catch

A Carleton-themed trivia game with pixel-art fishing. Choose a question day and one of three anglers, then play seven questions with 25 seconds of answer time each.

Settings → Season offers Classic and Autumn. Autumn adds copper and gold foliage and warm interface colors across the fishing scene, harbour, and loon chase. The choice is saved on the device.

## Run locally

Serve the repository with Python 3:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://localhost:4173/index.html`. On macOS, double-click `play-game.command` to start a server on port 8000 and open the game. Use an HTTP server so canvas artwork can be sampled safely.

The application is static HTML, CSS, and JavaScript. It has no backend, npm build step, or required Python packages. Sound, angler, and quick-mode preferences are saved in browser local storage. Fonts load from Google Fonts; game artwork and audio are local.

## Gameplay

- The first correct answer ends the question, and the result remains until Next Cast.
- Answers score 10, 15, 30, 60, 85, or 100 points. These are curated rarity tiers. Spelling suggestions appear without casting and require another submission to confirm and cast.
- Each question starts with the rod on the angler's shoulder and the line out of the water. Each submitted guess plays a 0.85-second cast: the rod draws back, the line unfurls, and the float lands with a splash before the guess resolves. The answer clock pauses during the cast. Reduced motion and Quick mode skip it.
- Settings includes a CRT effect slider (0–100%) with live scanlines, phosphor texture, and edge shading. Its strength is saved across visits.
- The answer clock pauses during catches and settings dialogs. Bites last 0.65s (10), 2.4s (15), 1s (30), 1.8s (60), 3.4s (85), or 4.4s (100), then the revealed catch lands in a woven basket over another 1.5s. The float dips and runs, the rod bends under tension, and the angler yanks back to set the hook before pumping the rod and reeling the fish in with a splash. A visible downstream current carries broken highlights and dark troughs into small bank-side eddies. It is masked to the water and stays still with reduced motion. Reduced motion shortens this sequence; Settings → Quick mode skips it.
- An empty question earns a boot or skeleton for −5 points. Give Up plays one last cast before revealing the consolation catch, with a 10% chance of a zero-point bottle containing a sourced Carleton fact. Ending after a successful catch has no penalty. Scores may be negative.
- Only question 7 has a flat 10% chance of a loon theft after catching a fish or using Give Up, regardless of score, with at most one theft. The loon flies to the basket and grabs the latest fish or Give Up consolation catch before asking ‘A loon is stealing your catch! Fight?’ Yes starts a full-screen swimming chase with increasingly fast, close rocks and no visible timer; survive 20 seconds to recover the catch. No, Recast removes the catch and reopens the same question with a fresh clock. Losing a fight removes the catch’s points plus 30, ends the question, and marks its postgame result 💀. The stolen catch's points are removed; a stolen boot or skeleton refunds its −5 penalty. Other catches stay safe; stolen answers and all their aliases remain unavailable. Reduced motion uses a brief stationary theft; Quick mode skips the flight. Empty timeouts do not trigger theft.
- Before fishing, mobile players can drag the joystick to walk the selected angler across the bridge and banks. Walking completely off the right edge opens Flappy Angler, using that character's face. Tap, Space or Up to flap between posts; pause, retry or return to Lyman Lakes. Flight scores have their own saved best and do not affect trivia. Arrow keys or WASD also support pregame walking on a keyboard.
- Graduation gear unlocks at 200, 300, and 350 points, using the highest score reached during the game. Gear survives later penalties and resets for the next game.
- The summary shows catches, the complete answer bank, facts, sources, and earned gear. Copy score produces a date, seven result emojis, and the score without answer spoilers.

## Code map

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure and ordered stylesheet/script loading |
| `game.css` | Shared page, dialog, companion, and summary styles |
| `fishing.css` | Fishing presentation and responsive overrides |
| `game-core.js` | Shared DOM helpers, sound, answer matching, legacy fact fallbacks, answer-bank rendering |
| `game-ui.js` | Settings interactions and the Schiller companion |
| `fishing-sprites.js` | Angler atlas and fish/loot sprite sampling and drawing |
| `fishing.js` | Canvas scene, viewport sizing, fish drawing, and catch animation |
| `fishing-game.js` | Gameplay state, clock, day/mode selection, catches, rewards, and sharing |
| `loon-fight.js` / `loon-fight.css` / `loon-audio.js` | Loon choice, 20-second swimming runner, and catch recovery |
| `pregame-play.js` / `pregame-play.css` | Pregame joystick, walking, and the face-based flying minigame |
| `question-packs/` | Editable daily question manifests and CSVs |
| `scripts/build_questions.py` | Validates packs and generates `questions-days.js` |
| `tests/` | Data, sharing, and browser regression checks |

Scripts are ordinary browser scripts sharing global bindings. Keep their order in `index.html`: question data → core → UI → sprites → scene → gameplay. The scene starts one animation loop; gameplay owns the round lifecycle.

## Edit questions

Read the [question-pack guide](question-packs/README.md). Each dated folder contains a `day.json` and seven CSVs with `ANSWER,Blurb,Worth` columns. The latest dated pack is the default; players can select earlier days. Drafts in `Pending` are not compiled.

```sh
python3 scripts/build_questions.py --check
python3 scripts/build_questions.py
```

Commit both the edited packs and regenerated `questions-days.js`. Do not edit the generated file directly.

## Validate changes

```sh
python3 -B -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build_questions.py --check
node tests/days.cjs
node tests/share.cjs
node tests/game.cjs
node tests/theme.cjs
node tests/boarding-loon.cjs
node tests/extras.cjs
node tests/loon-fight.cjs
```

Browser tests require Playwright and an installed browser. Set `PLAYWRIGHT_MODULE` to its module path if it is not locally installed, and `BROWSER_CHANNEL=msedge` or `chrome` to use an installed browser. They start a temporary local server and check desktop, mobile, landscape, and reduced-motion layouts, single-cast completion, catch timing, sharing, settings pauses, and quick-mode penalties. Screenshots are written to `/private/tmp`.

For a guaranteed loon encounter in the in-app browser, run `python3 scripts/preview_loon.py` and open `http://127.0.0.1:8765/loon-preview`. The `/loon-checks` page runs transition, full-screen, win/loss, alias, and cancellation checks in that browser.

Artwork lives in `assets/` and `sprites/`; see [art notes](assets/FISHING-ART.md). The active fish and loot are original lake-themed pixel sprites in `assets/catches/`; their generation prompts are recorded alongside them.

## Wallet and harbourside shoppe

Every completed fishing game sells its remaining basket contents at $1 per 10 points (15 points = $1.50; negative items deduct money). The catch’s net value is applied once, with a $0 balance floor, before the approximately 20-second fishmonger visit. Skip returns directly to the summary with an empty basket and the full transaction saved. Quitting an unfinished game does not pay. Quick mode skips the scene.

The top-left wallet and sunglasses ownership are saved on this device in `carillion-harbour-v1`. Walk toward the canoe on the right bank using arrow keys/WASD or the mobile walking stick, then accept the boarding prompt (or press E). After a game, select **Walk to the shoppe** in the summary first. The shop sells beer and Butterburgers for $10 each and permanent sunglasses for $50. Food and drink are consumed immediately; finishing the third beer sends you back to the dock. Sunglasses can be equipped or removed. Purchases and visits are available only outside an active game.

`harbour.js` owns the wallet, sale, canoe, and shop states; `harbour.css` styles their controls. Load it after gameplay and pregame exploration. Run `node tests/harbour.cjs` with Playwright and an installed Chromium browser to check transactions, persistence, skip behavior, purchases, third-beer dismissal, and desktop/mobile/landscape layouts.
