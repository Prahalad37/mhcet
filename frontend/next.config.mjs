/** @type {import('next').NextConfig} */
const useWebpackWatchTweaks = process.env.NEXT_WEBPACK_WATCH === "1";

const nextConfig = {
  /** Enables `frontend/Dockerfile` production image (standalone server bundle). */
  output: "standalone",
  /** Helps some ESM packages bundle cleanly with App Router. */
  transpilePackages: ["sonner", "recharts"],

  /**
   * When `NEXT_WEBPACK_WATCH=1` (default `npm run dev`; `dev:webpack` is an alias).
   * Default `next dev --turbo` ignores webpack; omitting `webpack` avoids the
   * "Webpack is configured while Turbopack is not" warning.
   *
   * With `WATCHPACK_POLLING=1` (macOS file-limit workaround), avoid watching `.next`
   * output — otherwise each compile writes there and retriggers an endless rebuild loop.
   */
  ...(useWebpackWatchTweaks
    ? {
        webpack: (config, { dev }) => {
          if (dev) {
            config.watchOptions = {
              ...config.watchOptions,
              ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
            };
          }
          return config;
        },
      }
    : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
