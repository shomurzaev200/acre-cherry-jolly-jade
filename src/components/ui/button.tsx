import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[background,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-cyan text-accent-fg hover:bg-cyan/90 shadow-[0_0_18px_-6px_rgb(0_212_224_/_0.7)]",
        secondary: "bg-bg-subtle text-fg border border-line hover:border-cyan/30 hover:bg-bg-hover",
        ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
        ai: "bg-violet/15 text-violet border border-violet/30 hover:bg-violet/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
