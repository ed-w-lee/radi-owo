type PlayStatus = 'playing' | 'paused';

// -------------------------------------
// from popup to content script messages
// -------------------------------------

type ChooseElementMessage = {
  command: 'choose-element',
  tabId: number,
}

type StopStreamMessage = {
  command: 'stop-stream',
  streamId: number,
}

type StopAllMessage = {
  command: 'stop-all',
}

type GetAllMessage = {
  command: 'get-all'
}

type ToContentMessage = ChooseElementMessage | StopStreamMessage | StopAllMessage | GetAllMessage;

// -------------------------------------
// from content script to popup messages
// -------------------------------------

type StatusUpdateMessage = {
  description: 'status-update',
  streamId: number,
  status: PlayStatus,
}

type AllStatusesMessage = {
  description: 'status-all',
  statuses: [number, PlayStatus][],
};

type FromContentMessage = StatusUpdateMessage | AllStatusesMessage;

// ----------------------------------------
// from popup to background script messages
// ----------------------------------------

type StartRoomMessage = {
  command: 'start-room',
  roomId: string,
  authToken: string,
};

type QueryRoomMessage = {
  command: 'query-room',
};

type StopRoomMessage = {
  command: 'stop-room',
};

type ToBackgroundMessage = StartRoomMessage | QueryRoomMessage | StopRoomMessage;

// ----------------------------------------
// from background script to popup messages
// ----------------------------------------

type ActionResponseMessage = {
  description: 'action-response',
  success: boolean,
};

type RoomInfoMessage = {
  description: 'room-info',
  roomId: string | null,
};

type FromBackgroundMessage = RoomInfoMessage | ActionResponseMessage;
