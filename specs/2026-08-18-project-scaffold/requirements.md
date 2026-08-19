# Requirements — Phase 0: Project scaffold

## Scope

Per `specs/roadmap.md` Phase 0: base HTML/CSS/JS structure, manifest file skeleton, service worker skeleton, icon set, and repo housekeeping. **No real functionality yet** — the goal is an installable, structurally-sound PWA shell that shows a placeholder screen, not any sun/weather/notification logic.

## Context (from parent specs)

- Stack is standard HTML/CSS/JS only, no frameworks, no build step, no backend — see `specs/tech-stack.md`.
- PWA non-negotiables apply from Phase 0 onward: manifest with `name`/`short_name`/icons, service worker, installability, offline fallback page, responsive layout, accessibility basics, automatic light/dark via `prefers-color-scheme` (`specs/tech-stack.md` → "PWA requirements").
- This phase lays the foundation other phases build on (sun calculation in Phase 1, geolocation in Phase 2, etc.) — it should not pre-build any of that logic.

## Decisions made for this phase

- **App naming:** `name` = "Golden Hour", `short_name` = "Golden Hour" (11 characters, within the ≤12 character guideline for home-screen labels).
- **Icons:** supplied by the user in `images/icons/` (not the originally-planned root-level `/icons/`; the manifest and plan below are updated to match). Files actually present:
  - `images/icons/icon-192.png` — 192×192, purpose `any`.
  - `images/icons/icon.png` — 512×512, purpose `any`.
  - `images/icons/icon-mascable.png` — 512×512, purpose `maskable`. Filename is a typo for "maskable" but is referenced as-is in the manifest rather than renaming a user-supplied file.
- **Repo housekeeping:** add a `README.md` (what the project is, how to run it locally) and an MIT `LICENSE` file.
- **Colours/theme:** use neutral placeholder `theme_color`/`background_color` values (no framework, dark-leaning neutral per `BRAND_DESIGN.md` direction) since the final golden/blue duotone palette is a Phase 11 decision. Do not hardcode a "real" palette here.
- **Service worker:** skeleton only — install/activate lifecycle and minimal app-shell caching (index.html, CSS, JS, manifest). The full offline strategy (cached location, offline sun calculation, stale-weather handling) is explicitly Phase 6, not this phase.

## Out of scope for this phase

- Sun/golden hour/blue hour calculation logic (Phase 1).
- Geolocation and manual location search (Phase 2).
- Live state indicator, weather, weather warnings, notifications (Phases 3–7).
- Final icon artwork and final colour palette (user-supplied icons land whenever provided; palette is Phase 11).
- Web Components — not needed yet since there's no repeated UI element on a single placeholder screen; introduce them when Phase 1+ actually has repeating elements (per `specs/tech-stack.md`).

## Open items for the user

- None remaining for icons — files are supplied (see "Decisions made for this phase" above). Icons are otherwise unresolved: no 512×512 "any" *and* separate maskable-safe-zone check has been done on the artwork; fine to defer polishing that to Phase 11.
