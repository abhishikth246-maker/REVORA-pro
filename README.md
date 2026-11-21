# REVORA — rebuilt 3D configurator

This package preserves the REVORA dark/gold theme and existing configurator structure.

## Install on GitHub Pages
1. Download and extract this ZIP.
2. Upload/replace `index.html`, `style.css`, and `script.js` in the repository root.
3. Commit the changes to `main`.
4. Keep GitHub Pages set to `main` / root.
5. Open the site in Chrome and hard-refresh.

## Improvements
- Correct Three.js import-map usage with dynamic initialization.
- A visible error and retry action instead of an infinite loading overlay.
- Paint colours and finishes update the body material.
- Wheel finish/design variants update the wheel geometry appearance.
- Brake colour, carbon accents, wing, window tint and LED visibility are connected to the 3D scene.
- Ride height and track width update the model.
- Front/side/rear views, auto-rotation, orbit, zoom, reset, download and copy actions.
- Mobile-aware pixel ratio and shadow settings.

## Important
This is a procedurally generated 3D concept inspired by the 911 GT3 RS, not an official production Porsche mesh or mechanical simulator. The configurator requires an internet connection for Three.js from jsDelivr. A 100% guarantee across every phone/browser/network is not possible; the included failure state prevents an endless spinner and reports startup errors.
