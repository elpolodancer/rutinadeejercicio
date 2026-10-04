/**
 * Mi Rutina – conexión con Google Sheets
 *
 * La app llama a este script (POST) enviando el token de la sesión de Google (Firebase).
 * El script comprueba que la cuenta sea administradora y entonces lee/escribe la hoja.
 * Una fila por día. Columnas (fila 1): Fecha | Baile | Principales | Barra
 *   Principales -> "Lagartijas: 05, Sentadillas: 05, Plancha: 01:00mns"
 *   Barra       -> "1: 15, 2: 15, 3: 15"
 *   Baile       -> "Baile: canción / canción / canción"
 */

const ID_HOJA = "1A8PSQzobZDazrRo7An-lomHwo_ridQS1RO4cwloM7PQ";
const NOMBRE_HOJA = "";                 // vacío = primera pestaña; o escribe el nombre de la pestaña
const API_KEY_FIREBASE = "AIzaSyA80l29AWAR3x1NCDoRPyhtM6c0JOYqoAA";   // la misma apiKey de firebaseConfig
/* Únicas cuentas de Google que pueden ver y modificar la información (deben coincidir con app.js) */
const ADMINISTRADORES = [
  "dulceprincesa086@gmail.com",
  "polo.pericoperico55@gmail.com"
];
const COLUMNA_FECHA = "Fecha";
const COLUMNAS_TEXTO = ["Baile"];       // columnas que guardan texto libre, no pares "clave: valor"
const ORDEN = {                         // orden en que se acomodan los ejercicios dentro de la celda
  Principales: ["Lagartijas", "Sentadillas", "Abdominales", "Plancha", "Saltos de Tijera", "Sentadilla con Barra"],
  Barra: ["1", "2", "3", "4", "5"]
};

/* ---------- Punto de entrada ---------- */
/* Abrir la URL /exec en el navegador solo sirve para comprobar que el script está activo */
function doGet() {
  return responder(function () {
    return { mensaje: "Script activo. La app lo usa con POST y sesión de administrador." };
  });
}

function doPost(e) {
  return responder(function () {
    let p;
    try {
      p = JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error("Solicitud no válida");
    }
    verificarAdministrador(p.idToken);
    const fecha = normalizarFecha(p.fecha);
    if (p.accion === "leer") return leerDia(fecha);
    if (p.accion === "guardar") return guardarValor(fecha, p.columna, p.clave, p.valor || "");
    throw new Error("Acción desconocida");
  });
}

/* Pregunta a Firebase de quién es el token y exige que sea un administrador con correo verificado */
function verificarAdministrador(idToken) {
  if (!idToken) throw new Error("Inicia sesión para continuar");
  const r = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + API_KEY_FIREBASE,
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    }
  );
  if (r.getResponseCode() !== 200) {
    throw new Error("No se pudo verificar la sesión (código " + r.getResponseCode() + "). Vuelve a iniciar sesión.");
  }
  const usuarios = JSON.parse(r.getContentText()).users || [];
  const u = usuarios[0];
  const correo = u && u.email ? String(u.email).toLowerCase() : "";
  const permitido = ADMINISTRADORES.some(function (a) { return a.toLowerCase() === correo; });
  if (!u || u.emailVerified !== true || !permitido) {
    throw new Error("Esta cuenta no tiene permiso de administrador");
  }
  return correo;
}

