import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/create", destination: "/carrier-master/create", permanent: false },
      { source: "/lookup", destination: "/carrier-master/lookup", permanent: false },
      { source: "/update", destination: "/carrier-master/update", permanent: false },
      { source: "/carriers", destination: "/carrier-master/carriers", permanent: false },
      { source: "/delete", destination: "/carrier-master/delete", permanent: false },
    ];
  },
};

export default nextConfig;
