import { browser } from 'webextension-polyfill-ts';
import { initLoginPage, renderLoginPage } from './components/login';
import { attemptGetRooms, renderRoomsList } from './components/roomlist';
import { getStorageState } from './storage';
import { SetStateFn, State, StateManager } from './state';
import { renderRoomManager } from './components/roommanage';

const StateHandler = (state: State, setState: SetStateFn) => {
  if (state.authToken && state.user) {
    console.log('[popup] attempting to get rooms');
    if (!state.allRooms) {
      attemptGetRooms(state, setState);
    } else if (!state.currentRoom) {
      renderRoomsList(state, setState);
    } else {
      renderRoomManager(state, setState);
    }
  } else {
    console.log('[popup] rendering login page');
    renderLoginPage();
  }
};

const initialize = async () => {
  const manager = new StateManager();
  manager.setListener(StateHandler);

  getStorageState(manager);
  initLoginPage(manager.setState);
};

(() => {
  console.log('[popup] executing script');

  browser.tabs.executeScript({
    file: '/src/content_scripts/build_content.js',
  })
    .catch((e) => console.log('[popup] there was some error in executing', e))
    .then(() => initialize());
})();
