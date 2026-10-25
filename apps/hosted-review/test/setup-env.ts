Object.assign(process.env, {
  BETTER_AUTH_SECRET: "dev-secret-change-me-please-32ch",
  DATABASE_URL: "postgres://storybranch:storybranch@127.0.0.1:5432/storybranch",
  S3_ACCESS_KEY: "test",
  S3_BUCKET: "storybranch",
  S3_SECRET_KEY: "test",
  STORYBRANCH_APP_URL: "http://127.0.0.1:3000",
  STORYBRANCH_DANGEROUS_EMAIL_LOG: "1",
});
