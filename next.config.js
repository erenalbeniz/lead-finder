/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "lead-finder";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : "",
  assetPrefix: isPages ? `/${repo}/` : "",
};

module.exports = nextConfig;
