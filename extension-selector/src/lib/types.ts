type PlayStatus = 'playing' | 'paused';

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

type StatusUpdateMessage = {
  description: 'status-update',
  streamId: number,
  status: PlayStatus,
}

type AllStatusesMessage = {
  description: 'status-all',
  statuses: [number, PlayStatus][],
};

type ToPopupMessage = StatusUpdateMessage | AllStatusesMessage;