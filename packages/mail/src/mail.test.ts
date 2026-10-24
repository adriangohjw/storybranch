import { expect, test } from "bun:test";

import { createMailer } from "@/mail.ts";

test("dangerousLog writes the message and does not call Resend", async () => {
  const lines: string[] = [];

  const mailer = createMailer({
    apiKey: undefined,
    dangerousLog: true,
    fetchFn: async () => {
      throw new Error("fetch should not run");
    },
    from: undefined,
    log: (line) => {
      lines.push(line);
    },
  });

  await mailer.send({
    subject: "Sign in to storybranch",
    text: "Sign in: https://review.example/login",
    to: "ada@example.com",
  });

  expect(lines).toEqual([
    "storybranch email to ada@example.com: Sign in: https://review.example/login",
  ]);
});

test("missing Resend config throws when dangerousLog is off", async () => {
  const mailer = createMailer({
    apiKey: undefined,
    from: undefined,
  });

  await expect(
    mailer.send({
      subject: "Sign in",
      text: "Sign in: https://review.example",
      to: "ada@example.com",
    })
  ).rejects.toThrow("dangerousLog");
});

test("sends through the Resend API", async () => {
  let body = "";

  const mailer = createMailer({
    apiKey: "re_test",
    fetchFn: async (_input, init) => {
      body = String(init?.body);

      return new Response(null, { status: 200 });
    },
    from: "storybranch <review@example.com>",
  });

  await mailer.send({
    subject: "Sign in to storybranch",
    text: "Sign in: https://review.example/login",
    to: "ada@example.com",
  });

  expect(JSON.parse(body)).toEqual({
    from: "storybranch <review@example.com>",
    subject: "Sign in to storybranch",
    text: "Sign in: https://review.example/login",
    to: "ada@example.com",
  });
});
