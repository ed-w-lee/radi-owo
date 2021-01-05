<script lang="ts">
  import { onMount } from "svelte";
  import { getRooms } from "../actions/rooms";
  import type { RoomInfo } from "../actions/rooms";
  import RoomItem from "./RoomItem.svelte";

  let rooms: RoomInfo[] | null = null;

  onMount(async () => {
    rooms = await getRooms();
  });
</script>

<style>
  .room-list {
    width: 100%;
  }
  th.name {
    width: 70%;
  }
  th.host {
    width: 20%;
  }
  th.action {
    width: 10%;
  }
</style>

{#if rooms === null}
  <h2>Loading</h2>
{:else}
  <table class="room-list">
    <tr>
      <th class="name">Name</th>
      <th class="host">From</th>
      <th class="action">Action</th>
    </tr>
    {#each rooms as room (room.id)}
      <RoomItem roomInfo={room} />
    {/each}
  </table>
{/if}
