import 'webrtc-adapter';
import { browser } from 'webextension-polyfill-ts';

import initRTCPeerConnection from '../lib/rtcConnection.js';
import captureStream from '../lib/polyfill.js';

type ConnectionAndStream = {
  pc: RTCPeerConnection,
  stream: MediaStream,
};

declare global {
  interface Window { RadiowoHasRun?: boolean; }
}

(() => {
  if (window.RadiowoHasRun) {
    return;
  }
  window.RadiowoHasRun = true;

  let nextStreamId = 0;
  const tabStreams: Map<number, ConnectionAndStream> = new Map();

  const findMediaElement = (el: HTMLElement, parentDepth = 2): HTMLMediaElement | null => {
    let myEl = el;
    for (let i = 0; i < parentDepth; i += 1) {
      myEl = myEl.parentNode as HTMLElement;
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
  const chooseStream = (): Promise<HTMLMediaElement> => {
    console.log('[content] choosing stream');
    const styleElement = document.createElement('style');
    styleElement.innerHTML = mediaElementCSS;

    document.head.appendChild(styleElement);
    console.log('[content] injected CSS');

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

  const addStream = async (streamId: number) => {
    const element = await chooseStream();

    console.log('[content] adding stream', element.outerHTML);
    let stream = captureStream(element);

    console.log('[content] attempting to connect to port');
    const port = browser.runtime.connect(undefined, {
      name: JSON.stringify({
        streamId,
      }),
    });
    console.log('[content] connected to port', port);
    const pc = initRTCPeerConnection(port, false);

    console.log('[content] stream audio tracks', stream.getAudioTracks());
    stream.getAudioTracks().forEach((track) => {
      pc.addTrack(track);
    });
    console.log('[content] stream audio tracks after', stream.getAudioTracks());

    tabStreams.set(streamId, { pc, stream });
  };

  const deleteStream = async (streamId: number) => {
    console.log('[content] deleting stream', streamId);
    const value = tabStreams.get(streamId);
    if (!value) {
      return;
    }
    const { pc, stream } = value;
    console.log(pc, stream);
    pc.close();
    console.log(stream.getAudioTracks());
    tabStreams.delete(streamId);
  };

  const deleteAll = () => {
    console.log('[content] deleting all');
    Array.from(tabStreams.keys()).forEach(deleteStream);
  };

  const messageHandler = (message: ToContentMessage) => {
    console.log(message);
    if (message.command === 'choose-element') {
      nextStreamId += 1;
      addStream(nextStreamId);
    } else if (message.command === 'get-all') {

    } else if (message.command === 'stop-stream') {
      deleteStream(message.streamId);
    } else if (message.command === 'stop-all') {
      deleteAll();
    }
  };

  browser.runtime.onMessage.addListener(messageHandler);

  window.onbeforeunload = () => {
    browser.runtime.onMessage.removeListener(messageHandler);
    deleteAll();
  };
})();
