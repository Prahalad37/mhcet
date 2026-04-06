/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Enables `frontend/Dockerfile` production image (standalone server bundle). */
  output: "standalone",
  /** Helps some ESM packages (e.g. toasts) bundle cleanly with App Router. */
  transpilePackages: ["sonner"],
};

export default nextConfig;
