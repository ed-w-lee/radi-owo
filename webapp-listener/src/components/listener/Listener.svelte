<script lang="ts">
  import startListenConnection from "@src/actions/connect";
  import type { RoomInfo } from "@src/actions/rooms";
  import { settings } from "@src/settings";
  import { listenRoomStore } from "@src/store";

  import AudioPlayer from "./audio/AudioPlayer.svelte";
  import RoomList from "./rooms/RoomList.svelte";

  let pc: RTCPeerConnection | null = null;
  let ws: WebSocket | null = null;
  let roomInfo: RoomInfo | null = null;
  let searchValue: string = "";

  listenRoomStore.subscribe(async (update) => {
    console.log("listenRoom updating");
    roomInfo = update;
    searchValue = "";

    const keepalive = () => {
      if (!ws) {
        console.warn("ws not alive anymore");
        return;
      }
      if (ws.readyState === WebSocket.CLOSED) {
        console.debug("ws closed, stopping keepalive");
        return;
      }
      if (ws.readyState === WebSocket.OPEN) {
        console.debug("sending keepalive");
        ws.send("");
      }
    };

    if (update === null) {
      pc?.close();
      ws?.close();
      pc = null;
      ws = null;
      return;
    }
    try {
      [pc, ws] = await startListenConnection(update.id);
      pc.onconnectionstatechange = (ev) => {
        if (!pc) return;
        if (["closed", "failed"].includes(pc.connectionState)) {
          ws?.close();
          pc = null;
          ws = null;
        }
      };
      const intervalHandle = setInterval(keepalive, settings.WS_KEEPALIVE_MS);
      ws.onclose = () => {
        clearInterval(intervalHandle);
        listenRoomStore.set(null);
      };
    } catch (err) {
      console.error(err);
    }
  });

  $: roomSearch = searchValue;
</script>

<div class="listen-hero">
  <div class="room">
    <span class="listen-to">Listening to</span>
    {#if roomInfo !== null}
      <div class="room-info">
        <span class="room-name">{roomInfo.name}</span>
        <span class="text-sep" />
        <span class="room-hostname">from {roomInfo.hostName}</span>
      </div>
    {:else}
      <div class="room-info">
        <input
          class="room-name"
          placeholder="search..."
          bind:value={searchValue}
        />
      </div>
    {/if}
  </div>

  {#if pc !== null}
    <div class="listen-controls">
      <AudioPlayer connection={pc} />
    </div>
  {/if}
</div>

<RoomList search={roomSearch} />

<style>
  .listen-hero {
    background: rgb(8, 110, 157);
  }
  .room {
    margin: 1em;
  }
  .listen-to {
    color: white;
    font-family: Helvetica, sans-serif;
    font-size: 1.5em;
  }
  .room-info {
    display: flex;
    flex-direction: row;
    align-items: baseline;

    color: white;
    font-family: monospace;
    font-size: 2em;
  }
  .text-sep {
    padding: 0 0.5em;
  }
  span.room-name {
    font-size: 2em;
  }
  input.room-name {
    font-size: 1.5em;
    background-color: transparent;
    border: 0 0 0 1px white solid;
    color: white;
    width: 100%;
  }
  input.room-name::placeholder {
    color: rgba(255, 255, 255, 0.9);
  }
</style>
