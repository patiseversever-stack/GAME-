// Yükleme filmi: sahneler TransitionSeries ile birleşir, HUD tüm filmin üstünde durur.
//  • tam          : önizleme filmi (giriş → 2 döngü → çıkış) = 15 sn
//  • giris-dongu  : oyuna gömülen A dosyası (giriş + 3 döngü; oyun döngüleri gerekirse geri sarar)
//  • cikis        : oyuna gömülen B dosyası (oyun hazır olunca oynar)
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { clampOpts } from '../theme';
import { Hud } from '../components/Hud';
import { Murekkep } from '../scenes/Murekkep';
import { Dizgi } from '../scenes/Dizgi';
import { Kesisimler } from '../scenes/Kesisimler';
import { Sayfa } from '../scenes/Sayfa';
import { Dongu } from '../scenes/Dongu';
import { Cikis } from '../scenes/Cikis';

// 30 kare/sn için süreler (kare). Giriş = 39 + 57 + 45 + 48 − 3×9 = 162 kare (5,4 sn).
export const F = { murekkep: 39, dizgi: 57, kesisim: 45, sayfa: 48, gecis: 9, dongu: 120, cikis: 48 } as const;
export const GIRIS = F.murekkep + F.dizgi + F.kesisim + F.sayfa - 3 * F.gecis;

type Props = { readonly variant: 'tam' | 'giris-dongu' | 'cikis'; readonly donguSayisi: number };

const IntroSeries: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="01 Mürekkep" durationInFrames={39} premountFor={fps}>
        <Murekkep />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 9 })} />
      <TransitionSeries.Sequence name="02 Dizgi" durationInFrames={57} premountFor={fps}>
        <Dizgi />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 9 })} />
      <TransitionSeries.Sequence name="03 Kesişimler" durationInFrames={45} premountFor={fps}>
        <Kesisimler />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 9 })} />
      <TransitionSeries.Sequence name="04 Sayfa" durationInFrames={48} premountFor={fps}>
        <Sayfa />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

const FilmHud: React.FC<Props> = ({ variant, donguSayisi }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (variant === 'cikis') {
    return <Hud sahne="05 — BASKI" mode="loop" loopT={0} opacity={interpolate(frame, [3, 14], [1, 0], clampOpts)} />;
  }
  const loopStart = GIRIS, outroStart = GIRIS + donguSayisi * F.dongu;
  if (frame < loopStart) {
    const sahne = frame < 34 ? '01 — MÜREKKEP' : frame < 82 ? '02 — DİZGİ' : frame < 118 ? '03 — KESİŞİMLER' : '04 — SAYFA';
    return <Hud sahne={sahne} mode="intro" progress={frame / GIRIS} enter={interpolate(frame, [2, 16], [0, 1], clampOpts)} />;
  }
  if (variant === 'tam' && frame >= outroStart) {
    return <Hud sahne="05 — BASKI" mode="loop" loopT={0} opacity={interpolate(frame - outroStart, [3, 14], [1, 0], clampOpts)} />;
  }
  const loopT = ((frame - loopStart) % F.dongu) / F.dongu;
  return <Hud sahne="05 — BASKI" mode="loop" loopT={loopT} />;
  void fps;
};

export const YuklemeFilmi: React.FC<Props> = ({ variant, donguSayisi }) => {
  const { fps } = useVideoConfig();
  if (variant === 'cikis') {
    return (
      <AbsoluteFill>
        <Cikis />
        <FilmHud variant={variant} donguSayisi={donguSayisi} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Sequence name="Giriş" durationInFrames={GIRIS} premountFor={fps}>
        <IntroSeries />
      </Sequence>
      {Array.from({ length: donguSayisi }, (_, i) => (
        <Sequence key={i} name={`Döngü ${i + 1}`} from={GIRIS + i * F.dongu} durationInFrames={F.dongu} premountFor={fps}>
          <Dongu />
        </Sequence>
      ))}
      {variant === 'tam' ? (
        <Sequence name="Çıkış" from={GIRIS + donguSayisi * F.dongu} durationInFrames={F.cikis} premountFor={fps}>
          <Cikis />
        </Sequence>
      ) : null}
      <FilmHud variant={variant} donguSayisi={donguSayisi} />
    </AbsoluteFill>
  );
};
