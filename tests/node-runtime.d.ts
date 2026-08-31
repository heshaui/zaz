declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: { cwd: string; encoding: 'utf8' },
  ): string;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
}

declare const process: {
  env: Record<string, string | undefined>;
};

interface ImportMeta {
  dirname: string;
}
