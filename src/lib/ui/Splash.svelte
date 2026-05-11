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
