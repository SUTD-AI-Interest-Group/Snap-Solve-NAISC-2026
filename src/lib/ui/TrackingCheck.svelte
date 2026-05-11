<script lang="ts">
  import { game } from '$lib/store.svelte';

  const READY_TARGET = 2000;

  let p1Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p1Ready : 0);
  let p2Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p2Ready : 0);
  let auto = $derived(game.state.phase === 'trackingCheck' ? game.state.autoCountdownMs : null);
  let p1Name = $derived(game.state.phase === 'trackingCheck' ? game.state.p1Name : '');
  let p2Name = $derived(game.state.phase === 'trackingCheck' ? game.state.p2Name : '');
</script>

<div class="absolute inset-0 pointer-events-none z-20">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-8 left-0 w-1/2 px-8">
    <h3 class="font-display text-4xl md:text-5xl mb-3 text-center tracking-tight" style="color: var(--color-p1)">{p1Name}</h3>
    <p class="font-sans text-center text-lg md:text-xl font-medium opacity-85 mb-4">Hold both hands in view</p>
    <div class="w-full h-4 bg-white/10 rounded-full overflow-hidden">
      <div
        class="h-full transition-[width] duration-100"
        style="width: {Math.min(100, (p1Ready / READY_TARGET) * 100)}%; background: var(--color-p1);"
      ></div>
    </div>
  </div>
  <div class="absolute top-8 right-0 w-1/2 px-8">
    <h3 class="font-display text-4xl md:text-5xl mb-3 text-center tracking-tight" style="color: var(--color-p2)">{p2Name}</h3>
    <p class="font-sans text-center text-lg md:text-xl font-medium opacity-85 mb-4">Hold both hands in view</p>
    <div class="w-full h-4 bg-white/10 rounded-full overflow-hidden">
      <div
        class="h-full transition-[width] duration-100"
        style="width: {Math.min(100, (p2Ready / READY_TARGET) * 100)}%; background: var(--color-p2);"
      ></div>
    </div>
  </div>
  {#if auto !== null}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="font-display text-[10rem] leading-none bg-black/70 rounded-3xl px-16 py-8 drop-shadow-[0_6px_0_rgba(0,0,0,0.5)]">{Math.ceil(auto / 1000)}</div>
    </div>
  {/if}
</div>
