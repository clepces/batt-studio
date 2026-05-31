/**
 * @file ApiClient.js
 * @description Adaptador y gestor de peticiones asíncronas REST hacia el servidor puente con tolerancia a fallos.
 * @author BATT Principal Automation Engineer
 */

const hostName = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const BASE_URL = `${protocol}//${hostName}:3000/api`;

export class ApiClient {
    /**
     * Realiza solicitudes HTTP fetch con reintentos automáticos y retroceso exponencial.
     * @param {string} url Endpoint destino.
     * @param {Object} options Opciones de la petición.
     * @param {number} retries Cantidad de reintentos permitidos (máx 3).
     * @param {number} delay Tiempo de espera base entre reintentos.
     */
    static async fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error || `HTTP ${res.status}`);
                }
                return res;
            } catch (err) {
                if (i === retries - 1) throw err; // Arrojar error final
                console.warn(`[ApiClient] Reintento ${i + 1}/3 para ${url} debido a error: ${err.message}`);
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Delay exponencial
            }
        }
    }

    /**
     * Obtiene la telemetría unificada de disco.
     */
    static async getTelemetry() {
        const res = await this.fetchWithRetry(`${BASE_URL}/telemetry`);
        return res.json();
    }

    /**
     * Crea un proyecto de novela e inyecta plantillas base.
     */
    static async createNovel(payload) {
        const res = await this.fetchWithRetry(`${BASE_URL}/novels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.json();
    }

    /**
     * Elimina físicamente la novela y carpetas asociadas en disco duro de Windows.
     */
    static async deleteNovel(id) {
        const res = await this.fetchWithRetry(`${BASE_URL}/novels/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    }

    /**
     * Sube y sanitiza un capítulo crudo .txt en el origen de la novela seleccionada.
     */
    static async uploadChapter(novelId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const res = await fetch(`${BASE_URL}/chapters/upload`, {
                        method: 'POST',
                        headers: {
                            'x-novel-id': novelId,
                            'x-file-name': file.name,
                            'Content-Type': 'text/plain'
                        },
                        body: reader.result
                    });
                    if (!res.ok) {
                        if (res.status === 413) {
                            throw new Error('El archivo supera el límite máximo permitido por el servidor (10 MB). Por favor, divida el texto o elija un archivo más ligero.');
                        }
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || `HTTP ${res.status}`);
                    }
                    resolve(await res.json());
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Error leyendo el archivo plano local con FileReader."));
            reader.readAsText(file, 'utf-8');
        });
    }


    /**
     * Obtiene en formato stream el texto final de un capítulo de volumen.
     */
    static async getChapterContent(novelId, chapterId) {
        const res = await this.fetchWithRetry(`${BASE_URL}/chapters/view?novelId=${novelId}&chapterId=${chapterId}`);
        return res.text();
    }

    /**
     * Encola físicamente un capítulo de novela en el disco duro mediante la API Express.
     */
    static async delegateTranslation(novelId, chapterId, fileName) {
        const res = await this.fetchWithRetry(`${BASE_URL}/chapters/delegate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novelId, chapterId, fileName })
        });
        return res.json();
    }

    /**
     * Encola físicamente un capítulo de novela en el disco duro mediante la API Express.
     * Alias para compatibilidad con EstadisticaView y ReaderView.
     * @param {string} novelId - ID del proyecto de novela.
     * @param {string} chapterId - ID del capítulo a delegar.
     * @param {string} fileName - Nombre del archivo de origen.
     * @returns {Promise<Object>} Resultado del encolamiento.
     */
    static async delegateChapter(novelId, chapterId, fileName) {
        return this.delegateTranslation(novelId, chapterId, fileName);
    }

    /**
     * Encola de manera masiva todos los capítulos de origen de una novela en el pipeline local.
     */
    static async delegateAllPending(novelId) {
        const res = await this.fetchWithRetry(`${BASE_URL}/chapters/delegate-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novelId })
        });
        return res.json();
    }

    /**
     * Obtiene la lista de agentes de IA configurados con sus prompts y modelos.
     */
    static async getAgents() {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/agents`);
        return res.json();
    }

    /**
     * Guarda la configuración (modelo, prompt) de un agente de IA específico o crea uno nuevo.
     */
    static async saveAgent(id, model, prompt) {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, model, prompt })
        });
        return res.json();
    }

    /**
     * Elimina de forma física un agente de IA personalizado si no es del core.
     * @param {string} id - ID del agente a eliminar.
     * @returns {Promise<Object>} Resultado de la operación.
     */
    static async deleteAgent(id) {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/agents/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    }

    /**
     * Obtiene el catálogo oficial de Kaomojis.
     */
    static async getKaomojis() {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/kaomojis`);
        return res.json();
    }

    /**
     * Guarda la paleta oficial de Kaomojis en el disco físico.
     */
    static async saveKaomojis(newPalette) {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/kaomojis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPalette)
        });
        return res.json();
    }

    /**
     * Obtiene el listado de archivos Markdown de bases de datos de una novela.
     * @param {string} novelId - ID del proyecto de novela.
     * @returns {Promise<Object>} Listado de archivos.
     */
    static async getNovelDatabases(novelId) {
        const res = await this.fetchWithRetry(`${BASE_URL}/novels/${novelId}/databases`);
        return res.json();
    }

    /**
     * Obtiene el contenido de un archivo de base de datos Markdown específico.
     * @param {string} novelId - ID del proyecto de novela.
     * @param {string} file - Nombre del archivo con extensión (.md).
     * @returns {Promise<string>} Contenido Markdown.
     */
    static async getNovelDatabaseContent(novelId, file) {
        const res = await this.fetchWithRetry(`${BASE_URL}/novels/${novelId}/databases/${file}`);
        return res.text();
    }

    /**
     * Obtiene las reglas globales de traducción (rules_globales.md).
     * @returns {Promise<string>} Contenido del archivo de reglas.
     */
    static async getGlobalRules() {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/rules-globales`);
        return res.text();
    }

    /**
     * Guarda las reglas globales de traducción (rules_globales.md) en el disco físico.
     * @param {string} markdownContent - Nuevo contenido para el archivo de reglas.
     * @returns {Promise<Object>} Resultado de la operación.
     */
    static async saveGlobalRules(markdownContent) {
        const res = await this.fetchWithRetry(`${BASE_URL}/config/rules-globales`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
            body: markdownContent
        });
        return res.json();
    }
}
export default ApiClient;
