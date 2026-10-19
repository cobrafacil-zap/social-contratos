/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Necessário para o upload de documentos de até 15 MB no cofre de contratos.
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};
export default nextConfig;
