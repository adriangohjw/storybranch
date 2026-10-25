import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageError, PagePending } from "~/components/page-state";
import { ProofKey, ProofStrip } from "~/components/proof-strip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createProject, inviteUser, listInvites } from "~/lib/app.functions";
import type { ProjectRow } from "~/lib/app.functions";
import { shortSha } from "~/lib/format";
import { projectsFinding } from "~/lib/proof";
import { canAdmin } from "~/lib/roles";

export const Route = createFileRoute("/_authed/projects")({
  component: ProjectsPage,
  errorComponent: ({ reset }) => (
    <PageError onRetry={reset} what="Couldn't load projects." />
  ),
  loader: async () => ({
    invites: await listInvites(),
  }),
  pendingComponent: PagePending,
});

function ProjectsPage() {
  const { user } = Route.useRouteContext();
  const { projects } = Route.parentRoute.useLoaderData();
  const { invites } = Route.useLoaderData();
  const router = useRouter();
  const admin = canAdmin(user.role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [query, setQuery] = useState("");

  const [tab, setTab] = useState<"all" | "waiting">(() =>
    projects.some((project) => (project.latest?.proof?.waiting ?? 0) > 0)
      ? "waiting"
      : "all"
  );

  const finding = projectsFinding(
    projects.map((project) => ({
      name: project.name,
      runCount: project.runCount,
      waiting: project.latest?.proof?.waiting ?? 0,
    }))
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return projects
      .filter((project) => {
        const waiting = project.latest?.proof?.waiting ?? 0;

        if (tab === "waiting" && waiting === 0) {
          return false;
        }

        return (
          needle.length === 0 || project.name.toLowerCase().includes(needle)
        );
      })
      .toSorted((a, b) => {
        const diff =
          (b.latest?.proof?.waiting ?? 0) - (a.latest?.proof?.waiting ?? 0);

        if (diff !== 0) {
          return diff;
        }

        return a.name.localeCompare(b.name);
      });
  }, [projects, query, tab]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">{finding}</p>
        </div>
        {admin ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                await createProject({ data: { name } });
                setName("");
                await router.invalidate();
              })();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                className="w-full sm:w-56"
                id="project-name"
                onChange={(event) => {
                  setName(event.target.value);
                }}
                value={name}
              />
            </div>
            <Button
              disabled={name.trim().length === 0}
              type="submit"
              variant={projects.length === 0 ? "default" : "outline"}
            >
              Create project
            </Button>
          </form>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-sm">
          <p>No projects yet.</p>
          {admin ? (
            <p className="mt-1">
              Name one above. CI posts proofs here after you create a token.
            </p>
          ) : (
            <p className="mt-1">Ask an admin to add the repo you review.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs
            onValueChange={(value) => {
              if (value === "waiting" || value === "all") {
                setTab(value);
              }
            }}
            value={tab}
          >
            <TabsList>
              <TabsTrigger value="waiting">Waiting</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              aria-label="Find a project"
              className="w-full sm:max-w-xs"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Find a project"
              value={query}
            />
            <p className="text-muted-foreground text-sm tabular-nums">
              {visible.length} {visible.length === 1 ? "project" : "projects"}
            </p>
          </div>
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-sm">No project matches.</p>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Latest run</TableHead>
                    <TableHead className="text-right">Waiting</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((project, index) => (
                    <ProjectLine
                      key={project.id}
                      lead={
                        index ===
                        visible.findIndex(
                          (item) => (item.latest?.proof?.waiting ?? 0) > 0
                        )
                      }
                      project={project}
                    />
                  ))}
                </TableBody>
              </Table>
              <ProofKey />
            </div>
          )}
        </div>
      )}

      {admin ? (
        <section className="space-y-4 border-t pt-8">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Invites</h2>
            <p className="text-muted-foreground text-sm">
              An invite is the only way in. The role applies to every project.
            </p>
          </div>
          {invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invites yet.</p>
          ) : (
            <ul>
              {invites.map((invite) => (
                <li
                  className="flex items-center gap-3 border-t py-3 text-sm"
                  key={invite.email}
                >
                  <span>{invite.email}</span>
                  <span className="text-muted-foreground">
                    {roleLabel(invite.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                await inviteUser({ data: { email, role } });
                setEmail("");
                await router.invalidate();
              })();
            }}
          >
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                type="email"
                value={email}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={email.trim().length === 0}
              type="submit"
              variant="outline"
            >
              Invite
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function ProjectLine({
  lead,
  project,
}: {
  lead: boolean;
  project: ProjectRow;
}) {
  const waiting = project.latest?.proof?.waiting ?? 0;
  const { latest } = project;

  return (
    <TableRow>
      <TableCell>
        <Link
          className="font-medium hover:underline"
          params={{ projectId: project.id }}
          to="/projects/$projectId"
        >
          {project.name}
        </Link>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {project.runCount === 0
            ? "No runs"
            : `${project.runCount.toString()} ${project.runCount === 1 ? "run" : "runs"}`}
        </span>
      </TableCell>
      <TableCell>
        {latest === null ? (
          <span className="text-muted-foreground">No run yet</span>
        ) : (
          <>
            <span>
              {latest.branch ?? "No branch"}
              <span className="tabular-nums">
                {" "}
                · {shortSha(latest.commitSha)}
              </span>
              {latest.prNumber === null
                ? ""
                : ` · PR ${latest.prNumber.toString()}`}
            </span>
            <ProofStrip proof={latest.proof} />
          </>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{waiting}</TableCell>
      <TableCell className="text-right">
        {latest === null ? null : (
          <Button asChild size="sm" variant={lead ? "default" : "ghost"}>
            <Link
              params={{ projectId: project.id, runId: latest.id }}
              to="/projects/$projectId/runs/$runId"
            >
              {waiting > 0 ? "Review" : "Open"}
            </Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function roleLabel(role: string): string {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "approver") {
    return "Approver";
  }

  return "Member";
}
