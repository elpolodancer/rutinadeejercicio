/* ---------- Navegación entre pantallas ---------- */
const vistas = {
  inicio: document.getElementById("vista-inicio"),
  calendario: document.getElementById("vista-calendario"),
  ejercicios: document.getElementById("vista-ejercicios")
};

function irA(nombre) {
  Object.entries(vistas).forEach(([clave, vista]) => {
    vista.hidden = clave !== nombre;
  });
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-ir]").forEach(boton => {
  boton.addEventListener("click", () => irA(boton.dataset.ir));
});

/* ---------- Conexión con Google Sheets (Apps Script) ---------- */
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwmgBQlQG18xXdwlkrVuKVx3vGWCGYg_3sRlz4kvFv1pTZhenqk0puI8KYexOrDGiY/exec";   // URL de la aplicación web de Apps Script

/* ---------- Administradores ---------- */
/* Solo estas cuentas de Google pueden ver y editar los ejercicios.
   La lista que de verdad protege la hoja está en Codigo.gs (ADMINISTRADORES): deben coincidir. */
const ADMINISTRADORES = [
  "dulceprincesa086@gmail.com",
  "polo.pericoperico55@gmail.com"
];

let usuario = null;

function esAdmin(u) {
  return !!u && u.emailVerified === true && ADMINISTRADORES.includes(String(u.email || "").toLowerCase());
}

function puedeEditar() {
  return esAdmin(usuario);
}

/* ---------- Ejercicios ---------- */
/* columna y clave: dónde se guarda cada ejercicio en la hoja.
   tipo: "cantidad" (número), "tiempo" (minutos:segundos) o "texto" (lista de canciones) */
const ejercicios = [
  { nombre: "Baile", columna: "Baile", clave: "Baile", tipo: "texto" },
  { nombre: "Lagartijas", columna: "Principales", clave: "Lagartijas", tipo: "cantidad" },
  { nombre: "Sentadillas", columna: "Principales", clave: "Sentadillas", tipo: "cantidad" },
  { nombre: "Abdominales", columna: "Principales", clave: "Abdominales", tipo: "cantidad" },
  { nombre: "Barra 1 Levantamiento Vertical de Pie", columna: "Barra", clave: "1", tipo: "cantidad" },
  { nombre: "Barra 2 Levantamiento Vertical sobre Espalda de Pie", columna: "Barra", clave: "2", tipo: "cantidad" },
  { nombre: "Barra 3 Sentadilla con Barra", columna: "Barra", clave: "3", tipo: "cantidad" },
  { nombre: "Barra 4 Bombeo Inferior Inclinado", columna: "Barra", clave: "4", tipo: "cantidad" },
  { nombre: "Barra 5 Acostado", columna: "Barra", clave: "5", tipo: "cantidad" },
  { nombre: "Sentadilla con Barra", columna: "Principales", clave: "Sentadilla con Barra", tipo: "cantidad" },
  { nombre: "Plancha", columna: "Principales", clave: "Plancha", tipo: "tiempo" },
  { nombre: "Salto de Tijera", columna: "Principales", clave: "Saltos de Tijera", tipo: "cantidad" }
];

const PREGUNTAS = {
  cantidad: "¿Cuántas veces lo has hecho?",
  tiempo: "¿Cuánto tiempo aguantaste? Escríbelo como minutos:segundos.",
  texto: "¿Qué canciones bailaste? Sepáralas con /."
};

const contenedor = document.getElementById("botones");
const actual = document.getElementById("actual");
const etiquetasValor = {};

function dos(n) {
  return String(n).padStart(2, "0");
}

function fechaTexto() {
  const d = new Date();
  return dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + "/" + d.getFullYear();
}

/* Registro del día: se guarda en este dispositivo y se envía a la hoja */
const CLAVE_DIA = "rutina-hoy";
let estadoDia = leerDiaLocal();

function leerDiaLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_DIA));
    if (d && d.fecha === fechaTexto() && d.valores) return d;
  } catch (e) { /* sin datos guardados */ }
  return { fecha: fechaTexto(), valores: {} };
}

