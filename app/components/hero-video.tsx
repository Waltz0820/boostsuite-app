'use client';

import { useEffect, useRef } from 'react';

type Props = {
  src: string;
  poster?: string;
  className?: string;
  playbackRate?: number; // デフォ 0.6
};

export default function HeroVideo({
  src,
  poster,
  className,
  playbackRate = 0.6,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // iOS 対策：一度 play() を試みてから再度 rate を適用
    const apply = () => {
      try { v.playbackRate = playbackRate; } catch {}
    };
    apply();
    const id = setTimeout(apply, 100); // メタデータ後の再適用
    return () => clearTimeout(id);
  }, [playbackRate]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      className={className}
    />
  );
}
useEffect(() => {
  const v = ref.current;
  if (!v) return;

  v.playbackRate = playbackRate;

  const handleEnd = () => {
    v.classList.add("opacity-60"); // ← 再生終了時に少し暗くする
  };
  v.addEventListener("ended", handleEnd);
  return () => v.removeEventListener("ended", handleEnd);
}, [playbackRate]);
