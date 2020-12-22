export type PlayStatus = 'playing' | 'paused';

// -------------------------------------
// from popup to content script messages
// -------------------------------------

export type ChooseElementMessage = {
  command: 'choose-element',
  tabId: number,
}

export type StopStreamMessage = {
  command: 'stop-stream',
  streamId: number,
}

export type StopAllMessage = {
  command: 'stop-all',
}

export type GetAllMessage = {
  command: 'get-all'
}

export type ToContentMessage =
  ChooseElementMessage
  | StopStreamMessage
  | StopAllMessage
  | GetAllMessage;

// -------------------------------------
// from content script to popup messages
// -------------------------------------

export type StatusUpdateMessage = {
  description: 'status-update',
  streamId: number,
  status: PlayStatus,
}

export type AllStatusesMessage = {
  description: 'status-all',
  statuses: [number, PlayStatus][],
};

export type FromContentMessage = StatusUpdateMessage | AllStatusesMessage;

// ----------------------------------------
// from popup to background script messages
// ----------------------------------------

export type StartRoomMessage = {
  command: 'start-room',
  roomId: string,
  authToken: string,
};

export type QueryRoomMessage = {
  command: 'query-room',
};

export type StopRoomMessage = {
  command: 'stop-room',
};

export type ToBackgroundMessage = StartRoomMessage | QueryRoomMessage | StopRoomMessage;

// ----------------------------------------
// from background script to popup messages
// ----------------------------------------

export type ActionResponseMessage = {
  description: 'action-response',
  success: boolean,
};

export type RoomInfoMessage = {
  description: 'room-info',
  roomId: string | null,
};

export type FromBackgroundMessage = RoomInfoMessage | ActionResponseMessage;
