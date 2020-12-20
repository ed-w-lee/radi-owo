/**
 * Listens for local streams and compresses all the streams received into a
 * single stream for export. This is the polite peer for all connections as
 * defined in
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation.
 */

import 'webrtc-adapter';
import { browser, Runtime } from 'webextension-polyfill-ts';

import { initHostPeerConnection, initLocalPeerConnection, WSMessageHandler } from '../lib/rtcConnection.js';
import { WS_KEEPALIVE_MS, WS_SERVER } from '../lib/constants.js';

type RoomManager = {
  currentRoom: string,
  ws: WebSocket,
  handlers: Map<string, WSMessageHandler>,
  listener_conns: RTCPeerConnection[],
};

type MediaStreamManager = {
  mediaStream: MediaStream,
  roomManage: RoomManager | null,
};

const createAudioElement = (myMediaStream: MediaStream) => {
  const audioElement = document.createElement('audio');
  audioElement.id = 'rolled-audio-track';
  audioElement.srcObject = myMediaStream;
  document.body.appendChild(audioElement);
  audioElement.play();
};

const addConnection = async (manager: MediaStreamManager, port: Runtime.Port) => {
  const pc = initLocalPeerConnection(port, true);
  pc.ontrack = (trackEv) => {
    console.log('[background] ontrack event', trackEv);
    const { track } = trackEv;
    track.onunmute = () => {
      console.log('[background] unmuted track');
      manager.mediaStream.addTrack(track);
      if (manager.roomManage) {
        // add track for existing listeners
        manager.roomManage.listener_conns.forEach(conn => {
          conn.addTrack(track);
        });
      }
    };
  };
  pc.oniceconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
      console.log('[background] track disconnected');
    }
  };
};

const createRoomManager = (myStream: MediaStream, currentRoom: string, authToken: string): RoomManager => {
  const uri = `${WS_SERVER}/rooms`
    + `/${encodeURIComponent(currentRoom)}`
    + `/host?token=${encodeURIComponent(authToken)}`;
  const ws = new WebSocket(uri);

  // make sure host connection stays alive
  const keepalive = () => {
    if (!ws) {
      console.error('ws not alive anymore');
      return;
    }
    if (ws.readyState === WebSocket.CLOSED) return;
    if (ws.readyState === WebSocket.OPEN) {
      console.log('sending keepalive');
      ws.send(JSON.stringify({
        type: 'KeepAlive',
      }));
    }
    setTimeout(keepalive, WS_KEEPALIVE_MS);
  }
  keepalive();

  const handlers = new Map;
  let listener_conns: RTCPeerConnection[] = [];
  ws.onmessage = ({ data }) => {
    console.log('[host] received websocket message', data);
    const { from, msg } = JSON.parse(data);
    console.log(handlers);
    const handler = handlers.get(from);
    if (handler) {
      // old listener, there's a handler for that
      console.log('handling message', JSON.parse(msg));
      handler(JSON.parse(msg));
    } else {
      // new listener, create a new connection to that listener
      console.log('new listener');
      const pc = initHostPeerConnection(handlers, ws, from);
      myStream.getAudioTracks().forEach(track => {
        pc.addTrack(track);
      });
      listener_conns.push(pc);
    }
  }

  return {
    currentRoom,
    ws,
    handlers,
    listener_conns,
  };
}

const initialize = (manager: MediaStreamManager) => {
  createAudioElement(manager.mediaStream);
  browser.runtime.onConnect.addListener((port) => {
    console.log('[background] found connection attempt', port);
    if (port.name !== 'popup') {
      // from content script, attempting to attach new stream
      if (manager.roomManage) {
        addConnection(manager, port)
          .catch((e) => console.log('[background] failed to add connection', e));
      } else {
        port.disconnect();
      }
    } else {
      // from popup, attempting to get info on current host
      port.onMessage.addListener((message: ToBackgroundMessage) => {
        if (message.command === 'start-room') {
          let success = false;
          if (manager.roomManage === null) {
            manager.roomManage = createRoomManager(manager.mediaStream, message.roomId, message.authToken);
            success = true;
          }
          port.postMessage({
            description: 'action-response',
            success,
          } as ActionResponseMessage);
        } else if (message.command === 'stop-room') {
          const allTracks = manager.mediaStream.getAudioTracks();
          allTracks.forEach(manager.mediaStream.removeTrack);
          manager.roomManage = null;
          port.postMessage({
            description: 'action-response',
            success: true,
          } as ActionResponseMessage);
        } else if (message.command === 'query-room') {
          port.postMessage({
            description: 'room-info',
            roomId: manager.roomManage?.currentRoom,
          } as RoomInfoMessage);
        }
      });
    }
  });
};

(() => {
  const manager: MediaStreamManager = {
    mediaStream: new MediaStream(),
    roomManage: null,
  };
  initialize(manager);
})();
