# 87 Freight Desktop

Official Windows desktop launcher for 87 Freight LLC.

## Automatic updates

This public repository distributes signed-by-hash GitHub Releases update assets for the Windows Electron desktop application. The **first** OTA-enabled version must be installed once. Afterward the running app checks GitHub Releases and installs downloaded updates on restart.

The updater uses electron-updater and the public GitHub Releases feed. No GitHub personal access token is embedded in desktop installations.

## Build

Windows: `npm ci` then `npm run build:win` after a lockfile exists, or `npm install` then `npm run build:win`.

The GitHub Actions release workflow builds the NSIS installer and publishes `latest.yml`, the installer and the `.blockmap` into the public GitHub Release. Increment `package.json` version for each release.

The six portal URLs are external live Vercel services and update without a desktop application release.

Application owner: 87 Freight LLC / Second Wall Holdings LLC / Four Walls Legacy Group.
