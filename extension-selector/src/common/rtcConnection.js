const config = {
  iceServers: [],
};

const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

export function initRTCPeerConnection(portParam, polite) {
  console.log("initializing rtc peer connection");
  const port = portParam;
  // negotiate WebRTC connection
  const pc = new RTCPeerConnection(config);
  let makingOffer = false;
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      console.log('setting local description for negotiation needed');
      await pc.setLocalDescription();
      console.log('local description', pc.localDescription);
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
      console.log('received message with', description, candidate);
      if (description) {
        const offerCollision = description.type === 'offer'
          && (makingOffer || pc.signalingState !== 'stable');
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) return;

        console.log('remote description', description);
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') {
          await pc.setLocalDescription();
          port.postMessage({
            description: sanitize(pc.localDescription),
          });
        }
      } else if (candidate) {
        try {
          console.log('candidate', candidate);
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if (!ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  return pc;
}
