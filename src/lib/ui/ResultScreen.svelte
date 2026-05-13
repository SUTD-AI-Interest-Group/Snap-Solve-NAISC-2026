<script lang="ts">
  import { game, leaderboard, refreshLeaderboard } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { animate, createTimeline, stagger } from 'animejs';
  import { onMount, onDestroy, tick } from 'svelte';
  import { recordWin } from '$lib/db/leaderboard';

  let r = $derived(game.state.phase === 'result' ? game.state : null);

  function rematch() {
    game.state = gameTick(game.state, { type: 'rematch' }, EMPTY_GESTURES);
  }
  function newPlayers() {
    game.state = gameTick(game.state, { type: 'newPlayers' }, EMPTY_GESTURES);
  }

  const winnerLabel = $derived(
    r?.winner === 'draw' ? "It's a draw!" :
    r?.winner === 'p1' ? `${r.p1.name} wins!` :
    r?.winner === 'p2' ? `${r.p2.name} wins!` : ''
  );

  let titleEl: HTMLHeadingElement | undefined = $state();
  let confettiEl: HTMLDivElement | undefined = $state();
  let highlightRank = $state<number | null>(null);
  // Tracks the looping highlight animation so we can stop it when the
  // result screen unmounts (rematch / new players). Without this the rAF
  // loop keeps running across phase transitions.
  let highlightAnim: ReturnType<typeof animate> | null = null;

  onMount(() => {
    if (titleEl) animate(titleEl, { scale: [0.4, 1], opacity: [0, 1], duration: 700, ease: 'outBack' });
    if (confettiEl) {
      const dots = confettiEl.querySelectorAll<HTMLSpanElement>('span');
      const tl = createTimeline({ defaults: { duration: 1200, ease: 'outQuad' } });
      dots.forEach((d) => {
        tl.add(d, {
          translateY: [0, 400 + Math.random() * 200],
          translateX: [0, (Math.random() - 0.5) * 400],
          rotate: [0, (Math.random() - 0.5) * 720],
          opacity: [1, 0]
        }, 0);
      });
    }

    // Save score and show leaderboard
    (async () => {
      let newRank: number | null = null;
      let didImprove = false;
      try {
        if (r && r.winner !== 'draw' && r.durationMs > 0) {
          const winnerName = r.winner === 'p1' ? r.p1.name : r.p2.name;
          const result = await recordWin(winnerName, r.durationMs);
          didImprove = result.improved;
          newRank = result.rank;
        }
      } catch (e) {
        console.error('Failed to save score', e);
      }
      highlightRank = didImprove ? newRank : null;

      await refreshLeaderboard();
      await tick();
      
      // Animate leaderboard in after a short delay
      const tl = createTimeline({ defaults: { ease: 'outQuad' } });
      tl.add('[data-lb-card]', { opacity: [0, 1], translateY: [20, 0], duration: 500 }, 400);
      if (document.querySelectorAll('[data-lb-row]').length > 0) {
        tl.add('[data-lb-row]', { opacity: [0, 1], translateX: [-20, 0], duration: 400, delay: stagger(50) }, 500);
      }
      // Loop the highlight for new score
      if (document.querySelectorAll('.new-score-row').length > 0) {
        highlightAnim = animate('.new-score-row', {
          backgroundColor: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.15)'],
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
          duration: 800
        });
      }
    })();
  });

  onDestroy(() => {
    // animejs v4 instances expose .pause() / .cancel(); pause is sufficient
    // to halt the rAF loop. Guard for both to stay forward-compatible.
    const a = highlightAnim as unknown as { pause?: () => void; cancel?: () => void } | null;
    a?.pause?.();
    a?.cancel?.();
    highlightAnim = null;
  });
</script>

<section class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-6 z-40 pointer-events-auto overflow-hidden">
  <div bind:this={confettiEl} class="absolute inset-0 pointer-events-none">
    {#each Array(40) as _, i}
      <span
        class="absolute top-1/3 left-1/2 inline-block w-3 h-3 rounded"
        style="background: {i % 3 === 0 ? 'var(--color-p1)' : i % 3 === 1 ? 'var(--color-p2)' : 'var(--color-accent)'};"
      ></span>
    {/each}
  </div>
  
  <div class="z-10 flex flex-col items-center gap-2">
    <h2 bind:this={titleEl} class="text-6xl md:text-7xl font-black text-center px-6">{winnerLabel}</h2>
    <p class="text-xl md:text-2xl opacity-80 font-mono">
      {r?.winner === 'draw' ? "Time's up!" : `Solved in ${((r?.durationMs ?? 0) / 1000).toFixed(2)}s`}
    </p>
  </div>

  <div class="z-10 flex gap-4 mt-2">
    <Button size="lg" onclick={rematch}>Rematch</Button>
    <Button size="lg" variant="outline" onclick={newPlayers}>New players</Button>
  </div>

  <div class="z-10 mt-4 max-w-sm w-full px-6" data-lb-card style="opacity: 0;">
    <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl">
      <h3 class="text-sm font-bold tracking-widest text-center uppercase mb-4 text-white/70">Top Times</h3>
      <div class="flex flex-col gap-2">
        {#each leaderboard.scores as score, i}
          <div
            class="flex items-center justify-between px-3 py-2 rounded-lg {(i + 1) === highlightRank ? 'new-score-row border border-white/30' : ''}"
            data-lb-row
            style="opacity: 0;"
          >
            <div class="flex items-center gap-3">
              <span class="font-mono text-sm opacity-50 w-4 text-right">{i + 1}</span>
              <span class="font-medium {(i + 1) === highlightRank ? 'text-white' : 'text-white/90'}">{score.name}</span>
            </div>
            <span class="font-mono {(i + 1) === highlightRank ? 'text-[var(--color-primary)] font-bold' : 'text-white/70'}">
              {(score.bestTimeMs / 1000).toFixed(2)}s
            </span>
          </div>
        {/each}
        {#if leaderboard.scores.length === 0}
          <p class="text-center text-sm opacity-50 italic py-2">No scores yet</p>
        {/if}
      </div>
    </div>
  </div>
</section>
