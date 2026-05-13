<script lang="ts">
  import { onMount } from 'svelte';

  let online = $state(true);

  onMount(() => {
    online = navigator.onLine;
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
</script>

{#if !online}
  <div
    class="pointer-events-none fixed top-4 left-4 z-50 rounded-full px-3 py-1.5 font-mono text-xs tracking-wide"
    style="background: var(--color-p1, #d4685c); color: white;"
    role="status"
    aria-live="polite"
  >
    Offline
  </div>
{/if}
