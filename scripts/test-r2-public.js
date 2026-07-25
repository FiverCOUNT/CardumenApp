require('../src/config/env');
const { uploadBuffer } = require('../src/services/s3Service');
const { s3 } = require('../src/config/env');

async function main() {
  console.log('bucket=', s3.bucket);
  console.log('publicBaseUrl=', s3.publicBaseUrl);
  console.log('folderQr=', s3.folderQr);
  console.log('folderMuestra=', s3.folderMuestra);

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const r = await uploadBuffer({
    buffer: png,
    contentType: 'image/png',
    originalName: 'probe.png',
    folder: s3.folderQr,
    prefix: 'qr',
  });
  console.log('uploaded=', r.url);

  const res = await fetch(r.url);
  console.log('public_http=', res.status, res.headers.get('content-type'));
}

main().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
