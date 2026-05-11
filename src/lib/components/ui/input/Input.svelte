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
    'flex h-10 w-full rounded-xl border-2 border-white/20 bg-white/5 px-4 py-2 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-accent)] transition-colors',
    className
  )}
  {...rest}
/>
