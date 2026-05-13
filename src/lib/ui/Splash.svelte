<script lang="ts">
  import { game, leaderboard, refreshLeaderboard } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { onMount, tick } from 'svelte';
  import { animate, createTimeline, stagger } from 'animejs';

  import playerSvg from '$lib/illustrations/player.svg?raw';
  import handPalmSvg from '$lib/icons/hand-palm.svg?raw';

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

    (async () => {
      await refreshLeaderboard();
      await tick();

      if (prefersReducedMotion()) {
        // Simple fade-in only.
        animate('[data-splash] > *', { opacity: [0, 1], duration: 200, ease: 'linear' });
        // Since leaderboard is nested, we explicitly animate it too
        animate('[data-splash-lb]', { opacity: [0, 1], duration: 200, ease: 'linear' });
      } else {
        const tl = createTimeline({ defaults: { ease: 'outQuad' } });

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
            ease: 'outElastic(1, 0.55)',
            delay: stagger(60)
          },
          150
        );

        // (3) Framing hands swing in from off-screen
        tl.add(
          '[data-splash-hand="left"]',
          { opacity: [0, 1], translateX: [-200, 0], rotate: [-20, 0], scaleX: [-1, -1], duration: 600 },
          400
        );
        tl.add(
          '[data-splash-hand="right"]',
          { opacity: [0, 1], translateX: [200, 0], rotate: [20, 0], scaleX: [1, 1], duration: 600 },
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
        
        // (6) Leaderboard
        tl.add('[data-splash-lb]', { opacity: [0, 1], translateY: [100, 0], duration: 600 }, 1000);
        
        // Only add row animation if there are actually rows
        if (document.querySelectorAll('[data-splash-lb-row]').length > 0) {
          tl.add('[data-splash-lb-row]', { opacity: [0, 1], translateY: [20, 0], duration: 400, delay: stagger(50) }, 1100);
        }
      }
    })();

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
  <header class="flex flex-col items-start gap-2 p-6 md:p-8 shrink-0" data-splash-tag>
    <div class="flex items-baseline gap-3">
      <span class="font-mono text-xs md:text-sm tracking-widest" style="color: var(--color-ink)">
        NAISC 2026
      </span>
      <span class="font-display text-lg md:text-xl tracking-wide" style="color: var(--color-primary)">
        · SUTD
      </span>
    </div>
    <div
      class="splash-idle-accent h-1 w-32 rounded-full"
      style="background: linear-gradient(90deg, var(--color-accent-green), var(--color-accent-yellow));"
      data-splash-accent-bar
    ></div>
  </header>

  <!-- (2) Hero: framing hands + title -->
  <div class="flex-1 flex flex-col items-center justify-center gap-6 md:gap-8 px-6 min-h-0" data-splash-hero>
    <div class="flex items-center justify-center gap-6 md:gap-10 w-full">
      <div
        class="splash-idle-hand w-24 md:w-36 lg:w-44 shrink-0"
        style="color: var(--color-p1); --scale-x: -1;"
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
        class="splash-idle-hand w-24 md:w-36 lg:w-44 shrink-0"
        style="color: var(--color-p2); --scale-x: 1; animation-delay: 1.75s;"
        data-splash-hand="right"
        aria-hidden="true"
      >
        {@html handPalmSvg}
      </div>
    </div>
    
    <!-- (3) Tagline -->
    <p
      class="font-sans text-xl md:text-2xl font-medium text-center max-w-2xl px-4"
      style="color: var(--color-ink); opacity: 0.85;"
      data-splash-tagline
    >
      Snip a picture with your fingers. Solve the puzzle. Beat your friend.
    </p>

    <!-- (5) CTA moved up -->
    <div class="splash-idle-cta mt-4" data-splash-cta>
      <Button size="lg" onclick={advance}>Press SPACE to play</Button>
    </div>
  </div>

  <!-- (4) Characters + (6) Leaderboard (Bleeding out bottom) -->
  <footer class="grid grid-cols-[1fr_auto_1fr] items-end px-8 md:px-16 shrink-0 h-64">
    <div class="flex justify-start pb-8 md:pb-12" data-splash-char="p1" aria-hidden="true">
      <div
        class="splash-idle-char w-32 md:w-44 lg:w-56"
        style="color: var(--color-p1); --scale-x: 1;"
      >
        {@html playerSvg}
      </div>
    </div>

    <!-- Leaderboard container -->
    <div class="relative w-80 h-full flex flex-col justify-end" data-splash-lb style="opacity: 0;">
      <div class="w-full flex flex-col bg-white/50 backdrop-blur-md border-t border-l border-r border-white/40 rounded-t-2xl p-5 pb-10 overflow-hidden leaderboard-mask">
        <h3 class="text-sm font-bold tracking-widest text-center uppercase mb-3 text-black/60">Top Times</h3>
        <div class="flex flex-col gap-1.5">
          {#each leaderboard.scores as score, i}
            <div
              class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/5"
              data-splash-lb-row
              style="opacity: 0;"
            >
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm opacity-40 w-4 text-right">{i + 1}</span>
                <span class="font-medium text-black/80">{score.name}</span>
              </div>
              <span class="font-mono text-black/60 font-medium">
                {(score.timeMs / 1000).toFixed(2)}s
              </span>
            </div>
          {/each}
          {#if leaderboard.scores.length === 0}
            <p class="text-center text-sm opacity-40 italic py-2">No scores yet</p>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex justify-end pb-8 md:pb-12" data-splash-char="p2" aria-hidden="true">
      <div
        class="splash-idle-char w-32 md:w-44 lg:w-56"
        style="color: var(--color-p2); --scale-x: -1; animation-delay: 2s;"
      >
        {@html playerSvg}
      </div>
    </div>
  </footer>
</section>

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

  .leaderboard-mask {
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    /* Move it down a bit to bleed off the edge naturally */
    transform: translateY(20px);
  }
</style>
