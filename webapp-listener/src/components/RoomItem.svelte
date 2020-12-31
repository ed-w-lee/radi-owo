<script lang="ts">
  import type { RoomInfo } from "../actions/rooms";

  export let roomInfo: RoomInfo;
  export let onRoomListen: (id: string) => any;
</script>

<div>
  {roomInfo.name}
  <button on:click={() => onRoomListen(roomInfo.id)}>Listen</button>
</div>
