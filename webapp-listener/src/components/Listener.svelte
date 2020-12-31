<script lang="ts">
  import startListenConnection from "../actions/connect";
  import AudioPlayer from "./AudioPlayer.svelte";
  import RoomList from "./RoomList.svelte";

  let pc: RTCPeerConnection | null = null;

  const onRoomListen = async (roomId: string) => {
    console.log("calling onListen");
    try {
      pc = await startListenConnection(roomId);
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
