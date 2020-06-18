import App from './App.svelte';

const app = new App({
  target: document.body,
});

export default app;

// NOTE I'm not sure it is a good idea to accept here, given how I seemed to get
// weird update bubbling, a full reload might be preferable
//
// if (import.meta.hot) {
//   import.meta.hot.accept(() => {
//     app.$destroy()
//   });
// }
