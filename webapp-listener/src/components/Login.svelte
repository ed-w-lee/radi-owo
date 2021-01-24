<script lang="ts">
  import { login } from "../actions/auth";
  import { userStore } from "../store";

  export let onSuccess: () => void;

  let email: string;
  let password: string;
  let state: "presubmit" | "postsubmit" = "presubmit";

  const handleSubmit = async () => {
    state = "postsubmit";
    const createdUser = await login(email, password);
    userStore.set(createdUser);
    onSuccess();
  };
</script>

<h1>Login</h1>
<form on:submit|preventDefault={handleSubmit}>
  <label for="login-email">Email</label>
  <input id="login-email" type="text" bind:value={email} placeholder="email" />

  <label for="login-password">Password</label>
  <input id="login-password" type="password" bind:value={password} />

  <button type="submit" disabled={state !== "presubmit"}>Submit</button>
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
  }
</style>
