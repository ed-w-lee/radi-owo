<script lang="ts">
  import { listenRoomStore } from "../store";

  import Slider from "./Slider.svelte";

  export let connection: RTCPeerConnection;
  let volume: number = 1;
  let muted: boolean = false;

  const toggleMute = () => {
    muted = !muted;
  };

  const onStop = () => {
    listenRoomStore.set(null);
  };

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
      },
    };
  };
</script>

<style>
  .listen-controls {
    display: flex;
    flex-direction: row;
    width: 90%;
    margin: 0 auto;
  }
  .listener-slider {
    width: 100%;
  }
</style>

<div class="listen-controls">
  <button on:click|preventDefault={onStop}>Stop</button>
  <button on:click|preventDefault={toggleMute}>
    {#if muted}Unmute{:else}Mute{/if}
  </button>
  <div class="listener-slider">
    <Slider range={[0, 1]} orientation="horizontal" bind:value={volume} />
  </div>
  <audio use:srcObject={connection} autoplay bind:volume bind:muted>
    <track kind="captions" />
  </audio>
</div>
