import { browser } from 'webextension-polyfill-ts';

const renderStreamList = (currentTracks) => {
  const container = document.getElementById('elements-list-container')!;
  container.innerHTML = ''; // clear children of the list

  const streams = currentTracks;
  console.log(streams);
  if (streams.length > 0) {
    const elementsList = document.createElement('ul');
    streams.forEach((stream) => {
      const entry = document.createElement('li');
      entry.innerText = `title: ${stream.key.sender.tab.title}`
        + ` stream: ${stream.key.streamId}`
        + ` state: ${stream.state}`;

      const tabId = stream.key.sender.tab.id;
      const { streamId } = stream.key;
      const deleteButton = document.createElement('button');
      deleteButton.innerText = 'delete';
      deleteButton.addEventListener('click', () => {
        browser.tabs.sendMessage(tabId, {
          command: 'stop-id',
          id: tabId.toString(),
          streamId,
        }).catch((e) => console.log('failed to stop: ', tabId, streamId, e));
      });
      entry.appendChild(deleteButton);
      elementsList.appendChild(entry);
    });
    container.appendChild(elementsList);
  } else {
    container.innerText = 'No streams exist at this time.';
  }
};

const backgroundMessageHandler = (message) => {
  console.log('[popup] received message', message);
  if (message.currentTracks) {
    renderStreamList(message.currentTracks);
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
            .catch((e) => console.log('[popup] failed to send to:', tab.id, e));
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
const addListeners = () => {
  if (isListening) {
    return;
  }
  isListening = true;

  document.addEventListener('click', clickHandler);
  browser.runtime.onMessage.addListener(backgroundMessageHandler);
  window.onclose = () => {
    browser.runtime.onMessage.removeListener(backgroundMessageHandler);
  };
  browser.runtime.sendMessage({
    background: 'ping',
  });
};

(() => {
  console.log('[popup] executing script');

  browser.tabs.executeScript({
    file: '/src/content_scripts/build_content.js',
  })
    .catch((e) => console.log('[popup] there was some error in executing', e))
    .then(addListeners);
})();
