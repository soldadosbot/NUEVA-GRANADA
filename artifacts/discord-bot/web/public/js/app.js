let currentPage = "dashboard";

const pages = {
  dashboard: { title: "Dashboard", sub: "Resumen general del servidor" },
  usuarios: { title: "Usuarios", sub: "Ciudadanos registrados con cédula" },
  banco: { title: "Banco", sub: "Ranking de riqueza y economía RP" },
  vehiculos: { title: "Vehículos", sub: "Registro vehicular oficial" },
  licencias: { title: "Licencias", sub: "Licencias de conducción emitidas" },
  logs: { title: "Logs del Sistema", sub: "Registro de actividad en tiempo real" },
};

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("es-ES");
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });
  document.getElementById("pageTitle").textContent = pages[page].title;
  document.getElementById("pageSub").textContent = pages[page].sub;
  loadCurrentPage();
}

function loadCurrentPage() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `<div class="loader"><div class="spinner"></div> Cargando datos...</div>`;
  const loaders = { dashboard, usuarios, banco, vehiculos, licencias, logs };
  loaders[currentPage]();
}

async function dashboard() {
  const [stats, servidor] = await Promise.all([
    fetch("/api/stats").then((r) => r.json()),
    fetch("/api/servidor").then((r) => r.json()),
  ]);

  const online = stats.servidor === "abierto";
  const dot = document.querySelector(".status-dot");
  const txt = document.getElementById("serverStatusText");
  dot.className = "status-dot " + (online ? "online" : "offline");
  txt.textContent = online ? "SERVIDOR ONLINE" : "SERVIDOR OFFLINE";

  document.getElementById("pageContent").innerHTML = `
    <div class="status-card">
      <div class="status-indicator ${online ? "online" : "offline"}"></div>
      <div class="status-info">
        <h3>Estado del Servidor: ${online ? "🟢 ABIERTO" : "🔴 CERRADO"}</h3>
        <p>${online
          ? `Jugadores activos: ${stats.jugadores} • Apertura: ${stats.ultimaApertura ? new Date(stats.ultimaApertura).toLocaleString("es-ES") : "N/A"}`
          : `Último cierre: ${stats.ultimoCierre ? new Date(stats.ultimoCierre).toLocaleString("es-ES") : "N/A"}`}</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${stats.totalUsuarios}</div>
        <div class="stat-label">CIUDADANOS REGISTRADOS</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚗</div>
        <div class="stat-value">${stats.totalVehiculos}</div>
        <div class="stat-label">VEHÍCULOS REGISTRADOS</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚘</div>
        <div class="stat-value">${stats.totalLicencias}</div>
        <div class="stat-label">LICENCIAS EMITIDAS</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${fmt(stats.totalDineroCirculacion)}</div>
        <div class="stat-label">DINERO EN CIRCULACIÓN</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🗳️</div>
        <div class="stat-value">${stats.totalVotaciones}</div>
        <div class="stat-label">VOTACIONES REALIZADAS</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎮</div>
        <div class="stat-value">${stats.jugadores}</div>
        <div class="stat-label">CAPACIDAD JUGADORES</div>
      </div>
    </div>
  `;
}

