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

/* ---------- Ejercicios ---------- */
const ejercicios = [
  "Baile",
  "Lagartijas",
  "Sentadillas",
  "Abdominales",
  "Barra 1 Levantamiento Vertical de Pie",
  "Barra 2 Levantamiento Vertical sobre Espalda de Pie",
  "Barra 3 Sentadilla con Barra",
  "Barra 4 Bombeo Inferior Inclinado",
  "Barra 5 Acostado",
  "Sentadilla con Barra",
  "Plancha",
  "Salto de Tijera"
];

const contenedor = document.getElementById("botones");
const actual = document.getElementById("actual");

/* Cantidades guardadas en el navegador (una por ejercicio) */
const CLAVE_CANTIDADES = "rutina-cantidades";

function leerCantidades() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CANTIDADES)) || {};
  } catch (e) {
    return {};
  }
}

function guardarCantidades() {
  try {
    localStorage.setItem(CLAVE_CANTIDADES, JSON.stringify(cantidades));
  } catch (e) {
    /* si el navegador no permite guardar, la cantidad solo dura mientras la página esté abierta */
  }
}

const cantidades = leerCantidades();
const etiquetasCuenta = {};

function textoCuenta(n) {
  return n + (n === 1 ? " vez" : " veces");
}

/* Submenú */
const submenu = document.getElementById("submenu");
const subTitulo = document.getElementById("sub-titulo");
const campoCantidad = document.getElementById("cantidad");
let ejercicioAbierto = null;

function leerCampo() {
  const n = Math.floor(Number(campoCantidad.value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function abrirSubmenu(nombre) {
  ejercicioAbierto = nombre;
  subTitulo.textContent = nombre;
  campoCantidad.value = cantidades[nombre] || 0;
  submenu.showModal();
}

function guardarEjercicio() {
  const n = leerCampo();
  cantidades[ejercicioAbierto] = n;
  guardarCantidades();
  etiquetasCuenta[ejercicioAbierto].textContent = n > 0 ? textoCuenta(n) : "";
  actual.textContent = ejercicioAbierto + ": " + textoCuenta(n);
  submenu.close();
}

document.getElementById("menos").addEventListener("click", () => {
  campoCantidad.value = Math.max(0, leerCampo() - 1);
});
document.getElementById("mas").addEventListener("click", () => {
  campoCantidad.value = leerCampo() + 1;
});
document.getElementById("guardar").addEventListener("click", guardarEjercicio);
document.getElementById("cancelar").addEventListener("click", () => submenu.close());
campoCantidad.addEventListener("keydown", e => {
  if (e.key === "Enter") guardarEjercicio();
});
/* Tocar fuera del cuadro lo cierra */
submenu.addEventListener("click", e => {
  if (e.target === submenu) submenu.close();
});

/* Botones de ejercicios */
ejercicios.forEach(nombre => {
  const boton = document.createElement("button");
  boton.type = "button";

  const etiquetaNombre = document.createElement("span");
  etiquetaNombre.textContent = nombre;

  const etiquetaCuenta = document.createElement("span");
  etiquetaCuenta.className = "cuenta";
  const guardada = cantidades[nombre];
  etiquetaCuenta.textContent = guardada > 0 ? textoCuenta(guardada) : "";
  etiquetasCuenta[nombre] = etiquetaCuenta;

  boton.append(etiquetaNombre, etiquetaCuenta);
  boton.addEventListener("click", () => abrirSubmenu(nombre));
  contenedor.appendChild(boton);
});

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
