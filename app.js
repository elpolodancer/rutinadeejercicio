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
  "Levantamiento de Barra 1",
  "Levantamiento de Barra 2",
  "Levantamiento de Barra 3",
  "Sentadilla con Barra",
  "Plancha",
  "Salto de Tijera"
];

const contenedor = document.getElementById("botones");
const actual = document.getElementById("actual");

function seleccionar(boton, nombre) {
  contenedor.querySelectorAll("button").forEach(b => b.classList.remove("activo"));
  boton.classList.add("activo");
  actual.textContent = "Ejercicio: " + nombre;
}

ejercicios.forEach(nombre => {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = nombre;
  boton.addEventListener("click", () => seleccionar(boton, nombre));
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
