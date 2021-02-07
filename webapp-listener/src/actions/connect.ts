import { settings } from '../settings';
import 'webrtc-adapter';

type TurnCreds = {
  username: string,
  credential: string,
};

type IceServer = {
  urls: string,
  username: string,
  credential: string,
};

type Configuration = {
  iceServers: IceServer[],
};

const getTurnCreds = async (): Promise<TurnCreds> => {
  const response = await fetch(`${settings.API_SERVER}/turn`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('failed to retrieve turn creds');
  }
  return response.json().then((turnCredsResponse) => {
    const toRet = {
      username: turnCredsResponse.username,
      credential: turnCredsResponse.password,
    };
    return toRet;
  });
};

const getConfig = async (): Promise<Configuration> => {
  const config: Configuration = { iceServers: [] };
  if (settings.ICE_SERVER) {
    const creds = await getTurnCreds();
    config.iceServers = [
      {
        urls: settings.ICE_SERVER,
        username: creds.username,
        credential: creds.credential,
      },
    ];
  }
  return config;
};

const wsSend = (ws: WebSocket, msg: any) => {
  ws.send(JSON.stringify(msg));
}

export async function initPeerConnection(wsParam: WebSocket) {
  console.log('initializing rtc peer connection');
  const ws = wsParam;
  const polite = false;
  // negotiate WebRTC connection
  const config = await getConfig();
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
    console.debug('received message with data', data);
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
    if (['closed'].includes(pc.connectionState)) {
      console.log('peer connection closed');
      ws.close();
    }
  }

  console.log('initialized')

  return pc;
}

export default function startListenConnection(roomId: string): Promise<[RTCPeerConnection, WebSocket]> {
  const ws = new WebSocket(`${settings.WS_SERVER}/rooms/${roomId}/listen`);
  return new Promise((res, rej) => {
    ws.onopen = () => {
      try {
        initPeerConnection(ws).then((pc) => {
          res([pc, ws]);
        });
      } catch (err) {
        console.error(err);
        rej(err);
      }
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
