
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    assetPrefix: './',
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Optional: set a different build directory.
    // distDir: 'build', 
};

module.exports = nextConfig;
