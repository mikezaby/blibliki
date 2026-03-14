# Blibliki Pi Display ASCII Mockup

This file is a quick visual companion to the main design draft. It is not a pixel-accurate spec. Its job is to make the agreed dashboard structure easy to discuss.

## Current layout intent

- Landscape only
- Header plus three horizontal bands
- Full `8` globals always visible
- Full upper and lower page rows always visible
- Musical values, not debug values
- Strong highlight on the most recently touched control
- No meters in `v1`

## Legend

- The third line in each band is a placeholder encoder-position indicator
- `>` marks the currently focused control
- Labels are intentionally abbreviated to fit compact screens

## Dashboard sketch

```text
+--------------------------------------------------------------------------------------------------+
| BLIBLIKI PI     Blank Template 01     Track 03: Wavetable     Page 2: Filter / Mod       PLAY   |
+--------------------------------------------------------------------------------------------------+
| GLOBAL                                                                                           |
| TMP | VOL | SWG | MCF | MRQ | REV | DLY | M1                                                    |
| 124 | -6dB| 54% | 3.2k| .31 | 22% | 18% | .00                                                   |
| --o-| ---o| --o-| ---o| --o-| -o--| -o--| --o-                                                  |
+--------------------------------------------------------------------------------------------------+
| FILTER                                                                                           |
| CUT | RES | TYPE | AMT | ATT | DEC  | SUS | REL                                                 |
| 2.4k| .42 | LP24 | 37% | 12ms| 420ms| 62% | 180ms                                               |
| ---o| --o-| --o- | -o--| o---| ---o | --o-| --o-                                                |
+--------------------------------------------------------------------------------------------------+
| MOD                                                                                              |
| LFO | TGT | WAVE | FREQ | OFFS | >AMT | SYNC | PHASE                                             |
|  2  | P+F | SINE |  1/8 |  0%  |  42% |  ON  |  90°                                              |
| -o--| --o-| --o- | ---o | --o- | ---o | ---- | --o-                                             |
+--------------------------------------------------------------------------------------------------+
```

## Notes

- The final graphical version should replace the ASCII position markers with small encoder arcs or ring indicators.
- Moving from `5"` to `3.5"` should keep the same structure and visible control count.
- The main adaptation for `3.5"` should be tighter spacing, shorter labels, and stricter value formatting rather than a new screen layout.
