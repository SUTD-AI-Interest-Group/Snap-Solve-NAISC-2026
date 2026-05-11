<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { animate } from 'animejs';

  let remaining = $derived(game.state.phase === 'countdown' ? game.state.remainingMs : 0);
  let label = $derived(remaining > 0 ? Math.ceil(remaining / 1000).toString() : 'GO!');
  let labelEl: HTMLDivElement | undefined = $state();
  let prevLabel = $state('');

  $effect(() => {
    if (label !== prevLabel && labelEl) {
      prevLabel = label;
      animate(labelEl, { scale: [1.5, 1], duration: 380, ease: 'outBack' });
    }
  });
</script>

<div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
  <div
    bind:this={labelEl}
    class="font-display text-[12rem] leading-none bg-black/70 rounded-3xl px-20 py-8 shadow-2xl drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]"
    style="color: var(--color-accent);"
  >
    {label}
  </div>
</div>
