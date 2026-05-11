<script lang="ts">
  import { game } from '$lib/store.svelte';
  let s1 = $derived(game.state.phase === 'snip' ? game.state.p1 : null);
  let s2 = $derived(game.state.phase === 'snip' ? game.state.p2 : null);
  let p1Name = $derived(game.state.phase === 'snip' ? game.state.p1Name : '');
  let p2Name = $derived(game.state.phase === 'snip' ? game.state.p2Name : '');
</script>

<div class="absolute inset-0 pointer-events-none z-20">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-6 left-0 w-1/2 text-center px-6">
    <h3 class="text-2xl md:text-3xl font-black" style="color: var(--color-p1)">{p1Name} — Frame your shot!</h3>
    <p class="opacity-80 text-sm mt-1">Pinch both hands · Hold 1.5s to lock</p>
    {#if s1?.kind === 'locked'}
      <p class="mt-3 text-3xl font-black text-green-400">Locked in ✓</p>
    {/if}
  </div>
  <div class="absolute top-6 right-0 w-1/2 text-center px-6">
    <h3 class="text-2xl md:text-3xl font-black" style="color: var(--color-p2)">{p2Name} — Frame your shot!</h3>
    <p class="opacity-80 text-sm mt-1">Pinch both hands · Hold 1.5s to lock</p>
    {#if s2?.kind === 'locked'}
      <p class="mt-3 text-3xl font-black text-green-400">Locked in ✓</p>
    {/if}
  </div>
</div>
