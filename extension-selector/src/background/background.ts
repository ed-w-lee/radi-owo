/**
 * Listens for local streams and compresses all the streams received into a
 * single stream for export. This is the polite peer for all connections as
 * defined in
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation.
 */

import 'webrtc-adapter';
import { browser, Runtime } from 'webextension-polyfill-ts';

import initRTCPeerConnection from '../lib/rtcConnection.js';

const createAudioElement = (myMediaStream: MediaStream) => {
  const audioElement = document.createElement('audio');
  audioElement.id = 'rolled-audio-track';
  audioElement.srcObject = myMediaStream;
  document.body.appendChild(audioElement);
  audioElement.play();
};

const addConnection = async (port: Runtime.Port, myMediaStream: MediaStream) => {
  const pc = initRTCPeerConnection(port, true);
  pc.ontrack = (trackEv) => {
    console.log('[background] ontrack event', trackEv);
    const { track } = trackEv;
    track.onunmute = () => {
      console.log('[background] unmuted track');
      myMediaStream.addTrack(track);
    };
  };
  pc.oniceconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
      console.log('[background] track disconnected');
    }
  };
};

const startCompressor = (myMediaStream) => {
  createAudioElement(myMediaStream);
  browser.runtime.onConnect.addListener((port) => {
    console.log('[background] found connection attempt', port);
    addConnection(port, myMediaStream)
      .catch((e) => console.log('[background] failed to add connection', e));
  });
};

(() => {
  const myMediaStream = new MediaStream();
  startCompressor(myMediaStream);
})();
