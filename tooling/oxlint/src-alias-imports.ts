export const srcAliasImportsOverride = {
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["./*", "../*"],
            message: "Use the @/ path alias instead of a relative import.",
          },
        ],
      },
    ],
  },
};
