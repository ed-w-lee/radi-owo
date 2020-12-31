<script lang="ts">
  import { onMount } from "svelte";
  import { getRooms } from "../actions/rooms";
  import type { RoomInfo } from "../actions/rooms";
  import RoomItem from "./RoomItem.svelte";

  export let onRoomListen: (id: string) => any;

  let rooms: RoomInfo[] | null = null;

  onMount(async () => {
    rooms = await getRooms();
  });
</script>

<style>
</style>

{#if rooms === null}
  <h2>Loading</h2>
{:else}
  <div>
    {#each rooms as room (room.id)}
      <RoomItem roomInfo={room} {onRoomListen} />
    {/each}
  </div>
{/if}
