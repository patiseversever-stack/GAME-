// Kompozisyonlar (dikey 1080x1920)
import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { T } from './seq/kesisim/field';
import { Kesisim } from './seq/kesisim/Kesisim';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Sekans1-Kesisim" component={Kesisim} width={1080} height={1920} fps={60} durationInFrames={Math.ceil(T.end * 60)} />
  </>
);
