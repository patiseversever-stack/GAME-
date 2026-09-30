// Kompozisyonlar (dikey 1080x1920, 30 kare/sn)
import React from 'react';
import { Composition, Folder } from 'remotion';
import './fonts';
import { FilmLook } from './fx/FilmLook';
import { Film } from './film/Film';
import { FPS, H, TOTAL, W } from './film/timeline';
import { Papirus } from './scenes/Papirus';
import { Parsomen } from './scenes/Parsomen';

const solo = (C: React.FC): React.FC => () => <FilmLook><C /></FilmLook>;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} width={W} height={H} fps={FPS} durationInFrames={Math.round(TOTAL * FPS)} />
    <Folder name="Sahneler">
      <Composition id="Papirus" component={solo(Papirus)} width={W} height={H} fps={FPS} durationInFrames={105} />
      <Composition id="Parsomen" component={solo(Parsomen)} width={W} height={H} fps={FPS} durationInFrames={105} />
    </Folder>
  </>
);
