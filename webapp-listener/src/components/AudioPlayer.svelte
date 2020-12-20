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
          currConn?.close();
          currConn = newConn;

          myStream = new MediaStream();
          if (currConn) {
            currConn.ontrack = (trackEv) => {
              const { track } = trackEv;
              track.onunmute = () => {
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
