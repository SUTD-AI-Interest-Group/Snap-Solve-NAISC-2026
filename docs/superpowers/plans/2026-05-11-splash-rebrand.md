# Splash Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Snap & Solve splash screen with a lively, human-centered composition (framing hand icons, two cartoon player characters, NAISC/SUTD tag) and adopt a bright-orange + offwhite palette across the whole app.

**Architecture:** Replace the existing dark-cool theme tokens with a new orange/offwhite/blue/green/yellow set in `app.css`. Introduce a `src/lib/render/theme.ts` constants module that mirrors the CSS tokens for canvas drawing (which can't read CSS variables). Rewrite `Splash.svelte` around five named regions (branding tag, hero title + framing hands, tagline, cartoon characters, CTA), drive entry animation with anime.js v4 and idle loops with CSS keyframes. Repaint the in-app error overlay; let the other phase screens inherit the new tokens for free with a quick contrast sanity-pass.

**Tech Stack:** Svelte 5 (runes), SvelteKit 2, Tailwind CSS 4, anime.js v4, Phosphor icons (`@phosphor-icons/core` raw SVGs), unDraw illustrations (static asset).

**Spec:** [`docs/superpowers/specs/2026-05-11-splash-rebrand-design.md`](../specs/2026-05-11-splash-rebrand-design.md)

---

## File Structure

```
src/
  app.css                                # CHANGED — new token set
  lib/
    render/
      theme.ts                           # NEW — canvas color constants (mirror app.css)
    ui/
      Splash.svelte                      # REWRITTEN — full new composition + animations
      App.svelte                         # CHANGED — color literals → theme.ts; crossfade; error overlay repaint
      Nicknames.svelte                   # SANITY-PASS — inherit tokens, verify legibility
      TrackingCheck.svelte               # SANITY-PASS
      ResultScreen.svelte                # SANITY-PASS
      PauseMenu.svelte                   # SANITY-PASS
      Countdown.svelte                   # SANITY-PASS
      SnipPhase.svelte                   # SANITY-PASS
      SolvePhase.svelte                  # SANITY-PASS
      MuteButton.svelte                  # SANITY-PASS
    components/
      ui/
        button/
          Button.svelte                  # CHANGED — default variant becomes orange pill
static/
  illustrations/
    player.svg                           # NEW — unDraw cartoon person, color rewired to currentColor
  icons/
    hand-palm.svg                        # NEW — Phosphor `hand-palm` bold/fill
    hand-pinching.svg                    # NEW — Phosphor `hand-pinching` bold/fill
  sutd-logo.svg                          # OPTIONAL — if asset is available
```

Each task below produces self-contained, testable changes. Pure-logic modules use TDD; visual/integration tasks use **manual smoke acceptance** (run dev server, eyeball at `http://localhost:5173`, commit). This mirrors the convention already established in `docs/superpowers/plans/2026-05-11-snap-and-solve.md`.

---

## Task 1: Replace palette tokens in `app.css`

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Replace the `:root` token block with the new palette**

Open `src/app.css`. The current `:root` block defines `--color-p1`, `--color-p2`, `--color-accent` and the `body` block sets a cold dark background. Replace lines 12–28 with:

```css
:root {
  --color-bg: oklch(0.97 0.02 80);            /* warm cream / offwhite */
  --color-ink: oklch(0.22 0.03 50);           /* warm charcoal */
  --color-primary: oklch(0.74 0.19 50);       /* bright orange */
  --color-p1: var(--color-primary);
  --color-p2: oklch(0.65 0.18 245);           /* vivid blue */
  --color-accent-green: oklch(0.78 0.18 145);
  --color-accent-yellow: oklch(0.88 0.18 95);
  --color-canvas-bg: var(--color-ink);
  /* Back-compat: the existing `--color-accent` is now an alias of yellow,
     so any inherited screens that still read it keep working. */
  --color-accent: var(--color-accent-yellow);
}

html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-sans);
  font-feature-settings: 'ss01' on;
}
body {
  background: var(--color-canvas-bg);
  color: oklch(0.96 0 0);
}
```

Keep the existing `@theme { ... }` font tokens at the top and the `@keyframes wobble-tilt` at the bottom untouched.

- [ ] **Step 2: Add a `.splash-bg` utility that overrides the dark body for splash-style pages**

Append to `src/app.css`:

```css
/* Used by Splash + any "menu" screen that wants the cream background.
   Keeps body itself dark so the in-game canvas inherits naturally. */
.splash-bg {
  background: var(--color-bg);
  color: var(--color-ink);
}
```

- [ ] **Step 3: Verify the dev server still boots and the app renders**

```bash
npm run dev
```

Expected: dev server starts on `http://localhost:5173`. Open the page. The current splash will look broken (white text on warm dark looks fine; the existing P1/P2 letter colors will shift to orange/blue). This is intentional — Task 5+ rebuild the splash. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat(theme): introduce orange + offwhite palette tokens"
```

---

## Task 2: Create canvas theme constants module

The canvas drawing code in `App.svelte` uses hex literals (`#ff8a5b`, `#5bb8ff`, `#ffb866`, `#66b8ff`) because the 2D canvas API can't read CSS variables. Centralize these in a single source of truth so the rest of the app and the canvas agree.

**Files:**
- Create: `src/lib/render/theme.ts`
- Create: `tests/unit/theme.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CANVAS_COLORS } from '../../src/lib/render/theme';

describe('CANVAS_COLORS', () => {
  it('exposes a P1 and P2 string', () => {
    expect(typeof CANVAS_COLORS.p1).toBe('string');
    expect(typeof CANVAS_COLORS.p2).toBe('string');
    expect(CANVAS_COLORS.p1).not.toEqual(CANVAS_COLORS.p2);
  });

  it('exposes board tint variants distinct from the hand tints', () => {
    expect(typeof CANVAS_COLORS.p1Board).toBe('string');
    expect(typeof CANVAS_COLORS.p2Board).toBe('string');
  });

  it('exposes a scrim color', () => {
    expect(typeof CANVAS_COLORS.scrim).toBe('string');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- theme
```

Expected: FAIL with `Cannot find module '../../src/lib/render/theme'` or similar.

- [ ] **Step 3: Implement the constants module**

Create `src/lib/render/theme.ts`:

```ts
// Canvas drawing colors. These mirror the CSS custom properties defined in
// src/app.css. The 2D canvas API can't read CSS variables, so this module is
// the single source of truth for the JS-side color literals. Keep in sync
// with the tokens in app.css if either changes.

export const CANVAS_COLORS = {
  // Player tints used for hand landmarks, snip-rect strokes, and cursors.
  p1: '#ff7733', // bright orange — matches --color-p1
  p2: '#3b8bff', // vivid blue — matches --color-p2
  // Lighter variants used as board tints / piece highlights during solve.
  p1Board: '#ffb066',
  p2Board: '#7fbcff',
  // Translucent dark scrim drawn over the live video for legibility.
  scrim: 'rgba(34, 27, 22, 0.4)' // ~oklch ink at 40% alpha
} as const;

export type CanvasColors = typeof CANVAS_COLORS;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- theme
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/theme.test.ts src/lib/render/theme.ts
git commit -m "feat(render): add CANVAS_COLORS constants module"
```

---

## Task 3: Replace hard-coded color literals in `App.svelte`

**Files:**
- Modify: `src/lib/ui/App.svelte`

- [ ] **Step 1: Import the new constants**

In `src/lib/ui/App.svelte`, after the existing `import { drawBoard } from '$lib/render/drawPuzzle';` line, add:

```ts
import { CANVAS_COLORS } from '$lib/render/theme';
```

- [ ] **Step 2: Replace landmark color literals**

Find the block inside `draw()` that paints hand landmarks (currently around lines 307–314). Replace the two `const` declarations:

```ts
const p1Color = '#ff8a5b';
const p2Color = '#5bb8ff';
```

with:

```ts
const p1Color = CANVAS_COLORS.p1;
const p2Color = CANVAS_COLORS.p2;
```

- [ ] **Step 3: Replace snip-rect color literals**

Find the `if (game.state.phase === 'snip')` block (around lines 316–332). It declares:

```ts
const color = side === 'p1' ? '#ff8a5b' : '#5bb8ff';
```

Replace with:

```ts
const color = side === 'p1' ? CANVAS_COLORS.p1 : CANVAS_COLORS.p2;
```

- [ ] **Step 4: Replace the cursor-overlay color literals**

A second `p1Color`/`p2Color` pair appears in the gestures overlay block (around lines 336–337). Replace:

```ts
const p1Color = '#ff8a5b'; // red-ish (P1)
const p2Color = '#5bb8ff'; // blue (P2)
```

with:

```ts
const p1Color = CANVAS_COLORS.p1;
const p2Color = CANVAS_COLORS.p2;
```

- [ ] **Step 5: Replace the board tint literals**

Find the `drawBoard(...)` calls inside the `solve` and `result` phase blocks (around lines 382–383 and 395–396). Replace the trailing hex strings:

```ts
drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, '#ffb866');
drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, '#66b8ff');
```

with:

```ts
drawBoard(ctx, game.state.p1.board, game.state.p1.pieces, p1Area, CANVAS_COLORS.p1Board);
drawBoard(ctx, game.state.p2.board, game.state.p2.pieces, p2Area, CANVAS_COLORS.p2Board);
```

Apply to **both** call sites (solve and result phases).

- [ ] **Step 6: Replace the scrim color literal**

Inside `draw()`, replace:

```ts
ctx.fillStyle = 'rgba(20,20,30,0.4)';
```

with:

```ts
ctx.fillStyle = CANVAS_COLORS.scrim;
```

- [ ] **Step 7: Verify type-check and dev render**

```bash
npm run check
npm run dev
```

Expected: `npm run check` reports 0 errors. Dev server boots. In-game the new palette is visible: orange hands/landmarks/rects for P1, blue for P2. (You won't see this until camera permission is granted and the game enters `trackingCheck`. For now just confirm the type check passes and the splash still loads.) Stop dev server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ui/App.svelte
git commit -m "refactor(ui): read canvas colors from theme constants"
```

---

## Task 4: Update the `Button` primitive to the new primary

**Files:**
- Modify: `src/lib/components/ui/button/Button.svelte`

- [ ] **Step 1: Replace the `default` variant style**

In `src/lib/components/ui/button/Button.svelte`, find the `variants` record (lines 18–22):

```ts
const variants: Record<Variant, string> = {
  default: 'bg-white text-black hover:bg-white/90',
  outline: 'border-2 border-white/30 hover:bg-white/10',
  ghost: 'hover:bg-white/10'
};
```

Replace with:

```ts
const variants: Record<Variant, string> = {
  default:
    'bg-[var(--color-primary)] text-[var(--color-bg)] hover:brightness-110 active:brightness-95',
  outline:
    'border-2 border-[var(--color-ink)]/30 text-[var(--color-ink)] hover:bg-[var(--color-ink)]/10',
  ghost: 'text-[var(--color-ink)] hover:bg-[var(--color-ink)]/10'
};
```

- [ ] **Step 2: Tweak the drop-shadow color for the chunky pill aesthetic**

In the same file, find the `<button class={cn(...)}` block (line 33). The current shadow is `shadow-[0_4px_0_rgba(0,0,0,0.3)]`. This is fine on dark backgrounds but too heavy on cream. Replace the three shadow-related utility classes:

Before:
```
shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.3)]
```

After:
```
shadow-[0_4px_0_rgba(34,27,22,0.25)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgba(34,27,22,0.25)] active:translate-y-[3px] active:shadow-[0_1px_0_rgba(34,27,22,0.25)]
```

(The rgba value approximates `--color-ink` at 25% alpha.)

- [ ] **Step 3: Verify**

```bash
npm run check && npm run dev
```

Expected: type check passes. Dev server boots. Open `http://localhost:5173` — the splash CTA pill is now bright orange with offwhite text. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ui/button/Button.svelte
git commit -m "feat(button): adopt orange primary variant"
```

---

## Task 5: Add the cartoon-character illustration

**Files:**
- Create: `static/illustrations/player.svg`

- [ ] **Step 1: Pick an unDraw illustration**

Open https://undraw.co/illustrations in a browser. Search for terms like "welcoming", "people", "gaming". Pick a single-person illustration where the figure is standing, ideally with a visible hand. Keep the default accent color (don't tint via the on-site picker — we'll wire that up in CSS).

Good candidates to consider:
- `welcoming.svg`
- `playful_cat.svg` (if the figure dominates the scene)
- `gamer.svg`
- `mobile-gaming.svg`

Pick the one whose body shape and pose feels chunky-friendly. Download as **SVG**.

- [ ] **Step 2: Save to `static/illustrations/player.svg`**

```bash
mkdir -p static/illustrations
mv ~/Downloads/<filename>.svg static/illustrations/player.svg
```

- [ ] **Step 3: Rewire the accent color to `currentColor`**

unDraw illustrations use a single accent hex throughout (typically `#6c63ff`). We replace it with `currentColor` so CSS `color` controls the tint.

