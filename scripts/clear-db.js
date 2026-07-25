require('../src/config/env');
const prisma = require('../src/lib/prisma');

async function main() {
  // Orden por FKs
  const recargas = await prisma.recarga.deleteMany();
  const ubicaciones = await prisma.ubicacion.deleteMany();
  const dispositivos = await prisma.dispositivo.deleteMany();
  const usuarios = await prisma.usuario.deleteMany();
  const pagos = await prisma.configuracionPago.deleteMany();

  console.log('Borrado:');
  console.log('- recargas:', recargas.count);
  console.log('- ubicaciones:', ubicaciones.count);
  console.log('- dispositivos:', dispositivos.count);
  console.log('- usuarios:', usuarios.count);
  console.log('- configuracion_pago:', pagos.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
