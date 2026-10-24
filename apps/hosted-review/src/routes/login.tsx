import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { getSessionUser } from "~/lib/auth.functions";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const user = await getSessionUser();

    if (user !== null) {
      throw redirect({ to: "/projects" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">storybranch</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Invite-only magic link. Check with an admin if you do not have access.
      </p>
      {sent ? (
        <p className="mt-6 text-sm text-zinc-200">
          If that email is invited, a sign-in link is on its way.
        </p>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              const { error: signError } = await authClient.signIn.magicLink({
                callbackURL: "/projects",
                email,
              });

              if (signError) {
                setError(signError.message ?? "Could not send link");

                return;
              }

              setError(null);
              setSent(true);
            })();
          }}
        >
          <label className="block text-sm text-zinc-300">
            Email
            <input
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              required
              type="email"
              value={email}
            />
          </label>
          {error === null ? null : (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            type="submit"
          >
            Email magic link
          </button>
        </form>
      )}
    </main>
  );
}
