require('../src/config/env');
const {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const configuredBucket = process.env.S3_BUCKET;

function makeClient(forcePathStyle) {
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

async function tryPut(client, bucket, label) {
  const key = `cardumen/qr/diag-${Date.now()}.txt`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from('cardumen-r2-test'),
        ContentType: 'text/plain',
      }),
    );
    console.log(`PUT_OK [${label}] bucket=${bucket} key=${key}`);
    return true;
  } catch (e) {
    console.log(
      `PUT_FAIL [${label}] bucket=${bucket} => ${e.name} ${e.message} status=${e.$metadata?.httpStatusCode}`,
    );
    return false;
  }
}

async function main() {
  console.log('endpoint=', endpoint);
  console.log('configuredBucket=', configuredBucket);
  console.log('accessKeyLen=', accessKeyId?.length, 'secretLen=', secretAccessKey?.length);

  for (const force of [true, false]) {
    const client = makeClient(force);
    console.log('\n--- forcePathStyle=', force, '---');
    try {
      const listed = await client.send(new ListBucketsCommand({}));
      const names = (listed.Buckets || []).map((b) => b.Name);
      console.log('buckets visibles:', names.length ? names.join(', ') : '(ninguno)');
    } catch (e) {
      console.log('ListBuckets FAIL:', e.name, e.message, e.$metadata?.httpStatusCode);
    }

    const candidates = [
      configuredBucket,
      'cardumen',
      'sistemafacturacion',
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    for (const bucket of candidates) {
      await tryPut(client, bucket, `pathStyle=${force}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
