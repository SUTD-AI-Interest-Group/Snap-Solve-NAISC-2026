<script lang="ts">
  import { onMount } from 'svelte';
  import type { PipelineHighlight } from '$lib/highlights/pipeline.svelte';

  let { highlights }: { highlights: PipelineHighlight[] } = $props();
  let canvases: HTMLCanvasElement[] = $state([]);

  onMount(() => {
    highlights.forEach((h, i) => {
      const c = canvases[i];
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(h.firstFrame, 0, 0, c.width, c.height);
    });
  });
</script>

<div class="flex justify-center gap-3">
  {#each highlights as h, i (h.kind + '-' + i)}
    <div class="flex flex-col items-center gap-1">
      <canvas
        bind:this={canvases[i]}
        width="80"
        height="45"
        class="rounded border-2"
        style="border-color: var(--color-primary); background: #000;"
      ></canvas>
      <span class="font-mono text-[10px] uppercase tracking-wide opacity-70">{h.kind}</span>
    </div>
  {/each}
</div>
