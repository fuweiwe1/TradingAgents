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
      CRAFT_INSTANCE_NUMBER: "2",
    });
  });

  test("preserves an explicit instance number for the base repository", () => {
    expect(
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents",
        ...context,
        env: { CRAFT_INSTANCE_NUMBER: "custom-number" },
      }).CRAFT_INSTANCE_NUMBER,
    ).toBe("custom-number");
  });

  test("maps numbered instances without colliding with the base port", () => {
    const expectedPorts = new Map([
      [1, "1173"],
      [4, "4173"],
      [5, "20005"],
      [66, "20066"],
    ]);

    for (const [instanceNumber, expectedPort] of expectedPorts) {
      expect(
        resolveElectronDevEnvironment({
          rootDir: `C:\\craft_agents-${instanceNumber}`,
          ...context,
          env: {},
        }).CRAFT_VITE_PORT,
      ).toBe(expectedPort);
    }
  });

  test("keeps every accepted numbered instance port unique and in range", () => {
    const ports = new Set<number>();

    for (let instanceNumber = 1; instanceNumber <= 45535; instanceNumber++) {
      const port = Number(
        resolveElectronDevEnvironment({
          rootDir: `C:\\craft_agents-${instanceNumber}`,
          ...context,
          env: {},
        }).CRAFT_VITE_PORT,
      );

      expect(port).toBeGreaterThanOrEqual(1);
      expect(port).toBeLessThanOrEqual(65535);
      expect(ports.has(port)).toBe(false);
      ports.add(port);
    }

    expect(ports.size).toBe(45535);
  });

  test("rejects ambiguous leading-zero numbered instance suffixes", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents-01",
        ...context,
        env: {},
      }),
    ).toThrow(/leading zero.*use.*-1/i);
  });

  test("rejects numbered instance zero", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents-0",
        ...context,
        env: {},
      }),
    ).toThrow(/greater than zero.*remove.*-0/i);
  });

  test("rejects numbered instance suffixes above the supported port range", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents-45536",
        ...context,
        env: {},
      }),
    ).toThrow(/45535.*choose.*smaller/i);
  });

  test("rejects explicit Vite ports containing shell metacharacters", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents",
        ...context,
        env: { CRAFT_VITE_PORT: "5173 & echo bad" },
      }),
    ).toThrow(/CRAFT_VITE_PORT.*ASCII decimal digits/i);
  });

  test("rejects explicit Vite port zero", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents",
        ...context,
        env: { CRAFT_VITE_PORT: "0" },
      }),
    ).toThrow(/CRAFT_VITE_PORT.*between 1 and 65535/i);
  });

  test("rejects explicit Vite ports above 65535", () => {
    expect(() =>
      resolveElectronDevEnvironment({
        rootDir: "C:\\craft_agents",
        ...context,
        env: { CRAFT_VITE_PORT: "65536" },
      }),
    ).toThrow(/CRAFT_VITE_PORT.*between 1 and 65535/i);
  });

  test("preserves each explicit identity field while filling every missing default", () => {
    const explicitValues = {
      CRAFT_INSTANCE_ID: "custom-instance",
      CRAFT_APP_NAME: "Custom App",
      CRAFT_CONFIG_DIR: "D:\\custom\\config",
      CRAFT_ELECTRON_USER_DATA_DIR: "D:\\custom\\user-data",
      CRAFT_DEEPLINK_SCHEME: "custom-scheme",
      CRAFT_VITE_PORT: "9000",
      CRAFT_INSTANCE_NUMBER: "custom-number",
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
    expect(source).toContain("...process.env as Record<string, string>");
    expect(source).not.toContain(
      'CRAFT_INSTANCE_NUMBER: process.env.CRAFT_INSTANCE_NUMBER || ""',
    );
  });

  test("can be imported without starting the development launcher", () => {
    expect(source).toContain("if (import.meta.main)");
  });
});
