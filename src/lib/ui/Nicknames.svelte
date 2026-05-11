<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let p1 = $state('');
  let p2 = $state('');

  const canSubmit = $derived(p1.trim().length > 0 && p1.length <= 12 && p2.trim().length > 0 && p2.length <= 12);

  function submit() {
    if (!canSubmit) return;
    game.state = gameTick(game.state, { type: 'nicknamesSubmitted', p1Name: p1.trim(), p2Name: p2.trim() }, EMPTY_GESTURES);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }
</script>

<section class="h-screen flex flex-col items-center justify-center gap-12 relative z-10">
  <h2 class="font-display text-6xl md:text-7xl text-center tracking-tight">Who's playing?</h2>
  <div class="grid grid-cols-2 gap-12 w-full max-w-3xl px-6">
    <div class="flex flex-col gap-3">
      <label for="p1" class="font-display text-3xl md:text-4xl tracking-wide" style="color: var(--color-p1)">Player 1</label>
      <Input id="p1" bind:value={p1} maxlength={12} placeholder="Nickname" class="font-sans text-2xl py-6 h-16" onkeydown={onKeydown} />
    </div>
    <div class="flex flex-col gap-3">
      <label for="p2" class="font-display text-3xl md:text-4xl tracking-wide" style="color: var(--color-p2)">Player 2</label>
      <Input id="p2" bind:value={p2} maxlength={12} placeholder="Nickname" class="font-sans text-2xl py-6 h-16" onkeydown={onKeydown} />
    </div>
  </div>
  <Button size="lg" disabled={!canSubmit} onclick={submit}>Let's go!</Button>
</section>
