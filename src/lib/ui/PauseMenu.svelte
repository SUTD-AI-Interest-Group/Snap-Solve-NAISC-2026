<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { game, paused } from '$lib/store.svelte';
  import { initialState } from '$lib/game/state';
  import { playMusic } from '$lib/audio/music';

  function resume() {
    paused.value = false;
  }

  function restart() {
    // Restart current match: back to tracking check with same names if we have them,
    // otherwise back to nicknames.
    paused.value = false;
    const s = game.state;
    if (s.phase === 'solve' || s.phase === 'countdown' || s.phase === 'result') {
      const p1Name = 'p1' in s && 'name' in (s as any).p1 ? (s as any).p1.name : '';
      const p2Name = 'p2' in s && 'name' in (s as any).p2 ? (s as any).p2.name : '';
      game.state = {
        phase: 'trackingCheck',
        p1Name,
        p2Name,
        p1Ready: 0,
        p2Ready: 0,
        autoCountdownMs: null
      };
    } else if (s.phase === 'snip' || s.phase === 'trackingCheck') {
      const p1Name = (s as { p1Name?: string }).p1Name ?? '';
      const p2Name = (s as { p2Name?: string }).p2Name ?? '';
      game.state = {
        phase: 'trackingCheck',
        p1Name,
        p2Name,
        p1Ready: 0,
        p2Ready: 0,
        autoCountdownMs: null
      };
    } else {
      game.state = { phase: 'nicknames', p1Name: '', p2Name: '' };
    }
    playMusic('lobby');
  }

  function quit() {
    paused.value = false;
    game.state = initialState;
    playMusic('lobby');
  }
</script>

<section class="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-8 z-50 pointer-events-auto">
  <h2 class="font-display text-7xl md:text-8xl tracking-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]" style="color: var(--color-accent);">Paused</h2>
  <p class="font-sans text-lg md:text-xl opacity-75 font-medium">Press ESC to resume</p>
  <div class="flex flex-col md:flex-row gap-4 mt-4">
    <Button size="lg" onclick={resume}>Resume</Button>
    <Button size="lg" variant="outline" onclick={restart}>Restart match</Button>
    <Button size="lg" variant="outline" onclick={quit}>Main menu</Button>
  </div>
</section>
