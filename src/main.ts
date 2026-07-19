import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import './styles/chrome.css';
import './styles/sections.css';

import { initScroll } from './app/scroll';
import { runPreloader } from './app/preloader';
import { initNav } from './app/nav';
import { initCursor } from './app/cursor';
import { initMagnetic } from './app/magnetic';
import { initAnchors } from './app/anchors';
import { initRail } from './app/rail';
import { initHero } from './app/sections/hero';
import { initManifesto } from './app/sections/manifesto';
import { initJourney } from './app/sections/journey';
import { initFootprint } from './app/sections/footprint';
import { initStats } from './app/sections/stats';
import { initIndustries } from './app/sections/industries';
import { initFooter } from './app/sections/footer';

initScroll();
initCursor();
initMagnetic();
initAnchors();
initManifesto();
initJourney();
initFootprint();
initStats();
initIndustries();
initFooter();

// three.js + all scenes load as a separate chunk while the preloader runs;
// the wipe waits for it so the canvas is never revealed dead
const glReady = import('./gl/stage').then((m) => m.initStage());

runPreloader(glReady).then(() => {
  initNav();
  initHero();
  initRail();
});
