import { browser } from 'webextension-polyfill-ts';
import { CLEAN_STATE, State, StateManager } from './state';

const stateKeys = [
  'authToken',
  'user',
];

export const getStorageState = async (manager: StateManager): Promise<void> => {
  const storageState = await browser.storage.local.get(stateKeys) as State;
  console.debug('storage state', storageState);
  manager.setState({ ...CLEAN_STATE, ...storageState });
};

export const setStorageState = async (state: State) => {
  const toSet = {
    authToken: state.authToken,
    user: state.user,
  };

  await browser.storage.local.set(toSet);
};
