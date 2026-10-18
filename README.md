# Trámite Fácil

Web estática (sin base de datos, coste 0 €). Cada guía es un archivo Markdown en `content/guias/` y el script `build.mjs` genera una página con URL propia (`/guias/nombre-de-la-guia/`).

## Poner la web en internet (sin instalar nada en tu PC)

### 1. Subir el proyecto a GitHub
1. Crea una cuenta en https://github.com y pulsa **New repository** (nombre: `tramite-facil`, público o privado).
2. Descomprime el ZIP. En el repositorio pulsa **Add file → Upload files** y arrastra **todo el contenido** de la carpeta (incluidas las carpetas `content` y `static`, y los archivos `.pages.yml`, `.gitignore`, `build.mjs`, `netlify.toml`, `package.json`, `preview.mjs`).
3. Pulsa **Commit changes**.

### 2. Publicarla en Netlify (gratis)
1. Entra en https://app.netlify.com con tu cuenta de GitHub.
2. **Add new site → Import an existing project → GitHub** y elige el repositorio.
3. No cambies nada: la configuración se lee de `netlify.toml`. Pulsa **Deploy**.
4. Cuando termine, Netlify te da una dirección `https://algo.netlify.app`. Puedes cambiarla en *Site configuration → Change site name*.

### 3. Publicar artículos desde un panel visual (Pages CMS)
1. Entra en https://app.pagescms.org con tu cuenta de GitHub e instala la aplicación en tu repositorio.
2. Abre el repositorio: verás **Guías** y **Páginas**.
3. **Guías → Add an entry**, rellena los campos y pulsa **Save**. Pages CMS guarda el archivo en GitHub y Netlify republica la web sola (tarda ~1 minuto).

#### Cómo escribir una guía
En el campo **Contenido** usa estos títulos de nivel 2 (H2), en este orden recomendado:
`Requisitos previos`, `Documentación necesaria`, `Pasos` (lista numerada), `Costes y plazos`, `Fuentes oficiales`, `Preguntas frecuentes`.
Dentro de `Preguntas frecuentes`, cada pregunta es un título de nivel 3 (H3) y su respuesta es el párrafo siguiente: así se generan automáticamente las preguntas para Google. El aviso de que la información puede cambiar, el índice, las migas de pan y las guías relacionadas se añaden solos.

## Estado de las pruebas (lo que sí y lo que no se ha comprobado)
- **Comprobado en un entorno de pruebas:** el script compila sin errores; se generan las URLs estáticas; no hay enlaces internos rotos; el buscador funciona (mayúsculas, tildes, sin resultados, `/buscar/?q=`); el menú móvil abre y cierra; no hay errores de JavaScript; no hay desbordamiento horizontal a 390 px.
- **NO comprobado:** el despliegue real en Netlify, el funcionamiento en Pages CMS (la sintaxis de `.pages.yml` sigue su documentación oficial y el archivo es YAML válido, pero no se ha abierto en el panel), ni la lectura de archivos guardados por Pages CMS con textos muy largos (el lector de datos admite los formatos habituales). Si algo falla, el error aparece en el registro de despliegue de Netlify con un mensaje en español.

## Contenido pendiente
- Solo hay 2 guías: **vida laboral** y **Cl@ve**. Faltan las otras seis (certificado digital, DNI, empadronamiento, cita previa, trámites de Seguridad Social y ayudas).
- En las guías, los datos que no se pudieron confirmar (costes, plazos, requisitos concretos) están marcados como *pendiente de verificación*. La revisión se hizo con búsquedas en fuentes oficiales, no abriendo cada página oficial paso a paso: **compruébalo tú antes de promocionar la web**.
- Las páginas legales (privacidad, cookies, aviso legal) y las de contacto/sobre nosotros son **borradores con huecos marcados**. Completa con tus datos reales y revísalas con asesoramiento legal.
- La web no usa cookies ni analítica; por eso no hay panel de gestión de cookies. Si añades analítica o publicidad, tendrás que añadirlo.

## Ver la web en tu PC (opcional)
Instala Node.js 20 o superior (https://nodejs.org), abre una terminal en la carpeta y ejecuta `npm install` y después `npm run preview`. Abre http://localhost:8080.
