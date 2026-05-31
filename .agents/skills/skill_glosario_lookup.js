/**
 * @file skill_glosario_lookup.js
 * @description Filtro local inteligente para extraer únicamente las filas del glosario
 * cuyos términos (caracteres chinos/Hanzi) estén presentes en el capítulo de origen.
 * Esto reduce el tamaño del prompt de traducción hasta en un 95%.
 * @version 1.0.0
 * @author Antigravity (BATT System Optimization)
 */

const fs = require('fs');
const path = require('path');

/**
 * Filtra el glosario Markdown para mantener únicamente los términos que aparecen en el texto del capítulo en chino.
 * 
 * @param {string} chapterChineseContent - Contenido de texto plano del capítulo en chino original.
 * @param {string} glosarioPath - Ruta absoluta al archivo glosario_elenco.md.
 * @returns {string} Sub-glosario en formato Markdown que contiene únicamente las coincidencias encontradas.
 */
function lookupGlosario(chapterChineseContent, glosarioPath) {
    if (!fs.existsSync(glosarioPath)) {
        return '<!-- [BATT WARNING] El glosario no existe en la ruta especificada. Se omite filtrado. -->';
    }

    try {
        const glosarioContent = fs.readFileSync(glosarioPath, 'utf8');
        const lines = glosarioContent.split(/\r?\n/);
        
        let headerLines = [];
        let matchingRows = [];
        let inTable = false;
        
        // Expresión regular para capturar caracteres Hanzi dentro de los paréntesis: (Hanzi / Pinyin)
        // Ejemplo: **Chen Luo** (陈洛 / Chén Luò) -> Captura "陈洛"
        const hanziRegex = /\(([\u4e00-\u9fa5]+)\s*\//;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Detectar cabecera de tabla de personajes
            if (trimmed.startsWith('|') && (trimmed.includes('Personaje') || trimmed.includes('Hanzi'))) {
                inTable = true;
                headerLines = [];
                headerLines.push(line);
                continue;
            }
            
            if (inTable) {
                // Agregar la línea de separación (| :--- | :--- |)
                if (trimmed.startsWith('|') && trimmed.includes(':---')) {
                    headerLines.push(line);
                    continue;
                }
                
                if (trimmed.startsWith('|')) {
                    // Es una fila de datos. Extraemos el Hanzi para comprobar coincidencia
                    const match = trimmed.match(hanziRegex);
                    if (match && match[1]) {
                        const hanzi = match[1];
                        // Comprobar si el Hanzi aparece en el texto del capítulo
                        if (chapterChineseContent.includes(hanzi)) {
                            matchingRows.push(line);
                        }
                    } else {
                        // Si no hay Hanzi en paréntesis, comprobar si alguna palabra clave del primer campo coincide
                        const cells = trimmed.split('|').map(c => c.trim());
                        if (cells.length > 1) {
                            const nameField = cells[1].replace(/\*/g, ''); // Remover negrita **
                            if (nameField && chapterChineseContent.includes(nameField)) {
                                matchingRows.push(line);
                            }
                        }
                    }
                } else {
                    // Fin de la tabla o línea vacía
                    if (trimmed !== '') {
                        inTable = false;
                    }
                }
            }
        }
        
        // Si hay filas que coinciden, armamos la tabla acotada
        if (matchingRows.length > 0) {
            return [
                '### 🎯 Glosario Acotado del Capítulo (Optimizado)',
                ' Este glosario ha sido pre-filtrado localmente. Solo contiene entidades presentes en el texto original.',
                '',
                ...headerLines,
                ...matchingRows
            ].join('\n');
        }
        
        return '<!-- [BATT INFO] No se detectaron coincidencias del glosario en este capítulo. Glosario omitido para ahorrar tokens. -->';

    } catch (error) {
        console.error('[BATT ERROR] Error en lookupGlosario:', error);
        return `<!-- [BATT ERROR] No se pudo procesar el glosario debido a un error: ${error.message} -->`;
    }
}

module.exports = { lookupGlosario };