function responder(trabajo) {
  let salida;
  try {
    salida = Object.assign({ ok: true }, trabajo());
  } catch (err) {
    salida = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(salida))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Leer ---------- */
function leerDia(fecha) {
  validarFecha(fecha);
  const hoja = obtenerHoja();
  const cols = encabezados(hoja);
  const colFecha = buscarColumna(cols, COLUMNA_FECHA);
  if (!colFecha) throw new Error('No encuentro la columna "' + COLUMNA_FECHA + '" en la fila 1');

  const fila = buscarFila(hoja, colFecha.col, fecha).fila;
  const columnas = {};
  if (fila) {
    const textos = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getDisplayValues()[0];
    cols.forEach(function (c) {
      if (c.col === colFecha.col) return;
      const texto = String(textos[c.col - 1]);
      if (esColumnaTexto(c.nombre)) {
        columnas[c.nombre] = quitarPrefijo(texto, c.nombre);
      } else {
        const objeto = {};
        parsear(texto).forEach(function (par) { objeto[par[0]] = par[1] === null ? "" : par[1]; });
        columnas[c.nombre] = objeto;
      }
    });
  }
  return { existe: !!fila, columnas: columnas };
}

/* ---------- Guardar ---------- */
function guardarValor(fecha, columna, clave, valor) {
  validarFecha(fecha);
  if (!columna) throw new Error("Falta la columna");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const hoja = obtenerHoja();
    const cols = encabezados(hoja);
    const colFecha = buscarColumna(cols, COLUMNA_FECHA);
    const col = buscarColumna(cols, columna);
    if (!colFecha) throw new Error('No encuentro la columna "' + COLUMNA_FECHA + '" en la fila 1');
    if (!col) throw new Error('No encuentro la columna "' + columna + '" en la fila 1');

    const busqueda = buscarFila(hoja, colFecha.col, fecha);
    let fila = busqueda.fila;
    if (!fila) {
      if (valor === "") return { guardado: false };      // nada que borrar
      fila = crearFila(hoja, colFecha.col, fecha, busqueda.siguiente);
    }

    const celda = hoja.getRange(fila, col.col);
    const actual = celda.getDisplayValue();
    let nuevo;

    if (esColumnaTexto(col.nombre)) {
      nuevo = valor === "" ? "" : col.nombre + ": " + valor;
    } else {
      if (!clave) throw new Error("Falta la clave del ejercicio");
      const k = String(clave).toLowerCase();
      const pares = [];
      let reemplazado = false;
      parsear(actual).forEach(function (par) {
        if (par[0].toLowerCase() === k) {
          reemplazado = true;
          if (valor !== "") pares.push([par[0], valor]);
        } else {
          pares.push(par);
        }
      });
      if (!reemplazado && valor !== "") pares.push([clave, valor]);
      nuevo = serializar(ordenar(col.nombre, pares));
    }

    celda.setNumberFormat("@");     // texto plano: evita que "1: 15" se convierta en hora
    celda.setValue(nuevo);
    return { guardado: true, fila: fila, celda: nuevo };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Hoja y columnas ---------- */
function obtenerHoja() {
  const libro = SpreadsheetApp.openById(ID_HOJA);
  const hoja = NOMBRE_HOJA ? libro.getSheetByName(NOMBRE_HOJA) : libro.getSheets()[0];
  if (!hoja) throw new Error('No encuentro la pestaña "' + NOMBRE_HOJA + '"');
  return hoja;
}

function encabezados(hoja) {
  const ultima = hoja.getLastColumn();
  if (ultima < 1) throw new Error("La hoja está vacía");
  const fila = hoja.getRange(1, 1, 1, ultima).getDisplayValues()[0];
  const lista = [];
  fila.forEach(function (texto, i) {
    const nombre = String(texto).trim();
    if (nombre) lista.push({ nombre: nombre, col: i + 1 });
  });
  return lista;
}

function buscarColumna(lista, nombre) {
  const n = String(nombre).trim().toLowerCase();
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].nombre.toLowerCase() === n) return lista[i];
  }
  return null;
}

function esColumnaTexto(nombre) {
  return COLUMNAS_TEXTO.some(function (c) { return c.toLowerCase() === String(nombre).toLowerCase(); });
}

/* ---------- Fechas ---------- */
function normalizarFecha(texto) {
  const t = String(texto || "").trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[3] : t;
}

function validarFecha(fecha) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) throw new Error("Fecha no válida: usa dd/mm/aaaa");
}

function textoFecha(valor, zona) {
  if (Object.prototype.toString.call(valor) === "[object Date]") return Utilities.formatDate(valor, zona, "dd/MM/yyyy");
  return normalizarFecha(valor);
}

/* Devuelve la fila de esa fecha (o null) y la primera fila libre al final */
function buscarFila(hoja, colFecha, fecha) {
  const zona = hoja.getParent().getSpreadsheetTimeZone();
  const ultima = hoja.getLastRow();
  let siguiente = 2;
  let encontrada = null;
  if (ultima >= 2) {
    const valores = hoja.getRange(2, colFecha, ultima - 1, 1).getValues();
    valores.forEach(function (v, i) {
      const t = textoFecha(v[0], zona);
      if (t) siguiente = i + 3;
      if (!encontrada && t === fecha) encontrada = i + 2;
    });
  }
  return { fila: encontrada, siguiente: siguiente };
}

function crearFila(hoja, colFecha, fecha, fila) {
  const zona = hoja.getParent().getSpreadsheetTimeZone();
  const celda = hoja.getRange(fila, colFecha);
  celda.setNumberFormat("dd/mm/yyyy");
  celda.setValue(Utilities.parseDate(fecha, zona, "dd/MM/yyyy"));
  return fila;
}

/* ---------- Texto de las celdas ("clave: valor, clave: valor") ---------- */
function parsear(texto) {
  const pares = [];
  String(texto || "").split(",").forEach(function (trozo) {
    const i = trozo.indexOf(":");
    if (i < 0) {
      if (trozo.trim()) pares.push([trozo.trim(), null]);
      return;
    }
    const clave = trozo.slice(0, i).trim();
    if (clave) pares.push([clave, trozo.slice(i + 1).trim()]);
  });
  return pares;
}

function serializar(pares) {
  return pares.map(function (par) {
    return par[1] === null ? par[0] : par[0] + ": " + par[1];
  }).join(", ");
}

function ordenar(columna, pares) {
  const clave = Object.keys(ORDEN).filter(function (k) { return k.toLowerCase() === columna.toLowerCase(); })[0];
  const orden = (clave ? ORDEN[clave] : []).map(function (x) { return x.toLowerCase(); });
  function rango(par) {
    const i = orden.indexOf(par[0].toLowerCase());
    return i < 0 ? 999 : i;
  }
  return pares
    .map(function (par, i) { return { par: par, i: i }; })
    .sort(function (a, b) { return (rango(a.par) - rango(b.par)) || (a.i - b.i); })
    .map(function (x) { return x.par; });
}

function quitarPrefijo(texto, nombre) {
  const t = String(texto).trim();
  const prefijo = nombre.toLowerCase() + ":";
  return t.toLowerCase().indexOf(prefijo) === 0 ? t.slice(prefijo.length).trim() : t;
}
