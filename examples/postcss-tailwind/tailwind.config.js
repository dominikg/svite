module.exports = {
  purge: process.env.NODE_ENV === 'production' && ['./src/**/*.svelte', './src/**/*.html', './src/**/*.css', './index.html'],
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
};
