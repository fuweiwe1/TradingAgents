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
>;

export interface ResolveElectronDevEnvironmentOptions {
  rootDir: string;
  homeDir: string;
  appDataDir: string;
  env: Readonly<Record<string, string | undefined>>;
}

function explicitOrDefault(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

export function resolveElectronDevEnvironment({
  rootDir,
  homeDir,
  appDataDir,
  env,
}: ResolveElectronDevEnvironmentOptions): ElectronDevEnvironment {
  const suffix = basename(rootDir).match(/-(\d+)$/)?.[1];
  const suffixToken = suffix ? `-${suffix}` : "";
  const appName = suffix ? `StockCraft Dev [${suffix}]` : "StockCraft Dev";
  const userDataName = suffix ? `StockCraft Dev ${suffix}` : "StockCraft Dev";

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
    CRAFT_VITE_PORT: explicitOrDefault(
      env.CRAFT_VITE_PORT,
      suffix ? `${suffix}173` : "5173",
    ),
  };
}
