import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db, inviteRole, query } from "~/lib/db.server";
import { appUrl, requiredEnv } from "~/lib/env";
import { sendLoginEmail } from "~/lib/mail.server";

type Auth = ReturnType<typeof createAuth>;

let cached: Auth | undefined;

function createAuth() {
  return betterAuth({
    baseURL: appUrl(),
    database: db(),
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const role = await inviteRole(user.email);

            if (role === undefined) {
              throw new Error("invite only");
            }

            return { data: { ...user, role } };
          },
        },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const invited = await inviteRole(email);

          const { rows } = await query<{ id: string }>(
            `SELECT id FROM "user" WHERE email = $1`,
            [email.toLowerCase()]
          );

          if (invited === undefined && rows[0] === undefined) {
            return;
          }

          await sendLoginEmail(email, url);
        },
      }),
      tanstackStartCookies(),
    ],
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: [appUrl()],
    user: {
      additionalFields: {
        role: {
          defaultValue: "member",
          input: false,
          required: true,
          type: "string",
        },
      },
    },
  });
}

export function getAuth(): Auth {
  cached ??= createAuth();

  return cached;
}
