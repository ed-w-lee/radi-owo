import { browser, Runtime } from 'webextension-polyfill-ts';

type StreamsStore = Map<number, Map<number, PlayStatus>>;

const renderStreamList = async (allStreams: StreamsStore) => {
  const container = document.getElementById('elements-list-container')!;
  container.innerHTML = 'loading...'; // clear children of the list

  let numRendered = 0;

  const elementsList = document.createElement('ul');
  const allTabs = await browser.tabs.query({});
  const tabMap = new Map(
    allTabs.filter(tab => tab.id && tab.title)
      .map(tab => [tab.id!, tab])
  );
  allStreams.forEach((tabStreams, tabId) => {
    console.log(tabStreams);
    const tabInfo = tabMap.get(tabId);
    if (!tabInfo) {
      console.error(`[popup] unable to find info for tab ${tabId}`);
    }
    tabStreams.forEach((status, streamId) => {
      console.log('status and streamid', status, streamId);
      console.log('num rendered', numRendered);
      numRendered += 1;
      console.log('num rendered after', numRendered);
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
      }
      deleteButton.addEventListener('click', deleteHandler);
      entry.appendChild(deleteButton);
      elementsList.appendChild(entry);
    })
  });
  container.innerHTML = '';
  container.appendChild(elementsList);

  console.log('num rendered final', numRendered);
  if (numRendered === 0) {
    container.innerText = 'No streams exist at this time.';
  }
};

const clickHandler = (ev: MouseEvent) => {
  const target = ev.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const onClickAction = () => {
    console.log('[popup] clicked action');
    if (target.classList.contains('action-chooser')) {
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
    } else if (target.classList.contains('action-clear')) {
      // clear all tracked streams
      browser.tabs.query({}).then((allTabs) => {
        allTabs.forEach((tab) => {
          if (!tab.id) {
            return;
          }
          browser.tabs.sendMessage(tab.id, {
            command: 'stop-all',
          } as StopAllMessage)
            .catch(e => { });
        });
      });
    }
  };

  if (target.classList.contains('action')) {
    // get all tabs in case we need to clear our listening to a certain tab
    onClickAction();
  }
};

let isListening = false;
const addListeners = (allStreams: StreamsStore) => {
  if (isListening) {
    return;
  }
  isListening = true;

  document.addEventListener('click', clickHandler);

  const statusMessageHandler = (message: ToPopupMessage, sender: Runtime.MessageSender) => {
    console.log('[popup] received message', message, sender);
    if (!sender.tab || !sender.tab.id) return;

    if (message.description === 'status-all') {
      const tabStatuses = new Map(message.statuses);
      console.log(tabStatuses);
      allStreams.set(sender.tab.id, tabStatuses);
      console.log(allStreams);
      renderStreamList(allStreams);
    } else if (message.description === 'status-update') {
      const tabStatuses = allStreams[sender.tab.id] || new Map();
      tabStatuses.set(message.streamId, message.status);
      allStreams.set(sender.tab.id, tabStatuses);
      renderStreamList(allStreams);
    }
  };

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
      } as GetAllMessage)
        .catch(e => { })
    });
  });
};

(() => {
  console.log('[popup] executing script');

  const allStreams: StreamsStore = new Map();

  browser.tabs.executeScript({
    file: '/src/content_scripts/build_content.js',
  })
    .catch((e) => console.log('[popup] there was some error in executing', e))
    .then(() => addListeners(allStreams));
})();
