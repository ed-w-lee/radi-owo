<script lang="ts">
  import startListenConnection from "../actions/connect";
  import AudioPlayer from "./AudioPlayer.svelte";

  let roomId: string;
  let pc: RTCPeerConnection | null = null;
  let counter: number = 0;
  let paused: boolean;

  const onListen = async () => {
    console.log("calling onListen");
    try {
      pc = await startListenConnection(roomId);
    } catch (err) {
      console.error(err);
    }
  };
</script>

<style>
  /* body {
    background-color: white;
  }

  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  } */
</style>

<AudioPlayer connection={pc} />

<form>
  <input bind:value={roomId} name="roomId" placeholder="room id" />
  <button on:click|preventDefault={onListen}> Listen </button>
</form>
