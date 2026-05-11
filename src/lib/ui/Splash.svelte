<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { Button } from '$lib/components/ui/button';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { onMount } from 'svelte';

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

<section class="h-screen flex flex-col items-center justify-center text-center select-none relative z-10">
  <h1 class="font-display text-8xl md:text-9xl tracking-tight leading-none drop-shadow-[0_8px_0_rgba(0,0,0,0.35)]">
    {#each letters as ch, i}
      {#if ch === ' '}
        <span class="inline-block w-4 md:w-6"></span>
      {:else}
        <span
          class="inline-block animate-bounce"
          style="animation-delay: {i * 80}ms; color: {i % 2 === 0 ? 'var(--color-p1)' : 'var(--color-p2)'};"
        >{ch}</span>
      {/if}
    {/each}
  </h1>
  <p class="font-sans mt-10 text-2xl md:text-3xl font-medium opacity-90 max-w-2xl px-6">
    Snip a picture with your fingers. Solve the puzzle. Beat your friend.
  </p>
  <div class="mt-12">
    <Button size="lg" onclick={advance}>Press SPACE or click to begin</Button>
  </div>
</section>
