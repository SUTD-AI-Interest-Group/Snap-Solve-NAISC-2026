# Splash screen rebrand & site-wide palette

Date: 2026-05-11
Status: Approved (pending spec review)

## Goal

Redesign the Snap & Solve splash screen to feel lively and human-centered, lightly brand it as an SUTD / NAISC event game, and adopt a new bright-orange + offwhite palette across the whole app. The palette change propagates from the splash into all menu screens and gameplay (player colors).

## Non-goals

- Logo design for "Snap & Solve" beyond the kinetic-type title.
- Animated SUTD logo / full motion brand identity.
- Dark/light theme toggle.
- Localization / i18n.
- Game flow, state-machine, control, or audio changes.
- Touch-screen or mobile-first responsive work beyond what naturally works at conference-laptop 16:9.

## Palette & theme tokens

Replace the current dark theme + oklch P1/P2 tokens with a new set of CSS custom properties in `src/app.css`.

| Token | Role | Value (approximate) |
|---|---|---|
| `--color-bg` | Page background on splash, nicknames, result, menus | `oklch(0.97 0.02 80)` — warm cream / offwhite |
| `--color-ink` | Default text + dark UI elements | `oklch(0.22 0.03 50)` — deep warm charcoal |
| `--color-primary` | Brand orange — titles, CTAs, accents | `oklch(0.74 0.19 50)` — bright orange |
| `--color-p1` | Player 1 (in-game) | alias of `--color-primary` |
| `--color-p2` | Player 2 (in-game) | `oklch(0.65 0.18 245)` — vivid blue |
| `--color-accent-green` | Complementary accent | `oklch(0.78 0.18 145)` |
| `--color-accent-yellow` | Complementary accent | `oklch(0.88 0.18 95)` |
| `--color-canvas-bg` | Backdrop behind in-game camera feed | alias of `--color-ink` |

Propagation rules:

- Splash, nicknames, and result screens use the cream background (`--color-bg`).
- Gameplay phases (`trackingCheck`, `snip`, `countdown`, `solve`) keep a dark backdrop — the live camera fills the canvas anyway, and a cream backdrop behind the feed would clash. The dark color is the new warm-charcoal ink, not the cold near-black we have now.
- Accents (green + yellow) are reserved for highlights, success states, and SUTD-branded micro-elements. They are never used as primary surfaces.

Approximate values are starting points. The implementer should verify legibility with a contrast checker and may nudge the lightness/chroma to maintain WCAG AA on primary text.

## Splash screen layout

The splash is a single full-viewport composition on the cream background, with five named regions.

### (1) Top branding tag

- Top-left corner, ~24px from edges.
- Small "NAISC 2026" wordmark in `font-mono` (Press Start 2P) at tiny size.
- Adjacent SUTD wordmark/logo. If `static/sutd-logo.svg` exists at build time, use it; otherwise fall back to a Lilita One "SUTD" text wordmark of the same height.
- 4px-tall color bar underneath using green + yellow accents — small chromatic flourish.

### (2) Hero center — title + framing hands

- "Snap & Solve" in Lilita One, solid `--color-primary` on `--color-bg`, slightly rotated per-letter keeping the existing kinetic character.
- Two large stylized hand illustrations angle in from left and right, fingers in a pinch — literally framing the title (the snip mechanic visualized).
- Left hand tinted via `--color-p1`, right hand tinted via `--color-p2`.
- Style: chunky line-art SVG, no realism, matching the Lilita One weight.

### (3) Tagline

- Below the title: *"Snip a picture with your fingers. Solve the puzzle. Beat your friend."*
- Fredoka (sans), `--color-ink`, medium weight.

### (4) Two cartoon player characters

- Two chunky cartoon figures flanking the lower composition, one bottom-left, one bottom-right.
- P1 (left) tinted `--color-p1`; P2 (right) tinted `--color-p2`.
- Each has one hand raised in a tiny pinch pose.
- Source: unDraw SVGs (see Assets section). Inlined into the Svelte component, color rewired via CSS so a single asset can be tinted twice.

### (5) CTA

- Center-bottom, below the tagline.
- Copy: *"Press SPACE to start playing"*.
- Style: chunky `--color-primary` pill with `--color-bg` text in Lilita One, soft drop shadow.
- The existing Space / Enter / click handler in `Splash.svelte` is reused unchanged.

### Layout sketch

```
┌──────────────────────────────────────────────────┐
│ [NAISC · SUTD]                                   │  (1)
│   ▰▰▰▰ (green/yellow bar)                        │
│                                                  │
│      ✋ ── Snap & Solve ── 🤚                     │  (2)
│                                                  │
│    Snip a picture · solve · beat your friend     │  (3)
│                                                  │
│   [char-P1]    [Press SPACE]    [char-P2]        │  (4) + (5)
└──────────────────────────────────────────────────┘
```

Designed for 16:9 conference display; also legible on a typical laptop screen.

## Animation & motion

Driven by anime.js v4 (already a dependency). No new libraries.

### Entry sequence (~1.2s, plays once on mount)

| Time | Element | Effect |
|---|---|---|
| 0–200ms | Background, branding tag | Cream fades in from a warmer tint; tag slides down 8px |
| 150–600ms | Title letters | Drop in one at a time, stagger ~60ms, anime.js `outElastic` overshoot |
| 400–900ms | Framing hands | Swing inward from off-screen left/right, settle into pinch pose |
| 700–1100ms | Cartoon characters | Bounce up from bottom edge with squash-and-stretch |
| 900–1200ms | Tagline, CTA | Tagline fades up; CTA scales from 0.92 → 1.0 |

