module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-input-range')(),
    require('tailwindcss')('./tailwind.config.js'),
    require('postcss-preset-env')({ stage: 1 }),
  ],
};
