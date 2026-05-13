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
  class="fixed top-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-black/40 text-2xl transition-all hover:bg-black/60 active:scale-90"
  onclick={toggle}
  aria-label={muted.value ? 'Unmute' : 'Mute'}
>
  {muted.value ? '🔇' : '🔊'}
</button>
