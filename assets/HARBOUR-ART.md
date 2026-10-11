# Harbour artwork

`harbour-canoe.png` was created with the built-in imagegen tool, with genuine alpha transparency. The renderer measures its visible bounds, preserves the original image, and draws its near gunwale over the paddler. Cedar paddle details, mooring rope, gentle bobbing, and wakes are animated in the canvas. Woodland and water textures reuse `fishing-world-extended.png`; merchants and anglers reuse the character atlas.

Final canoe prompt:

> Production-ready transparent pixel-art canoe sprite for an existing woodland fishing game. One empty traditional wooden canoe, long horizontal silhouette with gently pointed upturned ends, seen from a slightly elevated front three-quarter view so the open interior, wooden ribs and two simple bench seats are visible. Detailed handcrafted 16-bit woodland RPG sprites: crisp small square pixels, warm honey cedar boards, dark walnut seams, golden worn gunwales, subtle teal reflected light on the shaded underside, natural texture and stepped pixel highlights. Match weathered golden brown dock timber, deep teal water, and emerald woodland. Entire horizontal silhouette fully visible with modest transparent padding. Empty centre for the paddler. No person, paddle, scenery, water, external shadows, text, logos, smooth vector polygons, 3D realism, modern fiberglass, or blur. Genuine alpha transparency; suitable for display at roughly 320 pixels wide.

## Basket-matched revision

`harbour-canoe-v2.png` is the active asset, edited with the built-in imagegen tool using the previous canoe as the edit target and `fishing-basket-atlas.png` as the style reference. The original is preserved.

Final edit prompt: Redraw the canoe in exactly the basket's chunky crisp pixel-art treatment and pixel density: large visible square pixel clusters, stepped silhouettes, bold dark brown outlines, warm amber wood highlights, and a limited palette of flat clustered shades. Preserve the empty horizontal canoe shape, open interior, two bench seats, slightly elevated front view, cedar/walnut colors, full silhouette, and genuine transparent alpha. Simplify wood grain into bold blocky clusters comparable to the basket's wicker pixels. No smooth gradients, fine-grain photoreal detail, text, person, paddle, water, or scenery.

The docked hull is at world (1310, 1130), downstream from the bridge, entirely inside the water channel. Its rope reaches the right bank; the boarding prompt activates on the dry path near (1745, 900).

## Storefronts and consumables

Created with the built-in imagegen tool and integrated as separate sprite layers:

- `harbour-fishmonger.png`: the fishmonger scene was redesigned into a transparent wooden stall using the basket as the pixel-treatment reference and the bridge as the timber, perspective, and palette reference. Final prompt required chunky square pixel clusters, stepped edges, warm clustered highlights, a teal-and-cream awning, golden plank counter, stout posts, wicker baskets, ice trays and scale, an empty service opening, and the exact sign “FRESH FISH”. Full silhouette, upper-left daylight, genuine alpha transparency; no people, UI, scenery, smooth gradients, blur or photoreal texture.
- `harbour-shoppe.png`: the shop scene was redesigned with the same basket and bridge references plus the completed fishmonger as a sister-store reference. Final prompt required weathered honey cedar, a blue-and-cream awning, stocked side shelves, beer, Butterburgers and sunglasses, empty central service window, exact “HARBOURSIDE SHOPPE” sign, and blue-and-white “Culver’s” branding. Same clustered shading, pixel density and lighting as the fishmonger; full silhouette and alpha transparency.
- `harbour-consumables.png`: a transparent 2-column, 3-row atlas replacing primitive consumables, referenced against the basket and shop. Final prompt required a handled beer mug at full, half-full and empty stages in the left column; Butterburger in a blue-and-white wrapper at whole, bitten and mostly eaten stages in the right column. Consistent position, geometry and scale, transparent gutters, chunky pixel clusters, stepped outlines and warm shading; no labels, people, scenery or smooth gradients.

The renderer crops alpha padding, inserts existing character sprites into each service opening, and redraws the near counter over them. Consumable frame crops share fixed bounds to keep the mugs and wrappers steady during animations. Merchants are positioned relative to their illustrated service windows. Soil and pier details use the existing world palette and visible pixel clusters.

## Continuous canoe journey

Canoe travel now uses the main river world at its existing scale. The hull moves downstream from (1310, 1130) to (1310, 1550) as the camera pans 280 world units downward, then the angler steps onto the shop pier. Return travel reverses the route and restores the angler to the boarding bank. The shop sprite is positioned on the original right bank at (1720, 1250), with a timber pier connecting its counter to the canoe. Lower water, when exposed by the pan, reuses the world water texture at its original pixel density. No alternate flat-color backdrop or zoom is used.

## Continuous river world

The fishmonger and shop riverbanks were generated with the built-in imagegen tool using their existing scene screenshots as edit targets and `fishing-world-extended.png` as the pixel-density, perspective, palette and lighting reference.

- `fishmonger-riverbank.png`: final prompt required varied dense woodland in the upper 40%, a broad curving golden footpath around the middle leading to the original bridge at the right edge, empty stall clearing, irregular grassy banks, native reeds/flowers/rocks and deep teal flowing water in the lower 45%. No people, structures, UI or straight rectangular seams.
- `harbour-riverbank.png`: final prompt required a natural wooded peninsula, empty sandy shop clearing, a short sturdy timber landing matching the bridge, irregular grass/reeds/river stones, and clear teal river for the canoe. Same upper-left daylight and visible clustered pixels as the lake; no shop, people, canoe, signs or UI.

The shop sits farther downstream at world (1720, 3650), outside the starting view. A eight-second canoe journey retains the dock's world scale and smoothly follows the river; boarding and disembarking remain separate character actions. Generated banks blend into the original scenery, water extends past viewport boundaries, and the camera frames the merchant/player above the shop controls. Ground shadows and water highlights share the existing palette. Exploring swimmers render in front of the canoe when their world depth places them nearer the camera.

The final downstream composition uses `harbour-continuous-river.png` (see `HARBOUR-CONTINUOUS-RIVER.md` for its imagegen references and prompt) as one continuous backdrop, sampled to the existing 6.4-unit pixel grid. It spans world (-300, 1120) through (2900, 5920), with a gradual upper junction to the original lake. Repeated water tiles and the pasted shop-bank patch are no longer used. The illustrated deck sets the player baseline at (1720, 3800), the shop at (1720, 3600), and the canoe below its front at y=4120. Boarding on return targets that current hull position, with leg occlusion preserving the standing-to-seated handoff.

The audited canoe route follows the curved channel in both directions, with the camera following the hull before settling on the shop. `tests/canoe-clearance.py` checks the hull against the connected shoreline in the generated backdrop. Harbour scenes disable the CRT overlay so the painted water remains free of screen-space grids.

Second audit: boarding/disembarking now take 1.8 seconds each, within a 9.4-second trip; water crossings use the swimming pose. Both paddling hands track the shaft, and paddle sounds occur only during travel. The river blend ends 384 world units downstream of its start, with an earlier turn into the channel. The clearance check covers the fully opaque river from y=1504 onward.
