<script lang="ts">
  import { onMount } from 'svelte';

  // Snap & Solve is a side-by-side 2-player game and needs a wide frame.
  // On a touch device held in portrait, ask the player to rotate. Desktop
  // (fine pointer) is unaffected — a tall browser window never triggers this.
  let portrait = $state(false);

  onMount(() => {
    const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
    const update = () => (portrait = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });
</script>

{#if portrait}
  <div
    class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 px-10 text-center"
    style="background: var(--color-bg); color: var(--color-ink);"
  >
    <svg
      class="h-24 w-24 animate-pulse"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
      <path d="M3.5 9.5 1.5 12l2 2.5M20.5 9.5l2 2.5-2 2.5" />
    </svg>
    <h2 class="font-display text-4xl tracking-tight" style="color: var(--color-primary);">
      Rotate your iPad
    </h2>
    <p class="max-w-md font-sans text-lg leading-relaxed opacity-85">
      Snap &amp; Solve is a two-player game — turn your device to landscape so both players have
      room to play.
    </p>
  </div>
{/if}
