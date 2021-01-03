<script lang="ts">
	import Listener from "./Listener.svelte";
	import { Router, Route, navigate } from "svelte-routing";
	import HeaderNav from "./HeaderNav.svelte";
	import Home from "./Home.svelte";
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

<style>
	body {
		background-color: white;
	}
	main {
		text-align: center;
	}
</style>

<Router {url}>
	<body>
		<HeaderNav />
		<main>
			<Route path="/login">
				<Login
					onSuccess={() => {
						console.log('login success');
						navigate('/home');
					}} />
			</Route>
			<Route path="/signup">
				<Signup
					onSuccess={() => {
						console.log('signup success');
						navigate('/home');
					}} />
			</Route>
			<Route path="/home">
				<Home />
			</Route>
			<Route path="/*">
				<!-- fallback -->
				<Redirect to="/home" />
			</Route>
		</main>
	</body>
</Router>