async function usuarios() {
  const data = await fetch("/api/usuarios").then((r) => r.json());
  document.getElementById("pageContent").innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>👥 Ciudadanos Registrados</h3>
        <span class="table-count">${data.length} usuarios</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Ciudadano</th><th>N° Cédula</th><th>Edad</th><th>Nac.</th>
            <th>Efectivo</th><th>Banco</th><th>Total</th><th>Licencia</th><th>Vehículos</th>
          </tr>
        </thead>
        <tbody>
          ${data.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Sin usuarios registrados</td></tr>` :
            data.map((u, i) => `
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px">
                <img src="${u.avatar}" style="width:32px;height:32px;border-radius:50%;border:2px solid rgba(201,162,39,0.3)" onerror="this.style.display='none'" />
                <div>
                  <div style="font-weight:600">${u.nombre}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${u.discordTag}</div>
                </div>
              </div></td>
              <td><code style="background:rgba(201,162,39,0.1);color:var(--gold);padding:2px 8px;border-radius:4px">${u.cedula}</code></td>
              <td>${u.edad} años</td>
              <td>${u.nacionalidad}</td>
              <td style="color:var(--green)">${fmt(u.efectivo)}</td>
              <td style="color:var(--cyan)">${fmt(u.banco)}</td>
              <td style="font-weight:700;color:var(--gold)">${fmt(u.total)}</td>
              <td>${u.licencia ? `<span class="badge badge-green">Cat. ${u.licencia}</span>` : `<span style="color:var(--text-muted)">—</span>`}</td>
              <td>${u.vehiculos > 0 ? `<span class="badge badge-blue">${u.vehiculos} 🚗</span>` : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function banco() {
  const data = await fetch("/api/banco").then((r) => r.json());
  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  document.getElementById("pageContent").innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>🏆 Ranking de Riqueza</h3>
        <span class="table-count">Top ${data.length}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Ciudadano</th><th>Efectivo</th><th>Banco</th><th>Patrimonio Total</th></tr></thead>
        <tbody>
          ${data.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Sin datos</td></tr>` :
            data.map((r, i) => `
            <tr>
              <td style="font-size:18px">${medals[i] || (i+1)}</td>
              <td style="font-weight:600">${r.nombre}</td>
              <td style="color:var(--green)">${fmt(r.efectivo)}</td>
              <td style="color:var(--cyan)">${fmt(r.banco)}</td>
              <td><span style="font-size:16px;font-weight:800;color:var(--gold)">${fmt(r.total)}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function vehiculos() {
  const data = await fetch("/api/vehiculos").then((r) => r.json());
  document.getElementById("pageContent").innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>🚗 Registro Vehicular</h3>
        <span class="table-count">${data.length} vehículos</span>
      </div>
      <table>
        <thead><tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Color</th><th>Propietario</th><th>Registro</th></tr></thead>
        <tbody>
          ${data.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Sin vehículos</td></tr>` :
            data.map((v) => `
            <tr>
              <td><code style="background:rgba(88,101,242,0.15);color:var(--blue);padding:3px 10px;border-radius:6px;font-weight:700">${v.placa}</code></td>
              <td>${v.marca}</td><td>${v.modelo}</td><td>${v.color}</td>
              <td style="font-weight:500">${v.propietario}</td>
              <td style="color:var(--text-muted)">${new Date(v.fechaRegistro).toLocaleDateString("es-ES")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function licencias() {
  const data = await fetch("/api/licencias").then((r) => r.json());
  const catColor = { A: "badge-red", B: "badge-green", C: "badge-blue", D: "badge-gold" };
  document.getElementById("pageContent").innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>🚘 Licencias de Conducción</h3>
        <span class="table-count">${data.length} licencias</span>
      </div>
      <table>
        <thead><tr><th>N° Licencia</th><th>Titular</th><th>Categoría</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th></tr></thead>
        <tbody>
          ${data.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Sin licencias</td></tr>` :
            data.map((l) => {
              const ven = new Date(l.fechaVencimiento);
              const vigente = ven > new Date();
              return `<tr>
                <td><code style="font-size:12px;color:var(--text-muted)">${l.numeroLicencia}</code></td>
                <td style="font-weight:600">${l.nombre} ${l.apellido}</td>
                <td><span class="badge ${catColor[l.categoria] || 'badge-gold'}">Categoría ${l.categoria}</span></td>
                <td>${new Date(l.fechaEmision).toLocaleDateString("es-ES")}</td>
                <td>${ven.toLocaleDateString("es-ES")}</td>
                <td><span class="badge ${vigente ? "badge-green" : "badge-red"}">${vigente ? "VIGENTE" : "VENCIDA"}</span></td>
              </tr>`;
            }).join("")}
        </tbody>
      </table>
    </div>`;
}

async function logs() {
  const data = await fetch("/api/logs").then((r) => r.json());
  const tipoColor = { CEDULA:"badge-gold",VEHICULO:"badge-blue",LICENCIA:"badge-green",BANCO:"badge-green",VOTACION:"badge-blue",SERVIDOR:"badge-red",ERROR:"badge-red",MIEMBRO:"badge-blue",SALARIO:"badge-gold" };
  document.getElementById("pageContent").innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>📋 Logs del Sistema</h3>
        <span class="table-count">${data.length} entradas</span>
      </div>
      ${data.length === 0 ? `<div class="empty-state"><div class="empty-icon">📋</div><h3>Sin logs</h3><p>No hay actividad registrada aún.</p></div>` :
        data.map((l) => `
        <div class="log-entry">
          <span class="log-time">${l.timestamp}</span>
          <span class="log-tipo"><span class="badge ${tipoColor[l.tipo] || 'badge-blue'}">${l.tipo}</span></span>
          <div>
            <div class="log-accion">${l.accion} — <span style="color:var(--text-muted);font-weight:400">${l.usuario}</span></div>
            ${l.detalle ? `<div class="log-detalle">${l.detalle}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>`;
}

// Navigation
document.querySelectorAll(".nav-item").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// Clock
function updateTime() {
  document.getElementById("topbarTime").textContent = new Date().toLocaleString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric"
  });
}
updateTime();
setInterval(updateTime, 1000);

// Auto-refresh every 30s
setInterval(() => { loadCurrentPage(); }, 30000);

// Init
loadCurrentPage();
