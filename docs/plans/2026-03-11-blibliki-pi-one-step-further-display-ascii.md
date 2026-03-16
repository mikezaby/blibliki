# Blibliki Pi Display ASCII Mockup

This file is a quick visual companion to the main design draft. It is not a pixel-accurate spec. Its job is to make the agreed dashboard structure easy to discuss.

## Current layout intent

- Landscape only
- Header plus three horizontal bands
- Full `8` globals always visible
- Full upper and lower page rows always visible
- Musical values, not debug values
- Stable in-place updates instead of popup focus behavior
- No meters in `v1`

## Legend

- The third line in each band is a placeholder encoder-position indicator
- Labels are intentionally abbreviated to fit compact screens

## Dashboard sketch

```text
+--------------------------------------------------------------------------------------------------+
| BLIBLIKI PI     Untitled     Track 3: Pad     Page 2: Filter / Mod                       PLAY   |
+--------------------------------------------------------------------------------------------------+
| GLOBAL                                                                                           |
| BPM | SWG | MCF | MRQ | REV | DLY | --- | VOL                                                   |
| 124 | 54% | 3.2k| .31 | 22% | 18% | --- | -6dB                                                  |
| --o-| --o-| ---o| --o-| -o--| -o--| ----| ---o                                                  |
+--------------------------------------------------------------------------------------------------+
| FILTER                                                                                           |
| CUT | RES | TYPE | AMT | ATT | DEC  | SUS | REL                                                 |
| 2.4k| .42 | LP24 | 37% | 12ms| 420ms| 62% | 180ms                                               |
| ---o| --o-| --o- | -o--| o---| ---o | --o-| --o-                                                |
+--------------------------------------------------------------------------------------------------+
| MOD                                                                                              |
| LFO | TGT | WAVE | FREQ | OFFS | AMT | SYNC | PHASE                                              |
|  2  | P+F | SINE |  1/8 |  0%  |  42% |  ON  |  90°                                              |
| -o--| --o-| --o- | ---o | --o- | ---o | ---- | --o-                                             |
+--------------------------------------------------------------------------------------------------+
```

## Notes

- The final graphical version should replace the ASCII position markers with small encoder arcs or ring indicators.
- Value changes should update in place rather than opening a separate focus popup.
- Moving from `5"` to `3.5"` should keep the same structure and visible control count.
- The main adaptation for `3.5"` should be tighter spacing, shorter labels, and stricter value formatting rather than a new screen layout.
