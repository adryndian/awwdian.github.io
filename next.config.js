/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hapus experimental.serverActions - sudah GA di Next.js 14
  experimental: {
    // Kosongkan atau isi dengan fitur experimental lain yang valid
  },
  
  // Konfigurasi image jika perlu
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Environment variables yang akan diexpose ke browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;
