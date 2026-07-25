require('dotenv').config();

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.DB_USER || '');
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const name = process.env.DB_NAME || '';

  return `mysql://${user}:${password}@${host}:${port}/${name}`;
}

process.env.DATABASE_URL = buildDatabaseUrl();

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    url: process.env.DATABASE_URL,
  },
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  /** Solo true si sirves el admin por HTTPS */
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  s3: {
    /** Cloudflare R2 / S3 compatible endpoint */
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || process.env.AWS_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId:
      process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey:
      process.env.S3_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
    acl: process.env.S3_ACL || '',
    /** Una sola carpeta para imágenes de configuración de pago */
    folderConfig: process.env.S3_FOLDER_CONFIG || 'config',
  },
};
