# Golden Hour

Golden Hour answers a simple question: is it golden or blue hour where you are, right now?

It's an installable, offline-capable web app for photographers that shows golden hour and blue hour start/end/duration and sunrise/sunset times, plus (coming soon) a weather forecast with a warning when clouds or rain are likely to ruin the light.

See `specs/mission.md` for the full why behind the project.

## Status

Early scaffold (Phase 0 of `specs/roadmap.md`). There's no sun/weather logic yet, just the installable PWA shell.

## Stack

Standard HTML, CSS, and JavaScript. No frameworks, no build step, no backend. See `specs/tech-stack.md` for the full technical direction.

## Running locally

This is a static site with no build step. Serve the repository root with any static file server, for example:

```
npx serve .
```

or

```
python -m http.server
```

Then open the printed local URL in your browser. Opening `index.html` directly via `file://` won't register the service worker, since browsers require an HTTP(S) origin for that, so use a local server instead.
