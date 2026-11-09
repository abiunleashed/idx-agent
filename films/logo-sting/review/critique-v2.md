# Critique: draft-v2 (independent viewer)

Film: renders/draft-v2.mp4, 540x960, 24 fps, 6.5 s, 156 frames. Seen as a first-time viewer.

The logo reads well. From 4.2 s the drop, bean and ring mark, "arabica" and "ZAMZAM COFFEE" are sharp and centred a little above the middle, a safe spot for 9:16. Nothing looks broken: no boxes, hard edges, one-frame pops (QC 0), duplicate frames (0), jumps or cut-off parts. The drop-to-outline morph (2.6-3.0 s) is smooth.

## Biggest problems, worst first

1. **4.4-6.5 s · the light pass barely shows.** In the strip of the logo at 5 fps (`review/v2-frames/strip-sweep.png`) the eleven frames look almost identical. The logo area gets only +1.2 luma levels brighter at 4.5 s and +0.75 at 5.85 s compared with the last frame. In the full-size crops (`review/v2-frames/crops.png`, 4.5 / 5.85 / 6.45 s) you can only just see a faint band on "ra" and later on "abi". A viewer sees about 2 s of hold where nothing happens, and QC flags scene #3: "nothing moves", residual 0.70. **Fix:** make the sweep band about 3x brighter (a peak of about +30-40 luma on the gold, additive) and narrower. Run it once, left to right, over about 0.8 s starting near 4.6 s, so it ends before the closing hold.
2. **0.0-1.8 s · a small drop in a near-black frame, falling slowly.** At 0.3 and 1.0 s (`review/v2-frames/sheet.png`, tiles 1-2) the drop is about 25 px wide on a 540 px frame. It falls about 380 px in 1.8 s, which feels floaty for liquid. QC also counts 0-1.875 s as "black". On a phone feed this is the moment a thumb scrolls past. **Fix:** make the drop about 1.5x bigger, cut the fall to about 1.0-1.2 s with gravity ease-in, and add a faint warm glow from the start (the vignette now appears only at about 1.8 s).
3. **3.0-4.2 s · the name fades in muddy.** In `review/v2-frames/strip-land.png` (bottom row), "arabica" shows as a dark brown ghost for about 0.5 s before it turns gold, and it reads as dirty type. **Fix:** fade opacity on the gold fill instead of ramping colour from brown, or start it at 30% gold. Keep the same timing.

Sound (numbers only, I cannot hear): I -14.3 LUFS and true peak -3.7 dBFS, both fine. Scene #1 (0-2.2 s) is +4.1 dB harsh in 2-5 kHz, and scene #2 (the landing and morph, 2.2-4.3 s) is 6.4 LU quieter than the rest. The landing is the hit and should not be the quiet part. Bring #2 up by about 4-5 LU and soften the 2-5 kHz content of the fall by about 3 dB.

Verdict: FIX
Red items: none
Polish: a visible light sweep (#1), a quicker and larger drop with early glow (#2), a cleaner name fade (#3), a louder landing hit
Evidence: frames at 0.3/1.0/1.8/2.3/3.0/3.6/4.2/4.8/5.5/6.3 s (review/v2-frames/sheet.png); strips at 0-0.5 s (start.png), 2.2-3.4 s (strip-land.png) and 4.3-6.5 s (strip-sweep.png); full-size crops at 4.5/5.85/6.45 s (crops.png); logo-region luma gain against the last frame (max mean +1.2 at 4.5 s); review/qc-draft-v2/report.txt (pops 0, dups 0, black 0-1.875 s, scene #3 residual 0.70, I -14.3 LUFS, TP -3.7, scene #2 -6.4 LU)
