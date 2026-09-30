// Kompozisyonlar:
//  Sahneler/  : her sahne kendi zaman çizelgesiyle (bağlı kompozisyonlar)
//  Film/      : 15 sn önizleme filmi (yatay + dikey)
//  Oyun/      : oyuna gömülen dosyalar — giriş+döngü (A) ve çıkış (B), yatay + dikey
import React from 'react';
import { Composition, Folder } from 'remotion';
import './fonts';
import { Murekkep } from './scenes/Murekkep';
import { Dizgi } from './scenes/Dizgi';
import { Kesisimler } from './scenes/Kesisimler';
import { Sayfa } from './scenes/Sayfa';
import { Dongu } from './scenes/Dongu';
import { Cikis } from './scenes/Cikis';
import { YuklemeFilmi } from './films/YuklemeFilmi';

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Film">
      <Composition id="GecePostasi-Yatay" component={YuklemeFilmi} width={1920} height={1080} fps={30} durationInFrames={450} defaultProps={{ variant: 'tam' as const, donguSayisi: 2 }} />
      <Composition id="GecePostasi-Dikey" component={YuklemeFilmi} width={1080} height={1920} fps={30} durationInFrames={450} defaultProps={{ variant: 'tam' as const, donguSayisi: 2 }} />
    </Folder>
    <Folder name="Oyun">
      <Composition id="Oyun-Yatay-GirisDongu" component={YuklemeFilmi} width={1920} height={1080} fps={30} durationInFrames={402} defaultProps={{ variant: 'giris-dongu' as const, donguSayisi: 2 }} />
      <Composition id="Oyun-Yatay-Cikis" component={YuklemeFilmi} width={1920} height={1080} fps={30} durationInFrames={48} defaultProps={{ variant: 'cikis' as const, donguSayisi: 0 }} />
      <Composition id="Oyun-Dikey-GirisDongu" component={YuklemeFilmi} width={1080} height={1920} fps={30} durationInFrames={402} defaultProps={{ variant: 'giris-dongu' as const, donguSayisi: 2 }} />
      <Composition id="Oyun-Dikey-Cikis" component={YuklemeFilmi} width={1080} height={1920} fps={30} durationInFrames={48} defaultProps={{ variant: 'cikis' as const, donguSayisi: 0 }} />
    </Folder>
    <Folder name="Sahneler">
      <Composition id="Murekkep" component={Murekkep} width={1920} height={1080} fps={30} durationInFrames={39} />
      <Composition id="Dizgi" component={Dizgi} width={1920} height={1080} fps={30} durationInFrames={57} />
      <Composition id="Kesisimler" component={Kesisimler} width={1920} height={1080} fps={30} durationInFrames={45} />
      <Composition id="Sayfa" component={Sayfa} width={1920} height={1080} fps={30} durationInFrames={48} />
      <Composition id="Dongu" component={Dongu} width={1920} height={1080} fps={30} durationInFrames={120} />
      <Composition id="Cikis" component={Cikis} width={1920} height={1080} fps={30} durationInFrames={48} />
    </Folder>
  </>
);
