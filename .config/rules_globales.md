# Leyes y Reglas Globales de Traducción — BATT Engine

Este documento constituye la constitución lingüística y técnica del motor BATT. Todos los agentes (Traductor, Corrector, Localizador, Extractor) deben acatar estrictamente estas reglas al procesar cualquier cadena de texto.

---

## 1. Reglas de Puntuación y Ortotipografía (Estándar Español)
- **Raya Narrativa (`—`):** Se prohíben comillas chinas (`“”`, `「」`) para diálogos. Se debe emplear la raya larga (`—`, alt+0151) tanto al inicio del diálogo como para encuadrar los incisos del narrador.
  - *Ejemplo:* —Este lugar está rodeado —dijo Xie Liuyun con frialdad—. No tienes escapativa.
- **Incisos del Narrador:** Si el inciso comienza con un verbo de habla (decir, inquirir, responder, exclamar), el inciso se inicia en minúscula y el punto final de la frase se coloca al cierre del inciso.

---

## 2. Protocolo de Tratamiento (Tú vs. Usted)
- **Chen Luo (Protagonista):** Como ser omnisciente y superior, se dirige a figuras de autoridad o desconocidos (incluyendo inicialmente a Xie Liuyun) utilizando el pronombre de distanciamiento intelectual **"Usted"**. Dirige un tono calmado, sobrio y educado pero psicológicamente imponente.
- **Xie Liuyun:** Se dirige a Chen Luo de **"Usted"** debido a la desconfianza, androfobia y distanciamiento formal frente a un captor.
- **Subordinados / Personajes Secundarios:** Deben dirigirse a Chen Luo con títulos de absoluto respeto como **"Señor Chen"** o **"Maestro"**.

---

## 3. Localización de Términos y Nombres Propios
- **Pinyin Estricto:** Los nombres propios de personajes (**Chen Luo**, **Xie Liuyun**, **Xia Fan**) y ubicaciones geográficas (**Pengcheng**) nunca deben españolizarse ni alterarse.
- **Conversión de Monedas y Medidas:** Mantener las magnitudes del autor original pero expresadas en formatos y unidades legibles internacionalmente (ej. Yuanes `¥` o Dólares `USD` con notaciones estándar de decimales).

---

## 4. Protección y Preservación de Continuidad
- **Anti-Overwrites:** Si un archivo definitivo `.md` en la carpeta `03_final/` posee cambios manuales realizados por el ojo humano del editor, los agentes tienen prohibido pisarlo si `prevent_overwrite_final_chapters` está activado en `candado_proyecto.json`.