### Idle loop (after entry)

- **Framing hands**: every ~3.5s, both hands do a single small pinch — thumb + index close together briefly (~250ms) then release. Slight phase offset left vs right.
- **Cartoon characters**: 4s breathing bob (translate-y ±4px, ease-in-out), independent phase per character.
- **Title**: no continuous animation — front-loaded drama, then still.
- **CTA**: 2s pulse — opacity 0.85 → 1.0 (or soft outer glow).
- **Accent color bar**: slow 6s gradient cycle between green and yellow.

### Accessibility & safety

- Wrap both entry and idle loops in `@media (prefers-reduced-motion: reduce)`. In reduced-motion mode, everything fades in over 200ms and idle loops are disabled.
- Framing-hand pinch animation must never obscure title text.

### Performance

- All animations are CSS transforms + opacity.
- Anime.js drives the entry timeline; idle loops are CSS keyframes (no JS frame cost while idle).
- Splash often runs concurrently with camera-permission prompt + MediaPipe init, so frame budget must stay low.

## Site-wide propagation

### Files changed

| File | Change |
|---|---|
| `src/app.css` | New token set per Palette section. Body background defaults to warm-charcoal `--color-ink`. Splash overrides bg to `--color-bg` via a scoped style. |
| `src/lib/ui/App.svelte` | Replace hard-coded color literals (`#ff8a5b`, `#5bb8ff`, `#ffb866`, `#66b8ff`) used for landmarks, snip rects, cursors, and board tints with reads from a new `src/lib/render/theme.ts` constants module that mirrors the CSS token values. One source of truth. |
| `src/lib/ui/Splash.svelte` | Full redesign per the Splash Screen Layout section. |
| `src/lib/ui/Nicknames.svelte`, `TrackingCheck.svelte`, `ResultScreen.svelte`, `PauseMenu.svelte`, `MuteButton.svelte`, `Countdown.svelte`, `SnipPhase.svelte`, `SolvePhase.svelte` | Already token-driven — inherit new values automatically. Each needs a quick visual sanity-pass for contrast/legibility under the new palette; targeted tweaks only if an issue surfaces. |
| `src/lib/components/ui/button` | Default variant picks up `--color-primary` and becomes the chunky orange pill. Other variants structurally unchanged. |
| Error overlay block inside `App.svelte` (camera / tracking errors) | Repaint: cream-on-warm-dark card, orange title, offwhite body, on a dark scrim. |

### Files NOT changed

- `src/lib/vision/*`, `src/lib/gesture/*`, `src/lib/game/*` — pure logic, no color dependencies.
- `src/lib/render/canvas.ts` — color is a parameter.
- Tests — none assert on colors.
- Audio assets — unchanged.

### New module

- `src/lib/render/theme.ts` — exports color string constants for canvas drawing, mirroring the CSS token values. This is the bridge for the parts of the app that paint on `<canvas>` (which can't read CSS variables directly).

## Assets

### Required new files in `static/illustrations/`

- `player.svg` — single unDraw illustration of a chunky friendly cartoon person. Reused twice in the splash and tinted via CSS for P1 and P2. Specific illustration TBD; the implementer should pick from [unDraw illustrations](https://undraw.co/illustrations), prioritising the gaming / people / welcoming categories, choosing one where:
  - The figure is a single person (not a scene).
  - Pose is standing, ideally with a visible hand.
  - Style is chunky / geometric (matches the Lilita One title).
- `hand-left.svg`, `hand-right.svg` — the two framing hands. Preferred source: unDraw if a suitable hand illustration is available; otherwise hand-authored simple SVGs. Pinch pose (thumb + index near-touching). Must be drawable as outline strokes so the pinch animation can manipulate finger positions cleanly.

### unDraw integration approach

- Download SVGs from unDraw with neutral or default color.
- One-time post-download edit: replace the single accent hex (e.g., `#6c63ff`) with `currentColor`. Commit modified SVGs.
- Inline into Svelte via Vite's `?raw` import (or as a Svelte component) so the SVG markup sits in the DOM and inherits CSS `color`.
- Tint by setting `color: var(--color-p1)` (or `--color-p2`) on the containing element.
- License: [unDraw license](https://undraw.co/license) — free, commercial use, modifications allowed, no attribution required.

### Optional

- `static/sutd-logo.svg` — official SUTD wordmark/logo. If absent at build time, splash falls back to a Lilita One text wordmark. Can be added later without code changes.

## Risks & gotchas

- **Contrast on warm-dark backgrounds**: P2 blue and accent green can both lose contrast against warm-dark. Implementer must verify with a contrast checker and nudge token lightness if needed.
- **Cream-to-dark transition** between splash and gameplay: needs a brief crossfade (~250ms) on phase change so the swap isn't jarring. Wire into the existing `{#if phase === 'splash'}` block in `App.svelte`.
- **unDraw color rewriting**: the simplest reliable approach is the one-time post-download regex replace to `currentColor`, committing the modified SVG. A runtime / build-time rewriter is a more flexible alternative but unnecessary for two files.
- **anime.js v4 import paths** differ from v3. Implementation must use v4-specific syntax. Pin the version in the plan to avoid drift.
- **Splash runs during camera permission + MediaPipe init**. The entry animation must remain lightweight (transforms + opacity only) so it doesn't compete for CPU with model load.

## Open questions to resolve during implementation

- Specific unDraw illustrations for `player.svg` and the hand SVGs — choose during implementation by browsing the unDraw catalog.
- Final value of each color token after contrast verification.
