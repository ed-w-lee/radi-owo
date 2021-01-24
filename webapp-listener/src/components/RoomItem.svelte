<script lang="ts">
  import type { RoomInfo } from "../actions/rooms";
  import { listenRoomStore } from "../store";

  export let roomInfo: RoomInfo;
</script>

<tr>
  <td class="name">{roomInfo.name}</td>
  <td class="host">{roomInfo.hostName}</td>
  <td class="action">
    <button
      disabled={roomInfo.hostStatus !== "playing"}
      on:click={() => listenRoomStore.set(roomInfo)}>Listen</button
    >
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
