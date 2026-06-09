# Outer London 03 — South London Orbital Link

This is a Cloudflare Pages-compatible one-page project website for the South London Orbital Link proposal. It uses plain HTML, CSS and JavaScript, with a scroll-controlled SVG route overlay, pseudo-3D map camera movement, section reveal effects, and a QR-ready References & GAI Statement section.

The public page can load the latest References & GAI content from Cloudflare Workers KV through Pages Functions. A lightweight `/admin.html` editor lets group members update that content without editing `index.html` manually.

## How to Open Locally

Serve the folder with any static file server.

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

Local static serving will show fallback References & GAI content because Cloudflare Pages Functions and KV are only available in the Cloudflare Pages runtime unless you run a compatible local Pages dev environment.

## Deploy to Cloudflare Pages

Public site URL placeholder:

```text
https://outer-london-03-slo.pages.dev
```

1. Push these files to a Git repository.
2. In Cloudflare Pages, create a new project from that repository.
3. Set the build command to empty.
4. Set the output directory to `/` or leave the default for a static root project.
5. Deploy.

No framework or build step is required. The only backend behavior is the Cloudflare Pages Functions in `functions/api/`.

## Cloudflare KV and Admin Setup

1. Create a Workers KV namespace named `SITE_CONTENT`.
2. Bind that KV namespace to Cloudflare Pages Functions using the binding name `SITE_CONTENT`.
3. Add a Cloudflare Pages/Workers secret named `ADMIN_PASSWORD`.
4. Deploy to Cloudflare Pages.
5. Visit `/admin.html` on the deployed site.
6. Enter the shared admin password and save the References, Image/Data Credits and GAI Statement.
7. The public page loads the latest saved content from `/api/content`.
8. If KV is not configured, the public page uses fallback content instead of crashing.
9. The Assessment 2 poster QR code should point to the public website, not directly to `/admin.html`.

Stored KV key:

```text
references_gai
```

Stored JSON shape:

```json
{
  "references": "...",
  "imageCredits": "...",
  "gaiStatement": "...",
  "updatedAt": "...",
  "updatedBy": "Outer London 03 group"
}
```

The admin password is never stored in frontend JavaScript or HTML. It is checked only by `functions/api/login.js`.

## Page Structure

The main content lives in `index.html`:

- `#route` — animated hero route over the OpenStreetMap-based background.
- `#problem` — problem snapshot, statistic cards and journey-time comparison.
- `#corridor` — premium heatmap evidence panel explaining the case study corridor.
- `#solution` — service definition, route chip and concept constraints.
- `#precedent` — Grand Paris Express Line 15 precedent placeholder.
- `#stakeholders` — stakeholder fit.
- `#indicators` — evaluation indicators.
- `#references` — QR-ready references, image/data credits, GAI statement and last updated status.

Edit visual tokens in `styles.css` under `:root`. Edit scroll camera stops in `script.js` under `cameraStops`.

`assets/corridor-heatmap.png` is an OpenStreetMap-based corridor background used by the sticky evidence hero. The animated density focus circles are schematic overlays controlled in `index.html`, `styles.css` and `script.js`; replace the image or overlay copy when the final demographic mapping source is confirmed.

## Map Background

The file `assets/map-background.png` is a stitched OpenStreetMap-based static image covering the wider corridor from Kingston and Surbiton through Sutton and Croydon. It was built from standard OpenStreetMap tiles and then treated with muted grey/green colour grading for the hero background.

To replace it with another OpenStreetMap-based export:

1. Open an OpenStreetMap view covering Kingston, Surbiton, Worcester Park, Sutton, Wallington and West Croydon.
2. Use a muted grey/green map style if available.
3. Export or screenshot a larger map than the visible card so the scroll camera has room to zoom and pan.
4. Save the replacement image as `assets/map-background.png`.
5. Keep the visible attribution in the page: `Map background: © OpenStreetMap contributors`.

Do not use Google Maps tiles or screenshots. Do not use map imagery without the proper attribution and license terms.

The current hero keeps the attribution visible inside the map panel. Do not remove it unless you replace it with an equivalent attribution treatment.

## Paris Line 15 SVG

The precedent section looks for:

```text
assets/paris-line-15-precedent.svg
```

If the SVG is missing, `script.js` leaves the designed placeholder card visible, so there is no broken image icon. The current asset is an original schematic designed for this site, visually adapted from the provided Paris Metro Line 15 official PDF diagram rather than copied as a screenshot. Replace it at the same path if the final project team prepares a more precise diagram.

## References and GAI Statement

Use `/admin.html` on the deployed Cloudflare Pages site to edit the public References & GAI content. The admin editor saves to KV through:

- `GET /api/content`
- `POST /api/login`
- `POST /api/save`

The `#references` anchor is ready for a poster QR code link. The poster QR code text should be:

```text
Scan for project website, references & GAI statement.
```

The poster QR should point to the public Cloudflare Pages site, not `/admin.html`.

Fallback content is defined in `index.html`, `script.js`, and `functions/api/content.js` so the public page still loads if the API or KV binding is unavailable.

## Route Alignment

The route overlay is schematic and not to scale. It is not engineering-verified, and station positions are visually plausible rather than precise.

Edit route coordinates in `index.html` inside the SVG path and station groups. Edit colours in `styles.css` under the `:root` tokens.

## Motion and Accessibility

The route drawing uses `stroke-dasharray` and `stroke-dashoffset`. Section reveals use `IntersectionObserver`.

If `prefers-reduced-motion` is enabled, the route, stations and page content show statically without scroll animation.
