# Critique: draft v3 (independent viewer, cold)

Film: renders/draft-v3.mp4, 20.0 s, 540x960, 24 fps, 480 frames. Watched as frames only, with no sound, as a first-time viewer.

Muted test: "A golden drop moves across desert dunes, a trail of coffee beans follows it, it falls into a cup, and the cup turns into the Arabica Zamzam logo." That holds. The line on screen does not: it reaches the viewer as three loose words with dead air between them.

## 1. RED: the one sentence on screen is broken into three hanging pieces (about 4.0 to 14.5 s)
- What a viewer sees: "Arabica beans" (about 4.0 to 6.5 s), then about 2 s of empty sky (7 and 8 s on the sheet), then "fermented" (about 8.5 to 10.5 s), then about 2 s empty again (11 and 12 s), then "with Zamzam water." (about 12.5 to 14.5 s). "with Zamzam water." also lands in a new, closer framing on the light sky. Each fragment stays alone on screen and finishes nothing, which breaks the "no line left hanging" rule. "fermented" read by itself is also a strange word to show in a coffee ad.
- Frames: review/qc-draft-v3/sheet.jpg tiles 5 to 13 s; review/v3-frames/text-band.jpg (top band, every 0.5 s from 4 to 14.5 s).
- Smallest fix (a retime, no new words): close the gaps so each piece adds to the last and none disappears. Show "Arabica beans" from 4.0 s, add "fermented" below it at about 6.5 s, add "with Zamzam water." at about 9.0 s, and hold all three lines together until about 13.5 s. This puts about 4.5 s of reading time on the complete sentence.

## 2. RED: hard-edged grey rectangle across the logo (about 18.9 to 19.2 s)
- What a viewer sees: the end-card shine is a flat grey slab with straight top, bottom and left edges. It sits to the left of "arabica" and then crosses it, and it shows outside the letterforms over the black background. It looks like a render glitch, and it appears on the brand's final frame.
- Frames: review/v3-frames/f18.9.png (third panel of review/v3-frames/four.jpg), and review/qc-draft-v3/strip-18s.jpg frames 6 and 7. Also visible in the 19 s tile on the sheet.
- Smallest fix: mask the shine to the logo and wordmark shapes (clip or source-in), or soften its edges with a gradient feather of about 40 px on each side. If neither fits in time, drop the sweep. The logo holds well without it.

## 3. The dunes break into stair-steps and stripes (2 to 4 s, worst at 11 to 14.5 s)
- What a viewer sees: the ridge lines are jagged steps, not curves (2 to 4 s). In the close framing from 11 to 14.5 s the sand turns into horizontal terraces and banding. On a phone this reads as a cheap render or broken shading, right when the bean trail should look its best.
- Frames: review/v3-frames/dunes.jpg (crop from 1.5 to 2.25 s), review/v3-frames/f13.0.png (second panel of four.jpg), and sheet tiles 11 to 14.
- Smallest fix: raise the dune layers' segment count or path resolution (for example about 4x the points per ridge) and add a slight blur or dither to the sand gradient so the bands disappear. Composition and timing do not change.

## Notes (not reasons for another round)
- At 3 s the brand line "ARABICA ZAMZAM COFFEE" is small (about 12 px high at 540 wide) and sits low on dark sand. It can be read, but it is easy to miss. Make it about 1.5x larger or drop it, because the end card names the brand anyway.
- "ZAMZAM COFFEE" under the wordmark (18 to 20 s) is very small and thin. Zamzam is the hook of the product, so at least double that line's size.
- At 13 s "with Zamzam water." sits on pale pink sky with low contrast. Add a soft dark shadow, or keep the earlier dark-sky framing until the line has read.
- The cup (16 s) arrives as the film's payoff but holds for only about 1 s before the fade to black. Holding it 0.5 s longer would make "this is a cup of coffee" land.

## Measured (from review/qc-draft-v3/report.txt)
- Integrated loudness -13.8 LUFS (target -14 +/-1): pass. True peak -2.9 dBFS: pass. No silences, no black runs, no frozen frames, 0 duplicate frames, 0 one-frame pops, hook motion pass.
- I cannot hear the film, so the sound is judged only from these numbers.

Verdict: FIX
Red items:
- 4.0 to 14.5 s: the on-screen sentence is split into three fragments with about 2 s gaps between them (a hanging line). Retime it so the lines build up and the full sentence holds together.
- 18.9 to 19.2 s: the logo shine is a hard-edged grey rectangle that shows outside the logo. Mask it, feather it or remove it.
Polish: smooth the stair-stepped and banded dunes (2 to 4 s, 11 to 14.5 s); make "ZAMZAM COFFEE" and the 3 s brand line larger; add contrast behind "with Zamzam water."; hold the cup about 0.5 s longer.
Evidence: review/qc-draft-v3/sheet.jpg (1 frame/s), review/qc-draft-v3/strip-14.5s.jpg, review/qc-draft-v3/strip-18s.jpg, review/v3-frames/four.jpg (3.0 / 13.0 / 18.9 / 19.1 s), review/v3-frames/text-band.jpg, review/v3-frames/dunes.jpg; report.txt: -13.8 LUFS, -2.9 dBTP, 0 cuts, 0 pops, 0 duplicates.