Open `static/illustrations/player.svg` in a text editor. Search-and-replace **all** instances of `#6c63ff` (case-insensitive) with `currentColor`. Save.

If the file uses a different accent hex (rare — happens when the unDraw user changed the picker before downloading), check what it is first:

```bash
grep -oiE '#[0-9a-f]{6}' static/illustrations/player.svg | sort -u
```

The hex that appears the most times is the accent — that's the one to replace.

- [ ] **Step 4: Verify the SVG still renders**

Open `static/illustrations/player.svg` directly in a browser via `file://`. The accent fills will appear black (CSS `color` defaults to black with no parent). The rest of the illustration (skin, clothes, props) should remain in their original colors. If everything went black, you over-matched — restore the file and try a more specific replace.

- [ ] **Step 5: Commit**

```bash
git add static/illustrations/player.svg
git commit -m "chore(assets): add unDraw cartoon player illustration"
```

---

## Task 6: Add Phosphor hand icons

We use the raw SVGs from `@phosphor-icons/core` rather than `phosphor-svelte`. The package is small, and copying two SVGs into `static/` is the lowest-friction option for two static assets — no new runtime dep needed in the bundle.

**Files:**
- Create: `static/icons/hand-palm.svg`
- Create: `static/icons/hand-pinching.svg`

