// Kompozisyonlar (dikey 1080x1920, 60 kare/sn)
import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Acilis } from './seq/acilis/Acilis';
import { DUR, FPS, H, W } from './seq/acilis/scene';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Sekans1-Acilis" component={Acilis} width={W} height={H} fps={FPS} durationInFrames={Math.round(DUR * FPS)} />
  </>
);
