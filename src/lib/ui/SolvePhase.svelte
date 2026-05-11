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

<div class="absolute inset-0 pointer-events-none z-20">
  <div
    class="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-3xl md:text-4xl bg-black/75 px-8 py-3 rounded-2xl tracking-wider drop-shadow-[0_4px_0_rgba(0,0,0,0.45)]"
    style="color: var(--color-accent);"
  >
    {timer}
  </div>
  <div class="absolute top-4 left-6 flex items-baseline gap-3">
    <span class="font-display text-3xl md:text-4xl tracking-tight" style="color: var(--color-p1)">{p1?.name}</span>
    <span class="font-mono text-base md:text-lg opacity-85" style="color: var(--color-p1)">{p1?.board.correctCount}/9</span>
  </div>
  <div class="absolute top-4 right-6 flex items-baseline gap-3">
    <span class="font-mono text-base md:text-lg opacity-85" style="color: var(--color-p2)">{p2?.board.correctCount}/9</span>
    <span class="font-display text-3xl md:text-4xl tracking-tight" style="color: var(--color-p2)">{p2?.name}</span>
  </div>
</div>
