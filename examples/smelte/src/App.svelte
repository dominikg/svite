<script>
  import Button from 'smelte/src/components/Button/Button.svelte';
  import Card from 'smelte/src/components/Card';

  import Image from 'smelte/src/components/Image';
  const world = 'world'; // edit world and save to see hmr update
  function helloSmelte() {
    alert('Hello smelte');
  }
</script>

<style>
  h1 {
    color: orangered; /* change color an save to see hmr update */
  }
</style>

<h1>Hello {world}</h1>
<p>Open App.svelte in your editor and change something to see HMR in action</p>

<Button on:click={helloSmelte}>Hello smelte</Button>

<Card.Card>
  <div slot="title">
    <Card.Title title="The three little kittens" subheader="A kitten poem" avatar="https://placekitten.com/64/64" />
  </div>
  <div slot="media">
    <Image class="w-full" src="https://placekitten.com/300/200" alt="kitty" />
  </div>
  <div slot="text" class="p-5 pb-0 pt-3 text-gray-700 body-2">
    The three little kittens, they lost their mittens,
    <br />
    And they began to cry,
    <br />
    "Oh, mother dear, we sadly fear,
    <br />
    That we have lost our mittens."
  </div>
  <div slot="actions">
    <div class="p-2">
      <Button text on:click={() => alert('ok')}>OK</Button>
      <Button text on:click={() => alert('meow')}>Meow</Button>
    </div>
  </div>
</Card.Card>
