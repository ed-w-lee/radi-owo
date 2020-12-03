import { initRTCPeerConnection } from '../common/rtcConnection.js';

(() => {
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  let myId = null;
  let nextStreamId = 0;
  const tabStreams = new Map();

  const findMediaElement = (el, parentDepth = 2) => {
    let myEl = el;
    for (let i = 0; i < parentDepth; i += 1) {
      myEl = myEl.parentNode;
    }
    console.log(myEl);
    return myEl.querySelector('audio') || myEl.querySelector('video');
  };

  // These aren't atomic, but whatever
  const mediaElementCSS = `
  video {
    border: 5px solid red;
  }
  audio { 
    border: 5px solid red; 
  }`;
  const chooseStream = () => {
    console.log('choosing stream');
    const styleElement = document.createElement('style');
    styleElement.innerHTML = mediaElementCSS;

    document.head.appendChild(styleElement);
    console.log('injected CSS');

    return new Promise((resolve, reject) => {
      const teardown = () => {
        console.log('teardown');
        window.removeEventListener('blur', teardown);
        // eslint-disable-next-line no-use-before-define
        window.removeEventListener('click', listener, { capture: true });
        document.head.removeChild(styleElement);
      };

      const listener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        teardown();
        const mediaElement = findMediaElement(e.target);
        console.log(mediaElement);
        if (mediaElement) {
          resolve(mediaElement);
        } else {
          reject();
        }
      };

      window.addEventListener('click', listener, { capture: true });
      window.addEventListener('blur', teardown);
    });
  };

  const addStream = async (streamId) => {
    const element = await chooseStream();

    console.log('adding stream', element.outerHTML);
    let stream;
    if (element.mozCaptureStream) {
      stream = element.mozCaptureStream();
    } else {
      stream = element.captureStream();
    }

    console.log('attempting to connect to port');
    const port = browser.runtime.connect({
      name: `port-tab${myId}-stream${streamId}`,
    });
    console.log('connected to port', port);
    const pc = initRTCPeerConnection(port, false);

    console.log('stream audio tracks', stream.getAudioTracks());
    stream.getAudioTracks().forEach((track) => {
      pc.addTrack(track);
    });
    console.log('stream audio tracks after', stream.getAudioTracks());

    tabStreams[streamId] = element;
  };

  const deleteStream = async (streamId) => {
    console.log('deleting stream', streamId);
    tabStreams.delete(streamId);
  };

  const deleteAll = () => {
    console.log('deleting all');
    tabStreams.clear();
  };

  const messageHandler = (message) => {
    console.log(message);
    if (message.command === 'chooser-start') {
      myId = message.id;
      nextStreamId += 1;
      addStream(nextStreamId);
    } else if (message.command === 'stop-id') {
      deleteStream(message.streamId);
    } else if (message.command === 'stop-all') {
      deleteAll();
    }
  };

  browser.runtime.onMessage.addListener(messageHandler);

  window.onbeforeunload = () => {
    browser.runtime.onMessage.removeListener(messageHandler);
    deleteAll(myId);
  };
})();
