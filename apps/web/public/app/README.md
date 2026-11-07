# iOS app images for the landing page

The "iPhone & iPad" section on the landing page (`#app`) shows three phone screens, in this order (the middle one is the largest):

| File | Shows | Size |
| --- | --- | --- |
| `iphone-1.png` | Left: Today's plan | 1320 × 2868 (or any 1320:2868 image) |
| `iphone-2.png` | Middle: a lesson | 1320 × 2868 |
| `iphone-3.png` | Right: Progress | 1320 × 2868 |

They start as the App Store screenshots from `apps/mobile/store/screenshots/iphone`. Swap in your own by replacing the files with the same names; Next.js resizes them. If one shows something different, update its `alt` text in `IOS_APP.screenshots` in `src/lib/site.ts`.

When the app is live, set `IOS_APP.available` to `true` in `src/lib/site.ts`: the section then says "Out now" and the App Store badge links to the listing.
