import App from './components/App.svelte';

const app = new App({
  target: document.getElementById("app")!,
  hydrate: true,
});

export default app;
