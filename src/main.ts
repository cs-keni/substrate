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
import { initHero } from './app/sections/hero';
import { initManifesto } from './app/sections/manifesto';
import { initJourney } from './app/sections/journey';
import { initFootprint } from './app/sections/footprint';
import { initStats } from './app/sections/stats';
import { initIndustries } from './app/sections/industries';
import { initFooter } from './app/sections/footer';
import { initStage } from './gl/stage';

initScroll();
initCursor();
initStage();
initManifesto();
initJourney();
initFootprint();
initStats();
initIndustries();
initFooter();

runPreloader().then(() => {
  initNav();
  initHero();
});
