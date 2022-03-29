export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  docs: {
    transformSource: (src, storyContext) => {
      /* Crude re-indenting code for the code snippets */
      return src
        .replace(/ ([a-zA-Z0-9_]+=)/g, '\n  $1')
        .replace(/ \/>/, '\n/>')
    }
  },
  previewTabs: { 'storybook/docs/panel': { index: -1 } },
}