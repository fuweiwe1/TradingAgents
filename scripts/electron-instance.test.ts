import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveElectronDevEnvironment } from "./electron-instance";

const context = {
  homeDir: "C:\\Users\\tester",
  appDataDir: "C:\\Users\\tester\\AppData\\Roaming",
};

describe("resolveElectronDevEnvironment", () => {
  test("uses isolated StockCraft Dev defaults for the base repository", () => {
    expect(
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents",
        ...context,
        env: {},
      }),
    ).toEqual({
      CRAFT_INSTANCE_ID: "stockcraft-dev",
      CRAFT_APP_NAME: "StockCraft Dev",
      CRAFT_CONFIG_DIR: join(context.homeDir, ".stockcraft-dev"),
      CRAFT_ELECTRON_USER_DATA_DIR: join(
        context.appDataDir,
        "StockCraft Dev",
      ),
      CRAFT_DEEPLINK_SCHEME: "stockcraft-dev",
      CRAFT_VITE_PORT: "5173",
    });
  });

  test("derives an independent numbered development instance", () => {
    expect(
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents-2",
        ...context,
        env: {},
      }),
    ).toEqual({
      CRAFT_INSTANCE_ID: "stockcraft-dev-2",
      CRAFT_APP_NAME: "StockCraft Dev [2]",
      CRAFT_CONFIG_DIR: join(context.homeDir, ".stockcraft-dev-2"),
      CRAFT_ELECTRON_USER_DATA_DIR: join(
        context.appDataDir,
        "StockCraft Dev 2",
      ),
      CRAFT_DEEPLINK_SCHEME: "stockcraft-dev-2",
      CRAFT_VITE_PORT: "2173",
    });
  });

  test("preserves each explicit identity field while filling every missing default", () => {
    const explicitValues = {
      CRAFT_INSTANCE_ID: "custom-instance",
      CRAFT_APP_NAME: "Custom App",
      CRAFT_CONFIG_DIR: "D:\\custom\\config",
      CRAFT_ELECTRON_USER_DATA_DIR: "D:\\custom\\user-data",
      CRAFT_DEEPLINK_SCHEME: "custom-scheme",
      CRAFT_VITE_PORT: "9000",
    };

    for (const [key, value] of Object.entries(explicitValues)) {
      const result = resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents-2",
        ...context,
        env: { [key]: value },
      });

      expect(result[key as keyof typeof result]).toBe(value);
      expect(Object.values(result).every((field) => field.length > 0)).toBe(
        true,
      );
    }
  });
});

describe("electron-dev launcher wiring", () => {
  const source = readFileSync(join(import.meta.dir, "electron-dev.ts"), "utf8");
  const mainSource = source.slice(source.indexOf("async function main"));

  test("applies and logs the complete instance environment before build work", () => {
    const loadEnvIndex = mainSource.indexOf("loadEnvFile()");
    const applyIndex = mainSource.indexOf("resolveElectronDevEnvironment(");
    const cleanIndex = mainSource.indexOf("cleanViteCache()");

    expect(loadEnvIndex).toBeGreaterThan(-1);
    expect(applyIndex).toBeGreaterThan(loadEnvIndex);
    expect(cleanIndex).toBeGreaterThan(applyIndex);
    expect(mainSource).toContain("CRAFT_INSTANCE_ID");
    expect(mainSource).toContain("CRAFT_CONFIG_DIR");
    expect(mainSource).toContain("CRAFT_ELECTRON_USER_DATA_DIR");
  });

  test("passes instance identity and Electron user data to Electron", () => {
    expect(source).toContain(
      "CRAFT_INSTANCE_ID: process.env.CRAFT_INSTANCE_ID",
    );
    expect(source).toContain(
      "CRAFT_ELECTRON_USER_DATA_DIR: process.env.CRAFT_ELECTRON_USER_DATA_DIR",
    );
  });

  test("can be imported without starting the development launcher", () => {
    expect(source).toContain("if (import.meta.main)");
  });
});
