import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Mark } from "@storybranch/brand";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import type { ProjectRow } from "~/lib/app.functions";
import { authClient } from "~/lib/auth-client";
import type { SessionUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";

function roleWord(role: string): string {
  return role.slice(0, 1).toUpperCase() + role.slice(1);
}

function signOut(): void {
  void authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = "/login";
      },
    },
  });
}

function Account({ user }: { user: SessionUser }) {
  return (
    <>
      <span className="text-muted-foreground truncate text-sm">
        {user.email}
        <span> · {roleWord(user.role)}</span>
      </span>
      <Button onClick={signOut} size="sm" type="button" variant="ghost">
        Sign out
      </Button>
    </>
  );
}

function Crumb({
  path,
  projects,
}: {
  path: string;
  projects: readonly ProjectRow[];
}) {
  const bits = path.split("/").filter(Boolean);
  const projectId = bits[0] === "projects" ? bits[1] : undefined;
  const project = projects.find((item) => item.id === projectId);
  const onRun = bits[2] === "runs";

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        <BreadcrumbItem>
          {project === undefined ? (
            <BreadcrumbPage>Projects</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {project === undefined ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              {onRun ? (
                <BreadcrumbLink asChild>
                  <Link
                    params={{ projectId: project.id }}
                    to="/projects/$projectId"
                  >
                    {project.name}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate">
                  {project.name}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {onRun ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Run</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function navClass(current: boolean): string {
  return cn(
    "text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-8 items-center justify-between gap-2 rounded-md px-2 text-sm",
    current && "bg-accent text-accent-foreground font-medium"
  );
}

export function Shell({
  children,
  projects,
  user,
}: {
  children: ReactNode;
  projects: ProjectRow[];
  user: SessionUser;
}) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
  };

  return (
    <div className="bg-background text-foreground flex min-h-svh">
      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={close}
          type="button"
        />
      ) : null}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r p-3 motion-safe:transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-3 flex items-center justify-between md:hidden">
          <Button
            aria-label="Close"
            onClick={close}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        <Link
          className="mb-4 flex h-8 items-center gap-2 px-2 text-sm font-semibold"
          onClick={close}
          to="/projects"
        >
          <Mark />
          storybranch
        </Link>
        <nav
          aria-label="Projects"
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto"
        >
          <Link
            aria-current={path === "/projects" ? "page" : undefined}
            className={navClass(path === "/projects")}
            onClick={close}
            to="/projects"
          >
            All projects
          </Link>
          <p className="text-muted-foreground mt-4 mb-1 px-2 text-xs">
            Projects
          </p>
          {projects.map((project) => {
            const waiting = project.latest?.proof?.waiting ?? 0;

            const current =
              path === `/projects/${project.id}` ||
              path.startsWith(`/projects/${project.id}/`);

            return (
              <Link
                aria-current={current ? "page" : undefined}
                className={navClass(current)}
                key={project.id}
                onClick={close}
                params={{ projectId: project.id }}
                title={project.name}
                to="/projects/$projectId"
              >
                <span className="truncate">{project.name}</span>
                {waiting > 0 ? (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {waiting}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col items-start gap-2 border-t pt-3 md:hidden">
          <Account user={user} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <Button
            aria-expanded={open}
            aria-label="Menu"
            className="md:hidden"
            onClick={() => {
              setOpen(true);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Menu />
          </Button>
          <Crumb path={path} projects={projects} />
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <Account user={user} />
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
