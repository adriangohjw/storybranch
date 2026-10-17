import logUpdate from "log-update";
import ora from "ora";
import pc from "picocolors";

const ID_MAX = 52;

function progressEnabled(explicit?: boolean): boolean {
  if (explicit === false) {
    return false;
  }
  if (explicit === true) {
    return true;
  }
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  return process.stderr.isTTY ?? false;
}

function truncateId(id: string): string {
  if (id.length <= ID_MAX) {
    return id;
  }
  return `${id.slice(0, ID_MAX - 1)}…`;
}

function formatActive(
  current: number,
  total: number,
  id: string,
  shot: { index: number; total: number } | null
): string {
  const count = pc.dim(`[${current}/${total}]`);
  const name = pc.cyan(truncateId(id));
  if (shot === null) {
    return `${count} ${name} ${pc.dim("· loading…")}`;
  }
  if (shot.total <= 1) {
    return `${count} ${name} ${pc.dim("· capturing")}`;
  }
  return `${count} ${name} ${pc.dim(`· shot ${shot.index}/${shot.total}`)}`;
}

export interface CaptureProgress {
  header: (count: number) => void;
  storyStart: (current: number, id: string) => void;
  storyActive: (
    current: number,
    id: string,
    shot: { index: number; total: number } | null
  ) => void;
  storyDone: (
    current: number,
    id: string,
    stats: { failed: number; shots: number; skipped: boolean }
  ) => void;
  finish: (stats: {
    elapsedMs: number;
    failed: number;
    shots: number;
    stories: number;
  }) => void;
}

export function createCaptureProgress(
  totalStories: number,
  enabled = progressEnabled()
): CaptureProgress {
  if (!enabled || totalStories === 0) {
    return noopProgress();
  }

  let spinner = ora({ stream: process.stderr });

  const stopSpinner = (): void => {
    if (spinner.isSpinning) {
      spinner.stop();
    }
    logUpdate.clear();
  };

  return {
    finish(stats) {
      stopSpinner();
      const seconds = (stats.elapsedMs / 1000).toFixed(1);
      const outcome =
        stats.failed > 0
          ? pc.red(`${stats.failed} failed`)
          : pc.green("all matched");
      process.stderr.write(
        `\n${pc.bold("storybranch")} ${pc.dim("·")} ${pc.dim(`${seconds}s`)} ${pc.dim("·")} ${stats.stories} stories ${pc.dim("·")} ${stats.shots} shots ${pc.dim("·")} ${outcome}\n`
      );
      if (stats.failed > 0) {
        process.stderr.write(
          `${pc.dim("see diffs in")} ${pc.cyan(".storybranch/diff/")}\n`
        );
      }
      process.stderr.write("\n");
    },

    header(count) {
      process.stderr.write(
        `\n${pc.bold("storybranch")} ${pc.dim("·")} capturing ${count} stories\n\n`
      );
    },

    storyActive(current, id, shot) {
      spinner.text = formatActive(current, totalStories, id, shot);
      if (!spinner.isSpinning) {
        spinner.start();
      }
    },

    storyDone(current, id, stats) {
      const count = pc.dim(`[${current}/${totalStories}]`);
      const name = truncateId(id);
      if (stats.failed > 0) {
        const detail =
          stats.shots > 0
            ? pc.dim(
                ` · ${stats.failed} of ${stats.shots} shot${stats.shots === 1 ? "" : "s"} failed`
              )
            : "";
        spinner.fail(`${count} ${pc.red(name)}${detail}`);
        spinner = ora({ stream: process.stderr });
        return;
      }
      if (stats.skipped) {
        spinner.info(`${count} ${pc.dim(`${name} · skipped`)}`);
        spinner = ora({ stream: process.stderr });
        return;
      }
      stopSpinner();
    },

    storyStart(current, id) {
      stopSpinner();
      spinner = ora({
        stream: process.stderr,
        text: formatActive(current, totalStories, id, null),
      });
      spinner.start();
    },
  };
}

function noopProgress(): CaptureProgress {
  return {
    finish(_stats) {
      void _stats;
    },
    header(_count) {
      void _count;
    },
    storyActive(_current, _id, _shot) {
      void _current;
      void _id;
      void _shot;
    },
    storyDone(_current, _id, _stats) {
      void _current;
      void _id;
      void _stats;
    },
    storyStart(_current, _id) {
      void _current;
      void _id;
    },
  };
}

export function captureProgressEnabled(): boolean {
  return progressEnabled();
}
