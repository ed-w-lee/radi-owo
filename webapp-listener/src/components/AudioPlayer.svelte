<script lang="ts">
  export let connection: RTCPeerConnection | null;

  const srcObject = (
    node: HTMLAudioElement,
    connection: RTCPeerConnection | null
  ) => {
    let myStream: MediaStream = new MediaStream();
    let currConn: RTCPeerConnection | null = null;
    return {
      update(newConn: RTCPeerConnection | null) {
        if (currConn != newConn) {
          console.log("updating peer connection", newConn);
          currConn?.close();
          currConn = newConn;

          myStream = new MediaStream();
          if (currConn) {
            console.log("adding ontrack listener", newConn);
            currConn.ontrack = (trackEv) => {
              const { track } = trackEv;
              track.onunmute = () => {
                console.log("adding track");
                myStream.addTrack(track);
              };
            };
          }
          node.srcObject = myStream;
        }
      },
      destroy() {
        node.srcObject = null;
      },
    };
  };
</script>

<audio use:srcObject={connection}>
  <track kind="captions" />
</audio>
