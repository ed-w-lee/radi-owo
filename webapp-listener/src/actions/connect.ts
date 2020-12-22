import { WEBSOCKET_URL } from '../settings';
import 'webrtc-adapter';

const config = {
  iceServers: [],
};

const wsSend = (ws: WebSocket, msg: any) => {
  ws.send(JSON.stringify(msg));
}

export function initPeerConnection(wsParam: WebSocket) {
  console.log('initializing rtc peer connection');
  const ws = wsParam;
  const polite = false;
  // negotiate WebRTC connection
  const pc = new RTCPeerConnection(config);
  wsSend(ws, { msg: {} });
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      console.debug('setting local description for negotiation needed');
      // @ts-ignore: missing argument is OK
      await pc.setLocalDescription();
      console.debug('local description', pc.localDescription);
      wsSend(ws, {
        description: pc.localDescription,
      });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };
  pc.onicecandidate = ({ candidate }) => wsSend(ws, {
    candidate: candidate,
  });

  let ignoreOffer = false;
  ws.onmessage = async ({ data }) => {
    console.log('received message with data', data);
    const { description, candidate } = JSON.parse(data);
    try {
      console.debug('received message with', description, candidate);
      if (description) {
        const offerCollision = description.type === 'offer'
          && (makingOffer || pc.signalingState !== 'stable');
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) return;

        console.debug('remote description', description);
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') {
          // @ts-ignore: missing argument is OK
          await pc.setLocalDescription();
          wsSend(ws, {
            description: pc.localDescription,
          });
        }
      } else if (candidate) {
        try {
          console.debug('candidate', candidate);
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  pc.onconnectionstatechange = () => {
    if (['connected', 'closed', 'failed'].includes(pc.connectionState)) {
      console.log('peer connection state', pc.connectionState);
      ws.close();
    }
  }

  console.log('initialized')

  return pc;
}

export default function startListenConnection(roomId: string): Promise<RTCPeerConnection> {
  const ws = new WebSocket(`${WEBSOCKET_URL}/rooms/${roomId}/listen`);
  return new Promise((res, rej) => {
    ws.onopen = () => {
      const pc = initPeerConnection(ws);
      res(pc);
    };
    ws.onerror = () => {
      ws.close();
      rej();
    };
    setTimeout(() => {
      rej();
    }, 1000);
  });
}
