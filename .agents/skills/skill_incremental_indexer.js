/**
 * @file skill_incremental_indexer.js
 * @description Modulo local en Node.js que inserta de forma incremental un nuevo nodo de capítulo
 * en el archivo indice_cronologico.md, evitando que el LLM del archivista-indexador tenga que
 * leer o reescribir el índice completo. Esto previene el crecimiento exponencial de consumo de tokens.
 * @version 1.0.0
 * @author Antigravity (BATT System Optimization)
 */

const fs = require('fs');
const path = require('path');

/**
 * Inserta de manera incremental un nodo de capítulo formateado en el archivo indice_cronologico.md de la novela.
 * 
 * @param {object} chapterData - Datos estructurados del capítulo generados por el LLM.
 * @param {string|number} chapterData.numero - Número o ID del capítulo (ej. "002" o 2).
 * @param {string} chapterData.titulo - Título del capítulo en español.
 * @param {string} chapterData.descripcion - Resumen corto (estricto de máximo 3 líneas).
 * @param {string} chapterData.personajes - Cadena de personajes en escena (ej: "**Chen Luo** [Protagonista]").
 * @param {string} indexFilePath - Ruta absoluta al archivo indice_cronologico.md.
 * @returns {boolean} true si se insertó con éxito, false en caso contrario.
 */
function appendChronologicalIndex(chapterData, indexFilePath) {
    if (!fs.existsSync(indexFilePath)) {
        console.error(`[BATT ERROR] El índice cronológico no existe en la ruta: ${indexFilePath}`);
        return false;
    }

    try {
        const { numero, titulo, descripcion, personajes } = chapterData;
        
        // Formatear el número de capítulo de forma consistente (ej. "002")
        const formattedNum = String(numero).padStart(3, '0');

        // Construir el nodo Markdown del capítulo de forma rigurosa y limpia
        const newChapterNode = [
            `- **Capítulo ${formattedNum}:**`,
            `  - *Título:* ${titulo.trim()}`,
            `  - *Descripción:* ${descripcion.trim()}`,
            `  - *Personajes en la Escena:* ${personajes.trim()}`
        ].join('\n');

        // Leer el archivo de índice existente
        let fileContent = fs.readFileSync(indexFilePath, 'utf8');

        // Control de duplicados: si ya existe el nodo de este capítulo, lo reemplazamos para evitar duplicados
        const duplicateRegex = new RegExp(`- \\*\\*Capítulo ${formattedNum}:\\*\\*[\\s\\S]*?(?=(\\n- \\*\\*Capítulo |\\r?\\n$|$))`, 'g');
        if (duplicateRegex.test(fileContent)) {
            console.log(`[BATT INFO] Capítulo ${formattedNum} ya registrado. Reemplazando nodo existente.`);
            fileContent = fileContent.replace(duplicateRegex, newChapterNode);
            fs.writeFileSync(indexFilePath, fileContent, 'utf8');
            return true;
        }

        // Buscar la etiqueta de inserción dinámica
        const treeZoneTag = '<!-- START_DYNAMIC_TREE_ZONE -->';
        const tagIndex = fileContent.indexOf(treeZoneTag);

        if (tagIndex === -1) {
            console.warn(`[BATT WARNING] No se encontró la etiqueta "${treeZoneTag}". El nodo se concatenará al final del archivo.`);
            fs.appendFileSync(indexFilePath, `\n${newChapterNode}\n`, 'utf8');
            return true;
        }

        // Dividir el archivo e inyectar el nodo inmediatamente después de la etiqueta
        const beforeTag = fileContent.substring(0, tagIndex + treeZoneTag.length);
        const afterTag = fileContent.substring(tagIndex + treeZoneTag.length);

        // Armar el nuevo contenido con saltos de línea estéticos
        const updatedContent = `${beforeTag}\n\n${newChapterNode}${afterTag.startsWith('\n') ? '' : '\n'}${afterTag}`;
        
        fs.writeFileSync(indexFilePath, updatedContent, 'utf8');
        return true;

    } catch (error) {
        console.error('[BATT ERROR] Error en appendChronologicalIndex:', error);
        return false;
    }
}

module.exports = { appendChronologicalIndex };
