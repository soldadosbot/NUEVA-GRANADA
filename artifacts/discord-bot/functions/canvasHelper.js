const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const QRCode = require("qrcode");

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function generarCedula(datos) {
  const { nombre, apellido, edad, nacionalidad, fechaNacimiento, numeroCedula, avatarURL, fechaEmision, fechaVencimiento } = datos;

  const W = 760, H = 480;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fondo degradado oscuro premium
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1117");
  bg.addColorStop(0.5, "#161b22");
  bg.addColorStop(1, "#0d1117");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Borde exterior dorado
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  // Borde interior sutil
  ctx.strokeStyle = "rgba(201,162,39,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // Franja superior
  const gradTop = ctx.createLinearGradient(0, 0, W, 0);
  gradTop.addColorStop(0, "#c9a227");
  gradTop.addColorStop(0.5, "#f5e272");
  gradTop.addColorStop(1, "#c9a227");
  ctx.fillStyle = gradTop;
  ctx.fillRect(8, 8, W - 16, 60);

  // Título en franja
  ctx.fillStyle = "#0d1117";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("🏙️ REPÚBLICA RP — DOCUMENTO DE IDENTIDAD OFICIAL", W / 2, 47);

  // Franja inferior
  ctx.fillStyle = gradTop;
  ctx.fillRect(8, H - 68, W - 16, 60);

  ctx.fillStyle = "#0d1117";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`N° ${numeroCedula}  •  Válido hasta: ${formatDate(fechaVencimiento)}  •  Documento Oficial del Estado`, W / 2, H - 30);

  // Foto avatar
  const fotoX = 40, fotoY = 90, fotoW = 160, fotoH = 200;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(fotoX, fotoY, fotoW, fotoH, 10);
  ctx.clip();
  try {
    const avatar = await loadImage(avatarURL + "?size=256");
    ctx.drawImage(avatar, fotoX, fotoY, fotoW, fotoH);
  } catch {
    ctx.fillStyle = "#2d333b";
    ctx.fillRect(fotoX, fotoY, fotoW, fotoH);
    ctx.fillStyle = "#c9a227";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.fillText("👤", fotoX + fotoW / 2, fotoY + fotoH / 2 + 20);
  }
  ctx.restore();

  // Marco foto
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(fotoX, fotoY, fotoW, fotoH, 10);
  ctx.stroke();

  // Foto label
  ctx.fillStyle = "#c9a227";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("FOTOGRAFÍA OFICIAL", fotoX + fotoW / 2, fotoY + fotoH + 18);

  // Línea separadora vertical
  ctx.strokeStyle = "rgba(201,162,39,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(220, 80);
  ctx.lineTo(220, H - 70);
  ctx.stroke();

  // Datos personales
  const campoX = 240;
  const campos = [
    ["APELLIDO(S)", apellido.toUpperCase()],
    ["NOMBRE(S)", nombre.toUpperCase()],
    ["NACIONALIDAD", nacionalidad.toUpperCase()],
    ["FECHA DE NACIMIENTO", formatDate(fechaNacimiento)],
    ["EDAD", `${edad} AÑOS`],
    ["FECHA DE EMISIÓN", formatDate(fechaEmision)],
  ];

  let offsetY = 100;
  for (const [label, valor] of campos) {
    ctx.fillStyle = "#c9a227";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(label, campoX, offsetY);

    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 17px Arial";
    ctx.fillText(valor, campoX, offsetY + 20);

    // Línea bajo el campo
    ctx.strokeStyle = "rgba(201,162,39,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(campoX, offsetY + 28);
    ctx.lineTo(560, offsetY + 28);
    ctx.stroke();

    offsetY += 52;
  }

  // QR Code
  const qrData = `CEDULA:${numeroCedula}|${nombre} ${apellido}|${nacionalidad}`;
  try {
    const qrBuffer = await QRCode.toBuffer(qrData, {
      width: 100,
      margin: 1,
      color: { dark: "#c9a227", light: "#0d1117" },
    });
    const qrImg = await loadImage(qrBuffer);
    ctx.drawImage(qrImg, 580, 100, 110, 110);
  } catch {}

  ctx.fillStyle = "#c9a227";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("QR VERIFICACIÓN", 635, 220);

  // Firma simulada
  ctx.fillStyle = "rgba(201,162,39,0.15)";
  ctx.fillRect(240, 390, 200, 40);
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 1;
  ctx.strokeRect(240, 390, 200, 40);

  ctx.fillStyle = "#c9a227";
  ctx.font = "italic bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("~  Firma Digital  ~", 340, 416);

  ctx.fillStyle = "#c9a227";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("FIRMA DEL TITULAR", 340, 437);

  // Holograma simulado
  ctx.save();
  ctx.globalAlpha = 0.12;
  const holGrad = ctx.createRadialGradient(650, 370, 10, 650, 370, 70);
  holGrad.addColorStop(0, "#ff0080");
  holGrad.addColorStop(0.3, "#00ff80");
  holGrad.addColorStop(0.6, "#0080ff");
  holGrad.addColorStop(1, "transparent");
  ctx.fillStyle = holGrad;
  ctx.beginPath();
  ctx.arc(650, 370, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(201,162,39,0.5)";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("◈ HOLOGRAMA DE SEGURIDAD", 650, 440);

  return canvas.toBuffer("image/png");
}

