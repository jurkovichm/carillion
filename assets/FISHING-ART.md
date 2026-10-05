# Fishing characters and loot

Created with the built-in image-generation tool from the approved three-character concept sheet and new lake-themed catch concepts. Sources remain unchanged. Atlases are sampled with nearest-neighbour scaling; character frames become 56-pixel-high sprites and catches use a bounded pixel grid. Character row gutters are recorded explicitly in `fishing-sprites.js`.

## Character prompt

Create a production game character sprite atlas using the three approved fisherman designs. Transparent background. Uniform grid of three columns and four rows, 12 full-body sprites, no text or separators. All cells equally sized, sprites centered, same visual height and feet baseline, clear padding. Column 1: Lakeside Regular, bearded, tan brim hat, olive vest, cream shirt, brown boots. Column 2: Student Angler, navy baseball cap, gold jacket, blue trousers, small satchel. Column 3: Old Professor, white beard, glasses, brown bucket hat, teal sweater. Row 1: base outfits. Row 2: headwear replaced by navy graduation mortarboard with gold tassel, no gown. Row 3: mortarboard and plain navy graduation gown, no ribbons. Row 4: mortarboard, navy gown, gold and light-blue distinction ribbons. Same stable standing pose, three-quarter facing right, right forearm extended to hold a rod; do not draw rods or lines. Crisp consistent pixel clusters, dark outlines, flat shading, no blur or antialiasing. Portrait 3:4.

Output: `fishermen-atlas.png`.

## Fish and loot sprites

Original sprites were generated from scratch using the built-in image-generation tool, with `fishing-world-extended.png` as the style/palette reference and transparent backgrounds. Full prompts are saved in [catches/PROMPTS.md](catches/PROMPTS.md). The generated PNGs preserve their original alpha; the renderer trims transparent margins and samples a higher-resolution nearest-neighbour canvas so the generated detail remains visible at game scale.

| Points / kind | File | Catch |
| --- | --- | --- |
| 10 | `catches/sunny-crappie.png` | Sunny / crappie |
| 15 | `catches/derpy-goldfish.png` | Derpy goldfish |
| 30 | `catches/bass.png` | Bass |
| 60 | `catches/walleye.png` | Walleye |
| 85 | `catches/rainbow-trout.png` | Rainbow trout |
| 100 | `catches/pike.png` | Pike |
| boot | `catches/old-boot.png` | Mossy old leather boot |
| bottle | `catches/message-bottle.png` | Sea-green glass bottle with a scroll |
| skeleton | `catches/skeleton-fish.png` | Ivory skeleton fish |

Gameplay waits for all nine catch sprites before starting. Fish keep their rarity sizing during flight and in the basket.

## Catch basket

`fishing-basket-atlas.png` was generated from the supplied wicker basket reference with its red and cream gingham cloth. The transparent atlas contains two aligned square cells: the complete empty basket, then its foreground wicker/cloth layer. `fishing.js` draws catches between the layers, keeps full-sized heads and tails protruding around the small opening, and brings airborne fish down behind the front rim. The basket is drawn at half its initial size on the sandy bank; mobile positioning leaves room for protruding full-sized fish. The original generated asset is retained outside the repository.

## Bridge depth

Draw the angler in front of the bridge deck. Then draw the transparent foreground timber layer traced on the original 320×534 grid: two horizontal logs and stepped vertical posts. Leave the board backing behind the legs; do not include neighboring board rows in the timber mask. Draw the moving rod/reel and fishing line afterward. Do not redraw the entire front face over the angler.
