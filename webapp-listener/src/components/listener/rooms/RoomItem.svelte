<script lang="ts">
  import type { RoomInfo } from "@src/actions/rooms";
  import { listenRoomStore } from "@src/store";

  export let roomInfo: RoomInfo;
  let isCurrentRoom = false;
  listenRoomStore.subscribe((selectedRoom) => {
    if (selectedRoom && selectedRoom.id === roomInfo.id) {
      isCurrentRoom = true;
    } else {
      isCurrentRoom = false;
    }
  });
</script>

<tr>
  <td class="name">{roomInfo.name}</td>
  <td class="host">{roomInfo.hostName}</td>
  <td class="action">
    <button
      disabled={roomInfo.hostStatus !== "playing" || isCurrentRoom}
      on:click={() => listenRoomStore.set(roomInfo)}
    >
      {#if isCurrentRoom}
        Listening...
      {:else}
        Listen
      {/if}
    </button>
  </td>
</tr>

<style>
  .host {
    text-align: center;
  }
  .action {
    text-align: center;
  }
  .name {
    width: 70%;
  }
  .host {
    width: 20%;
  }
  .action {
    width: 10%;
  }
</style>
