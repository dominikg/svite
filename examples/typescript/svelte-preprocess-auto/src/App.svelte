<script>
  import Nested from './Nested.svelte';
  export let label = '';

  $: console.log(label);
</script>

<style type="text/stylus">
  /* prettier-ignore */
  .note
    color #ff3e00
  h1
    color blue
</style>

<!-- prettier-ignore -->
<template type="text/pug">
  h1.note This is the svelte-preproces example - built with svite
  hr
  h1 Hello!
  br
  input(bind:value="{label}")
  br
  Nested("{label}")
</template>
