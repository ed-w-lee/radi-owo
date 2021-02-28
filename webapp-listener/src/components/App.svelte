<script lang="ts">
  import { Router, Route, navigate } from "svelte-routing";
  import { onMount } from "svelte";

  import { userStore } from "@src/store";

  import Listener from "./listener/Listener.svelte";
  import HeaderNav from "./header/HeaderNav.svelte";
  import Redirect from "./Redirect.svelte";
  import Signup from "./Signup.svelte";
  import Login from "./Login.svelte";
  import About from "./About.svelte";

  export let url = "";

  onMount(() => {
    userStore.useLocalStorage();
  });
</script>

<Router {url}>
  <HeaderNav />
  <main>
    <Route path="/login">
      <Login
        onSuccess={() => {
          console.log("login success");
          navigate("/home");
        }}
      />
    </Route>
    <Route path="/signup">
      <Signup
        onSuccess={() => {
          console.log("signup success");
          navigate("/home");
        }}
      />
    </Route>
    <Route path="/home">
      <Listener />
    </Route>
    <Route path="/about">
      <About />
    </Route>
    <Route path="/*">
      <!-- fallback -->
      <Redirect to="/home" />
    </Route>
  </main>
</Router>

<style>
  main {
    width: 95%;
    margin: auto;
    background-color: rgb(184, 228, 255);
  }
</style>
