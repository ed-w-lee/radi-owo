import { PlayStatus } from '../lib/types';
import { RoomInfo, UserInfo } from './net';

export type StreamsStore = Map<number, Map<number, PlayStatus>>;

export type State = {
  authToken?: string,
  user?: UserInfo,
  allRooms?: RoomInfo[],
  currentRoom?: string,
};

export type SetStateFn = (newState: State) => void;

type StateChangeListener = (state: State, setState: SetStateFn) => void;

export const CLEAN_STATE: State = {
  authToken: undefined,
  user: undefined,
  allRooms: undefined,
  currentRoom: undefined,
};

export class StateManager {
  state: State;

  listener?: StateChangeListener;

  constructor() {
    this.state = { ...CLEAN_STATE };
    this.setState = this.setState.bind(this);
  }

  setListener(listener: StateChangeListener) {
    this.listener = listener;
  }

  getState(): State {
    return this.state;
  }

  setState(newState: State) {
    this.state = { ...this.state, ...newState };
    console.debug('updated state:', this.state);
    if (this.listener !== undefined) {
      console.debug('calling listener');
      this.listener(this.state, this.setState);
    }
  }
}
