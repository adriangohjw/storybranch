const posted = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatWhen(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return posted.format(date);
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}