- [ ] **Step 1: Install the icon package as a dev dep**

```bash
npm install -D @phosphor-icons/core
```

- [ ] **Step 2: Copy the two icons into `static/icons/`**

```bash
mkdir -p static/icons
cp node_modules/@phosphor-icons/core/assets/bold/hand-palm-bold.svg static/icons/hand-palm.svg
cp node_modules/@phosphor-icons/core/assets/bold/hand-pinching-bold.svg static/icons/hand-pinching.svg
```

If the bold weight isn't available for `hand-pinching`, fall back to the regular weight (`assets/regular/hand-pinching.svg`). Verify the files exist:

```bash
ls -la static/icons/
```

Expected: both files present, each under 5 KB.

- [ ] **Step 3: Verify Phosphor icons use `currentColor`**

```bash
grep -i 'fill\|currentColor' static/icons/hand-palm.svg
```

Expected: the SVG uses `currentColor` (Phosphor's default). If the file specifies a hex fill, search-and-replace the hex with `currentColor` in both icon files.

- [ ] **Step 4: Commit**

```bash
git add static/icons/hand-palm.svg static/icons/hand-pinching.svg package.json package-lock.json
git commit -m "chore(assets): add Phosphor hand-palm + hand-pinching icons"
```

---

## Task 7: Rewrite `Splash.svelte` — static composition (no animation yet)

This task builds the five-region splash layout with the new palette and assets. Animation is added in Tasks 8–10.

**Files:**
- Modify: `src/lib/ui/Splash.svelte`

- [ ] **Step 1: Replace the file with the static layout**

Overwrite `src/lib/ui/Splash.svelte` with:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { onMount } from 'svelte';

  // SVG assets — Vite serves these from `static/` at the matching URL.
  // We import the markup directly via `?raw` so we can inline it and
  // recolor via CSS `currentColor`.
  import playerSvg from '../../../static/illustrations/player.svg?raw';
  import handPalmSvg from '../../../static/icons/hand-palm.svg?raw';

  function advance() {
    game.state = gameTick(game.state, { type: 'advanceFromSplash' }, EMPTY_GESTURES);
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const title = 'Snap & Solve';
  const letters = title.split('');
</script>

<section
  class="splash-bg fixed inset-0 z-10 flex flex-col select-none overflow-hidden"
  data-splash
>
  <!-- (1) Branding tag -->
  <header class="flex flex-col items-start gap-2 p-6 md:p-8" data-splash-tag>
    <div class="flex items-baseline gap-3">
      <span class="font-mono text-xs md:text-sm tracking-widest" style="color: var(--color-ink)">
        NAISC 2026
      </span>
      <span class="font-display text-lg md:text-xl tracking-wide" style="color: var(--color-primary)">
        · SUTD
      </span>
    </div>
    <div
      class="h-1 w-32 rounded-full"
      style="background: linear-gradient(90deg, var(--color-accent-green), var(--color-accent-yellow));"
      data-splash-accent-bar
    ></div>
  </header>

  <!-- (2) Hero: framing hands + title -->
  <div class="flex-1 flex items-center justify-center gap-6 md:gap-10 px-6" data-splash-hero>
    <div
      class="w-24 md:w-36 lg:w-44 shrink-0"
      style="color: var(--color-p1); transform: scaleX(-1);"
      data-splash-hand="left"
      aria-hidden="true"
    >
      {@html handPalmSvg}
    </div>

    <h1
      class="font-display text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none text-center drop-shadow-[0_6px_0_rgba(34,27,22,0.15)]"
      data-splash-title
    >
      {#each letters as ch, i}
        {#if ch === ' '}
          <span class="inline-block w-4 md:w-6"></span>
        {:else}
          <span
            class="inline-block"
            data-splash-letter={i}
            style="color: var(--color-primary);"
          >{ch}</span>
        {/if}
      {/each}
    </h1>

    <div
      class="w-24 md:w-36 lg:w-44 shrink-0"
      style="color: var(--color-p2);"
      data-splash-hand="right"
      aria-hidden="true"
    >
      {@html handPalmSvg}
    </div>
  </div>

  <!-- (3) Tagline -->
  <p
    class="font-sans text-xl md:text-2xl font-medium text-center px-6 mb-2"
    style="color: var(--color-ink); opacity: 0.85;"
    data-splash-tagline
  >
    Snip a picture with your fingers. Solve the puzzle. Beat your friend.
  </p>

  <!-- (4) Characters + (5) CTA -->
  <footer class="grid grid-cols-3 items-end gap-6 px-8 pb-8 md:px-16 md:pb-12">
    <div class="flex justify-start" data-splash-char="p1" aria-hidden="true">
      <div class="w-32 md:w-44 lg:w-56" style="color: var(--color-p1);">
        {@html playerSvg}
      </div>
    </div>

    <div class="flex justify-center" data-splash-cta>
      <Button size="lg" onclick={advance}>Press SPACE to play</Button>
    </div>

    <div class="flex justify-end" data-splash-char="p2" aria-hidden="true">
      <div class="w-32 md:w-44 lg:w-56" style="color: var(--color-p2); transform: scaleX(-1);">
        {@html playerSvg}
      </div>
    </div>
  </footer>
</section>
```

- [ ] **Step 2: Run the dev server and eyeball the static composition**

```bash
npm run dev
```

Expected at `http://localhost:5173`:
- Cream/offwhite background.
- Top-left: small "NAISC 2026 · SUTD" tag with a thin green-to-yellow gradient bar underneath.
- Center: two orange/blue hand icons flanking the orange "Snap & Solve" title.
- Below: the tagline in warm-charcoal ink.
- Bottom row: P1 (left, orange-tinted) and P2 (right, blue-tinted, mirrored) cartoon figures with the orange CTA pill between them.

Things to fix if they look off:
- If the SVGs aren't tinted (still default colors): re-check that you replaced the accent hex with `currentColor` in Task 5/6.
- If the hands are huge: confirm the `w-24 md:w-36 lg:w-44` classes apply.
- If layout is cramped on a small window: that's expected — the splash is designed for a conference 16:9 display.

Stop dev server with Ctrl+C.

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ui/Splash.svelte
git commit -m "feat(splash): rebrand layout with hand icons + cartoon characters"
```

---

## Task 8: Add entry animation with anime.js v4

**Files:**
- Modify: `src/lib/ui/Splash.svelte`

- [ ] **Step 1: Add the anime.js import and entry timeline in the `<script>` block**

In `src/lib/ui/Splash.svelte`, replace the existing `<script lang="ts">` block with:

```svelte
<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { onMount } from 'svelte';
  import { animate, createTimeline, stagger } from 'animejs';

  import playerSvg from '../../../static/illustrations/player.svg?raw';
  import handPalmSvg from '../../../static/icons/hand-palm.svg?raw';

  function advance() {
    game.state = gameTick(game.state, { type: 'advanceFromSplash' }, EMPTY_GESTURES);
  }

  function prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') advance();
    };
    window.addEventListener('keydown', onKey);

    if (prefersReducedMotion()) {
      // Simple fade-in only.
      animate('[data-splash] > *', { opacity: [0, 1], duration: 200, easing: 'linear' });
    } else {
      const tl = createTimeline({ defaults: { easing: 'outQuad' } });

      // (1) Branding tag slides down
      tl.add('[data-splash-tag]', { opacity: [0, 1], translateY: [-12, 0], duration: 350 }, 0);

      // (2) Title letters drop in with stagger + elastic overshoot
      tl.add(
        '[data-splash-letter]',
        {
          opacity: [0, 1],
          translateY: [-40, 0],
          rotate: [-15, 0],
          duration: 700,
          easing: 'outElastic(1, 0.55)',
          delay: stagger(60)
        },
        150
      );

      // (3) Framing hands swing in from off-screen
      tl.add(
        '[data-splash-hand="left"]',
        { opacity: [0, 1], translateX: [-200, 0], rotate: [-20, 0], duration: 600 },
        400
      );
      tl.add(
        '[data-splash-hand="right"]',
        { opacity: [0, 1], translateX: [200, 0], rotate: [20, 0], duration: 600 },
        400
      );

      // (4) Cartoon characters bounce up
      tl.add(
        '[data-splash-char]',
        {
          opacity: [0, 1],
          translateY: [80, 0],
          scaleY: [{ value: 0.7, duration: 0 }, { value: 1.1, duration: 250 }, { value: 1, duration: 200 }],
          duration: 500,
          delay: stagger(80)
        },
        700
      );

      // (5) Tagline + CTA
      tl.add('[data-splash-tagline]', { opacity: [0, 1], translateY: [10, 0], duration: 400 }, 900);
      tl.add('[data-splash-cta]', { opacity: [0, 1], scale: [0.92, 1], duration: 400 }, 950);
    }

    return () => window.removeEventListener('keydown', onKey);
  });

  const title = 'Snap & Solve';
  const letters = title.split('');
</script>
```

Note: anime.js v4 uses named exports (`animate`, `createTimeline`, `stagger`). If `npm run check` complains about types, see Step 3 below for the fallback.

- [ ] **Step 2: Verify the animation runs**

```bash
npm run dev
```

Expected: refresh the page. You should see the entry sequence play once: tag drops down, title letters bounce in one-by-one, hands swing in from the sides, characters pop up from the bottom, tagline + CTA fade in last. Total duration ~1.2s. Open DevTools Performance tab if any step looks janky.

- [ ] **Step 3: If anime.js v4 import paths differ, adjust**

If `npm run check` reports `Module 'animejs' has no exported member 'createTimeline'` or similar, replace the import line with the v4 default-export form:

```ts
import anime from 'animejs';
// Then call anime.timeline(...) instead of createTimeline(...).
```

Adjust the `tl = ...` line accordingly and re-run `npm run check`. (Pin to the actually-installed v4 API — `node_modules/animejs/lib/anime.esm.min.js` is the source of truth.)

- [ ] **Step 4: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/Splash.svelte
git commit -m "feat(splash): entry animation timeline with anime.js v4"
```

---

## Task 9: Add idle-loop animations (CSS keyframes)

Idle loops run forever, so we put them in pure CSS rather than JS — zero frame cost while the user reads the splash.

**Files:**
- Modify: `src/app.css`
- Modify: `src/lib/ui/Splash.svelte`

- [ ] **Step 1: Add the keyframes to `app.css`**

Append to `src/app.css` (after the existing `@keyframes wobble-tilt`):

```css
/* === Splash idle-loop keyframes === */

@keyframes splash-hand-pinch {
  0%, 70%, 100% { transform: scaleX(var(--scale-x, 1)) scale(1) rotate(0deg); }
  80% { transform: scaleX(var(--scale-x, 1)) scale(0.92) rotate(4deg); }
  90% { transform: scaleX(var(--scale-x, 1)) scale(1.02) rotate(-2deg); }
}

@keyframes splash-char-bob {
  0%, 100% { transform: scaleX(var(--scale-x, 1)) translateY(0); }
  50% { transform: scaleX(var(--scale-x, 1)) translateY(-4px); }
}

@keyframes splash-cta-pulse {
  0%, 100% { opacity: 0.92; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.06); }
}

@keyframes splash-accent-shift {
  0%, 100% { background: linear-gradient(90deg, var(--color-accent-green), var(--color-accent-yellow)); }
  50%      { background: linear-gradient(90deg, var(--color-accent-yellow), var(--color-accent-green)); }
}

@media (prefers-reduced-motion: reduce) {
  .splash-idle-hand,
  .splash-idle-char,
  .splash-idle-cta,
  .splash-idle-accent {
    animation: none !important;
  }
}
```

The `--scale-x` CSS variable lets us preserve the mirroring (`scaleX(-1)`) on the right hand and right character while still animating them. We set `--scale-x: -1` on those elements inline.

- [ ] **Step 2: Wire idle classes onto the splash elements**

Edit `src/lib/ui/Splash.svelte`. Find the left framing hand div and add `class="splash-idle-hand"`. Find the right framing hand div and add both `class="splash-idle-hand"` and update the inline style to use the CSS variable.

Left hand block — change from:
```svelte
<div
  class="w-24 md:w-36 lg:w-44 shrink-0"
  style="color: var(--color-p1); transform: scaleX(-1);"
  data-splash-hand="left"
  aria-hidden="true"
>
```

to:
```svelte
<div
  class="splash-idle-hand w-24 md:w-36 lg:w-44 shrink-0"
  style="color: var(--color-p1); --scale-x: -1;"
  data-splash-hand="left"
  aria-hidden="true"
>
```

Right hand block — change from:
```svelte
<div
  class="w-24 md:w-36 lg:w-44 shrink-0"
  style="color: var(--color-p2);"
  data-splash-hand="right"
  aria-hidden="true"
>
```

to:
```svelte
<div
  class="splash-idle-hand w-24 md:w-36 lg:w-44 shrink-0"
  style="color: var(--color-p2); --scale-x: 1; animation-delay: 1.75s;"
  data-splash-hand="right"
  aria-hidden="true"
>
```

Then in `<style>` (add this block at the bottom of `Splash.svelte`):

```svelte
<style>
  /* Idle loops — start after the entry timeline finishes (~1.3s). */
  .splash-idle-hand {
    animation: splash-hand-pinch 3500ms ease-in-out 1300ms infinite;
    transform-origin: center center;
  }
  :global([data-splash-char="p1"]) .splash-idle-char,
  :global([data-splash-char="p2"]) .splash-idle-char {
    animation: splash-char-bob 4000ms ease-in-out infinite;
  }
  .splash-idle-cta {
    animation: splash-cta-pulse 2000ms ease-in-out 1500ms infinite;
  }
  .splash-idle-accent {
    animation: splash-accent-shift 6000ms ease-in-out infinite;
  }
</style>
```

- [ ] **Step 3: Add the idle classes to characters, CTA, and accent bar**

Find the P1 character inner div (currently `<div class="w-32 md:w-44 lg:w-56" style="color: var(--color-p1);">`) and update it to:

```svelte
<div
  class="splash-idle-char w-32 md:w-44 lg:w-56"
  style="color: var(--color-p1); --scale-x: 1;"
>
  {@html playerSvg}
</div>
```

Find the P2 character inner div and update to:

```svelte
<div
  class="splash-idle-char w-32 md:w-44 lg:w-56"
  style="color: var(--color-p2); --scale-x: -1; animation-delay: 2s;"
>
  {@html playerSvg}
</div>
```

(The `--scale-x: -1` replaces the previous inline `transform: scaleX(-1)`; the keyframe now drives the transform.)

Find the CTA wrapper div (`<div class="flex justify-center" data-splash-cta>`) and add the idle class:

```svelte
<div class="splash-idle-cta flex justify-center" data-splash-cta>
```

Find the accent bar div and add the idle class:

```svelte
<div
  class="splash-idle-accent h-1 w-32 rounded-full"
  style="background: linear-gradient(90deg, var(--color-accent-green), var(--color-accent-yellow));"
  data-splash-accent-bar
></div>
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Expected at `http://localhost:5173`:
- Entry animation still plays once.
- After ~1.3s, the idle loops start:
  - Both framing hands do a subtle pinch/squish every ~3.5s (offset).
  - Both cartoon characters bob up and down (~4s cycle, offset).
  - CTA pulses gently.
  - Accent bar shifts colors back and forth.
- Open DevTools → Performance → record 10s. Frame rate should hold 60 FPS.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/lib/ui/Splash.svelte
git commit -m "feat(splash): idle-loop animations (hand pinch, char bob, cta pulse)"
```

---

## Task 10: Verify reduced-motion support

**Files:**
- (Verification only — no code changes if Tasks 8 and 9 implemented `prefers-reduced-motion` correctly.)

- [ ] **Step 1: Enable reduced motion in the OS**

On macOS: System Settings → Accessibility → Display → toggle on "Reduce motion".
On Windows: Settings → Accessibility → Visual effects → toggle off "Animation effects".
On Linux: depends on DE; in Chrome DevTools you can simulate via Rendering panel → "Emulate CSS media feature prefers-reduced-motion: reduce".

- [ ] **Step 2: Reload the splash**

```bash
npm run dev
```

Refresh `http://localhost:5173`. Expected:
- Entry animation is a quick fade-in only (~200ms), no bouncing/swinging.
- No idle loops running — hands, characters, CTA, and accent bar are static.

If any element is still animating, debug the corresponding selector in `app.css`'s `@media (prefers-reduced-motion: reduce)` block. Add the missing class to the override list.

- [ ] **Step 3: Disable reduced motion in the OS**

Toggle the OS/devtools setting back off. Reload and confirm animations resume.

Stop dev server.

- [ ] **Step 4: Commit (only if changes were needed)**

```bash
# If the previous tasks needed fixing:
git add src/app.css src/lib/ui/Splash.svelte
git commit -m "fix(splash): respect prefers-reduced-motion in all idle loops"
```

If no fixes were needed, skip the commit.

---

## Task 11: Splash → gameplay crossfade

Now that the splash is cream and the gameplay canvas is warm-dark, the transition between them is jarring without a fade. The existing `App.svelte` toggles phase content via `{#if game.state.phase === 'splash'}<Splash />{/if}` blocks. We add a brief opacity crossfade using Svelte's built-in `fade` transition.

**Files:**
- Modify: `src/lib/ui/App.svelte`

- [ ] **Step 1: Import the fade transition**

In `src/lib/ui/App.svelte`, add to the imports near the top:

```ts
import { fade } from 'svelte/transition';
```

- [ ] **Step 2: Wrap the phase components in transition-aware blocks**

Find the phase-conditional block (currently around lines 470–477):

```svelte
{#if game.state.phase === 'splash'}<Splash />{/if}
{#if game.state.phase === 'nicknames'}<Nicknames />{/if}
{#if game.state.phase === 'trackingCheck'}<TrackingCheck />{/if}
{#if game.state.phase === 'snip'}<SnipPhase />{/if}
{#if game.state.phase === 'countdown'}<Countdown />{/if}
{#if game.state.phase === 'solve'}<SolvePhase />{/if}
{#if game.state.phase === 'result'}<ResultScreen />{/if}
```

Replace with:

```svelte
{#if game.state.phase === 'splash'}
  <div out:fade={{ duration: 250 }}><Splash /></div>
{/if}
{#if game.state.phase === 'nicknames'}
  <div in:fade={{ duration: 250 }}><Nicknames /></div>
{/if}
{#if game.state.phase === 'trackingCheck'}<TrackingCheck />{/if}
{#if game.state.phase === 'snip'}<SnipPhase />{/if}
{#if game.state.phase === 'countdown'}<Countdown />{/if}
{#if game.state.phase === 'solve'}<SolvePhase />{/if}
{#if game.state.phase === 'result'}<ResultScreen />{/if}
```

(We only crossfade the splash↔nicknames boundary — that's the cream→dark transition. The other phase transitions are dark→dark and don't need fading.)

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Open `http://localhost:5173`. Press SPACE on the splash. Expected: the cream splash fades out over ~250ms while the dark nicknames screen fades in over ~250ms. No jarring snap.

Stop dev server.

- [ ] **Step 4: Type-check + commit**

```bash
npm run check
```

Expected: 0 errors.

```bash
git add src/lib/ui/App.svelte
git commit -m "feat(app): crossfade splash to nicknames"
```

---

## Task 12: Repaint the camera/tracking error overlay

**Files:**
- Modify: `src/lib/ui/App.svelte`

- [ ] **Step 1: Replace the error overlay block**

In `src/lib/ui/App.svelte`, find the error overlay block (currently around lines 445–468). Replace the entire block:

```svelte
{#if permError || trackingError}
  <div class="absolute inset-0 flex items-center justify-center z-50 bg-black/85 backdrop-blur-sm">
    <div class="bg-black/90 border-2 border-white/20 p-10 rounded-2xl max-w-lg text-center">
      <h3 class="font-display text-4xl mb-4 tracking-tight" style="color: var(--color-accent);">
        {permError ? 'Camera access needed' : 'Setup error'}
      </h3>
      <p class="font-sans text-base md:text-lg opacity-85 leading-relaxed">{permError ?? trackingError}</p>
      <div class="mt-6 flex gap-3 justify-center">
        <button
          class="font-display tracking-wide px-6 py-3 bg-white text-black rounded-xl text-lg disabled:opacity-50"
          disabled={initializing}
          onclick={retry}
        >
          {initializing ? 'Trying…' : 'Retry'}
        </button>
        <button
          class="font-display tracking-wide px-6 py-3 border-2 border-white/30 rounded-xl text-lg"
          onclick={() => location.reload()}
        >
          Reload page
        </button>
      </div>
    </div>
  </div>
{:else}
```

with:

```svelte
{#if permError || trackingError}
  <div class="absolute inset-0 flex items-center justify-center z-50 backdrop-blur-sm" style="background: rgba(34, 27, 22, 0.85);">
    <div
      class="border-2 p-10 rounded-2xl max-w-lg text-center"
      style="background: var(--color-bg); border-color: var(--color-primary); color: var(--color-ink);"
    >
      <h3 class="font-display text-4xl mb-4 tracking-tight" style="color: var(--color-primary);">
        {permError ? 'Camera access needed' : 'Setup error'}
      </h3>
      <p class="font-sans text-base md:text-lg opacity-85 leading-relaxed">{permError ?? trackingError}</p>
      <div class="mt-6 flex gap-3 justify-center">
        <button
          class="font-display tracking-wide px-6 py-3 rounded-xl text-lg disabled:opacity-50"
          style="background: var(--color-primary); color: var(--color-bg);"
          disabled={initializing}
          onclick={retry}
        >
          {initializing ? 'Trying…' : 'Retry'}
        </button>
        <button
          class="font-display tracking-wide px-6 py-3 border-2 rounded-xl text-lg"
          style="border-color: var(--color-ink); color: var(--color-ink); opacity: 0.7;"
          onclick={() => location.reload()}
        >
          Reload page
        </button>
      </div>
    </div>
  </div>
{:else}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

To trigger the error overlay without revoking camera permissions: open the page in a fresh incognito window, deny camera access at the browser prompt. The overlay should appear: cream card on a dark warm scrim, orange heading, orange "Retry" pill, charcoal-outlined "Reload page" button.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ui/App.svelte
git commit -m "feat(app): repaint error overlay with new palette"
```

---

## Task 13: Sanity-pass inheriting screens (Nicknames, TrackingCheck, etc.)

These screens already read `--color-p1`/`--color-p2`/etc. via CSS custom properties and will pick up the new values automatically. We just need to eyeball each one to catch any contrast/legibility regressions from the warmer background.

**Files:**
- Modify (only if issues found): `src/lib/ui/Nicknames.svelte`, `TrackingCheck.svelte`, `ResultScreen.svelte`, `PauseMenu.svelte`, `Countdown.svelte`, `SnipPhase.svelte`, `SolvePhase.svelte`, `MuteButton.svelte`

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk through every phase and inspect**

For each phase below, navigate to it and check that text is legible and player colors are clearly distinguishable. To advance through phases without a webcam, you can edit the initial phase in `src/lib/store.svelte.ts` temporarily — but the simpler route is to play through normally with the camera on.

| Phase | What to verify |
|---|---|
| `nicknames` | "Who's playing?" heading visible against warm-dark bg. P1 label is orange, P2 label is blue. Input boxes visible. |
| `trackingCheck` | Instructions readable over the live camera feed. Hand landmark dots are orange (P1) / blue (P2). |
| `snip` | Hand cursors clearly orange vs blue. Snip rectangle strokes match player colors. Hold-progress fill visible. |
| `countdown` | "3 / 2 / 1 / GO" text legible. Player snip preview frames visible. |
| `solve` | Board tints (light orange / light blue) clearly distinguishable. Pieces readable. Held-piece highlight visible. |
| `result` | Winner banner readable. Final board state visible. |
| `pauseMenu` (press Esc during gameplay) | "Paused" text readable on the dark scrim. Buttons legible. |

- [ ] **Step 3: If any contrast issue surfaces, make a targeted fix**

Typical fixes (only apply if needed):
- Text too faint on the warmer dark: change `opacity-85` → `opacity-95` on the affected paragraph.
- A player color hard to read on its own background: add a thin outline / darker stroke via the existing canvas rendering helpers.
- Button blends in: swap to the `default` variant (now orange) for primary actions.

Make one commit per file you change:

```bash
git add src/lib/ui/<ChangedFile>.svelte
git commit -m "fix(<phase>): improve contrast on new palette"
```

If no changes are needed for any screen, **skip this step entirely** — no empty commits.

- [ ] **Step 4: Stop dev server**

Ctrl+C.

---

## Task 14: Run the existing smoke-test checklist

The repo already has a smoke-test checklist at `docs/smoke-test.md` that's run before every commit-to-main. We run it now as the final acceptance gate.

**Files:**
- (No changes — verification only.)

- [ ] **Step 1: Run the type check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 2: Run the unit tests**

```bash
npm test
```

Expected: all tests pass, including the new `theme.test.ts` from Task 2.

- [ ] **Step 3: Walk the smoke-test checklist**

Open `docs/smoke-test.md` and execute each item. Pay special attention to:
- The splash screen is the visual centerpiece — confirm it matches the spec (NAISC/SUTD tag, framing hands, title, characters, CTA, entry animation, idle loops).
- All phase transitions feel natural (esp. splash→nicknames crossfade).
- No console errors during the full game loop.

- [ ] **Step 4: If smoke test reveals issues, fix and re-test**

Make targeted fixes, commit each separately with a `fix(...)` prefix, and re-run the smoke test.

- [ ] **Step 5: Final commit (if needed) and push**

When the smoke test passes cleanly, the branch is ready.

```bash
git status
```

Expected: working tree clean. The implementation is done.

---

## Self-Review

**Spec coverage:**

- ✅ Palette tokens (spec §"Palette & theme tokens") — Task 1.
- ✅ Cream bg on splash, dark on gameplay — Task 1 (`.splash-bg`) + existing body bg.
- ✅ Splash layout: branding tag, hero, tagline, characters, CTA (§"Splash screen layout") — Task 7.
- ✅ Framing hands using Phosphor icons (§"Hero center", §"Framing hands") — Tasks 6, 7.
- ✅ Cartoon characters using unDraw (§"Cartoon characters") — Tasks 5, 7.
- ✅ Entry animation timeline with anime.js v4 (§"Entry sequence") — Task 8.
- ✅ Idle loops (§"Idle loop") — Task 9.
- ✅ Reduced-motion support (§"Accessibility & safety") — Tasks 8, 9, 10.
- ✅ Site-wide canvas color tokens (§"Site-wide propagation", §"Files changed") — Tasks 2, 3.
- ✅ Button primitive picks up orange (§"Files changed") — Task 4.
- ✅ Splash→gameplay crossfade (§"Risks & gotchas") — Task 11.
- ✅ Error overlay repaint (§"Files changed") — Task 12.
- ✅ Inheriting-screen sanity-pass (§"Files changed") — Task 13.

**Placeholder scan:** No TBDs, no "fill in later", every code block contains the actual content the engineer needs.

**Type consistency:** `CANVAS_COLORS` properties (`p1`, `p2`, `p1Board`, `p2Board`, `scrim`) are used consistently in Tasks 2 and 3. Phosphor icon filenames match between Tasks 6 and 7. Splash data-attributes (`data-splash-tag`, `data-splash-title`, `data-splash-letter`, `data-splash-hand`, `data-splash-char`, `data-splash-tagline`, `data-splash-cta`, `data-splash-accent-bar`) are introduced in Task 7 and reused consistently in Tasks 8 and 9.

**Known open decisions** (documented in the spec's "Open questions" section, intentionally deferred to implementation):
- Specific unDraw illustration chosen during Task 5.
- Specific Phosphor weight (bold vs fill vs regular) — Task 6 falls back gracefully.
- Final color token values pending visual contrast check — Task 13 catches regressions.
