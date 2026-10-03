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
