// Screen registry.
import type { ScreenId } from '../types.ts';
import type { ScreenDef } from './screen.ts';
import { h } from '../dom.ts';
import { loadingScreen } from './loading.ts';
import { menuScreen } from './menu.ts';
import { worldsScreen } from './worlds.ts';
import { routesScreen } from './routes.ts';
import { modesScreen, suruScreen } from './modes.ts';
import { dailyScreen, duelScreen } from './daily.ts';
import { pauseScreen } from './pause.ts';
import { resultsScreen } from './results.ts';
import { settingsScreen } from './settings.ts';
import { collectionScreen } from './collection.ts';
import { photoScreen } from './photo.ts';
import { assistOffCard, helpCard, invertedCard, levelUpCard, resumeOverlay, unlockCard } from './cards.ts';
import { suruResultsScreen, weeklyScreen } from './extra.ts';

/** In-flight root: empty layer, the HUD (separate layer) is visible. */
const flightScreen: ScreenDef<Record<string, never>> = {
  layer: 'root',
  render() {
    return h('section', { class: 'kn-flight', 'aria-hidden': 'true' });
  },
};

export const SCREENS: Record<ScreenId, ScreenDef<never>> = {
  loading: loadingScreen,
  menu: menuScreen,
  worlds: worldsScreen,
  routes: routesScreen,
  modes: modesScreen,
  daily: dailyScreen,
  duel: duelScreen,
  suru: suruScreen,
  pause: pauseScreen,
  results: resultsScreen,
  settings: settingsScreen,
  collection: collectionScreen,
  photo: photoScreen,
  unlock: unlockCard,
  help: helpCard,
  inverted: invertedCard,
  assistOff: assistOffCard,
  resume: resumeOverlay,
  flight: flightScreen,
  levelUp: levelUpCard,
  weekly: weeklyScreen,
  suruResults: suruResultsScreen,
} as Record<ScreenId, ScreenDef<never>>;
