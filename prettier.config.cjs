/** @type {import("prettier").Config} */
const config = {
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  tailwindFunctions: ["clsx"],
};

module.exports = config;
