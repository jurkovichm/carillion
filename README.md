# CARILLION — the daily dive

A responsive pixel-art ocean game with Carleton College branding. Open `index.html` in a browser to play the seven-prompt round.

The animated scene and game interface are in `index.html`. Curated prompts and answers are in `questions.js`. Each prompt has answer forms (including aliases) and a hand-set `points` value. The live game’s observed rarity ladder is 10 (PLANKTON), 15 (TOO CLEVER), 30 (SCHOOLER), 60 (RARE), 85 (DEEP CUT), and 100 (ONE IN A KRILLION); points add directly to score and each point sinks 10m.

The post-dive summary includes the round log and the curated answer bank with per-question score distributions. Sound effects are synthesized in the browser with Web Audio and can be toggled from the sound button.
