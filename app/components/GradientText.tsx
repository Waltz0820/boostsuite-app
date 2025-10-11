// /app/components/GradientText.tsx
import { ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

type Props = {
  as?: keyof JSX.IntrinsicElements;   // h1/h2/h3 など
  children: React.ReactNode;
  className?: string;
  from?: string; // Tailwind色 or 任意クラス
  to?: string;
};

export default function GradientText({
  as = "h2",
  children,
  className,
  from = "from-brand-400",
  to = "to-brand-600",
  ...rest
}: Props & ComponentPropsWithoutRef<"h2">) {
  const Tag: any = as;
  return (
    <Tag
      {...rest}
      className={clsx(
        "font-bold tracking-tight",
        "bg-clip-text text-transparent",
        "bg-gradient-to-r",
        from,
        to,
        className
      )}
    >
      {children}
    </Tag>
  );
}
