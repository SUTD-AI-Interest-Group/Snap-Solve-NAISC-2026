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

<div class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
  <div
    bind:this={labelEl}
    class="font-display rounded-3xl bg-black/70 px-20 py-8 text-[12rem] leading-none shadow-2xl drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]"
    style="color: var(--color-accent);"
  >
    {label}
  </div>
</div>
