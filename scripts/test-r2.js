require('../src/config/env');
const { uploadBuffer } = require('../src/services/s3Service');

async function main() {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const r = await uploadBuffer({
    buffer: png,
    contentType: 'image/png',
    originalName: 'test.png',
    folder: 'pagos/test',
  });
  console.log('UPLOAD_OK', r.url);
}

main().catch((e) => {
  console.error('FAIL', e.name, e.message);
  if (e.Code) console.error('Code', e.Code);
  if (e.$metadata) console.error('status', e.$metadata.httpStatusCode);
  console.error(e);
  process.exit(1);
});
