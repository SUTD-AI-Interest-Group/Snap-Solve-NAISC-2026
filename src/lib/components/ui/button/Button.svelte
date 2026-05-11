<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Variant = 'default' | 'outline' | 'ghost';
  type Size = 'default' | 'sm' | 'lg';

  interface Props extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    class?: string;
    children?: Snippet;
  }

  let { variant = 'default', size = 'default', class: className = '', children, ...rest }: Props = $props();

  const variants: Record<Variant, string> = {
    default: 'bg-white text-black hover:bg-white/90',
    outline: 'border-2 border-white/30 hover:bg-white/10',
    ghost: 'hover:bg-white/10'
  };

  const sizes: Record<Size, string> = {
    default: 'h-10 px-5 py-2 text-base',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-16 px-10 text-2xl'
  };
</script>

<button
  class={cn(
    'inline-flex items-center justify-center rounded-2xl font-display tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.3)]',
    variants[variant],
    sizes[size],
    className
  )}
  {...rest}
>
  {@render children?.()}
</button>
