<script lang="ts">
  import listenTo from "../actions/connect";

  let roomId: string;
  let ws: WebSocket | null = null;
  let counter: number = 0;

  const onConnect = (ev: MouseEvent) => {
    ws = listenTo(roomId);
    ws.onclose = () => {
      ws = null;
    };
  };

  const onSend = (ev: MouseEvent) => {
    counter += 1;
    ws.send(counter.toString());
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

<form>
  <input bind:value={roomId} name="roomId" placeholder="room id" />
  <button on:click|preventDefault={onConnect} disabled={ws !== null}>
    Connect
  </button>
  <button on:click|preventDefault={onSend} disabled={ws === null}>
    Send
  </button>
</form>
