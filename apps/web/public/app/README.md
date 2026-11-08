# iOS app images for the landing page

The "iPhone & iPad" section on the landing page (`#app`) shows the app's screens in a phone that cycles through them, with the screens either side peeking out behind it. They play in the order of `IOS_APP.screenshots` in `src/lib/site.ts`:

| File | Shows |
| --- | --- |
| `learn.png` | Today's plan |
| `lesson.png` | A lesson |
| `practice.png` | A practice problem |
| `progress.png` | Progress |
| `leagues.png` | The weekly league |
| `course.png` | The course map |
| `welcome.png` | The welcome tour, choosing Path or Audit mode |

Each is a raw iPhone capture with no frame (the page draws the phone), 1320:2868, saved at 660 × 1434. They come from `apps/mobile/store/screenshots/raw/iphone` (see `apps/mobile/store/capture/capture.sh`), resized with:

```bash
python3 -c "import sys; from PIL import Image; [Image.open(f'../../mobile/store/screenshots/raw/iphone/{n}.png').convert('RGB').resize((660, 1434), Image.LANCZOS).save(f'{n}.png', optimize=True) for n in sys.argv[1:]]" learn lesson practice progress leagues course welcome
```

To change one, replace the file with the same name; Next.js resizes them. If one shows something different, update its `label`, `caption` and `alt` in `IOS_APP.screenshots`.

When the app is live, set `IOS_APP.available` to `true` in `src/lib/site.ts`: the section then says "Out now" and the App Store badge links to the listing.
