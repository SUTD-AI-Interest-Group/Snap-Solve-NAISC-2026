<script lang="ts">
  import { game } from '$lib/store.svelte';

  const READY_TARGET = 2000;

  let p1Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p1Ready : 0);
  let p2Ready = $derived(game.state.phase === 'trackingCheck' ? game.state.p2Ready : 0);
  let p1Name = $derived(game.state.phase === 'trackingCheck' ? game.state.p1Name : '');
  let p2Name = $derived(game.state.phase === 'trackingCheck' ? game.state.p2Name : '');
</script>

<div class="pointer-events-none absolute inset-0 z-20">
  <div class="absolute inset-y-0 left-1/2 w-px bg-white/30"></div>
  <div class="absolute top-8 left-0 w-1/2 px-8">
    <h3
      class="font-display mb-3 text-center text-4xl tracking-tight md:text-5xl"
      style="color: var(--color-p1)"
    >
      {p1Name}
    </h3>
    <p class="mb-4 text-center font-sans text-lg font-medium opacity-85 md:text-xl">
      Hold both hands in view
    </p>
    <div class="h-4 w-full overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full transition-[width] duration-100"
        style="width: {Math.min(
          100,
          (p1Ready / READY_TARGET) * 100
        )}%; background: var(--color-p1);"
      ></div>
    </div>
  </div>
  <div class="absolute top-8 right-0 w-1/2 px-8">
    <h3
      class="font-display mb-3 text-center text-4xl tracking-tight md:text-5xl"
      style="color: var(--color-p2)"
    >
      {p2Name}
    </h3>
    <p class="mb-4 text-center font-sans text-lg font-medium opacity-85 md:text-xl">
      Hold both hands in view
    </p>
    <div class="h-4 w-full overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full transition-[width] duration-100"
        style="width: {Math.min(
          100,
          (p2Ready / READY_TARGET) * 100
        )}%; background: var(--color-p2);"
      ></div>
    </div>
  </div>
</div>