async function generarTarjetaVehiculo(datos) {
  const { placa, marca, modelo, color, propietario, avatarURL, fechaRegistro } = datos;

  const W = 700, H = 380;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0e1a");
  bg.addColorStop(1, "#1a2035");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Borde azul premium
  ctx.strokeStyle = "#5865f2";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Header
  const gradH = ctx.createLinearGradient(0, 0, W, 0);
  gradH.addColorStop(0, "#5865f2");
  gradH.addColorStop(1, "#4752c4");
  ctx.fillStyle = gradH;
  ctx.fillRect(6, 6, W - 12, 55);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("🚗 TARJETA DE REGISTRO VEHICULAR OFICIAL", W / 2, 40);

  // PLACA grande
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 90, 180, 90);
  ctx.strokeStyle = "#5865f2";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 90, 180, 90);

  ctx.fillStyle = "#1a2035";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(placa.toUpperCase(), 130, 148);

  ctx.fillStyle = "#5865f2";
  ctx.font = "bold 12px Arial";
  ctx.fillText("PLACA OFICIAL", 130, 170);

  // Datos vehículo
  const dX = 250;
  const campos = [
    ["MARCA", marca.toUpperCase()],
    ["MODELO", modelo.toUpperCase()],
    ["COLOR", color.toUpperCase()],
    ["PROPIETARIO", propietario],
    ["REGISTRO", formatDate(fechaRegistro)],
  ];

  let oY = 90;
  for (const [label, valor] of campos) {
    ctx.fillStyle = "#5865f2";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(label, dX, oY);

    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 16px Arial";
    ctx.fillText(valor, dX, oY + 18);

    ctx.strokeStyle = "rgba(88,101,242,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dX, oY + 25);
    ctx.lineTo(640, oY + 25);
    ctx.stroke();

    oY += 46;
  }

  // Footer
  ctx.fillStyle = "rgba(88,101,242,0.2)";
  ctx.fillRect(6, H - 50, W - 12, 44);
  ctx.fillStyle = "#5865f2";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`🏙️ Ministerio de Transporte RP • Documento Oficial • ${formatDate(new Date())}`, W / 2, H - 22);

  return canvas.toBuffer("image/png");
}

async function generarLicencia(datos) {
  const { nombre, apellido, categoria, fechaEmision, fechaVencimiento, numeroLicencia, avatarURL } = datos;

  const W = 680, H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f1923");
  bg.addColorStop(1, "#1a2d1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Borde verde
  ctx.strokeStyle = "#00d26a";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Header
  const gradH = ctx.createLinearGradient(0, 0, W, 0);
  gradH.addColorStop(0, "#00d26a");
  gradH.addColorStop(1, "#00a855");
  ctx.fillStyle = gradH;
  ctx.fillRect(6, 6, W - 12, 55);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("🚘 LICENCIA DE CONDUCCIÓN OFICIAL", W / 2, 40);

  // Foto
  const fX = 40, fY = 80, fW = 130, fH = 160;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(fX, fY, fW, fH, 8);
  ctx.clip();
  try {
    const avatar = await loadImage(avatarURL + "?size=256");
    ctx.drawImage(avatar, fX, fY, fW, fH);
  } catch {
    ctx.fillStyle = "#1a2d1a";
    ctx.fillRect(fX, fY, fW, fH);
  }
  ctx.restore();
  ctx.strokeStyle = "#00d26a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(fX, fY, fW, fH, 8);
  ctx.stroke();

  // Categoría grande
  const catColor = { A: "#ff6b35", B: "#00d26a", C: "#5865f2", D: "#ffd700" }[categoria] || "#00d26a";
  ctx.fillStyle = catColor;
  ctx.beginPath();
  ctx.arc(130, 270, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(categoria, 130, 283);
  ctx.fillStyle = catColor;
  ctx.font = "bold 11px Arial";
  ctx.fillText("CATEGORÍA", 130, 323);

  // Datos
  const dX = 200;
  const campos = [
    ["APELLIDO(S)", apellido.toUpperCase()],
    ["NOMBRE(S)", nombre.toUpperCase()],
    ["N° LICENCIA", numeroLicencia],
    ["EMISIÓN", formatDate(fechaEmision)],
    ["VENCIMIENTO", formatDate(fechaVencimiento)],
  ];

  let oY = 90;
  for (const [label, valor] of campos) {
    ctx.fillStyle = "#00d26a";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(label, dX, oY);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 17px Arial";
    ctx.fillText(valor, dX, oY + 20);

    ctx.strokeStyle = "rgba(0,210,106,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dX, oY + 28);
    ctx.lineTo(640, oY + 28);
    ctx.stroke();

    oY += 52;
  }

  // Categorías tabla
  const cats = ["A", "B", "C", "D"];
  let cX = 200;
  ctx.fillStyle = "#00d26a";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "left";
  ctx.fillText("HABILITADO PARA:", dX, 360);
  cX = dX;
  for (const c of cats) {
    const habilitada = c === categoria;
    ctx.fillStyle = habilitada ? catColor : "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(cX, 370, 45, 28, 5);
    ctx.fill();
    ctx.fillStyle = habilitada ? "#fff" : "rgba(255,255,255,0.3)";
    ctx.font = `bold 16px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(c, cX + 22, 389);
    cX += 55;
  }

  // Footer
  ctx.fillStyle = "rgba(0,210,106,0.15)";
  ctx.fillRect(6, H - 44, W - 12, 38);
  ctx.fillStyle = "#00d26a";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`🏙️ Dirección de Tránsito RP • Documento Oficial • ${formatDate(new Date())}`, W / 2, H - 18);

  return canvas.toBuffer("image/png");
}

module.exports = { generarCedula, generarTarjetaVehiculo, generarLicencia };
