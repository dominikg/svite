<script>
  import Datepicker from 'svelte-calendar/src/Components/Datepicker.svelte';
  import { notifications, Notification } from 'renderless-svelte/src/index';
  import { fly } from 'svelte/transition';
  const world = 'world'; // edit world and save to see hmr update

  function notify() {
    notifications.push('Hello svite');
  }
</script>

<style>
  h1 {
    color: orangered; /* change color an save to see hmr update */
  }
  .notifications {
    margin-top: 1rem;
    /* use position fixed, sticky, absolute or whatever else to move the notification area */
  }
  .notification {
    border-radius: 0.25rem;
    background-color: #ff3e00;
    color: white;
    padding: 0.25rem;
    margin: 0.5rem;
  }
</style>

<h1>Hello {world}</h1>
<p>Open App.svelte in your editor and change something to see HMR in action</p>

<h2>svelte-calendar datepicker</h2>
<Datepicker />

<h2>renderless-svelte notification</h2>
<button on:click={notify}>Notify</button>
<div class="notifications">
  <Notification let:payload on:notify={(ev) => console.log(ev.detail)}>
    <span class="notification" in:fly={{ duration: 500, y: 1000 }}>{payload}</span>
  </Notification>
</div>
