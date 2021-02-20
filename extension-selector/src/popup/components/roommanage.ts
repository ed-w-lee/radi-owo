import { browser, Runtime } from 'webextension-polyfill-ts';
import {
  ChooseElementMessage, FromContentMessage, GetAllMessage, StopAllMessage, StopStreamMessage,
} from '../../lib/types';
import { SetStateFn, State, StreamsStore } from '../state';
import { bgPingPong, hideAllExcept } from './util';

const handleChooseElement = () => {
  // we want to start the element chooser process in the current tab
  browser.tabs.query({ active: true, currentWindow: true })
    .then((myTab) => {
      const tabId = myTab[0].id;
      if (myTab.length === 0) {
        console.error('[popup] failed to find active tab');
        return;
      }
      if (!tabId) {
        console.error('[popup] failed to get tab id for active tab');
        return;
      }
      browser.tabs.sendMessage(tabId, {
        command: 'choose-element',
        tabId,
      } as ChooseElementMessage)
        .catch((e) => console.log('[popup] failed to send to:', myTab[0].id, e));
    });
};

const handleClearStreams = () => {
  // clear all tracked streams
  browser.tabs.query({}).then((allTabs) => {
    allTabs.forEach((tab) => {
      if (!tab.id) {
        return;
      }
      browser.tabs.sendMessage(tab.id, {
        command: 'stop-all',
      } as StopAllMessage)
        .catch(() => { /* ignore failure to send errors */ });
    });
  });
};

const renderStreamList = async (allStreams: StreamsStore) => {
  // render current streams
  const container = document.getElementById('elements-list-container')!;
  container.textContent = 'loading...'; // clear children of the list

  let numRendered = 0;

  const elementsList = document.createElement('ul');
  const allTabs = await browser.tabs.query({});
  const tabMap = new Map(
    allTabs.filter((tab) => tab.id && tab.title)
      .map((tab) => [tab.id!, tab]),
  );
  allStreams.forEach((tabStreams, tabId) => {
    console.log('[popup] rendering tabStreams:', tabStreams);
    const tabInfo = tabMap.get(tabId);
    if (!tabInfo) {
      console.error(`[popup] unable to find info for tab ${tabId}`);
    }
    tabStreams.forEach((status, streamId) => {
      numRendered += 1;
      const entry = document.createElement('li');
      entry.innerText = `title: ${tabInfo?.title}`
        + ` stream: ${streamId}`
        + ` status: ${status}`;

      const deleteButton = document.createElement('button');
      deleteButton.innerText = 'delete';
      const deleteHandler = () => {
        browser.tabs.sendMessage(tabId, {
          command: 'stop-stream',
          streamId,
        } as StopStreamMessage)
          .catch((e) => console.log('[popup] failed to stop: ', tabId, streamId, e));
      };
      deleteButton.addEventListener('click', deleteHandler);
      entry.appendChild(deleteButton);
      elementsList.appendChild(entry);
    });
  });
  container.textContent = '';
  container.appendChild(elementsList);

  if (numRendered === 0) {
    container.innerText = 'No streams exist at this time.';
  }
};

const createMessageHandler = (allStreams: StreamsStore) => (
  (message: FromContentMessage, sender: Runtime.MessageSender) => {
    console.log('[popup] received message', message, sender);
    if (!sender.tab || !sender.tab.id) return;

    if (message.description === 'status-all') {
      const tabStatuses = new Map(message.statuses);
      allStreams.set(sender.tab.id, tabStatuses);
      renderStreamList(allStreams);
    } else if (message.description === 'status-update') {
      const tabStatuses = allStreams[sender.tab.id] || new Map();
      tabStatuses.set(message.streamId, message.status);
      allStreams.set(sender.tab.id, tabStatuses);
      renderStreamList(allStreams);
    }
  }
);

export default async (state: State, setState: SetStateFn) => {
  if (!state.allRooms || !state.currentRoom) {
    console.error('renderRoomManager FAILED DUE TO ALLROOMS OR CURRENTROOM');
    return;
  }

  console.log('[popup] running content script');
  browser.tabs.executeScript({
    file: 'content.js',
  })
    .catch((e) => console.log('[popup] there was some error in executing', e));

  hideAllExcept('room-information');

  // render title
  const currentRoomInfo = state.allRooms.find((v) => v.id === state.currentRoom);
  if (!currentRoomInfo) {
    console.error("[popup] couldn't find currently hosting room:", state.currentRoom);
    return;
  }
  const roomName = document.getElementById('hosting-room-name')!;
  roomName.innerText = currentRoomInfo.name;

  // get streams
  const allStreams: StreamsStore = new Map();
  const statusMessageHandler = createMessageHandler(allStreams);
  browser.runtime.onMessage.addListener(statusMessageHandler);
  window.onblur = () => {
    browser.runtime.onMessage.removeListener(statusMessageHandler);
  };
  browser.tabs.query({}).then((allTabs) => {
    allTabs.forEach((tab) => {
      if (!tab.id) {
        return;
      }
      browser.tabs.sendMessage(tab.id, {
        command: 'get-all',
      } as GetAllMessage).catch(() => { /* ignore failure to send errors */ });
    });
  });

  // initialize button handlers
  const chooser = document.getElementById('action-chooser') as HTMLButtonElement;
  chooser.onclick = handleChooseElement;
  const clear = document.getElementById('action-clear') as HTMLButtonElement;
  clear.onclick = handleClearStreams;
  const stop = document.getElementById('action-stop') as HTMLButtonElement;
  stop.onclick = () => {
    browser.runtime.onMessage.removeListener(statusMessageHandler);
    bgPingPong({
      command: 'stop-room',
    }, () => {
      handleClearStreams();
      setState({ currentRoom: undefined });
    });
  };

  renderStreamList(allStreams);
};
