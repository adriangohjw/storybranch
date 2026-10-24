import nodemailer from "nodemailer";

import { optionalEnv } from "~/lib/env";

export async function sendLoginEmail(
  email: string,
  url: string
): Promise<void> {
  const host = optionalEnv("SMTP_HOST");

  if (host === undefined) {
    console.info(`storybranch magic link for ${email}: ${url}`);

    return;
  }

  const port = Number(optionalEnv("SMTP_PORT") ?? "587");

  const transporter = nodemailer.createTransport({
    auth:
      optionalEnv("SMTP_USER") === undefined
        ? undefined
        : {
            pass: optionalEnv("SMTP_PASS"),
            user: optionalEnv("SMTP_USER"),
          },
    host,
    port,
    secure: port === 465,
  });

  await transporter.sendMail({
    from: optionalEnv("SMTP_FROM") ?? "storybranch@localhost",
    subject: "Sign in to storybranch",
    text: `Sign in: ${url}`,
    to: email,
  });
}
