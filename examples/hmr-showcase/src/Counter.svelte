<script>
  import { getStore } from './stores.js';
  let storeCount = getStore('count', 0);
  let internalCount = 0;
  function incrementCounts() {
    internalCount++;
    $storeCount++;
  }
</script>

<style>
  .counters {
    display: inline-block;
    padding: 1rem;
    margin: 1rem;
    border: 1px solid orangered;
    border-radius: 0.25rem;
  }
  .counters > * {
    margin: 0 0.5rem;
  }
  ol > li {
    font-weight: bold;
  }
  ol > li > ul {
    font-weight: normal;
  }
</style>

<h2>Counter</h2>
<p>This counter component stores state in 2 different ways to demonstrate the effects of hmr updates.</p>
<p>
  TL;DR: internal state gets recreated if a component or parent is recreated. state in an external store is preserved as long as the store
  itself is not updated or the store uses extra code to preserve its state
</p>

<span class="counters">
  <span>interal: {internalCount}</span>
  <span>store: {$storeCount}</span>
  <button on:click={incrementCounts}>+</button>
</span>

<h3>Steps</h3>
<ol>
  <li>
    Click on '+' button to increment both counts
    <ul>
      <li>both counts are at 1</li>
    </ul>
  </li>
  <li>
    Edit file Counter.svelte, add a new line at the end of the file, save
    <ul>
      <li>save file triggers a hot module reload of the Counter component</li>
      <li>internal count is 0, store count is 1</li>
      <li>internal count changed to 0 because the Counter instance has been recreated and 'let internalCount=0;' in line 4 was executed</li>
      <li>store count remains unchanged because the new Counter instance got it from getStore('count',0); in line 3</li>
    </ul>
  </li>
  <li>
    Click on '+' button to increment both counts
    <ul>
      <li>internal = 1, store = 2</li>
    </ul>
  </li>
  <li>
    Edit file App.svelte, add a new line at the end of the file, save
    <ul>
      <li>save file triggers a hot module reload of the App component</li>
      <li>internal count is 0, store count is 2</li>
      <li>internal count changed again because Counter got recreated as it is a child of App</li>
      <li>store count remains unchanged because the new Counter instance got it from getStore('count',0); in line 3</li>
    </ul>
  </li>
  <li>
    Click on '+' button to increment both counts
    <ul>
      <li>internal = 1, store = 3</li>
    </ul>
  </li>
  <li>
    Edit file stores.js, add a new line at the end of the file, save
    <ul>
      <li>save file triggers a hot module reload of the store</li>
      <li>counters remain unchanged at 1,3 because Counter was not recreated</li>
    </ul>
  </li>
  <li>
    Edit file Counter.svelte, add a new line at the end of the file, save
    <ul>
      <li>save file triggers a hot module reload of the Counter component</li>
      <li>internal count is 0, store count is 3</li>
      <li>we know why internal count reset, but why is store count still 3?, the store module was reloaded in the last step</li>
      <li>store count remains unchanged because the store contains code to recover state when reloading. go check it out in stores.js</li>
    </ul>
  </li>
  <li>
    Edit file stores.js, comment out line 'stores = import.meta.hot.data.stores;', save
    <ul>
      <li>save file triggers a hot module reload of the store</li>
      <li>counters remain unchanged at 0,3 because Counter was not recreated</li>
      <li>the store no longer contains the count '3', but the existing Counter instance still has it</li>
    </ul>
  </li>
  <li>
    Edit file Counter.svelte, add a new line at the end of the file, save
    <ul>
      <li>save file triggers a hot module reload of the Counter component</li>
      <li>internal count is 0, store count is 0</li>
      <li>
        the new instance of Counter tries to get the state from stores, but as it was recreated and did not preserve its state, store count
        is back at 0 now too
      </li>
    </ul>
  </li>
  <li>Go on, try different ways to implement state and trigger hmr updates.</li>
</ol>
