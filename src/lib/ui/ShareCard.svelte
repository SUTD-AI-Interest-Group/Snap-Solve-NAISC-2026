<script lang="ts">
  import { onDestroy } from 'svelte';
  import QRCode from 'qrcode';
  import { pipeline, runPipeline, resetPipeline } from '$lib/highlights/pipeline.svelte';
  import { lastRecording } from '$lib/highlights/recordingStore.svelte';
  import ShareCardThumbnails from './ShareCardThumbnails.svelte';

  let qrDataUrl = $state<string | null>(null);
  // The recorder finalises asynchronously after solve → result, so blob/meta
  // arrive AFTER ShareCard mounts. Watch reactively and kick the pipeline
  // exactly once when all three fields are ready.
  let pipelineKickedOff = $state(false);
  $effect(() => {
    if (pipelineKickedOff) return;
    const { blob, events, startedAtMs, meta } = lastRecording;
    if (!blob || startedAtMs == null || !meta) return;
    pipelineKickedOff = true;
    runPipeline(blob, events, startedAtMs, meta).catch((e) => {
      console.error('runPipeline rejected', e);
    });
  });

  onDestroy(() => {
    resetPipeline();
  });

  // Render QR whenever a landingUrl appears.
  $effect(() => {
    if (pipeline.stage === 'ready' && pipeline.landingUrl) {
      QRCode.toDataURL(pipeline.landingUrl, {
        width: 240,
        margin: 1,
        color: { dark: '#221b16', light: '#ffffff' }
      })
        .then((url) => (qrDataUrl = url))
        .catch((e) => console.error('QR generation failed', e));
    }
  });

  function downloadGif(blob: Blob, kind: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snap-solve-${kind}.gif`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<section
  class="w-full max-w-md rounded-2xl border-2 p-5 backdrop-blur-md"
  style="background: rgba(255,255,255,0.08); border-color: var(--color-primary);"
  aria-live="polite"
>
  <h3 class="font-display mb-3 text-center text-xl tracking-wide">🎬 YOUR HIGHLIGHTS 🎬</h3>

  {#if pipeline.stage === 'idle' || pipeline.stage === 'clipping'}
    <p class="text-center text-sm opacity-80">
      Cooking up your highlights… {pipeline.completedClips}/{pipeline.totalClips}
    </p>
  {:else if pipeline.stage === 'uploading'}
    <p class="text-center text-sm opacity-80">☁️ Saving to the cloud…</p>
  {:else if pipeline.stage === 'ready' && qrDataUrl}
    <div class="flex flex-col items-center gap-3">
      <img src={qrDataUrl} alt="Scan to view your highlight reel" class="rounded bg-white p-2" />
      <p class="text-center text-sm leading-snug">
        Scan to grab your reel — {pipeline.highlights.length} clips of your match.<br />
        <span class="text-xs opacity-60">Expires when 10 newer games arrive.</span>
      </p>
      <ShareCardThumbnails highlights={pipeline.highlights} />
    </div>
  {:else if pipeline.stage === 'error'}
    <div class="flex flex-col items-center gap-3">
      <p class="text-sm opacity-80">Couldn't upload — grab them here instead.</p>
      <div class="flex flex-wrap justify-center gap-2">
        {#each pipeline.highlights as h}
          <button
            type="button"
            class="rounded border px-3 py-1 font-mono text-xs tracking-wide uppercase hover:opacity-80"
            style="border-color: var(--color-primary); color: var(--color-primary);"
            onclick={() => downloadGif(h.gif, h.kind)}
          >
            ↓ {h.kind}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</section>
