require('../src/config/env');
const fs = require('fs');
const path = require('path');
const { s3 } = require('../src/config/env');

async function main() {
  console.log('folderConfig=', s3.folderConfig);

  // login
  const login = await fetch('http://localhost:5000/admin/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.ADMIN_USER,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const loginBody = await login.json();
  console.log('login', login.status, loginBody);
  const cookie = login.headers.getSetCookie?.()?.[0] || login.headers.get('set-cookie');
  if (!cookie) throw new Error('sin cookie');

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const tmp = path.join(__dirname, 'tmp-qr.png');
  fs.writeFileSync(tmp, png);

  const fd = new FormData();
  fd.append('numero', '999999999');
  fd.append('titular', 'Cardumen');
  fd.append('metodo', 'yape');
  fd.append('activo', 'true');
  fd.append('qr', new Blob([png], { type: 'image/png' }), 'qr.png');

  const save = await fetch('http://localhost:5000/admin/api/pago', {
    method: 'PUT',
    headers: { Cookie: cookie.split(';')[0] },
    body: fd,
  });
  const saved = await save.json();
  console.log('save', save.status, JSON.stringify(saved, null, 2));

  if (!save.ok) process.exit(1);

  const mediaUrl = saved.pago?.imagenQrUrl;
  const media = await fetch(mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:5000${mediaUrl}`);
  console.log('media', media.status, media.headers.get('content-type'));

  fs.unlinkSync(tmp);
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
