import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/** Nocturne .btn 계열을 shadcn 방식(cva)으로 감싼 버튼 */
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      plain: "",
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
    },
    size: {
      default: "",
      icon: "btn-icon",
    },
  },
  defaultVariants: { variant: "plain", size: "default" },
});

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
