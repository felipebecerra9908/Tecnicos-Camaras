# Bitácora de Servicios

App web simple para técnicos instaladores (cámaras análogas, cámaras IP, alarmas, revisiones) que llevan el control diario de los servicios que realizan y cuánto les pagan por cada punto.

No necesita servidor ni base de datos: es HTML/CSS/JS puro que guarda todo en el navegador (`localStorage`), así que funciona gratis en **GitHub Pages**.

## Funcionalidad

- Registrar cada servicio del día: fecha, tipo (cámaras análogas, cámaras IP, alarmas, revisión de cámaras, revisión general, u otro), punto/cliente, monto cobrado, **ubicación de la instalación** y notas.
- Ubicación: puedes escribir la dirección a mano o presionar **"Usar mi ubicación"** para capturar las coordenadas GPS del punto (el navegador pedirá permiso). En el historial queda un enlace directo a Google Maps.
- El historial **nunca se borra solo**: cada mes queda guardado y puedes navegar entre meses anteriores con las flechas `‹` `›`.
- Reporte automático por mes: total ganado, cantidad de servicios, días trabajados, promedio por servicio y **gráfico de barras** con el desglose por tipo de servicio.
- **Informe en PDF** con un clic: incluye tu nombre (si lo escribes arriba), resumen del mes, el gráfico y una tabla detallada de todos los servicios con su ubicación.
- Exportar también el mes en CSV (para Excel/Google Sheets).
- Exportar un respaldo completo en JSON de todo el historial (recomendado hacerlo seguido, ya que los datos viven solo en el navegador donde los ingresaste).
- Eliminar un registro si te equivocaste.

## Cómo subirlo a GitHub

1. Crea un repositorio nuevo en GitHub (público o privado), por ejemplo `bitacora-servicios`.
2. Sube estos archivos tal cual (`index.html`, `styles.css`, `app.js`, `README.md`) a la raíz del repositorio.
   - Desde la web de GitHub: botón **Add file → Upload files**, arrastra los archivos y haz commit.
   - O desde terminal:
     ```bash
     git init
     git add .
     git commit -m "Primera versión de la bitácora"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/bitacora-servicios.git
     git push -u origin main
     ```
3. Activa GitHub Pages: en el repo ve a **Settings → Pages**, en "Source" elige la rama `main` y carpeta `/ (root)`, guarda.
4. En un par de minutos tu app estará disponible en:
   `https://TU_USUARIO.github.io/bitacora-servicios/`
5. Agrégala a la pantalla de inicio de tu celular (desde el navegador: "Agregar a pantalla de inicio") para usarla como si fuera una app.

## Importante sobre los datos

Los datos se guardan en el `localStorage` del navegador **donde los ingresaste** (ese celular/computadora, ese navegador). Si:
- borras el caché/datos del navegador,
- usas otro celular o navegador,
- o reinstalas el navegador,

el historial **no** se sincroniza solo. Por eso hay un botón **"Respaldar datos"** que descarga un `.json` con todo — guárdalo en tu Drive o donde prefieras cada cierto tiempo.

## Sobre la ubicación GPS

El botón "Usar mi ubicación" usa la geolocalización del navegador. En el celular funciona mejor si:
- Le das permiso de ubicación al navegador cuando lo pida.
- Usas HTTPS (GitHub Pages ya sirve todo por HTTPS, así que no tienes que hacer nada extra).
- Estás afuera o cerca de una ventana para mejor señal GPS.

Si no das permiso o falla, simplemente escribe la dirección o referencia a mano en el mismo campo — igual queda guardada.

## Estructura del proyecto

```
bitacora-servicios/
├── index.html   # estructura de la página
├── styles.css   # estilos (tema oscuro, estilo "orden de trabajo")
├── app.js       # lógica: guardar, listar, reportes, gráfico, PDF, exportar
└── README.md
```

El proyecto usa dos librerías por CDN (no hay que instalar nada): **Chart.js** para el gráfico y **jsPDF + jsPDF-AutoTable** para generar el informe en PDF. Necesitan conexión a internet para cargar la primera vez que abres la página.

## Posibles mejoras futuras

- Sincronización en la nube (por ejemplo con Firebase o Supabase) para ver el mismo historial desde varios dispositivos.
- Login para proteger los datos si algún día lo compartes con más técnicos.
- Gráfica de ingresos por mes a lo largo del año.
- Mapa con todos los puntos visitados en el mes.
