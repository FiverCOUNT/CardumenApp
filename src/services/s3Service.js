const { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const { s3 } = require('../config/env');

let client;

function getClient() {
  if (!s3.bucket || !s3.accessKeyId || !s3.secretAccessKey) {
    const err = new Error(
      'S3/R2 no configurado. Completa S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET y S3_ENDPOINT en .env',
    );
    err.status = 500;
    throw err;
  }

  if (!client) {
    const config = {
      region: s3.region || 'auto',
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
      // Evita 403 con Cloudflare R2 (checksums AWS SDK recientes)
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };

    // Cloudflare R2 / MinIO / etc.
    if (s3.endpoint) {
      config.endpoint = s3.endpoint;
      // Por defecto path-style en R2 (más compatible)
      config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
    }

    client = new S3Client(config);
  }
  return client;
}

function publicUrlForKey(key) {
  if (s3.publicBaseUrl) {
    return `${s3.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  if (s3.endpoint) {
    return `${s3.endpoint.replace(/\/$/, '')}/${s3.bucket}/${key}`;
  }
  return `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${key}`;
}

/**
 * Extrae la key de una URL guardada en DB (R2 path-style, public base, o key directa).
 */
function keyFromStoredUrl(stored) {
  if (!stored) return null;
  const value = String(stored).trim();
  if (!value) return null;

  // URLs del proxy de la API no son keys de R2
  if (/\/api\/pago\/media\//i.test(value)) {
    return null;
  }

  // Ya es una key relativa
  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '');
  }

  try {
    const u = new URL(value);
    let pathname = decodeURIComponent(u.pathname || '').replace(/^\/+/, '');

    // path-style: /bucket/key...
    if (s3.bucket && pathname.startsWith(`${s3.bucket}/`)) {
      pathname = pathname.slice(s3.bucket.length + 1);
    }

    // public base: https://cdn/.../key
    if (s3.publicBaseUrl) {
      try {
        const basePath = new URL(s3.publicBaseUrl).pathname.replace(/^\/+|\/+$/g, '');
        if (basePath && pathname.startsWith(`${basePath}/`)) {
          pathname = pathname.slice(basePath.length + 1);
        }
      } catch (_) {
        // ignore
      }
    }

    return pathname || null;
  } catch (_) {
    return null;
  }
}

async function getObjectByKey(key) {
  const cleanKey = String(key || '').replace(/^\/+/, '');
  if (!cleanKey) {
    const err = new Error('key de imagen requerida');
    err.status = 400;
    throw err;
  }

  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: s3.bucket,
      Key: cleanKey,
    }),
  );

  return {
    body: result.Body,
    contentType: result.ContentType || 'application/octet-stream',
    contentLength: result.ContentLength,
  };
}

async function pingBucket() {
  await getClient().send(new HeadBucketCommand({ Bucket: s3.bucket }));
  return true;
}

/**
 * Sube un buffer/archivo a S3/R2 y devuelve la URL pública.
 * Crea "subcarpetas" virtuales con el prefijo folder (ej. cardumen/qr).
 */
async function uploadBuffer({
  buffer,
  contentType,
  originalName,
  folder = 'cardumen',
  prefix = 'file',
}) {
  const ext = path.extname(originalName || '').toLowerCase() || '.png';
  const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)
    ? ext
    : '.png';
  const cleanFolder = String(folder || 'cardumen').replace(/^\/+|\/+$/g, '');
  const key = `${cleanFolder}/${prefix}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}${safeExt}`;

  const params = {
    Bucket: s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  };
  // R2 no usa ACL como AWS; solo aplicar si está definido
  if (s3.acl) {
    params.ACL = s3.acl;
  }

  await getClient().send(new PutObjectCommand(params));

  return {
    key,
    url: publicUrlForKey(key),
  };
}

module.exports = {
  uploadBuffer,
  publicUrlForKey,
  keyFromStoredUrl,
  getObjectByKey,
  pingBucket,
};
