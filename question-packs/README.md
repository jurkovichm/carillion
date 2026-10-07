# Question Packs

Edit these CSVs in Excel, Google Sheets, or a text editor. These are the source of truth for playable question data. `questions-days.js` is generated from them; do not edit it directly.

## Layout

```text
question-packs/
  2026-09-28/
    day.json
    01-miac-schools.csv
    ...
  2026-09-29/
    day.json
    01-man-eating-animals.csv
    02-harry-potter-characters.csv
    ...
```

Each day has seven question CSVs. `day.json` defines the date, display label, question order, prompts, source URLs, and optional source notes. The CSV filenames can be descriptive; their order in `day.json` controls play order. The latest dated folder becomes the default day.

## Research Format

Use exactly these three column headings:

```csv
ANSWER,Blurb,Worth
Cumulus|Cumulus cloud,A cloud type with a puffy appearance.,10
```

- **ANSWER:** Canonical answer first. Optional accepted aliases follow, separated by `|`. All aliases on a row earn just one catch. Do not put different scoring answers on the same row.
- **Blurb:** Optional short fact shown after the catch and in the answer bank. Leave blank when no fact is available. Existing Carleton questions also retain their legacy fallback facts.
- **Worth:** One of `10`, `15`, `30`, `60`, `85`, `100`. The ordinary editorial rarity ladder is `10 → 30 → 60 → 85 → 100`: higher means rarer, without implying measured answer frequencies. Reserve `15` (**QUIRKY**) for a familiar, deceptively obvious answer that feels clever or unexpected but is not obscure. It is a special exception, not an intermediate rarity tier; use it sparingly with no quota.

CSV means comma-separated columns, not pipe-separated columns. A spreadsheet handles commas, quotation marks, and line breaks inside cells automatically. Export as UTF-8 CSV. Capitalization, accents, and punctuation are normalized by the game's existing matching rules. Keep aliases unique within each question.

Give researchers the question prompt, source link, and a copy of `template.csv` in this folder. Ask them to return one completed CSV per question, not JavaScript. Keep drafts outside dated folders until all seven questions are ready.

## Add a Day

1. Copy an existing day folder and rename it to `YYYY-MM-DD`.
2. Update its `day.json`: `id` must match the folder; set `label`, seven prompts, CSV filenames, and source links. Replace inherited source notes when changing categories.
3. Replace the seven CSVs with researched answers.
4. From the repository folder, validate and build:

```sh
python3 scripts/build_questions.py --check
python3 scripts/build_questions.py
```

5. Reload the game and select the new day. For GitHub Pages, commit and push both the CSV pack and regenerated `questions-days.js`.

No Python packages are needed. Compilation keeps browser data in a normal script, so CSV loading does not introduce a fetch/server requirement for local-file play. Invalid packs fail before replacing the browser data file.
