<script type="text/typescript">
  import Nested from './Nested.svelte';
  export let label: string = '';

  $: console.log(label);
</script>

<style type="text/stylus">
  .note
    color #ff3e00
  h1
    color blue
</style>

<template type="text/pug">
  h1.note This is the svelte-preproces example - built with svite
  hr
  h1 Hello!
  br
  input(bind:value="{label}")
  br
  Nested("{label}")
</template>
