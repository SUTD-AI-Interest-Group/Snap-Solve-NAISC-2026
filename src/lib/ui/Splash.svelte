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
  <h1 class="text-7xl md:text-8xl font-black tracking-tight">
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
  <p class="mt-8 text-xl md:text-2xl opacity-80 max-w-2xl px-6">
    Snip a picture with your fingers. Solve the puzzle. Beat your friend.
  </p>
  <div class="mt-12">
    <Button size="lg" onclick={advance}>Press SPACE or click to begin</Button>
  </div>
</section>
