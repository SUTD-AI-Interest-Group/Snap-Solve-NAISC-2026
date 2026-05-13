<script lang="ts">
  import { game } from '$lib/store.svelte';
  let s1 = $derived(game.state.phase === 'snip' ? game.state.p1 : null);
  let s2 = $derived(game.state.phase === 'snip' ? game.state.p2 : null);
  let p1Name = $derived(game.state.phase === 'snip' ? game.state.p1Name : '');
  let p2Name = $derived(game.state.phase === 'snip' ? game.state.p2Name : '');
</script>

<div class="pointer-events-none absolute inset-0 z-20">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-6 left-0 w-1/2 px-6 text-center">
    <h3 class="font-display text-3xl tracking-tight md:text-4xl" style="color: var(--color-p1)">
      {p1Name} — Frame your shot!
    </h3>
    <p class="mt-1 font-sans text-sm font-medium opacity-85 md:text-base">
      Pinch both hands · Hold 1.5s to lock
    </p>
    {#if s1?.kind === 'locked'}
      <p class="font-display mt-3 text-4xl" style="color: var(--color-accent-green);">
        Locked in ✓
      </p>
    {/if}
  </div>
  <div class="absolute top-6 right-0 w-1/2 px-6 text-center">
    <h3 class="font-display text-3xl tracking-tight md:text-4xl" style="color: var(--color-p2)">
      {p2Name} — Frame your shot!
    </h3>
    <p class="mt-1 font-sans text-sm font-medium opacity-85 md:text-base">
      Pinch both hands · Hold 1.5s to lock
    </p>
    {#if s2?.kind === 'locked'}
      <p class="font-display mt-3 text-4xl" style="color: var(--color-accent-green);">
        Locked in ✓
      </p>
    {/if}
  </div>
</div>
