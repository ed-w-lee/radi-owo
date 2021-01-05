import { Writable, writable } from 'svelte/store';
import type { RoomInfo } from './actions/rooms';

export type UserStore = {
  token: string,
  result: {
    id: string,
    display_name: string,
    email: string,
  }
};

export type PersistentStore<T> = Writable<T> & {
  useLocalStorage: () => void
};

const persistentStore = <T>(key: string, initial): PersistentStore<T> => {
  const { subscribe, set, ...myWritable } = writable(initial);

  // handle SSR by just not using local storage... or something
  let useLocalStorage: () => void;
  useLocalStorage = () => {
    const json = window.localStorage.getItem(key);
    if (json) {
      set(JSON.parse(json));
    }

    subscribe((updated) => {
      window.localStorage.setItem(key, JSON.stringify(updated));
    });
  };

  return {
    ...myWritable,
    subscribe,
    set,
    useLocalStorage,
  }
};

export const userStore: PersistentStore<UserStore | null> =
  persistentStore('user', null);

export const listenRoomStore: Writable<RoomInfo | null> = writable(null);