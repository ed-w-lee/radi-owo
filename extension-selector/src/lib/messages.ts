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