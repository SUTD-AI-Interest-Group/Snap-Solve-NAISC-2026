<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { game, paused, camera, volume } from '$lib/store.svelte';
  import { initialState } from '$lib/game/state';
  import { playMusic, setMusicVolume } from '$lib/audio/music';
  import { setSfxVolume } from '$lib/audio/sfx';
  import { saveVolume } from '$lib/audio/volumeStorage';

  function cameraLabel(d: MediaDeviceInfo, i: number): string {
    return d.label || `Camera ${i + 1}`;
  }

  const volumePct = $derived(Math.round(volume.value * 100));

  function onVolumeInput(e: Event) {
    const pct = Number((e.currentTarget as HTMLInputElement).value);
    volume.value = pct / 100;
    setMusicVolume(volume.value);
    setSfxVolume(volume.value);
    saveVolume(volume.value);
  }

  function resume() {
    paused.value = false;
  }

  // Restart drops the current match and returns to the "Who's playing?" screen
  // for a fresh pair of names.
  function restart() {
    paused.value = false;
    game.state = { phase: 'nicknames', p1Name: '', p2Name: '' };
    playMusic('lobby');
  }

  function mainMenu() {
    paused.value = false;
    game.state = initialState;
    playMusic('lobby');
  }
</script>

<section
  class="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/85 px-6 backdrop-blur-sm"
>
  <h2
    class="font-display text-7xl tracking-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.4)] md:text-8xl"
    style="color: var(--color-accent);"
  >
    Paused
  </h2>
  <p class="font-sans text-lg font-medium opacity-75 md:text-xl">Press ESC to continue</p>

  <div class="flex w-full max-w-sm flex-col gap-6">
    {#if camera.list.length > 1}
      <div class="flex flex-col gap-2">
        <label for="pause-camera" class="font-sans text-sm tracking-wide text-white/70"
          >Camera</label
        >
        <select
          id="pause-camera"
          bind:value={camera.selectedId}
          class="rounded-xl border-2 border-white/40 bg-transparent px-4 py-2 font-sans text-base text-white"
        >
          {#each camera.list as device, i (device.deviceId)}
            <option value={device.deviceId} class="text-black">{cameraLabel(device, i)}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <label
        for="pause-volume"
        class="flex justify-between font-sans text-sm tracking-wide text-white/70"
      >
        <span>Volume</span>
        <span>{volumePct}%</span>
      </label>
      <input
        id="pause-volume"
        type="range"
        min="0"
        max="100"
        value={volumePct}
        oninput={onVolumeInput}
        class="w-full accent-[var(--color-accent)]"
      />
    </div>
  </div>

  <div class="mt-2 flex flex-col gap-4 md:flex-row">
    <Button size="lg" onclick={resume}>Continue</Button>
    <Button size="lg" variant="outline" onclick={restart}>Restart</Button>
    <Button size="lg" variant="outline" onclick={mainMenu}>Main menu</Button>
  </div>
</section>
