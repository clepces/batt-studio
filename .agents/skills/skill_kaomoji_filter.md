# Filtro Dinámico de Kaomojis (`skill_kaomoji_filter`)

## 1. Propósito
Esta habilidad tiene como objetivo **reducir significativamente los tokens de contexto** al invocar el agente `corrector-lqa`. En lugar de inyectar todo el catálogo maestro de Kaomojis (`palette_kaomojis.json`), que mide ~6 KB y consume tokens repetitivamente en cada ejecución del corrector, este script pre-escanea el borrador traducido o LQA parcial, detecta los estados emocionales, acciones o afecciones físicas más dominantes y extrae **únicamente las categorías de Kaomojis correspondientes** para alimentar el LLM.

## 2. Parámetros de Entrada
- `chapterSpanishContent` (`string`): El texto borrador en español del capítulo.
- `palettePath` (`string`): La ruta absoluta hacia el archivo `palette_kaomojis.json` de configuración global.

## 3. Lógica o Script Asociado
La lógica está implementada en [skill_kaomoji_filter.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_kaomoji_filter.js). A continuación se detalla su comportamiento principal:

```javascript
/**
 * Detecta palabras clave en el texto borrador en español y filtra la paleta
 * de Kaomojis para inyectar únicamente las categorías de emociones o acciones activas.
 * 
 * @param {string} chapterSpanishContent 
 * @param {string} palettePath 
 * @returns {object} Paleta de kaomojis reducida lista para pasar al prompt
 */
const { filterKaomojis } = require('./skill_kaomoji_filter.js');
```

> [!TIP]
> **Reducción de Consumo Estimada:** **~75% de ahorro** en tokens relacionados a la paleta de Kaomojis. Al filtrar y reducir el payload del prompt a solo 1 o 2 categorías emocionales relevantes en lugar de inyectar las 12 categorías que existen.
