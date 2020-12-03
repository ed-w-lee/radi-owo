import { initRTCPeerConnection } from '../common/rtcConnection.js';

/**
 * Listens for local streams and compresses all the streams received into a
 * single stream for export. This is the polite peer for all connections as
 * defined in
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation.
 */

const createAudioElement = (myMediaStream) => {
  const audioElement = document.createElement('audio');
  audioElement.id = 'rolled-audio-track';
  audioElement.srcObject = myMediaStream;
  document.body.appendChild(audioElement);
};

const addConnection = async (port, myMediaStream) => {
  const pc = initRTCPeerConnection(port, true);
  pc.ontrack = (trackEv) => {
    console.log('ontrack event', trackEv);
    const { track } = trackEv;
    track.onunmute = () => {
      console.log('unmuted track');
      myMediaStream.addTrack(track);
    };
  };
};

const startup = (myMediaStream) => {
  createAudioElement(myMediaStream);
  browser.runtime.onConnect.addListener((port) => {
    console.log('found connection attempt', port);
    addConnection(port, myMediaStream)
      .catch((e) => console.log('failed to add connection', e));
  });
};

(() => {
  const myMediaStream = new MediaStream();
  startup(myMediaStream);
})();
