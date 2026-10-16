/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@hawl/shared"],
  eslint: { ignoreDuringBuilds: true }, // linting runs at the repo root (npm run lint)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // TODO (Maxamed Omer + Zacki, Day 6): add a strict Content-Security-Policy
        ],
      },
    ];
  },
};
export default nextConfig;
