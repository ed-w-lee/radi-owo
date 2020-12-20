/**
 * Content script which runs on a specific tab. Manages everything related to
 * the stream, from creating them when needed to reporting statuses to the
 * popup.
 */

import 'webrtc-adapter';
import { browser } from 'webextension-polyfill-ts';

import { initLocalPeerConnection } from '../lib/rtcConnection.js';
import captureStream from '../lib/polyfill.js';
import generateId from '../lib/lib.js';

type StreamInfo = {
  element: HTMLMediaElement,
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
  const tabStreams: Map<number, StreamInfo> = new Map();

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

  const getPlayStatus = (el: HTMLMediaElement): PlayStatus => {
    return el.paused ? 'paused' : 'playing';
  };

  const sendStreamUpdate = (streamId: number, status: PlayStatus) => {
    console.log('[content] send update', streamId, status);
    browser.runtime.sendMessage(undefined, {
      description: 'status-update',
      streamId: streamId,
      status: status,
    } as StatusUpdateMessage)
      .catch(e => console.error(e));
  };

  const sendStreams = () => {
    const tabStatuses: [number, PlayStatus][] = Array.from(tabStreams.entries()).map(([k, v]) =>
      [k, getPlayStatus(v.element)]
    );
    console.log('[content] sending statuses', tabStatuses);
    browser.runtime.sendMessage(undefined, {
      description: 'status-all',
      statuses: tabStatuses,
    } as AllStatusesMessage)
      .catch(e => console.error(e));
  };

  const addStream = async (streamId: number) => {
    const element = await chooseStream();

    let stream = captureStream(element);

    console.log('[content] attempting to connect to port');
    const port = browser.runtime.connect(undefined, {
      name: `${streamId}-${generateId(10)}`,
    });
    console.log('[content] connected to port', port);
    const pc = initLocalPeerConnection(port, false);
    console.log('[content] attempting to retrieve audio tracks', port, stream.getAudioTracks());
    stream.getAudioTracks().forEach((track) => {
      pc.addTrack(track);
    });
    console.log('[content] created pc and added tracks');
    tabStreams.set(streamId, { element, pc, stream });
    sendStreamUpdate(streamId, getPlayStatus(element));
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
    sendStreams();
  };

  const deleteAll = () => {
    console.log('[content] deleting all');
    Array.from(tabStreams.keys()).forEach(deleteStream);
    sendStreams();
  };

  const messageHandler = (message: ToContentMessage) => {
    console.log(message);
    if (message.command === 'choose-element') {
      nextStreamId += 1;
      addStream(nextStreamId);
    } else if (message.command === 'get-all') {
      sendStreams();
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
