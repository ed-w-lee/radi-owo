<script lang="ts">
  import { settings } from "@src/settings";
  import { listenRoomStore } from "@src/store";

  import Slider from "@src/components/Slider.svelte";

  import AudioVis from "./AudioVis.svelte";

  export let connection: RTCPeerConnection;
  let volume: number = 1;
  let muted: boolean = false;

  let audioCtx: AudioContext = new (window.AudioContext ||
    // @ts-ignore: audio context polyfill
    window.webkitAudioContext)();
  console.log(audioCtx.sampleRate);
  let audioSource: MediaStreamTrackAudioSourceNode | null = null;
  let analyserNode: AnalyserNode = new AnalyserNode(audioCtx, {
    fftSize: settings.FFT_SIZE,
  });

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
          if (node.srcObject != stream) {
            node.srcObject = stream;
          }
          audioSource?.disconnect();
          audioSource = null;

          console.log("created new audio source");
          if (audioCtx.createMediaStreamTrackSource) {
            // use TrackSource since MediaStreamAudioSourceNode also only gets 1 track, but we can't control that one
            audioSource = audioCtx.createMediaStreamTrackSource(track);
          } else {
            // polyfill for chrome b/c they don't support track source, doesn't always work :(
            audioSource = audioCtx.createMediaStreamSource(stream);
          }
          console.log("connected to analyser node");
          audioSource.connect(analyserNode);
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

<AudioVis {analyserNode} />

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
