import nodemailer from "nodemailer";

import { optionalEnv } from "~/lib/env";

export async function sendLoginEmail(
  email: string,
  url: string
): Promise<void> {
  const resendKey = optionalEnv("RESEND_API_KEY");

  if (resendKey !== undefined) {
    await sendWithResend(resendKey, email, url);

    return;
  }

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

export function resendLoginBody(
  email: string,
  url: string,
  from: string
): { from: string; subject: string; text: string; to: string } {
  return {
    from,
    subject: "Sign in to storybranch",
    text: `Sign in: ${url}`,
    to: email,
  };
}

async function sendWithResend(
  key: string,
  email: string,
  url: string
): Promise<void> {
  const from = optionalEnv("RESEND_FROM");

  if (from === undefined) {
    throw new Error("RESEND_FROM is required when RESEND_API_KEY is set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify(resendLoginBody(email, url, from)),
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `Resend returned ${response.status}${detail === "" ? "" : `: ${detail}`}`
    );
  }
}
