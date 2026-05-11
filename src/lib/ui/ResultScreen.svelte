<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { animate, createTimeline } from 'animejs';
  import { onMount } from 'svelte';

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
  });
</script>

<section class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-8 z-40 pointer-events-auto">
  <div bind:this={confettiEl} class="absolute inset-0 pointer-events-none">
    {#each Array(40) as _, i}
      <span
        class="absolute top-1/3 left-1/2 inline-block w-3 h-3 rounded"
        style="background: {i % 3 === 0 ? 'var(--color-p1)' : i % 3 === 1 ? 'var(--color-p2)' : 'var(--color-accent)'};"
      ></span>
    {/each}
  </div>
  <h2
    bind:this={titleEl}
    class="font-display text-7xl md:text-8xl text-center px-6 tracking-tight drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]"
    style="color: var(--color-accent);"
  >{winnerLabel}</h2>
  <p class="font-sans text-2xl md:text-3xl font-medium opacity-85">
    {r?.winner === 'draw' ? "Time's up!" : `Solved in ${((r?.durationMs ?? 0) / 1000).toFixed(1)}s`}
  </p>
  <div class="flex gap-6 mt-6">
    <Button size="lg" onclick={rematch}>Rematch</Button>
    <Button size="lg" variant="outline" onclick={newPlayers}>New players</Button>
  </div>
</section>
