import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db, ensureAdmin, inviteRole, kysely } from "~/lib/db.server";
import { appUrl, env, trustedAppOrigins } from "~/lib/env";
import { sendLoginEmail } from "~/lib/mail.server";

type Auth = ReturnType<typeof createAuth>;

let cached: Promise<Auth> | undefined;

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
          const [invited, existing] = await Promise.all([
            inviteRole(email),
            kysely()
              .selectFrom("user")
              .select("id")
              .where("email", "=", email.toLowerCase())
              .executeTakeFirst(),
          ]);

          if (invited === undefined && existing === undefined) {
            return;
          }

          await sendLoginEmail(email, url);
        },
      }),
      tanstackStartCookies(),
    ],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedAppOrigins(),
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

export async function getAuth(): Promise<Auth> {
  cached ??= (async () => {
    await ensureAdmin();

    return createAuth();
  })();

  return cached;
}
