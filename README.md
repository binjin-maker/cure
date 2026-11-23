# LAWLESS — SECTOR-07

A Criminality-style free-roam fighting game. Sector-07 is a walled-off, overcast brick city, and below it are the Subway, the Sewers and Vibe Check. Features: 60+ weapons, dealers, armories, the Rebel Dealer, ATMs, safes, registers, scrap piles, crates, airdrops, the downing system, bounties and levels. First and third person.

## Play
1. Download `LawlessLauncher.ex_` and rename it to `LawlessLauncher.exe`.
2. Run it. It downloads the latest build and opens the game in its own window.

## Updates
The launcher checks this repo every 15 s while you play. New commits download in the background and apply on the main menu, after death, or right away with **F9**. The launcher updates itself when `launcher/build.txt` goes up. (`CureLauncher.ex_` is kept so older launchers can upgrade.)

Saves: `%LOCALAPPDATA%\Cure\save.json`.

## Dev
`./build.sh` regenerates `game/manifest.json` and rebuilds the launcher.
