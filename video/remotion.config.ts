import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";
import path from "node:path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideBundlerConfig((config) => {
  const tailwindConfig = enableTailwind(config);

  return {
    ...tailwindConfig,
    resolve: {
      ...tailwindConfig.resolve,
      alias: {
        ...(tailwindConfig.resolve?.alias ?? {}),
        "@": path.resolve(process.cwd(), "src"),
      },
    },
  };
});
