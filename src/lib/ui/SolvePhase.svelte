<script lang="ts">
  import { game } from '$lib/store.svelte';

  const fmt = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  let timer = $derived(game.state.phase === 'solve' ? fmt(game.state.remainingMs) : '0:00');
  let p1 = $derived(game.state.phase === 'solve' ? game.state.p1 : null);
  let p2 = $derived(game.state.phase === 'solve' ? game.state.p2 : null);
</script>

<div class="pointer-events-none absolute inset-0 z-20">
  <div
    class="absolute top-2 left-1/2 -translate-x-1/2 rounded-2xl bg-black/75 px-8 py-3 font-mono text-3xl tracking-wider drop-shadow-[0_4px_0_rgba(0,0,0,0.45)] md:text-4xl"
    style="color: var(--color-accent);"
  >
    {timer}
  </div>
  <div class="absolute top-4 left-6 flex items-baseline gap-3">
    <span class="font-display text-3xl tracking-tight md:text-4xl" style="color: var(--color-p1)"
      >{p1?.name}</span
    >
    <span class="font-mono text-base opacity-85 md:text-lg" style="color: var(--color-p1)"
      >{p1?.board.correctCount}/9</span
    >
  </div>
  <div class="absolute top-4 right-6 flex items-baseline gap-3">
    <span class="font-mono text-base opacity-85 md:text-lg" style="color: var(--color-p2)"
      >{p2?.board.correctCount}/9</span
    >
    <span class="font-display text-3xl tracking-tight md:text-4xl" style="color: var(--color-p2)"
      >{p2?.name}</span
    >
  </div>
</div>
