<script lang="ts">
  export let connection: RTCPeerConnection;

  const srcObject = (node: HTMLAudioElement, connection: RTCPeerConnection) => {
    let currConn: RTCPeerConnection = connection;
    node.srcObject = null;

    const setMyStream = (newConn: RTCPeerConnection) => {
      newConn.ontrack = ({ track, streams: [stream] }) => {
        console.log("unmuted stream", stream);
        track.onunmute = () => {
          console.log("unmuted track, add stream");
          if (!node.srcObject) {
            node.srcObject = stream;
          }
          // stupid hack for some weird Chrome issue when removing and adding tracks
          node.pause();
          node.play();
        };
      };
    };
    setMyStream(currConn);

    return {
      update(newConn: RTCPeerConnection) {
        if (currConn != newConn) {
          console.log("updating peer connection", newConn);
          currConn?.close();
          currConn = newConn;

          setMyStream(currConn);
        }
      },
      destroy() {
        node.srcObject = null;
        currConn.close();
      },
    };
  };
</script>

<audio use:srcObject={connection} controls autoplay>
  <track kind="captions" />
</audio>
