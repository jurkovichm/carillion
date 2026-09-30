# CARILLION — the daily catch

## Editing Questions

Question research lives in `question-packs/YYYY-MM-DD/`, with one CSV per question using `ANSWER,Blurb,Worth`. See [the question-pack guide](question-packs/README.md) for aliases, research handoff, and adding new days. Run `python3 scripts/build_questions.py` after editing to regenerate the game's data.

A seven-prompt pixel-art fishing game. Serve this folder with any static server (for example, `python3 -m http.server 4173`) and open `http://localhost:4173`. Serving the files is required for the canvas artwork processing.

The original curated prompts, aliases, and rarity values are in `questions.js`. Answer matching, confirmation-based autocorrect, and the expandable post-game answer bank remain in `index.html`. `fishing-game.js` controls multi-answer rounds and extends the summary with every catch. The stationary bridge and lake are drawn by `fishing.js`; `fishing-sprites.js` handles playable characters, rewards, and loot. Responsive presentation lives in `fishing.css`.

Each question has 25 seconds of answer time and accepts multiple unique answers. Aliases of an already caught answer do not score again. The clock preserves its remaining milliseconds during the 2.7-second catch sequence and resumes automatically. Rarity and points reveal 1.3 seconds into the catch. Fish use the original 10/15/30/60/85/100-point values, are twice their previous size, and pile up on the left bank. Reduced-motion preferences disable ambient movement and shorten the landing.

Give Up or timeout on a question with no fish reels in a boot or skeleton for −5 points. Give Up on an empty question instead has a 10% chance of a bottle worth 0 points; timeout has no bottle chance. A bottle displays a sourced one-line Carleton fact and uses browser speech synthesis when available and sound is on. Muting cancels speech. Ending a question after a successful catch has no penalty. Negative scores are allowed.

Choose the Lakeside Regular, Student Angler, or Old Professor before playing; the choice is remembered locally. Each has cumulative outfits at 200 (cap), 300 (cap and gown), and 350 (cap, gown, and ribbons). Gear is earned from the highest score reached during that game, survives later penalties, and resets for a new game. The front railing is redrawn above the character so the fisherman stands on the bridge deck.

The summary retains all seven questions, the full answer bank, rarity ladder, answer facts, and sources. It adds per-question catches and loot, correct signed totals, caught-answer highlights, and earned gear. The score bar now compares against all unique curated answer points, since multiple answers are allowed.

The bridge composition has been redrawn and is rendered on a fixed 320×534 grid with a 32-color palette and nearest-neighbour scaling. The scene extends vertically into empty grassy hills above and an open lake below; Schiller still floats alongside the game. Catches use the supplied `sprites/NewRiverFishAssetPack1.0` fish: bluegill, yellow perch, largemouth bass, walleye, channel catfish, and muskie. Character and loot artwork is in `assets/fishermen-atlas.png` and `assets/loot-atlas.png`; see `assets/FISHING-ART.md` for generation notes. The separate `fishing_free` pack is not used.
