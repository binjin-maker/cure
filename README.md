# CURE — SECTOR-07

A Criminality-style free-roam fighting game: Sector-07, the Subway, the Sewers and Vibe Check, with 60+ weapons, dealers, armories, the Rebel Dealer, ATMs, safes, registers, scrap piles, crates, airdrops, the downing system, bounties and levels.

## Play
1. Download `CureLauncher.ex_` and rename it to `CureLauncher.exe`.
2. Run it. It downloads the latest build and opens the game in its own window (Edge/Chrome app mode).

## Updates
The launcher checks this repo every 15 s while you play. New commits download in the background and apply on the main menu, after you die, or right away with **F9**. The launcher updates itself when `launcher/build.txt` goes up.

Saves live in `%LOCALAPPDATA%\Cure\save.json`.

## Dev
`./build.sh` regenerates `game/manifest.json` and rebuilds the launcher.
