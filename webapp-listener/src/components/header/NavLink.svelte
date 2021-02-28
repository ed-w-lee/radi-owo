<script lang="typescript">
  import { Link } from "svelte-routing";

  export let to: String | null = null;
  export let onClick: null | (() => void) = null;
</script>

<div class="nav-link">
  {#if to}
    <Link {to}>
      <slot />
    </Link>
  {:else if onClick}
    <button on:click={onClick}>
      <slot />
    </button>
  {:else}
    <slot />
  {/if}
</div>

<style>
  .nav-link {
    padding: 0.5em 1em;
  }

  .nav-link:hover {
    background: lightgray;
  }

  button {
    background: transparent;
    border: transparent;
    padding: 0;
    margin: 0;
    color: rgb(0, 100, 200);
  }

  button:hover {
    text-decoration: underline;
    cursor: pointer;
  }
</style>
