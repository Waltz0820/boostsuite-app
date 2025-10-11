import React from "react";
import clsx from "clsx";

// 見出し・テキスト系だけに限定（SVG系を除外）
type TagName = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

type Props = {
  as?: TagName;
  children: React.ReactNode;
  className?: string;
  from?: string; // 例: "from-sky-400"
  to?: string;   // 例: "to-blue-500"
} & React.HTMLAttributes<HTMLElement>;

export default function GradientText({
  as = "span",
  children,
  className,
  from = "from-sky-400",
  to = "to-blue-500",
  ...rest
}: Props) {
  // 汎用 HTMLElement として扱う（型の衝突を避ける）
  const Tag = as as unknown as React.ElementType;

  return (
    <Tag
      {...rest}
      className={clsx(
        "font-bold bg-gradient-to-r bg-clip-text text-transparent",
        from,
        to,
        // 暗背景での視認性フォールバック（好みで外してOK）
        "text-white [text-shadow:0_0_1px_rgba(255,255,255,0.06)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
