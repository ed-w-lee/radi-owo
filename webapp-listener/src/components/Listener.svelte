<script lang="ts">
  import startListenConnection from "../actions/connect";
  import type { RoomInfo } from "../actions/rooms";
  import { listenRoomStore } from "../store";
  import AudioPlayer from "./AudioPlayer.svelte";
  import RoomList from "./RoomList.svelte";

  let pc: RTCPeerConnection | null = null;
  let ws: WebSocket | null = null;
  let roomInfo: RoomInfo | null = null;

  listenRoomStore.subscribe(async (update) => {
    console.log("listenRoom updating");
    roomInfo = update;
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
      ws.onclose = () => {
        pc?.close();
        pc = null;
        ws = null;
      };
    } catch (err) {
      console.error(err);
    }
  });

  let searchValue: string = "";
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
      <!-- TODO: if we can get song info, put it here -->
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
</style>
