/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Enables `frontend/Dockerfile` production image (standalone server bundle). */
  output: "standalone",
  /** Helps some ESM packages (e.g. toasts) bundle cleanly with App Router. */
  transpilePackages: ["sonner"],

  /**
   * With `WATCHPACK_POLLING=1` (macOS file-limit workaround), avoid watching `.next`
   * output — otherwise each compile writes there and retriggers an endless rebuild loop.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
