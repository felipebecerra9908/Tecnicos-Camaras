# Bitácora de Servicios

App web simple para técnicos instaladores (cámaras análogas, cámaras IP, alarmas, revisiones) que llevan el control diario de los servicios que realizan y cuánto les pagan por cada punto.

No necesita servidor ni base de datos: es HTML/CSS/JS puro que guarda todo en el navegador (`localStorage`), así que funciona gratis en **GitHub Pages**.

## Funcionalidad

- Registrar cada servicio del día: fecha, tipo (cámaras análogas, cámaras IP, alarmas, revisión de cámaras, revisión general, u otro), punto/cliente, monto cobrado y notas.
- El historial **nunca se borra solo**: cada mes queda guardado y puedes navegar entre meses anteriores con las flechas `‹` `›`.
- Reporte automático por mes: total ganado, cantidad de servicios, días trabajados, promedio por servicio y desglose por tipo de servicio.
- Exportar el reporte de un mes en CSV (para Excel/Google Sheets).
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

## Estructura del proyecto

```
bitacora-servicios/
├── index.html   # estructura de la página
├── styles.css   # estilos (tema oscuro, estilo "orden de trabajo")
├── app.js       # lógica: guardar, listar, reportes, exportar
└── README.md
```

## Posibles mejoras futuras

- Sincronización en la nube (por ejemplo con Firebase o Supabase) para ver el mismo historial desde varios dispositivos.
- Login para proteger los datos si algún día lo compartes con más técnicos.
- Gráfica de ingresos por mes a lo largo del año.
