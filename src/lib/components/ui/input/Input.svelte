<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'class'> {
    class?: string;
    value?: string;
  }

  let { class: className = '', value = $bindable(''), ...rest }: Props = $props();
</script>

<input
  bind:value
  class={cn(
    'flex h-10 w-full rounded-xl border-2 border-[var(--color-ink)]/25 bg-white px-4 py-2 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/20 shadow-[0_2px_0_rgba(34,27,22,0.12)] transition-all',
    className
  )}
  {...rest}
/>
