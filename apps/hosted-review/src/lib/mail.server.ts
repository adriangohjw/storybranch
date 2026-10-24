import { createMailer } from "@storybranch/mail";

import { dangerousEmailLog, env } from "~/lib/env";

const mailer = createMailer({
  apiKey: env.RESEND_API_KEY,
  dangerousLog: dangerousEmailLog(),
  from: env.RESEND_FROM,
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
