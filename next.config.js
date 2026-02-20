const path = require("path");

// Always use this directory (where next.config.js lives) as project root,
// so resolution doesn't use /Users/pohuliailo or Desktop/Projects
const projectRoot = __dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: { root: projectRoot },
  webpack: (config) => {
    config.context = projectRoot;
    config.resolve = config.resolve ?? {};
    config.resolve.modules = [path.join(projectRoot, "node_modules"), ...(config.resolve.modules || [])];
    return config;
  },
};

module.exports = nextConfig;
