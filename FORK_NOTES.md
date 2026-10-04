# Fork notes: Jellyfin 10.11.11

Branch `fix/jellyfin-10.11.11`, based on upstream tag `3.0.2.0`. Tested on Jellyfin 10.11.11 with
File Transformation 3.0.1.0 and Plugin Pages 3.0.1.0.

## Build

```
dotnet build src/Jellyfin.Plugin.HomeScreenSections -c Release -p:JellyfinVersion=10.11.11
```

The default `JellyfinVersion` in the csproj targets 12.x. The value is baked into the assembly and
decides which jellyfin-web hooks `TransformationPatches` uses, so a 12.x build will not patch 10.11 correctly.

Install into `<jellyfin data>/plugins/Home Screen Sections_3.0.2.0/` (dll, deps.json, logo.png and a
`meta.json` with `targetAbi` `10.11.11.0`) and restart Jellyfin.

## Changes

- `main.jellyfin.bundle.js` gets a `userpluginsettings` route next to Plugin Pages' `userpluginsettings.html`.
  jellyfin-web's router strips `.html` on in-app navigation, so the "Modular Home" menu link ended on
  "Page not found". The file name has to be registered as plain text (`main.jellyfin.bundle.js`); a
  regex-escaped pattern was never applied by File Transformation.
- The main bundle URL in `index.html` carries `&hss=<version>.<CacheBustCounter>` so CDNs and browsers
  holding the unpatched bundle refetch it.
- `HomeScreenSections.js` rewrites a stale `#/userpluginsettings?...` hash to `userpluginsettings.html`.
- Spanish translations for the user-facing section titles and the Modular Home page.

## Setup gotchas

- With an empty `SectionSettings` in the plugin configuration no sections render at all. Add an entry
  per section id; a user can only enable sections that exist there.
- Disable Jellyfin's "Update plugins" task (or pin the plugin) so the repository version does not replace
  this build.

## Install from this repository

In Jellyfin: Dashboard > Plugins > Repositories > add

```
https://raw.githubusercontent.com/MUbeira0/jellyfin-plugin-home-sections/fix/jellyfin-10.11.11/manifest.json
```

then install "Home Screen Sections" from the catalogue. The zip is attached to the GitHub release
(`home-screen-sections_<version>.zip`); the manifest holds its MD5 checksum.

## Seerr page

If `JellyseerrExternalUrl` (or `JellyseerrUrl`) is set in the plugin settings, a "Seerr" page is registered:
a link in the main navigation drawer and one under "Plugin Settings", opening `/ModularHomeViews/seerr`, which
embeds Seerr in an iframe. The drawer entry and the Discover cards instead open it as a popup (`window.HSSSeerr`). The URL must be https when Jellyfin is served over https (browsers block mixed content),
and Seerr must be on the same site as Jellyfin for its login cookie to work inside the iframe.
