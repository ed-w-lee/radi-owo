<script lang="ts">
  import { userStore } from "../store";
  import type { UserStore } from "../store";
  import { Link } from "svelte-routing";

  let userInfo: UserStore | null;
  userStore.subscribe((val) => (userInfo = val));
</script>

<style>
  #nav-left {
    float: left;
  }

  #nav-right {
    float: right;
  }
</style>

<nav>
  <div id="nav-left">
    <Link to="/">Home</Link>
  </div>
  <div id="nav-right">
    {#if userInfo === null}
      <Link to="/login">Login</Link>
      <Link to="/signup">Signup</Link>
    {:else}{userInfo.result.display_name}{/if}
  </div>
</nav>
