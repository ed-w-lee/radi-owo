<script lang="ts">
  import startListenConnection from "../actions/connect";
  import AudioPlayer from "./AudioPlayer.svelte";
  import RoomList from "./RoomList.svelte";

  let pc: RTCPeerConnection | null = null;
  let ws: WebSocket | null = null;

  const onRoomListen = async (roomId: string) => {
    console.log("calling onListen");
    try {
      [pc, ws] = await startListenConnection(roomId);
      pc.onconnectionstatechange = (ev) => {
        if (["closed", "failed"].includes(pc.connectionState)) {
          ws.close();
          pc = null;
          ws = null;
        }
      };
      ws.onclose = () => {
        pc.close();
        pc = null;
        ws = null;
      };
    } catch (err) {
      console.error(err);
    }
  };
</script>

<style>
</style>

{#if pc !== null}
  <AudioPlayer connection={pc} />
{:else}
  <p>Please choose a room to listen to:</p>
{/if}

<RoomList {onRoomListen} />
