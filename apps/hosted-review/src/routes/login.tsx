import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Mark } from "@storybranch/brand";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  const [pending, setPending] = useState(false);

  return (
    <main className="bg-background grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Mark />
            storybranch
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <CardDescription>
            Invite-only. Ask an admin if you do not have access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-muted-foreground text-sm">
              Check that inbox for the sign-in link.
            </p>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setPending(true);
                void (async () => {
                  const { error: signError } =
                    await authClient.signIn.magicLink({
                      callbackURL: "/projects",
                      email,
                    });

                  setPending(false);

                  if (signError) {
                    setError(signError.message ?? "Could not send link");

                    return;
                  }

                  setError(null);
                  setSent(true);
                })();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  autoComplete="email"
                  id="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  required
                  type="email"
                  value={email}
                />
              </div>
              {error === null ? null : (
                <p className="text-destructive text-sm">{error}</p>
              )}
              <Button disabled={pending} type="submit">
                {pending ? "Sending" : "Email magic link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
