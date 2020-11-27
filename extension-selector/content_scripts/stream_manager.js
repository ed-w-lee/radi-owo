(() => {
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  let myId = null;
  let someIndex = 0;

  const getStreamsForTab = (tabId) => browser.storage.local.get(tabId);

  const findMediaElement = (el, parentDepth = 2) => {
    let myEl = el;
    for (let i = 0; i < parentDepth; i += 1) {
      myEl = myEl.parentNode;
    }
    return el.querySelector('audio') || el.querySelector('video');
  };

  // These aren't atomic, but whatever
  const mediaElementCSS = `
  video {
    border: 5px solid red;
  }
  audio { 
    border: 5px solid red; 
  }`;
  const chooseStream = (index) => {
    console.log('choosing stream');
    const styleElement = document.createElement('style');
    styleElement.innerHTML = mediaElementCSS;

    document.head.appendChild(styleElement);
    console.log('injected CSS');

    return new Promise((resolve, reject) => {
      const listener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        teardown();
        const mediaElement = findMediaElement(e.target);
        console.log(mediaElement);
        if (mediaElement) {
          resolve({
            id: index,
            element: mediaElement.outerHTML,
          });
        } else {
          reject();
        }
      };

      const teardown = () => {
        console.log('teardown');
        window.removeEventListener('blur', teardown);
        window.removeEventListener('click', listener, { capture: true });
        document.head.removeChild(styleElement);
      };

      window.addEventListener('click', listener, { capture: true });
      window.addEventListener('blur', teardown);
    });
  };

  const addStream = async (tabId, index) => {
    console.log('adding stream');
    const stream = await chooseStream(index);

    console.log('adding to stream', tabId, stream);
    getStreamsForTab(tabId)
      .then((streams) => {
        const updated = streams[tabId] || [];
        updated.push(stream);
        const updatedStreams = streams;
        updatedStreams[tabId] = updated;
        browser.storage.local.set(updatedStreams);
      })
      .catch((e) => console.log('failed adding to stream', e));
    console.log('test');
  };

  const deleteStream = async (tabId, streamId) => {
    console.log('deleting stream', tabId, streamId);
    const streams = await getStreamsForTab(tabId);
    let updated = streams[tabId] || [];
    updated = updated.filter((stream) => stream.id !== streamId);
    if (updated.length === 0) {
      browser.storage.local.remove(tabId);
    } else {
      streams[tabId] = updated;
      browser.storage.local.set(streams);
    }
  };

  const deleteAll = (tabId) => {
    console.log('deleting all', tabId);
    browser.storage.local.remove(tabId);
  };

  const messageHandler = (message) => {
    console.log(message);
    if (message.command === 'chooser-start') {
      myId = message.id;
      someIndex += 1;
      addStream(myId, someIndex);
    } else if (message.command === 'stop-all') {
      deleteAll(myId || message.id);
    } else if (message.command === 'stop-id') {
      deleteStream(myId || message.id, message.streamId);
    }
  };

  browser.runtime.onMessage.addListener(messageHandler);

  window.onbeforeunload = () => {
    browser.runtime.onMessage.removeListener(messageHandler);
    deleteAll(myId);
  };
})();
