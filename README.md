# multiACE-MakerDad

Snapmaker U1 multiACE / ACE2 Pro integration maintained by MakerDad.

## Current baseline

The current direct-line baseline is `v0.99.3b-MakerDad1.7`. Future releases
increase the MakerDad version by `0.1` and build on this baseline.

## Version archive

This repository contains the direct MakerDad release packages from `0.1` to
`1.7` together with the available release and test notes.

The special `1.4a` branch and earlier experimental `u1fix`/alternate-naming
packages are intentionally excluded.

## Important 1.7 changes

- Based on the direct upstream `v0.99.3b` line.
- Retains the `v0.99.3b` Web G-code upload workflow.
- Includes MakerDad 1.5 ACE2 Pro unload tip-forming reverse assistance.
- Restores the MakerDad 1.5 automatic-drying UI.
- Uses 100 mm additional swap purge and 0 mm anti-ooze retract by default.
- Validates loading through ACE2 Pro mileage and retries according to
  `load_retry`, reporting `进料失败` after retries are exhausted.
- Accepts mileage movement in either direction and normalizes uint64
  two's-complement counter values.
- Uses the extruder as the primary 100 mm retry pull while ACE2 Pro provides
  synchronized rollback assistance when load mileage validation fails.
- Bridges ACE2 Pro air-print detection to the original high/medium/low system
  setting and native `523/38` error.

See `releases/multiACE-v0.99.3b-MakerDad1.7-更新说明.md` for the Chinese release notes.
