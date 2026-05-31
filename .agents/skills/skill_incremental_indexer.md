# Escritura Incremental Local de Índices (`skill_incremental_indexer`)

## 1. Propósito
Esta habilidad tiene como objetivo **detener el crecimiento exponencial de consumo de tokens de salida y entrada** en el agente `archivista-indexador`. En lugar de forzar al LLM a leer todo el archivo `indice_cronologico.md` (que contendrá cientos de capítulos) y volver a escribir todo el archivo completo (lo que consumiría decenas de miles de tokens de forma repetitiva), el LLM solo procesa el capítulo actual y emite un objeto JSON estructurado de 3 líneas. Este script local de Node.js se encarga de inyectar y ordenar ese nodo en el archivo Markdown local de forma 100% segura y atómica.

## 2. Parámetros de Entrada
- `chapterData` (`object`): Objeto estructurado que contiene:
  - `numero` (`string`|`number`): El número de capítulo (ej. `"002"` o `2`).
  - `titulo` (`string`): Título en español del capítulo.
  - `descripcion` (`string`): Resumen de máximo 3 líneas.
  - `personajes` (`string`): Cadena formateada de personajes en escena (ej: `"**Chen Luo** [Protagonista]"`).
- `indexFilePath` (`string`): La ruta absoluta del archivo `indice_cronologico.md` de la novela correspondiente.

## 3. Lógica o Script Asociado
La lógica está implementada en [skill_incremental_indexer.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_incremental_indexer.js). A continuación se detalla su comportamiento principal:

```javascript
/**
 * Lee el archivo de índice, evita duplicados de capítulo y realiza la inserción
 * quirúrgica del nodo Markdown formateado inmediatamente después de la etiqueta de zona dinámica.
 * 
 * @param {object} chapterData 
 * @param {string} indexFilePath 
 * @returns {boolean} true si fue exitoso
 */
const { appendChronologicalIndex } = require('./skill_incremental_indexer.js');
```

> [!TIP]
> **Reducción de Consumo Estimada:** **Ahorro incremental masivo**. Previene que el consumo del indexador se dispare de forma lineal/exponencial (por ejemplo, escribir un archivo de 50 KB a través de un LLM cada vez cuesta alrededor de 4,000 tokens de escritura, lo cual se reduce a un consumo fijo de menos de 100 tokens de salida JSON en cada llamada).
