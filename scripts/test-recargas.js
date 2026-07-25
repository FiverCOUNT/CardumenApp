require('../src/config/env');

async function hit(name, body) {
  const r = await fetch('http://localhost:5000/api/recargas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  console.log(name, '=>', r.status, text);
}

async function main() {
  await hit('sin dni', { monto_pago: 10 });
  await hit('dni inexistente', {
    monto_pago: 10,
    dni: '00000000',
    numero_operacion: `T-${Date.now()}`,
  });
  await hit('monto invalido', { monto_pago: 0, dni: '74895426' });

  const tun = await fetch(
    'https://encouraging-unity-tours-align.trycloudflare.com/api/recargas',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto_pago: 5,
        dni: '00000000',
        numero_operacion: `TUN-${Date.now()}`,
      }),
    },
  );
  console.log('tunel =>', tun.status, await tun.text());
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
