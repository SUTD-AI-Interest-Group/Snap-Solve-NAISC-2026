<script lang="ts">
  import { muted } from '$lib/store.svelte';
  import { setSfxMuted } from '$lib/audio/sfx';
  import { setMusicMuted } from '$lib/audio/music';

  function toggle() {
    muted.value = !muted.value;
    setSfxMuted(muted.value);
    setMusicMuted(muted.value);
  }
</script>

<button
  class="fixed top-4 right-4 z-50 size-12 rounded-full bg-black/40 hover:bg-black/60 text-2xl flex items-center justify-center transition-all active:scale-90"
  onclick={toggle}
  aria-label={muted.value ? 'Unmute' : 'Mute'}
>
  {muted.value ? '🔇' : '🔊'}
</button>
