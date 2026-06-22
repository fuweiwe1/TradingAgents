import { basename, join } from "node:path";

const INSTANCE_ENVIRONMENT_KEYS = [
  "CRAFT_INSTANCE_ID",
  "CRAFT_APP_NAME",
  "CRAFT_CONFIG_DIR",
  "CRAFT_ELECTRON_USER_DATA_DIR",
  "CRAFT_DEEPLINK_SCHEME",
  "CRAFT_VITE_PORT",
] as const;

type ElectronDevEnvironmentKey = (typeof INSTANCE_ENVIRONMENT_KEYS)[number];

export type ElectronDevEnvironment = Record<
  ElectronDevEnvironmentKey,
  string
> & {
  CRAFT_INSTANCE_NUMBER?: string;
};

export interface ResolveElectronDevEnvironmentOptions {
  rootDir: string;
  homeDir: string;
  appDataDir: string;
  env: Readonly<Record<string, string | undefined>>;
}

function explicitOrDefault(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

function validateVitePort(value: string): string {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(
      `Invalid CRAFT_VITE_PORT "${value}": expected ASCII decimal digits only.`,
    );
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid CRAFT_VITE_PORT "${value}": expected an integer between 1 and 65535.`,
    );
  }

  return value;
}

function resolveNumberedInstance(rootDir: string):
  | { suffix: string; vitePort: string }
  | undefined {
  const suffix = basename(rootDir).match(/-(\d+)$/)?.[1];
  if (!suffix) {
    return undefined;
  }

  if (suffix.length > 1 && suffix.startsWith("0")) {
    const normalizedSuffix = suffix.replace(/^0+/, "") || "0";
    throw new Error(
      `Numbered instance suffix "-${suffix}" has a leading zero and is ambiguous; use "-${normalizedSuffix}" instead.`,
    );
  }

  const instanceNumber = BigInt(suffix);
  if (instanceNumber === 0n) {
    throw new Error(
      'Numbered instance suffix must be greater than zero; remove "-0" for the base instance.',
    );
  }
  if (instanceNumber > 45535n) {
    throw new Error(
      `Numbered instance suffix must be at most 45535; choose a smaller suffix than "${suffix}".`,
    );
  }

  const numericInstance = Number(instanceNumber);
  return {
    suffix,
    vitePort:
      numericInstance <= 4
        ? `${numericInstance}173`
        : String(20000 + numericInstance),
  };
}

export function resolveElectronDevEnvironment({
  rootDir,
  homeDir,
  appDataDir,
  env,
}: ResolveElectronDevEnvironmentOptions): ElectronDevEnvironment {
  const numberedInstance = resolveNumberedInstance(rootDir);
  const suffix = numberedInstance?.suffix;
  const suffixToken = suffix ? `-${suffix}` : "";
  const appName = suffix ? `StockCraft Dev [${suffix}]` : "StockCraft Dev";
  const userDataName = suffix ? `StockCraft Dev ${suffix}` : "StockCraft Dev";
  const vitePort = validateVitePort(
    explicitOrDefault(
      env.CRAFT_VITE_PORT,
      numberedInstance?.vitePort ?? "5173",
    ),
  );
  const instanceNumber =
    env.CRAFT_INSTANCE_NUMBER?.trim()
      ? env.CRAFT_INSTANCE_NUMBER
      : suffix;

  return {
    CRAFT_INSTANCE_ID: explicitOrDefault(
      env.CRAFT_INSTANCE_ID,
      `stockcraft-dev${suffixToken}`,
    ),
    CRAFT_APP_NAME: explicitOrDefault(env.CRAFT_APP_NAME, appName),
    CRAFT_CONFIG_DIR: explicitOrDefault(
      env.CRAFT_CONFIG_DIR,
      join(homeDir, `.stockcraft-dev${suffixToken}`),
    ),
    CRAFT_ELECTRON_USER_DATA_DIR: explicitOrDefault(
      env.CRAFT_ELECTRON_USER_DATA_DIR,
      join(appDataDir, userDataName),
    ),
    CRAFT_DEEPLINK_SCHEME: explicitOrDefault(
      env.CRAFT_DEEPLINK_SCHEME,
      `stockcraft-dev${suffixToken}`,
    ),
    CRAFT_VITE_PORT: vitePort,
    ...(instanceNumber ? { CRAFT_INSTANCE_NUMBER: instanceNumber } : {}),
  };
}
