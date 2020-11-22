const { tailwindExtractor } = require('tailwindcss/lib/lib/purgeUnusedStyles');

const svelteClassColonExtractor = (content) => {
  return content.match(/(?<=class:)([a-zA-Z0-9_-]+)/gm) || [];
};

module.exports = {
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: ['./src/**/*.svelte', './src/**/*.html', './src/**/*.css', './index.html'],
    preserveHtmlElements: true,
    options: {
      safelist: [/svelte-/],
      defaultExtractor: (content) => {
        return [...tailwindExtractor(content), ...svelteClassColonExtractor(content)];
      },
    },
  },
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
};