function guardarDiaLocal() {
  try {
    localStorage.setItem(CLAVE_DIA, JSON.stringify(estadoDia));
  } catch (e) { /* si el navegador no deja guardar, solo dura mientras la página esté abierta */ }
}

/* Si cambió el día con la página abierta, empieza un registro nuevo */
function asegurarDia() {
  if (estadoDia.fecha === fechaTexto()) return;
  estadoDia = { fecha: fechaTexto(), valores: {} };
  guardarDiaLocal();
  pintarTodos();
  cargarDesdeHoja();
}

function textoValor(ej, v) {
  if (v === undefined || v === null || v === "") return "";
  if (ej.tipo === "cantidad") return v + (v === 1 ? " vez" : " veces");
  if (ej.tipo === "tiempo") return v + " min";
  const n = v.split("/").length;
  return n + (n === 1 ? " canción" : " canciones");
}

function valorParaHoja(ej, v) {
  if (v === null || v === undefined) return "";
  if (ej.tipo === "cantidad") return dos(v);
  if (ej.tipo === "tiempo") return v + "mns";
  return v;
}

function pintar(ej) {
  /* sin permiso no se muestran los datos guardados en este dispositivo */
  etiquetasValor[ej.nombre].textContent = puedeEditar() ? textoValor(ej, estadoDia.valores[ej.nombre]) : "";
}

function pintarTodos() {
  ejercicios.forEach(pintar);
}

/* Llamadas al Apps Script: se envía el token de la sesión de Google y el script comprueba que sea administrador */
async function llamarScript(parametros) {
  if (!window.rutinaAuth) throw new Error("el inicio de sesión no está disponible");
  const idToken = await window.rutinaAuth.obtenerToken();
  const respuesta = await fetch(URL_SCRIPT, {
    method: "POST",
    body: JSON.stringify(Object.assign({ idToken }, parametros))
  }).catch(() => { throw new Error("no hay conexión con el script"); });
  const texto = await respuesta.text();
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (e) {
    throw new Error("respuesta no válida; revisa la URL y que el acceso sea «Cualquier persona»");
  }
  if (!datos.ok) throw new Error(datos.error || "error en la hoja");
  return datos;
}

function valorDeHoja(ej, col) {
  if (col === undefined || col === null || col === "") return null;
  if (ej.tipo === "texto") return typeof col === "string" && col.trim() ? col.trim() : null;
  if (typeof col !== "object") return null;
  const llave = Object.keys(col).find(k => k.toLowerCase() === ej.clave.toLowerCase());
  if (llave === undefined) return null;
  const crudo = String(col[llave]);
  if (ej.tipo === "cantidad") {
    const n = parseInt(crudo, 10);
    return n > 0 ? n : null;
  }
  const m = /^(\d{1,2}):([0-5]\d)/.exec(crudo);
  return m ? dos(m[1]) + ":" + m[2] : null;
}

function cargarDesdeHoja() {
  if (!URL_SCRIPT || !puedeEditar()) return;
  const fecha = estadoDia.fecha;
  llamarScript({ accion: "leer", fecha })
    .then(datos => {
      if (fecha !== estadoDia.fecha) return;
      const columnas = datos.columnas || {};
      ejercicios.forEach(ej => {
        const v = valorDeHoja(ej, columnas[ej.columna]);
        if (v !== null) estadoDia.valores[ej.nombre] = v;
      });
      guardarDiaLocal();
      pintarTodos();
    })
    .catch(e => {
      actual.textContent = "No se pudo leer la hoja (" + e.message + ").";
    });
}

/* Submenú */
const submenu = document.getElementById("submenu");
const subTitulo = document.getElementById("sub-titulo");
const subPregunta = document.getElementById("sub-pregunta");
const subError = document.getElementById("sub-error");
const bloques = {
  cantidad: document.getElementById("bloque-cantidad"),
  tiempo: document.getElementById("bloque-tiempo"),
  texto: document.getElementById("bloque-texto")
};
const campoCantidad = document.getElementById("cantidad");
const campoTiempo = document.getElementById("tiempo");
const campoCanciones = document.getElementById("canciones");
let ejercicioAbierto = null;

