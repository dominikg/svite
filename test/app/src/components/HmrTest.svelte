<script context="module">
  let idCount = 1;
</script>

<script>
  export let label = 'from-script';
  export let id = `hmr-test-${idCount++}`;
  let counter = 0;
  function increment() {
    counter++;
  }
</script>

<style>
  .hmr-test {
    display: flex;
  }
  .label {
    color: red;
  }
</style>

<div class="hmr-test" {id}>
  <span class="label">{label}</span>
  <span class="counter">{counter}</span>
  <button class="increment" on:click={increment}>inc</button>

</div>
