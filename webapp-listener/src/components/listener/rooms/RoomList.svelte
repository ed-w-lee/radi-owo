<script lang="ts">
  import { onMount } from "svelte";

  import { getRooms } from "@src/actions/rooms";
  import type { RoomInfo } from "@src/actions/rooms";

  import RoomItem from "./RoomItem.svelte";

  export let search: string = "";

  let rooms: RoomInfo[] | null = null;

  onMount(async () => {
    rooms = await getRooms();
  });

  const containsSubsequence = (base: string, subseq: string) => {
    let baseIdx = 0;
    for (let subseqIdx = 0; subseqIdx < subseq.length; subseqIdx++) {
      let found: boolean = false;
      while (baseIdx < base.length) {
        if (base[baseIdx] === subseq[subseqIdx]) {
          found = true;
          break;
        }
        baseIdx++;
      }
      if (found) continue;
      return false;
    }
    return true;
  };
</script>

{#if rooms === null}
  <h2>Loading</h2>
{:else}
  <table class="room-list">
    <!-- <tr>
      <th class="name">Name</th>
      <th class="host">From</th>
      <th class="action">Action</th>
    </tr> -->
    {#each rooms as room (room.id)}
      {#if !search || containsSubsequence(room.name, search)}
        <RoomItem roomInfo={room} />
      {/if}
    {/each}
    {#if search && rooms.every((room) => !containsSubsequence(room.name, search))}
      <tr>
        <td colspan="3">No rooms found :(</td>
      </tr>
    {/if}
  </table>
{/if}

<style>
  .room-list {
    width: 100%;
  }
</style>
