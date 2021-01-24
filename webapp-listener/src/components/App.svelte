<script lang="ts">
  import Listener from "./Listener.svelte";
  import { Router, Route, navigate } from "svelte-routing";
  import HeaderNav from "./HeaderNav.svelte";
  import Redirect from "./Redirect.svelte";
  import Signup from "./Signup.svelte";
  import Login from "./Login.svelte";
  import { userStore } from "../store";
  import { onMount } from "svelte";

  export let url = "";

  onMount(() => {
    userStore.useLocalStorage();
  });
</script>

<Router {url}>
  <body>
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
      <Route path="/*">
        <!-- fallback -->
        <Redirect to="/home" />
      </Route>
    </main>
  </body>
</Router>

<style>
  body {
    background-color: white;
  }

  main {
    width: 95%;
    margin: auto;
    background-color: lightskyblue;
  }
</style>
