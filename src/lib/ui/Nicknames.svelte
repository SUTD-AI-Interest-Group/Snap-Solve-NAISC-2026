<script lang="ts">
  import { game } from '$lib/store.svelte';
  import { tick as gameTick } from '$lib/game/tick';
  import { EMPTY_GESTURES } from '$lib/game/state';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';

  let p1 = $state('');
  let p2 = $state('');

  const canSubmit = $derived(
    p1.trim().length > 0 && p1.length <= 12 && p2.trim().length > 0 && p2.length <= 12
  );

  function submit() {
    if (!canSubmit) return;
    game.state = gameTick(
      game.state,
      { type: 'nicknamesSubmitted', p1Name: p1.trim(), p2Name: p2.trim() },
      EMPTY_GESTURES
    ).state;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }
</script>

<section
  class="splash-bg relative z-10 flex h-screen flex-col items-center justify-center gap-12 overflow-hidden"
>
  <!-- Decorative illustration — bottom-right corner accent -->
  <img
    src="/illustrations/capture-moment.svg"
    alt=""
    aria-hidden="true"
    class="pointer-events-none absolute right-4 bottom-0 h-48 w-auto opacity-25 select-none md:h-56"
    draggable="false"
  />

  <h2
    class="font-display text-center text-6xl tracking-tight md:text-7xl"
    style="color: var(--color-ink);"
  >
    Who's playing?
  </h2>
  <div class="grid w-full max-w-3xl grid-cols-2 gap-12 px-6">
    <div class="flex flex-col gap-3">
      <label
        for="p1"
        class="font-display text-3xl tracking-wide md:text-4xl"
        style="color: var(--color-p1)">Player 1</label
      >
      <Input
        id="p1"
        bind:value={p1}
        maxlength={12}
        placeholder="Nickname"
        class="h-16 border-[var(--color-p1)]/50 py-6 font-sans text-2xl focus:border-[var(--color-p1)] focus:ring-[var(--color-p1)]/25"
        onkeydown={onKeydown}
      />
    </div>
    <div class="flex flex-col gap-3">
      <label
        for="p2"
        class="font-display text-3xl tracking-wide md:text-4xl"
        style="color: var(--color-p2)">Player 2</label
      >
      <Input
        id="p2"
        bind:value={p2}
        maxlength={12}
        placeholder="Nickname"
        class="h-16 border-[var(--color-p2)]/50 py-6 font-sans text-2xl focus:border-[var(--color-p2)] focus:ring-[var(--color-p2)]/25"
        onkeydown={onKeydown}
      />
    </div>
  </div>
  <Button size="lg" disabled={!canSubmit} onclick={submit}>Let's go!</Button>
</section>
