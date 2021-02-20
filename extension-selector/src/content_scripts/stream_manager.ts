/**
 * Content script which runs on a specific tab. Manages everything related to
 * the stream, from creating them when needed to reporting statuses to the
 * popup.
 */

import 'webrtc-adapter';
import { browser } from 'webextension-polyfill-ts';

import { initLocalPeerConnection } from '../lib/rtcConnection';
import captureStream from '../lib/polyfill';
import generateId from '../lib/lib';
import {
  AllStatusesMessage, PlayStatus, StatusUpdateMessage, ToContentMessage,
} from '../lib/types';

type StreamInfo = {
  element: HTMLMediaElement,
  pc: RTCPeerConnection,
  stream: MediaStream,
  senders: Map<string, RTCRtpSender>,
  vacantSenders: RTCRtpSender[],
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
    styleElement.appendChild(document.createTextNode(mediaElementCSS));

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
      window.addEventListener('blur', () => { teardown(); reject(); });
    });
  };

  const getPlayStatus = (el: HTMLMediaElement): PlayStatus => (el.paused ? 'paused' : 'playing');

  const sendStreamUpdate = (streamId: number, status: PlayStatus) => {
    console.log('[content] send update', streamId, status);
    browser.runtime.sendMessage(undefined, {
      description: 'status-update',
      streamId,
      status,
    } as StatusUpdateMessage)
      .catch((e) => console.error(e));
  };

  const sendStreams = () => {
    const tabStatuses: [number, PlayStatus][] = Array.from(tabStreams.entries())
      .map(([k, v]) => [k, getPlayStatus(v.element)]);
    console.log('[content] sending statuses', tabStatuses);
    browser.runtime.sendMessage(undefined, {
      description: 'status-all',
      statuses: tabStatuses,
    } as AllStatusesMessage)
      .catch((e) => console.error(e));
  };

  let isChoosing = false;
  const addStream = async (streamId: number) => {
    if (isChoosing) {
      console.log('[content] still choosing');
      return;
    }
    isChoosing = true;
    let element: HTMLMediaElement;
    try {
      element = await chooseStream();
    } catch (e) {
      isChoosing = false;
      return;
    }
    isChoosing = false;

    const stream = captureStream(element);

    console.log('[content] attempting to connect to port');
    const port = browser.runtime.connect(undefined, {
      name: `${streamId}-${generateId(10)}`,
    });
    console.log('[content] connected to port', port);
    let pc: RTCPeerConnection;
    try {
      pc = await initLocalPeerConnection(port, false);
    } catch (err) {
      console.error(err);
      return;
    }
    console.log('[content] attempting to retrieve audio tracks');
    const senders: Map<string, RTCRtpSender> = new Map();
    stream.getAudioTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream);
      senders.set(track.id, sender);
    });
    console.log('[content] created pc and added tracks', senders);
    tabStreams.set(streamId, {
      element,
      pc,
      stream,
      senders,
      vacantSenders: [],
    });
    sendStreamUpdate(streamId, getPlayStatus(element));

    // if the stream modifies its tracks, we should update the peer connection as well
    stream.onremovetrack = ({ track }) => {
      if (track.kind !== 'audio') return;
      console.log(`[content] stream ${streamId} removing track ${track.id}`);
      const info = tabStreams.get(streamId);
      if (!info) return;
      console.log('[content] identifying sender');
      const sender = info.senders.get(track.id);
      if (!sender) return;
      console.log('[content] removing track from pc');
      info.senders.delete(track.id); // track.id seems to hit a UAF or something if we delete
      console.log('[content] modified info:', info);
      pc.removeTrack(sender);
    };
    stream.onaddtrack = ({ track }) => {
      if (track.kind !== 'audio') return;
      console.log(`[content] stream ${streamId} adding track ${track.id}`);
      const info = tabStreams.get(streamId);
      if (!info) return;
      console.log('[content] adding track to sender');
      const sender = info.pc.addTrack(track, stream);
      info.senders.set(track.id, sender);
    };
  };

  // When mozCaptureStream is called, audio stops getting output from that
  // element, just refresh to fix it for now. we can use a
  // MediaElementAudioSourceNode for a better fix, but not going there right now
  // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1573031
  const refreshFirefox = () => {
    if (navigator.userAgent.indexOf('Firefox') > 0) {
      window.location.reload();
    }
  };

  const deleteStream = async (streamId: number) => {
    console.log('[content] deleting stream', streamId);
    const value = tabStreams.get(streamId);
    if (!value) {
      return;
    }
    const { pc, stream } = value;
    pc.close();
    stream.onremovetrack = null;
    stream.onaddtrack = null;
    tabStreams.delete(streamId);
    sendStreams();

    refreshFirefox();
  };

  const deleteAll = () => {
    console.log('[content] deleting all');
    Array.from(tabStreams.keys()).forEach(deleteStream);
    sendStreams();

    refreshFirefox();
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
