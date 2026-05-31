# ⚙️ BATT (Buca Agentic Translation Tool) — Engine Core (v2.6.0)

BATT es un motor de traducción literaria altamente sofisticado, modular e inteligente. Diseñado para procesar novelas web masivas del idioma Chino/Coreano al Español de forma 100% autónoma y segura, implementa una arquitectura descentralizada de multi-agentes de Inteligencia Artificial que cooperan de forma asíncrona.

---

## 🏛️ Arquitectura de Multi-Agentes de BATT

El motor opera bajo un pipeline FIFO compuesto por 6 agentes especializados, coordinados de forma cognitiva por el orquestador de **Antigravity**:

```mermaid
graph TD
    A[vault/ novel_id /01_origen/ *.txt] --> B[Traductor Universal (traductor-universal)]
    B -->|Borrador Crudo| C[Corrector LQA (corrector-lqa)]
    C -->|Filtro LQA + Kaomojis| D[Localizador Cultural (localizador-cultural)]
    D -->|03_final/ *.md| E[Extractor Histórico (extractor-historico)]
    D -->|03_final/ *.md| F[Archivista Indexador (archivista-indexador)]
    E -->|Actualización incremental| G[(bases_datos/ glosario_elenco.md)]
    F -->|Nodo de capítulo de 3 líneas| H[(bases_datos/ indice_cronologico.md)]
    H --> I[Director de Arcos (director-arcos)]
    I -->|Sincronización de progreso| J[control_progreso.json]
```

---

## 📂 Organización y Jerarquía de Carpetas (Multi-Novela)

La estructura física del entorno de trabajo está distribuida exactamente de la siguiente manera:

*   **`.agents/`**: Directivas de comportamiento, prompts y configuraciones de personalidad de los 6 agentes de sistema que cooperan en el pipeline.
*   **`.config/`**: Parámetros de control global, definición de la secuencia de encadenamiento de estados y la **paleta oficial de Kaomojis** (`palette_kaomojis.json`).
*   **`.logs/`**: Bitácoras físicas de control de consumo de tokens y depuración de errores del sistema.
*   **`templates/`**: Plantillas estructuradas de capítulos optimizadas con directivas de diseño inmersivo para lectura premium.
*   **`vault/`**: Directorio unificado de proyectos de novelas en disco.
  *   **`[nombre_novela]/`**: Carpeta independiente por cada novela para evitar contaminación lingüística.
    *   **`bases_datos/`**: Registros Markdown e índices JSON de control local (`candado_proyecto.json` y `control_progreso.json`).
    *   **`01_origen/`**: Zona de depósito del texto crudo original plano (.txt).
    *   **`02_crudo/`**: Borradores intermedios de traducción y correcciones LQA.
    *   **`03_final/`**: Capítulos finales literarios traducidos listos para lectura (.md).
*   **`src/`**: Código fuente modular de la consola visual SPA (API Client, EventBus, Router, State, Layouts, Overlays y vistas).
*   **`dist/`**: Entregable estático optimizado de producción compilado dinámicamente por Vite en la raíz.

---

## 📊 Consola Industrial de Telemetría Unificada (Vite SPA)

El panel de control visual se compila bajo **Vite** en el puerto `5173` y se comunica con un servidor puente local asíncrono en **Express.js** (puerto `3000`) para romper de forma segura el sandbox del navegador sin problemas de CORS ni Race Conditions:

1.  **Selección Reactiva**: Elige cualquier novela de la barra lateral para inspeccionar instantáneamente su progreso general, capítulos procesados, historial de transacciones y telemetría de disco.
2.  **Zona Drag & Drop**: Arrastra archivos planos `.txt` directamente sobre el menú lateral para sanitizar de forma automática su nombre y guardarlos de forma segura en `01_origen/`.
3.  **Lector de Capítulos Incorporado**: Pestaña lectora premium para examinar y disfrutar del texto literario traducido en formato markdown directamente en el navegador.
4.  **Consola en Tiempo Real (Live Polling)**: Un lector continuo que sincroniza la interfaz con la telemetría compilada de disco cada 3 segundos sin recargar la página.
5.  **Matriz de Diagnóstico**: Diagnóstico en caliente del puente HTTP, endpoints operativos y paleta interactiva de Kaomojis integrada.

---

## 🚀 Protocolo de Operación e Integración Activa

### Paso 1: Iniciar el Sistema Unificado (Windows Launcher)
1. Ejecute el archivo **`BATT_Launcher.bat`** (doble clic en su explorador de Windows).
2. El orquestador levantará automáticamente tres hilos concurrentes en segundo plano:
    *   **Servidor Puente Express** en http://localhost:3000.
    *   **Consola de Telemetría Vite** en http://localhost:5173.
    *   **PowerShell Sanity Check (Watcher)** para compilar la telemetría de disco.
3. Se abrirá automáticamente tu navegador preferido en el Dashboard interactivo de control de BATT.

### Paso 2: Ingesta de Capítulos
Arrastra el archivo de capítulo `.txt` en la barra lateral, o cópialo directamente en la ruta `vault/[nombre_novela]/01_origen/`. El Watcher de PowerShell lo detectará e indexará en caliente en menos de 3 segundos, mostrándolo en la cola del Dashboard.

### Paso 3: Procesamiento Autónomo de Pipeline
Al detectarse un nuevo capítulo, puedes dar la instrucción en el chat del IDE a Antigravity:
> *"Antigravity, procesa el capítulo [Número] de la novela [ID_novela]"*

Antigravity ejecutará el pipeline basándose en los prompts estandarizados en `.agent/`, generará los archivos correspondientes en `vault/` a coste **$0.00 USD** utilizando la capa gratuita de Firebase, y el Dashboard visual reflejará el avance operativo y lingüístico de forma asíncrona e instantánea.
