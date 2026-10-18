import { useEffect, useId, useState } from "react";
import { FaGithub } from "react-icons/fa6";
import { LuMenu, LuX } from "react-icons/lu";

const links = [
  { href: "#review", label: "Review" },
  { href: "#install", label: "Install" },
  { href: "#how", label: "How it works" },
  { href: "#agents", label: "Agents" },
] as const;

interface SiteNavProps {
  github: string;
}

export function SiteNav({ github }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
  };

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <a
        className="font-syne text-ink text-lg font-bold tracking-tight sm:text-xl"
        href="/"
      >
        storybranch
      </a>

      <nav
        aria-label="Primary"
        className="text-ink-muted hidden items-center gap-5 text-sm font-medium md:flex"
      >
        {links.map((link) => (
          <a
            className="hover:text-ink transition-colors"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
        <a
          aria-label="GitHub repository"
          className="bg-ink text-paper hover:bg-ink/90 inline-flex rounded-md p-2 transition-colors"
          href={github}
          rel="noopener noreferrer"
          target="_blank"
        >
          <FaGithub aria-hidden className="size-4" />
        </a>
      </nav>

      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="border-ink/15 text-ink hover:border-ink/30 hover:bg-paper-2 inline-flex rounded-md border p-2 transition-colors md:hidden"
        onClick={() => {
          setOpen((value) => !value);
        }}
        type="button"
      >
        {open ? (
          <LuX aria-hidden className="size-5" />
        ) : (
          <LuMenu aria-hidden className="size-5" />
        )}
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
      >
        <button
          aria-label="Close menu"
          className={`bg-ink/40 absolute inset-0 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
          tabIndex={open ? 0 : -1}
          type="button"
        />
        <aside
          className={`border-ink/10 bg-paper absolute top-0 right-0 flex h-full w-[min(100%,18rem)] flex-col border-l shadow-xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          id={panelId}
        >
          <div className="border-ink/10 flex items-center justify-between border-b px-5 py-4">
            <span className="font-syne text-ink text-base font-bold">Menu</span>
            <button
              aria-label="Close menu"
              className="text-ink-muted hover:bg-paper-2 hover:text-ink rounded-md p-1.5 transition-colors"
              onClick={close}
              type="button"
            >
              <LuX aria-hidden className="size-5" />
            </button>
          </div>
          <nav
            aria-label="Mobile"
            className="text-ink flex flex-1 flex-col gap-1 p-3 text-base font-medium"
          >
            {links.map((link) => (
              <a
                className="hover:bg-paper-2 rounded-md px-3 py-2.5 transition-colors"
                href={link.href}
                key={link.href}
                onClick={close}
              >
                {link.label}
              </a>
            ))}
            <a
              aria-label="GitHub repository"
              className="hover:bg-paper-2 flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors"
              href={github}
              onClick={close}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FaGithub aria-hidden className="size-5 shrink-0" />
              <span>GitHub</span>
            </a>
          </nav>
        </aside>
      </div>
    </header>
  );
}
