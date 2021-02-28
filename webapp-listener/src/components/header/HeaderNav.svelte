<script lang="ts">
  import { navigate } from "svelte-routing";

  import { userStore } from "@src/store";
  import type { UserStore } from "@src/store";

  import NavLink from "./NavLink.svelte";

  let userInfo: UserStore | null;
  userStore.subscribe((val) => (userInfo = val));

  const onLogout = () => {
    userStore.set(null);
    navigate("/home");
  };
</script>

<nav>
  <div id="nav-left">
    <NavLink to="/">RadioWo</NavLink>
    <NavLink to="/about">About</NavLink>
  </div>
  <div id="nav-right">
    {#if userInfo === null}
      <NavLink to="/login">Login</NavLink>
      <NavLink to="/signup">Signup</NavLink>
    {:else}
      <NavLink>
        {userInfo.result.display_name}
      </NavLink>
      <NavLink onClick={onLogout}>Logout</NavLink>
    {/if}
  </div>
</nav>

<style>
  nav {
    height: 3em;
  }

  #nav-left {
    float: left;
    display: flex;
    flex-direction: row;
  }

  #nav-right {
    float: right;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
</style>
