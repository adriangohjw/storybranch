import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    document.body.dataset.review = "pending";

    return () => {
      delete document.body.dataset.review;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="specimen px-8 pb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          storybranch
        </h1>
        <p className="text-ink-soft mt-3 max-w-[65ch] text-sm">
          Invite-only magic link. Ask an admin if you do not have access.
        </p>
        {sent ? (
          <p className="text-ink mt-6 text-sm">
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
            <label className="text-ink-soft block text-sm">
              Email
              <input
                autoComplete="email"
                className="border-line bg-sheet mt-1 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                required
                type="email"
                value={email}
              />
            </label>
            {error === null ? null : (
              <p className="text-changes text-sm">{error}</p>
            )}
            <button className="chip-button" type="submit">
              Email magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
