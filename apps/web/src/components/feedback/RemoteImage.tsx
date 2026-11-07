"use client";

import Image from "next/image";
import { useState } from "react";

type Props = { src: string; className: string; width: number; height: number };

export function RemoteImage({ src, className, width, height }: Props) {
  const [failedSource, setFailedSource] = useState<string>();
  if (failedSource === src) return <div aria-hidden="true" className={className} />;
  return (
    <Image
      unoptimized
      src={src}
      alt=""
      width={width}
      height={height}
      className={className}
      loading="lazy"
      onError={() => setFailedSource(src)}
    />
  );
}
