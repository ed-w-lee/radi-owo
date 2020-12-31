<script lang="ts">
  export let connection: RTCPeerConnection;

  const srcObject = (node: HTMLAudioElement, connection: RTCPeerConnection) => {
    let currConn: RTCPeerConnection = connection;
    let isPlaying: boolean = false;
    node.srcObject = null;

    const setMyStream = (newConn: RTCPeerConnection) => {
      isPlaying = false;
      newConn.ontrack = ({ track, streams: [stream] }) => {
        console.log("unmuted stream", stream);
        track.onunmute = () => {
          console.log("unmuted track, add stream");
          if (!node.srcObject) {
            node.srcObject = stream;
          }
          if (!isPlaying) {
            node.play();
            isPlaying = true;
          }
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

<audio use:srcObject={connection} controls>
  <track kind="captions" />
</audio>
