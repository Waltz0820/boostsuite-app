"use client";
import { useEffect, useRef } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  playbackRate?: number;
  loop?: boolean;
};

export default function HeroVideo({
  src,
  poster,
  className,
  playbackRate = 1,
  loop = false, // デフォルトでループさせない
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // 再生速度を設定
    v.playbackRate = playbackRate;

    // 再生終了時に少し暗くフェード（自然停止用）
    const handleEnd = () => {
      v.classList.add("opacity-60", "transition-opacity", "duration-1000");
    };

    v.addEventListener("ended", handleEnd);
    return () => {
      v.removeEventListener("ended", handleEnd);
    };
  }, [playbackRate]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      playsInline
      preload="metadata"
      loop={loop}
      className={className}
    />
  );
}
