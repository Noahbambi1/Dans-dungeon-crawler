#!/bin/bash
# Setup script for initializing git and pushing to remote

set -e

echo "Initializing git repository..."
git init

echo "Adding remote repository..."
git remote add origin https://github.com/Noahbambi1/Dans-dungeon-crawler.git

echo "Adding all files..."
git add .

echo "Creating initial commit..."
git commit -m "Initial commit: Dungeon crawler card game

- Complete game implementation with deck filtering (removes red royals, red aces, jokers)
- Health system (20 max, hearts heal)
- Weapon system (diamonds, damage calculation, weapon degradation)
- Monster combat (clubs/spades, direct damage or weapon combat)
- Floor progression system
- Run away mechanic (once per game)
- Beautiful card UI with classic deck styling
- Drag and drop interactions"

echo "Setting branch to main..."
git branch -M main

echo "Pushing to remote..."
git push -u origin main

echo "Done! Repository is set up and pushed to GitHub."

