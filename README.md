# CARILLION — the daily catch

A Carleton-themed trivia game with pixel-art fishing. Choose a question day and one of three anglers, then play seven questions with 25 seconds of answer time each.

## Run locally

Serve the repository with Python 3:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://localhost:4173/index.html`. On macOS, double-click `play-game.command` to start a server on port 8000 and open the game. Use an HTTP server so canvas artwork can be sampled safely.

The application is static HTML, CSS, and JavaScript. It has no backend, npm build step, or required Python packages. Sound, angler, and quick-mode preferences are saved in browser local storage. Fonts load from Google Fonts; game artwork and audio are local.

## Gameplay

- **Single-cast** is the default: the first correct answer ends the question, and the result remains until Next Cast.
- **Multi-cast** accepts multiple unique answers until time runs out or the player finishes the question. Aliases of a caught answer cannot score again.
- Answers score 10, 15, 30, 60, 85, or 100 points. These are curated rarity tiers. Spelling suggestions require another submission to confirm.
- The answer clock pauses during catches and settings dialogs. A normal catch reveals after 1.5 seconds, then lands over another 1.5 seconds. Reduced motion shortens this sequence; Settings → Quick mode skips it.
- An empty question earns a boot or skeleton for −5 points. Give Up has a 10% chance of a zero-point bottle containing a sourced Carleton fact. Ending after a successful catch has no penalty. Scores may be negative.
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
| `fishing-sprites.js` | Angler/loot atlas sampling and sprite drawing |
| `fishing.js` | Canvas scene, viewport sizing, fish drawing, and catch animation |
| `fishing-game.js` | Gameplay state, clock, day/mode selection, catches, rewards, and sharing |
| `question-packs/` | Editable daily question manifests and CSVs |
| `scripts/build_questions.py` | Validates packs and generates `questions-days.js` |
| `tests/` | Data, sharing, and browser regression checks |

Scripts are ordinary browser scripts sharing global bindings. Keep their order in `index.html`: question data → core → UI → sprites → scene → gameplay. The scene starts one animation loop; gameplay owns the round lifecycle. `questions.js` remains as historical curated data and is no longer loaded by the game.

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
```

Browser tests require Playwright and an installed browser. Set `PLAYWRIGHT_MODULE` to its module path if it is not locally installed, and `BROWSER_CHANNEL=msedge` or `chrome` to use an installed browser. They start a temporary local server and check desktop, mobile, landscape, and reduced-motion layouts, both cast modes, catch timing, sharing, settings pauses, and quick-mode penalties. Screenshots are written to `/private/tmp`.

Artwork lives in `assets/` and `sprites/`; see [art notes](assets/FISHING-ART.md). The active fish come from `sprites/NewRiverFishAssetPack1.0`; other packs are retained as source assets.
