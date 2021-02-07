import { Runtime } from 'webextension-polyfill-ts';
import 'webrtc-adapter';
import { settings } from './settings';

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

const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

export async function initLocalPeerConnection(portParam: Runtime.Port, polite: boolean) {
  console.log('initializing rtc peer connection');
  const port = portParam;
  const config: Configuration = {
    iceServers: [],
  };
  // negotiate WebRTC connection
  const pc = new RTCPeerConnection(config);
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      console.debug('setting local description for negotiation needed');
      // @ts-ignore: missing argument is OK
      await pc.setLocalDescription();
      console.debug('local description', pc.localDescription);
      port.postMessage({
        description: sanitize(pc.localDescription),
      });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };
  pc.onicecandidate = ({ candidate }) => port.postMessage({
    candidate: sanitize(candidate),
  });

  let ignoreOffer = false;
  port.onMessage.addListener(async ({ description, candidate }) => {
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
          port.postMessage({
            description: sanitize(pc.localDescription),
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
  });

  console.log('initialized');

  return pc;
}

const wsSendToListener = (ws: WebSocket, clientId: string, msg) => {
  ws.send(JSON.stringify({
    type: 'ToListener',
    to: clientId,
    msg: JSON.stringify(msg),
  }));
};

export type WSMessageHandler = ({ description, candidate }) => Promise<void>;

export async function initHostPeerConnection(
  handlers: Map<string, WSMessageHandler>,
  wsParam: WebSocket,
  clientId: string,
) {
  console.log('[host] initializing rtc peer connection', clientId);
  const ws = wsParam;

  const config = await getConfig();
  const pc = new RTCPeerConnection(config);
  const polite = true;
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      console.debug('[host] setting local description for negotiation needed');
      // @ts-ignore: missing argument is OK
      await pc.setLocalDescription();
      console.debug('[host] local description', pc.localDescription);
      wsSendToListener(ws, clientId, {
        description: sanitize(pc.localDescription),
      });
    } catch (err) {
      console.error(err);
    } finally {
      makingOffer = false;
    }
  };
  pc.onicecandidate = ({ candidate }) => wsSendToListener(ws, clientId, {
    candidate: sanitize(candidate),
  });

  let ignoreOffer = false;
  handlers.set(clientId, async (obj) => {
    console.log('[host] obj:', obj);
    const { candidate, description } = obj;
    console.debug('[host] received message with', description, candidate);
    try {
      if (description) {
        const offerCollision = description.type === 'offer'
          && (makingOffer || pc.signalingState !== 'stable');
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) return;

        console.debug('[host] remote description', description);
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') {
          // @ts-ignore: missing argument is OK
          await pc.setLocalDescription();
          wsSendToListener(ws, clientId, {
            description: sanitize(pc.localDescription),
          });
        }
      } else if (candidate) {
        console.debug('[host] candidate', candidate);
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  console.log('[host] initialized');
  return pc;
}