function leerCampo() {
  const n = Math.floor(Number(campoCantidad.value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* Lee lo escrito en el submenú: { valor } o { error } (valor null = borrar) */
function leerEntrada(ej) {
  if (ej.tipo === "cantidad") {
    const n = leerCampo();
    return { valor: n > 0 ? n : null };
  }
  if (ej.tipo === "tiempo") {
    const t = campoTiempo.value.trim();
    if (t === "") return { valor: null };
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(t);
    if (!m) return { error: "Escribe el tiempo como minutos:segundos, por ejemplo 1:30." };
    const v = dos(m[1]) + ":" + m[2];
    return { valor: v === "00:00" ? null : v };
  }
  const lista = campoCanciones.value.split(/[\/\n]/).map(s => s.trim()).filter(Boolean);
  return { valor: lista.length ? lista.join(" / ") : null };
}

function abrirSubmenu(ej) {
  if (!puedeEditar()) {
    actual.textContent = usuario
      ? "Esta cuenta no tiene permiso para editar los ejercicios."
      : "Inicia sesión con Google (en la pantalla principal) para editar los ejercicios.";
    return;
  }
  asegurarDia();
  ejercicioAbierto = ej;
  subTitulo.textContent = ej.nombre;
  subPregunta.textContent = PREGUNTAS[ej.tipo];
  subError.textContent = "";
  Object.keys(bloques).forEach(tipo => { bloques[tipo].hidden = tipo !== ej.tipo; });
  const v = estadoDia.valores[ej.nombre];
  campoCantidad.value = ej.tipo === "cantidad" ? (v || 0) : 0;
  campoTiempo.value = ej.tipo === "tiempo" ? (v || "") : "";
  campoCanciones.value = ej.tipo === "texto" ? (v || "") : "";
  submenu.showModal();
}

function guardarEjercicio() {
  if (!puedeEditar()) {
    submenu.close();
    return;
  }
  const ej = ejercicioAbierto;
  const entrada = leerEntrada(ej);
  if (entrada.error) {
    subError.textContent = entrada.error;
    return;
  }
  asegurarDia();
  const fecha = estadoDia.fecha;
  if (entrada.valor === null) delete estadoDia.valores[ej.nombre];
  else estadoDia.valores[ej.nombre] = entrada.valor;
  guardarDiaLocal();
  pintar(ej);
  submenu.close();

  const resumen = ej.nombre + ": " + (textoValor(ej, entrada.valor) || "sin registro");
  if (!URL_SCRIPT) {
    actual.textContent = resumen + " · guardado solo en este dispositivo (falta conectar la hoja)";
    return;
  }
  actual.textContent = resumen + " · guardando en la hoja…";
  llamarScript({
    accion: "guardar",
    fecha,
    columna: ej.columna,
    clave: ej.clave,
    valor: valorParaHoja(ej, entrada.valor)
  })
    .then(() => { actual.textContent = resumen + " · guardado en la hoja"; })
    .catch(e => {
      actual.textContent = resumen + " · no se pudo guardar en la hoja (" + e.message + "). Quedó en este dispositivo.";
    });
}

document.getElementById("menos").addEventListener("click", () => {
  campoCantidad.value = Math.max(0, leerCampo() - 1);
});
document.getElementById("mas").addEventListener("click", () => {
  campoCantidad.value = leerCampo() + 1;
});
document.getElementById("guardar").addEventListener("click", guardarEjercicio);
document.getElementById("cancelar").addEventListener("click", () => submenu.close());
[campoCantidad, campoTiempo].forEach(campo => {
  campo.addEventListener("keydown", e => {
    if (e.key === "Enter") guardarEjercicio();
  });
});
/* Tocar fuera del cuadro lo cierra */
submenu.addEventListener("click", e => {
  if (e.target === submenu) submenu.close();
});

/* Botones de ejercicios */
ejercicios.forEach(ej => {
  const boton = document.createElement("button");
  boton.type = "button";

  const etiquetaNombre = document.createElement("span");
  etiquetaNombre.textContent = ej.nombre;

  const etiquetaValor = document.createElement("span");
  etiquetaValor.className = "cuenta";
  etiquetasValor[ej.nombre] = etiquetaValor;

  boton.append(etiquetaNombre, etiquetaValor);
  boton.addEventListener("click", () => abrirSubmenu(ej));
  contenedor.appendChild(boton);
});

pintarTodos();

/* ---------- Sesión de Google ---------- */
const sesionEstado = document.getElementById("sesion-estado");
const btnSesion = document.getElementById("btn-sesion");

function mostrarSesion() {
  if (!usuario) {
    sesionEstado.textContent = "Sin iniciar sesión";
    btnSesion.textContent = "Iniciar sesión con Google";
  } else {
    const nombre = usuario.email || usuario.displayName || "Cuenta de Google";
    sesionEstado.textContent = nombre + (esAdmin(usuario) ? " · Administrador" : " · Sin permiso para editar");
    btnSesion.textContent = "Cerrar sesión";
  }
  btnSesion.hidden = false;
}

function mensajeAuth(e) {
  const c = e && e.code;
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Se canceló el inicio de sesión.";
  if (c === "auth/popup-blocked") return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo otra vez.";
  if (c === "auth/unauthorized-domain") return "Este sitio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).";
  if (c === "auth/operation-not-allowed") return "El inicio de sesión con Google no está activado en Firebase.";
  return "No se pudo iniciar sesión (" + (c || (e && e.message) || "error desconocido") + ").";
}

if (!window.rutinaAuth) {
  sesionEstado.textContent = "El inicio de sesión no se pudo cargar. Revisa tu conexión y recarga la página.";
} else {
  window.rutinaAuth.alCambiar(u => {
    usuario = u;
    mostrarSesion();
    pintarTodos();
    cargarDesdeHoja();
  });
  btnSesion.addEventListener("click", () => {
    const accion = usuario ? window.rutinaAuth.cerrarSesion() : window.rutinaAuth.iniciarSesion();
    Promise.resolve(accion).catch(e => { sesionEstado.textContent = mensajeAuth(e); });
  });
}

/* ---------- Calendario ---------- */
const nombresMeses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const diasSemana = ["L", "M", "M", "J", "V", "S", "D"]; // la semana empieza en lunes

const fechaHoy = new Date();
let anioMostrado = fechaHoy.getFullYear();

const contenedorMeses = document.getElementById("meses");
const etiquetaAnio = document.getElementById("anio");

function crearMes(anio, mes) {
  const caja = document.createElement("div");
  caja.className = "mes";

  const titulo = document.createElement("h3");
  titulo.textContent = nombresMeses[mes];
  caja.appendChild(titulo);

  const rejilla = document.createElement("div");
  rejilla.className = "dias";

  diasSemana.forEach(letra => {
    const c = document.createElement("span");
    c.className = "dia-semana";
    c.textContent = letra;
    rejilla.appendChild(c);
  });

  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes = 0
  for (let i = 0; i < desfase; i++) {
    rejilla.appendChild(document.createElement("span"));
  }

  const totalDias = new Date(anio, mes + 1, 0).getDate();
  for (let d = 1; d <= totalDias; d++) {
    const c = document.createElement("span");
    c.className = "dia";
    c.textContent = d;
    if (anio === fechaHoy.getFullYear() && mes === fechaHoy.getMonth() && d === fechaHoy.getDate()) {
      c.classList.add("hoy-dia");
    }
    rejilla.appendChild(c);
  }

  caja.appendChild(rejilla);
  return caja;
}

function dibujarAnio() {
  etiquetaAnio.textContent = anioMostrado;
  contenedorMeses.replaceChildren();
  for (let m = 0; m < 12; m++) {
    contenedorMeses.appendChild(crearMes(anioMostrado, m));
  }
}

document.getElementById("anio-ant").addEventListener("click", () => {
  anioMostrado--;
  dibujarAnio();
});
document.getElementById("anio-sig").addEventListener("click", () => {
  anioMostrado++;
  dibujarAnio();
});
document.getElementById("btn-hoy").addEventListener("click", () => {
  anioMostrado = fechaHoy.getFullYear();
  dibujarAnio();
});

dibujarAnio();

/* La app cargó completa: quitar el aviso de diagnóstico */
document.getElementById("estado").remove();
