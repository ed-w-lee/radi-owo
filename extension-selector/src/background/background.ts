/**
 * Listens for local streams and compresses all the streams received into a
 * single stream for export. This is the polite peer for all connections as
 * defined in
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation.
 */

import 'webrtc-adapter';
import { browser, Runtime } from 'webextension-polyfill-ts';

import { initHostPeerConnection, initLocalPeerConnection, WSMessageHandler } from '../lib/rtcConnection';
import { settings } from '../lib/settings';
import { ActionResponseMessage, RoomInfoMessage, ToBackgroundMessage } from '../lib/types';

type ListenerConnInfo = {
  connection: RTCPeerConnection,
  senders: Map<string, RTCRtpSender>,
};

type RoomManager = {
  currentRoom: string,
  ws: WebSocket,
  handlers: Map<string, WSMessageHandler>,
  // listener UUID -> [ peer connection, track ID -> sender ]
  listenerConns: Map<string, ListenerConnInfo>,
};

type MediaStreamManager = {
  mediaStream: MediaStream,
  roomManage: RoomManager | null,
};

const createAudioElement = (myMediaStream: MediaStream) => {
  const audioElement = document.createElement('audio');
  audioElement.id = 'rolled-audio-track';
  audioElement.autoplay = true;
  audioElement.srcObject = myMediaStream;
  document.body.appendChild(audioElement);
  audioElement.play();
};

const addConnection = async (manager: MediaStreamManager, port: Runtime.Port) => {
  let pc: RTCPeerConnection | null = initLocalPeerConnection(port, true);

  const onRemoveTrack = ({ track }: { track: MediaStreamTrack }) => {
    console.log('[background] stream removing track', track.id);
    manager.mediaStream.removeTrack(track);
    if (manager.roomManage) {
      manager.roomManage.listenerConns.forEach(({ connection, senders }, listener) => {
        const sender = senders.get(track.id);
        if (!sender) return;
        console.log('[background] removing track from listener connection', listener);
        senders.delete(track.id);
        connection.removeTrack(sender);
      });
    }
  };

  pc.ontrack = (trackEv) => {
    console.log('[background] ontrack event fired', trackEv);
    const { track, streams: [stream] } = trackEv;
    track.onunmute = () => {
      console.log('[background] unmuted track', track.id);
      manager.mediaStream.addTrack(track);
      if (manager.roomManage) {
        // add track for existing listeners
        manager.roomManage.listenerConns.forEach(({ connection, senders }) => {
          const rtcSender = connection.addTrack(track, manager.mediaStream);
          senders.set(track.id, rtcSender);
        });
      }
    };
    stream.onremovetrack = onRemoveTrack;
  };
  pc.onconnectionstatechange = () => {
    if (pc && ['failed', 'closed'].includes(pc.connectionState)) {
      console.log('[background] input closed');
      pc.getReceivers().forEach((receiver) => {
        onRemoveTrack(receiver);
      });
      pc.close();
      pc = null;
    }
  };
};

const createRoomManager = (
  myStream: MediaStream,
  currentRoom: string,
  authToken: string,
): RoomManager => {
  const uri = `${settings.WS_SERVER}/rooms`
    + `/${encodeURIComponent(currentRoom)}`
    + `/host?token=${encodeURIComponent(authToken)}`;
  const ws = new WebSocket(uri);

  const handlers = new Map();
  const listenerConns: Map<string, ListenerConnInfo> = new Map();
  const senders: Map<string, RTCRtpSender> = new Map();
  ws.onmessage = ({ data }) => {
    console.debug('[host] received websocket message', data);
    const { from, msg } = JSON.parse(data);
    const handler = handlers.get(from);
    if (handler) {
      // old listener, there's a handler for that
      console.debug('[host] handling message', JSON.parse(msg));
      handler(JSON.parse(msg));
    } else {
      // new listener, create a new connection to that listener
      console.log('[host] new listener', from);
      const pc = initHostPeerConnection(handlers, ws, from);
      myStream.getAudioTracks().forEach((track) => {
        const sender = pc.addTrack(track, myStream);
        senders.set(track.id, sender);
      });
      const cleanupListener = () => {
        pc.close();
        handlers.delete(from);
        listenerConns.delete(from);
      };
      pc.onconnectionstatechange = () => {
        if (['closed'].includes(pc.connectionState)) {
          console.log('[host] connection closed');
          cleanupListener();
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (['closed', 'failed', 'completed'].includes(pc.iceConnectionState)) {
          console.log('[host] ice connection', pc.iceConnectionState);
          cleanupListener();
        }
      };
      listenerConns.set(from, {
        connection: pc,
        senders,
      });
    }
  };

  // make sure host connection stays alive
  const keepalive = () => {
    if (!ws) {
      console.error('[background] ws not alive anymore');
      return;
    }
    if (ws.readyState === WebSocket.CLOSED) {
      console.log('[background] ws closed, stopping keepalive');
      return;
    }
    if (ws.readyState === WebSocket.OPEN) {
      console.log('[background] sending keepalive');
      ws.send(JSON.stringify({
        type: 'KeepAlive',
      }));
    }
    setTimeout(keepalive, settings.WS_KEEPALIVE_MS);
  };
  keepalive();

  return {
    currentRoom,
    ws,
    handlers,
    listenerConns,
  };
};

const initialize = (managerParam: MediaStreamManager) => {
  const manager = managerParam;
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
            manager.roomManage = createRoomManager(
              manager.mediaStream,
              message.roomId,
              message.authToken,
            );
            success = true;
          }
          port.postMessage({
            description: 'action-response',
            success,
          } as ActionResponseMessage);
        } else if (message.command === 'stop-room') {
          const allTracks = manager.mediaStream.getAudioTracks();
          allTracks.forEach((track) => {
            manager.mediaStream.removeTrack(track);
          });
          manager.roomManage?.listenerConns.forEach(({ connection }) => {
            connection.close();
          });
          manager.roomManage?.ws.close();
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

  // just check out the manager state over time
  if (settings.DEBUG) {
    const mediaStreamManagerLog = () => {
      console.debug(manager);
      setTimeout(mediaStreamManagerLog, 100000);
    };
    mediaStreamManagerLog();
  }

  initialize(manager);
})();
