# 🎭 Guía de Habilidades Modulares (Skills) de Agentes BATT

Esta carpeta está destinada a albergar los recursos técnicos e instrumentales (habilidades, herramientas y funciones ejecutable en caliente) que los agentes del sistema BATT pueden reclamar y usar para llevar a cabo sus tareas literarias especializadas.

## ¿Qué es un Skill en BATT?

Un **Skill** es una función lógica modular, un script automatizado (JS/PowerShell) o una plantilla de prompt con formato estructurado que expande las capacidades nativas de un agente de IA. 

Por ejemplo, un agente de traducción por sí solo solo posee su modelo LLM, pero con un Skill registrado puede:
1. Realizar una búsqueda léxica interactiva en bases de datos.
2. Formatear y inyectar de forma limpia kaomojis de la paleta.
3. Analizar la coherencia cronológica en el glosario de personajes.

## Estructura Recomendada para un Skill

Cada skill dentro de esta carpeta debe seguir el siguiente patrón de diseño:

```markdown
# [Nombre del Skill]

## 1. Propósito
Breve explicación de qué hace la habilidad y qué agente la reclama.

## 2. Parámetros de Entrada
Especificación técnica de las variables que recibe.

## 3. Lógica o Script Asociado
Bloque de código (JS / PowerShell) o plantilla estructural de prompt.
```

---

## Catálogo de Skills Oficiales (Optimizados para Ahorro de Tokens)

| Habilidad (Documentación / Script) | Agente / Módulo Destinatario | Propósito Técnico | Reducción de Consumo |
| :--- | :--- | :--- | :---: |
| [skill_glosario_lookup.md](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_glosario_lookup.md) / [skill_glosario_lookup.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_glosario_lookup.js) | `traductor-universal` | Pre-escanea el capítulo original en chino y filtra el glosario central enviando únicamente coincidencias. | **~95% de ahorro** en tokens del glosario. |
| [skill_kaomoji_filter.md](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_kaomoji_filter.md) / [skill_kaomoji_filter.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_kaomoji_filter.js) | `corrector-lqa` | Escanea el tono y contenido del texto en español para inyectar solo la categoría relevante de Kaomojis. | **~75% de ahorro** en tokens de la paleta. |
| [skill_incremental_indexer.md](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_incremental_indexer.md) / [skill_incremental_indexer.js](file:///c:/wamp64/www/Applications/buca-studio/.agents/skills/skill_incremental_indexer.js) | `archivista-indexador` | Inserta localmente y de forma incremental el nodo del capítulo en el índice, evitando que el LLM lea/escriba el índice completo. | **Previene crecimiento exponencial** de coste. |
