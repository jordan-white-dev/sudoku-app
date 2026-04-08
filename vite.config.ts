/// <reference types="vitest/config" />

import process from "node:process";
import babel from "@rolldown/plugin-babel";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type UserConfig } from "vite";
import checker from "vite-plugin-checker";

const CHAKRA_GROUP_REGEX = /node_modules[\\/](?:@chakra-ui|@emotion[\\/])/;
const TANSTACK_GROUP_REGEX = /node_modules[\\/]@tanstack[\\/]/;
const ICONS_GROUP_REGEX = /node_modules[\\/]react-icons[\\/]/;
const SUDOKU_GROUP_REGEX = /node_modules[\\/]sudoku[\\/]/;
const REACT_VENDOR_GROUP_REGEX = /node_modules[\\/](?:react|scheduler)[\\/]/;
const VENDOR_GROUP_REGEX = /node_modules/;

const chunkSplittingOutput = {
  codeSplitting: {
    groups: [
      { name: "chakra", test: CHAKRA_GROUP_REGEX, priority: 50 },
      { name: "tanstack", test: TANSTACK_GROUP_REGEX, priority: 40 },
      { name: "icons", test: ICONS_GROUP_REGEX, priority: 30 },
      { name: "sudoku", test: SUDOKU_GROUP_REGEX, priority: 25 },
      { name: "react-vendor", test: REACT_VENDOR_GROUP_REGEX, priority: 20 },
      { name: "vendor", test: VENDOR_GROUP_REGEX, priority: 10 },
    ],
  },
} as NonNullable<NonNullable<UserConfig["build"]>["rolldownOptions"]>["output"];

export default defineConfig(({ mode }) => {
  const isCheckDisabled = mode === "production" || Boolean(process.env.VITEST);

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      ...(mode === "development" ? [devtools()] : []),
      babel({
        presets: [reactCompilerPreset()],
      }),
      tanstackRouter({ autoCodeSplitting: true }),
      react(),
      ...(isCheckDisabled
        ? []
        : [
            checker({
              typescript: true,
            }),
          ]),
    ],
    build: {
      rolldownOptions: {
        output: chunkSplittingOutput,
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    test: {
      coverage: {
        provider: "v8",
        include: ["**/*test.{ts,tsx,js,jsx}"],
      },
      include: ["src/**/*.test.{ts,tsx}"],
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
        screenshotFailures: false,
      },
    },
  };
});
