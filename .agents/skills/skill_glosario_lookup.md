# Búsqueda Local Acotada de Glosario (`skill_glosario_lookup`)

## 1. Propósito
Esta habilidad tiene como objetivo **reducir masivamente el consumo de tokens de entrada** en el agente `traductor-universal`. En lugar de inyectar todo el archivo `glosario_elenco.md` (que crece exponencialmente con cada capítulo procesado), este script local en Node.js realiza un pre-escaneo del capítulo original en chino y filtra las filas de personajes e importantes, enviando al LLM **únicamente** los términos de traducción presentes en las escenas del capítulo actual.

## 2. Parámetros de Entrada
- `chapterChineseContent` (`string`): El contenido completo del capítulo original en chino mandarín (`01_origen/*.txt`).
- `glosarioPath` (`string`): La ruta absoluta hacia el archivo `glosario_elenco.md` de la novela correspondiente.

## 3. Lógica o Script Asociado
La lógica está implementada en [skill_glosario_lookup.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_glosario_lookup.js). A continuación se detalla su comportamiento principal:

```javascript
/**
 * Busca coincidencias exactas de términos chinos (Hanzi) del glosario
 * en el texto de origen y genera un sub-glosario Markdown dinámico y ligero.
 * 
 * @param {string} chapterChineseContent 
 * @param {string} glosarioPath 
 * @returns {string} Tabla Markdown acotada
 */
const { lookupGlosario } = require('./skill_glosario_lookup.js');
```

> [!TIP]
> **Reducción de Consumo Estimada:** **~95% de ahorro** en tokens relacionados al glosario de personajes. Al pasar de ~5,000 tokens en novelas avanzadas a menos de 200 tokens de contexto específico por capítulo.
