<script>
  import img from '/src/assets/static.svg';
  const importedAsset = img;
  const label = 'static-import';
</script>

<style>
  .label {
    padding-left: 2rem;
    background-image: url('/src/assets/static.svg');
    background-repeat: no-repeat;
    background-size: contain;
  }
  img {
    width: 1rem;
    height: 1rem;
  }
</style>

<div id="static-import"><span class="label">{label}</span> <img alt="imported" src={importedAsset} /></div>
