import plugin from 'tailwindcss/plugin';

const customPlugin = plugin(({ matchUtilities }) => {
  const allowedFontSizes = [10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 128];

  const fontSizeValues = allowedFontSizes.reduce((acc, size) => {
    acc[`${size}px`] = `calc(var(--spacing) / 4 * ${size})`;
    return acc;
  }, {});

  matchUtilities(
    {
      text: value => ({
        fontSize: value,
      }),
    },
    {
      values: fontSizeValues,
    }
  );
});

export default customPlugin;
