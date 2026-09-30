// "Harflerin Gece Yolculuğu" — tek parça dikey yükleme filmi.
// Katmanlar: sonsuz zoom zinciri (hareket bulanıklığıyla) → sabit katman (sayaç + anlatı) → eski film görünümü.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FilmLook } from '../fx/FilmLook';
import { MotionBlur } from '../fx/MotionBlur';
import { FONT, clampOpts } from '../theme';
import { Papirus, PAPIRUS_PORTAL } from '../scenes/Papirus';
import { Parsomen, PARSOMEN_PORTAL } from '../scenes/Parsomen';
import { Chain, blurSamplesAt, type SceneMap } from './Chain';
import { Overlay } from './Overlay';

// henüz yapılmamış sahneler için yer tutucu (zinciri uçtan uca sınamak için)
const placeholder = (name: string, bg: string): React.FC => () => (
  <AbsoluteFill style={{ background: bg, display: 'grid', placeItems: 'center' }}>
    <div style={{ position: 'absolute', left: 540 - 60, top: 960 - 60, width: 120, height: 120, borderRadius: '50%', background: '#000', boxShadow: '0 0 0 6px #d4a54a' }} />
    <div style={{ position: 'absolute', top: 1180, width: '100%', textAlign: 'center', fontFamily: FONT.roman, fontWeight: 900, fontSize: 90, color: '#ecdfc2' }}>{name}</div>
  </AbsoluteFill>
);
const PH = { cx: 540, cy: 960, r: 60 };

export const SCENES: SceneMap = {
  papirus: { Comp: Papirus, portal: { ...PAPIRUS_PORTAL, open: [0.0, 0.14] } },
  parsomen: { Comp: Parsomen, portal: { ...PARSOMEN_PORTAL, open: [0.0, 0.1] } },
  matbaa: { Comp: placeholder('MATBAA', '#1a120a'), portal: PH },
  bulmaca: { Comp: placeholder('BULMACA', '#222'), portal: PH },
  harfler: { Comp: placeholder('HARFLER', '#1c2622'), portal: PH },
  gece: { Comp: placeholder('GECE POSTASI', '#0b1426') },
};

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const samples = blurSamplesAt(frame, fps, SCENES, W, H);
  // film dokusu tarih ilerledikçe "restore" olur: antik çağda ağır, bu gece hafif
  const strength = interpolate(t, [0, 12, 17], [1, 0.8, 0.45], clampOpts);
  return (
    <FilmLook strength={strength}>
      <MotionBlur samples={samples}><Chain scenes={SCENES} /></MotionBlur>
      <Overlay hideAfter={18.6} />
    </FilmLook>
  );
};
