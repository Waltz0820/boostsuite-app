// app/components/GradientText.tsx
import React from "react";
import { ComponentPropsWithoutRef } from "react";
import clsx from "clsx";

type Props = {
  as?: keyof React.JSX.IntrinsicElements;  // ← ここも React.JSX に変更してもOK
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
} & ComponentPropsWithoutRef<"span">;

export default function GradientText({
  as: Tag = "span",
  children,
  className,
  from = "from-sky-400",
  to = "to-blue-500",
  ...props
}: Props) {
  return (
    <Tag
      {...props}
      className={clsx(
        "font-bold bg-gradient-to-r bg-clip-text text-transparent",
        from,
        to,
        // ✅ 暗背景用フォールバック
        "text-white [text-shadow:0_0_1px_rgba(255,255,255,0.05)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
