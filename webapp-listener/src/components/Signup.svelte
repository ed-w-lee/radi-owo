<script lang="ts">
  import { signup } from "../actions/auth";
  import { userStore } from "../store";

  export let onSuccess: () => void;

  let displayName: string;
  let email: string;
  let password: string;
  let state: "presubmit" | "postsubmit" = "presubmit";

  const handleSubmit = async () => {
    state = "postsubmit";
    const createdUser = await signup(displayName, email, password);
    userStore.set(createdUser);
    onSuccess();
  };
</script>

<style>
  form {
    display: flex;
    flex-direction: column;
  }
</style>

<h1>Signup</h1>
<form on:submit|preventDefault={handleSubmit}>
  <label for="signup-name">Display name</label>
  <input
    id="signup-name"
    type="text"
    bind:value={displayName}
    placeholder="This will be the name other users see" />

  <label for="signup-email">Email</label>
  <input id="signup-email" type="text" bind:value={email} placeholder="email" />

  <label for="signup-password">Password</label>
  <input id="signup-password" type="password" bind:value={password} />

  <button type="submit" disabled={state !== 'presubmit'}>Submit</button>
</form>
