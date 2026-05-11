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
  <div class="absolute top-2 left-1/2 -translate-x-1/2 text-5xl font-mono font-black bg-black/70 px-8 py-2 rounded-2xl">
    {timer}
  </div>
  <div class="absolute top-4 left-6 text-2xl font-black" style="color: var(--color-p1)">
    {p1?.name} <span class="opacity-80 font-mono">{p1?.board.correctCount}/8</span>
  </div>
  <div class="absolute top-4 right-6 text-2xl font-black text-right" style="color: var(--color-p2)">
    <span class="opacity-80 font-mono">{p2?.board.correctCount}/8</span> {p2?.name}
  </div>
</div>
