// Kamera hareket bulanıklığı: çocukları, kareyi ortalayan bir "enstantane" aralığında birkaç alt-kare olarak çizip
// ortalar (plus-lighter + opacity(1/n)). samples<=1 iken hiçbir ek maliyet yoktur. Katmanlar opak olmalıdır.
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';

type Props = { readonly samples: number; readonly shutter?: number; readonly children: React.ReactNode };

export const MotionBlur: React.FC<Props> = ({ samples, shutter = 0.5, children }) => {
  const f = useCurrentFrame();
  const n = Math.max(1, Math.round(samples));
  if (n <= 1) return <>{children}</>;
  return (
    <AbsoluteFill style={{ isolation: 'isolate', background: '#000' }}>
      {Array.from({ length: n }, (_, i) => (
        <AbsoluteFill key={i} style={{ mixBlendMode: 'plus-lighter', filter: `opacity(${1 / n})` }}>
          <Freeze frame={f + ((i + 0.5) / n - 0.5) * shutter}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
