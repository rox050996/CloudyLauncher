# CloudyLauncher

CloudyLauncher is a Windows desktop launcher for managing and launching custom Minecraft Java Edition experiences.

The project is currently under active development.

## Features

- Microsoft account authentication
- Minecraft Java Edition profile authentication
- Automatic Java runtime installation
- Automatic Minecraft installation and repair
- Automatic mod loader installation
- Isolated game instances
- Per-instance mods and configuration
- Configurable Minecraft RAM
- Private instance access through codes
- Planned automatic modpack updates

## Authentication

CloudyLauncher uses Microsoft's official authentication flow.

The launcher does not collect or store Microsoft account passwords.

Authentication is completed through Microsoft's official sign-in service and is then used to authenticate the user's Minecraft Java Edition profile.

CloudyLauncher does not bypass:

- Minecraft ownership checks
- Microsoft authentication
- Minecraft license checks
- Account security
- Minecraft Services authentication

A legitimate Minecraft Java Edition account is required for authenticated play.

## Technology

CloudyLauncher is built with:

- Electron
- Node.js
- Microsoft Authentication Library (MSAL)
- XMCL libraries

## Status

CloudyLauncher is currently in development and is not yet distributed as a public release.
