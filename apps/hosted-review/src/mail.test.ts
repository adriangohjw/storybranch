import { expect, test } from "bun:test";

import { resendLoginBody } from "~/lib/mail.server";

test("resend login body names the sign-in link", () => {
  expect(
    resendLoginBody(
      "ada@example.com",
      "https://review.example/login",
      "storybranch <review@example.com>"
    )
  ).toEqual({
    from: "storybranch <review@example.com>",
    subject: "Sign in to storybranch",
    text: "Sign in: https://review.example/login",
    to: "ada@example.com",
  });
});
