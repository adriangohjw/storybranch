import { createMailer } from "@storybranch/mail";

import { optionalEnv } from "~/lib/env";

const mailer = createMailer({
  apiKey: optionalEnv("RESEND_API_KEY"),
  dangerousLog: optionalEnv("STORYBRANCH_DANGEROUS_EMAIL_LOG") === "1",
  from: optionalEnv("RESEND_FROM"),
});

export async function sendLoginEmail(
  email: string,
  url: string
): Promise<void> {
  await mailer.send({
    subject: "Sign in to storybranch",
    text: `Sign in: ${url}`,
    to: email,
  });
}
