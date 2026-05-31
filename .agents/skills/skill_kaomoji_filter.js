/**
 * @file skill_kaomoji_filter.js
 * @description Escanea el borrador en español del capítulo para detectar categorías emocionales,
 * físicas o de acción. Filtra la paleta maestra de Kaomojis y devuelve solo las categorías
 * relevantes para reducir el consumo de tokens en la llamada al corrector-lqa.
 * @version 1.0.0
 * @author Antigravity (BATT System Optimization)
 */

const fs = require('fs');
const path = require('path');

// Mapeo de palabras clave en español a categorías del JSON de Kaomojis
const CATEGORY_KEYWORDS = {
    "emociones_personajes": {
        "ira_furia_hostilidad": ["ira", "furia", "hostil", "maldito", "mátame", "odio", "gritar", "grita", "enojado", "golpea", "golpeó"],
        "tristeza_desesperacion_agoniadebucle": ["triste", "lágrimas", "agonía", "bucle", "desesperación", "llanto", "llorar", "dolor", "soledad"],
        "miedo_terror_vulnerabilidad": ["miedo", "terror", "asustado", "vulnerable", "tiembla", "temblor", "pánico", "peligro", "amenaza"],
        "burla_sarcasmo_desprecio": ["burla", "sarcasmo", "desprecio", "sonrió", "sonrisa", "ironía", "burlón", "despreciable"],
        "asombro_shock_incredulidad": ["asombro", "shock", "sorpresa", "increíble", "sorprendido", "impactado", "¡qué!", "boca abierta"],
        "enamoramiento_aprecio_interes": ["amor", "cariño", "interés", "aprecio", "enamorado", "bella", "hermosa", "atractivo", "corazón"]
    },
    "accion_y_entorno": {
        "combate_cuerpo_a_cuerpo": ["combate", "pelea", "puño", "fuerza", "patada", "golpe", "batalla", "lucha"],
        "armas_y_artes_marciales": ["espada", "arma", "disparo", "pistola", "cuchillo", "espada", "hoja", "marcial", "técnica"],
        "tiempo_bucle_cronologia": ["tiempo", "bucle", "reencarnación", "cronología", "cien años", "reloj", "reencarnar", "eterno"],
        "hackeo_redes_tecnologia": ["hack", "computadora", "tecnología", "red", "servidor", "código", "sistema", "digital", "información"]
    },
    "estados_fisicos_biologicos": {
        "debilidad_tos_cancer": ["cáncer", "tos", "debilidad", "tosió", "sangre", "enfermo", "pálido", "fatiga", "debilitado", "clínica", "hospital"],
        "aura_divina_omnisciencia": ["divino", "omnisciente", "sabio", "aura", "carta", "comodín", "misterio", "misterioso", "superior", "dios"]
    }
};

/**
 * Escanea el texto en español para pre-filtrar la paleta de Kaomojis y reducir tokens de contexto.
 * 
 * @param {string} chapterSpanishContent - Texto del borrador traducido o LQA parcial.
 * @param {string} palettePath - Ruta absoluta a palette_kaomojis.json.
 * @returns {object} Un objeto que contiene únicamente las categorías de kaomojis con palabras clave detectadas.
 */
function filterKaomojis(chapterSpanishContent, palettePath) {
    if (!fs.existsSync(palettePath)) {
        return { error: "La paleta de Kaomojis no existe en la ruta especificada." };
    }

    try {
        const paletteContent = fs.readFileSync(palettePath, 'utf8');
        const masterPalette = JSON.parse(paletteContent);
        
        const lowerText = chapterSpanishContent.toLowerCase();
        
        const filteredMatrix = {};
        let matchesCount = 0;

        // Iterar sobre las secciones de la matriz maestra
        for (const [section, categories] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const [category, keywords] of Object.entries(categories)) {
                // Comprobar si alguna palabra clave está en el texto
                const hasKeyword = keywords.some(keyword => lowerText.includes(keyword));
                
                if (hasKeyword) {
                    if (!filteredMatrix[section]) {
                        filteredMatrix[section] = {};
                    }
                    // Copiar los Kaomojis aprobados de la paleta maestra
                    if (masterPalette.matrix && masterPalette.matrix[section] && masterPalette.matrix[section][category]) {
                        filteredMatrix[section][category] = masterPalette.matrix[section][category];
                        matchesCount++;
                    }
                }
            }
        }

        // Caso de respaldo: si no hay coincidencias directas, inyectar categorías por defecto de aura divina y burla
        if (matchesCount === 0) {
            filteredMatrix["estados_fisicos_biologicos"] = {
                "aura_divina_omnisciencia": masterPalette.matrix["estados_fisicos_biologicos"]["aura_divina_omnisciencia"]
            };
            filteredMatrix["emociones_personajes"] = {
                "burla_sarcasmo_desprecio": masterPalette.matrix["emociones_personajes"]["burla_sarcasmo_desprecio"]
            };
        }

        return {
            catalog_name: masterPalette.catalog_name,
            version: masterPalette.version,
            usage_rule: masterPalette.usage_rule,
            matrix: filteredMatrix
        };

    } catch (error) {
        console.error('[BATT ERROR] Error en filterKaomojis:', error);
        return { error: `No se pudo filtrar la paleta de Kaomojis: ${error.message}` };
    }
}

module.exports = { filterKaomojis };
