/**
 * @file server.js
 * @description Servidor puente Express de alto rendimiento para el control del sistema operativo desde la interfaz web.
 * @author BATT Principal Automation Engineer
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Crear servidor HTTP unificado para Express y WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * Difunde (broadcast) el objeto de telemetría a todos los clientes WebSocket conectados.
 * @param {Object} data - Objeto de telemetría consolidado.
 */
function broadcastTelemetry(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 = WebSocket.OPEN
            try {
                client.send(payload);
            } catch (err) {
                console.error('[WS BROADCAST] Fallo al enviar telemetría a cliente:', err);
            }
        }
    });
}

// Intervalo de escaneo activo (Heartbeat Ping-Pong) para purgar sockets semi-abiertos (fantasmas)
const wsHeartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            console.log('[WS] Conexión inactiva purgada por falla en latido.');
            return ws.terminate();
        }
        ws.isAlive = false;
        try {
            ws.ping();
        } catch (err) {
            console.error('[WS PING ERROR] Error al enviar ping de latido:', err);
            ws.terminate();
        }
    });
}, 30000);

// Asegurar la limpieza del temporizador si el servidor se apaga
wss.on('close', () => {
    clearInterval(wsHeartbeatInterval);
});

// Manejador de conexiones WebSocket entrantes
wss.on('connection', (ws) => {
    console.log('[WS] Cliente conectado al puente de telemetría BATT.');
    ws.isAlive = true;

    // Manejar respuesta pong para validar la salud de la conexión
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Enviar telemetría inicial en caliente de inmediato para pintar la UI velozmente
    if (cachedTelemetry) {
        try {
            ws.send(JSON.stringify(cachedTelemetry));
        } catch (err) {
            console.error('[WS] Fallo al enviar telemetría inicial al cliente conectado:', err);
        }
    }
    
    ws.on('error', (err) => {
        console.error('[WS SOCKET ERROR] Excepción capturada en socket:', err);
    });

    ws.on('close', () => {
        console.log('[WS] Cliente desconectado.');
    });
});

// Configuración de rutas estáticas y paths
const VAULT_DIR = path.join(__dirname, 'vault');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const TELEMETRY_PATH = path.join(__dirname, 'src', 'telemetry_bridge.json');
const CONFIG_DIR = path.join(__dirname, '.config');
const AGENT_RULES_DIR = path.join(__dirname, '.agents', 'rules');

const CORE_AGENT_IDS = [
    'traductor-universal',
    'corrector-lqa',
    'localizador-cultural',
    'extractor-historico',
    'archivista-indexador',
    'director-arcos'
];

let SAFE_AGENT_IDS = [...CORE_AGENT_IDS];


/**
 * Verifica si un archivo o directorio existe en disco de manera asíncrona.
 * 
 * @param {string} p - Ruta a verificar.
 * @returns {Promise<boolean>}
 */
async function existsAsync(p) {
    try {
        await fs.promises.access(p);
        return true;
    } catch {
        return false;
    }
}

/**
 * Escribe un archivo de manera atómica en disco para evitar corrupción de datos en Windows.
 * Escribe primero en un archivo temporal (.tmp) y luego realiza un renombrado atómico.
 * 
 * @param {string} filePath - Ruta completa del archivo destino.
 * @param {string|Object} content - Contenido a escribir (string de texto o un objeto JSON).
 * @returns {Promise<void>}
 */
async function safeWriteFileAsync(filePath, content) {
    const tmpPath = `${filePath}.tmp`;
    const dir = path.dirname(filePath);
    try {
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        const dataToWrite = typeof content === 'string' ? content : JSON.stringify(content, null, 4);
        await fs.promises.writeFile(tmpPath, dataToWrite, 'utf8');
        await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
        console.error(`[SAFE WRITE ERROR] Falló la escritura atómica en ${filePath}:`, err);
        // Limpiar archivo temporal si quedó huérfano
        try {
            if (fs.existsSync(tmpPath)) {
                await fs.promises.unlink(tmpPath);
            }
        } catch (unlinkErr) {
            // Ignorar fallas al desvincular
        }
        throw err;
    }
}

/**
 * Resuelve y valida de manera segura una ruta en el sistema de archivos,
 * previniendo ataques de Path Traversal (CWE-22) y asegurando que la ruta
 * permanezca dentro del directorio base configurado.
 * 
 * @param {string} basePath - Directorio base restringido y de confianza (ej. VAULT_DIR).
 * @param {...string} segments - Segmentos o entradas del usuario para concatenar y construir la ruta.
 * @returns {string} - La ruta absoluta resuelta y normalizada.
 * @throws {Error} - Si la ruta resulta fuera del directorio base o es inválida.
 */
function resolveSafePath(basePath, ...segments) {
    const absoluteBase = path.resolve(basePath);
    const joinedPath = path.join(absoluteBase, ...segments);
    const resolvedPath = path.resolve(joinedPath);
    
    // Agregar separador al final del path base para validaciones de prefijo seguras
    const baseWithSeparator = absoluteBase.endsWith(path.sep) ? absoluteBase : absoluteBase + path.sep;
    
    if (resolvedPath !== absoluteBase && !resolvedPath.startsWith(baseWithSeparator)) {
        throw new Error('Intento de acceso a ruta no autorizado (Path Traversal detectado).');
    }
    
    return resolvedPath;
}

/**
 * Realiza una búsqueda recursiva asíncrona no bloqueante de un archivo por su nombre exacto
 * dentro de un directorio específico y todos sus subdirectorios.
 * 
 * @param {string} dir - Directorio inicial de búsqueda.
 * @param {string} filename - Nombre del archivo a localizar.
 * @returns {Promise<string|null>} - Ruta absoluta del archivo encontrado o null si no existe.
 */
async function findFileRecursive(dir, filename) {
    try {
        const stats = await fs.promises.stat(dir).catch(() => null);
        if (!stats || !stats.isDirectory()) return null;
        
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = await findFileRecursive(fullPath, filename);
                if (found) return found;
            } else if (entry.isFile() && entry.name === filename) {
                return path.resolve(fullPath);
            }
        }
    } catch (err) {
        console.error(`[findFileRecursive Error] No se pudo acceder a ${dir}:`, err);
    }
    return null;
}

/**
 * Realiza una lectura recursiva asíncrona no bloqueante para listar todos los archivos
 * con una extensión específica dentro de un directorio y sus subdirectorios.
 * 
 * @param {string} dir - Directorio base de escaneo.
 * @param {string} ext - Extensión de archivos a filtrar (ej. '.md').
 * @returns {Promise<string[]>} - Promesa que resuelve a un arreglo con nombres de archivos localizados.
 */
async function getFilesRecursive(dir, ext = '.md') {
    let results = [];
    try {
        const stats = await fs.promises.stat(dir).catch(() => null);
        if (!stats || !stats.isDirectory()) return results;

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await getFilesRecursive(fullPath, ext);
                results = results.concat(subResults);
            } else if (entry.isFile() && entry.name.endsWith(ext) && entry.name !== '.gitkeep') {
                results.push(entry.name);
            }
        }
    } catch (err) {
        console.error(`[getFilesRecursive Error] Fallo al leer de forma recursiva en ${dir}:`, err);
    }
    return results;
}

// Variable global de telemetría unificada en memoria (optimización de red sin I/O de disco)
let cachedTelemetry = null;

app.use(cors());
app.use(express.json());

// Servir la Single Page Application (SPA) de producción de forma unificada si está compilada
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    console.log('[BATT BRIDGE] Ecosistema estático dist/ enlazado de forma nativa al servidor.');
}


/**
 * @class FileSemaphore
 * @description Semáforo lógico de escritura secuencial para prevenir condiciones de carrera (Race Conditions) e I/O locks en disco.
 */
class FileSemaphore {
    constructor() {
        this.queue = Promise.resolve();
    }
    
    /**
     * Adquiere el semáforo y encola una operación asíncrona sobre archivos, con reintentos exponenciales.
     * @param {Function} fn - Función asíncrona de lectura/escritura en disco.
     * @returns {Promise<any>}
     */
    acquire(fn) {
        this.queue = this.queue.then(async () => {
            let retries = 3;
            while (retries > 0) {
                try {
                    return await fn();
                } catch (err) {
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 100)); // Delay de reintento
                }
            }
        });
        return this.queue;
    }
}

const fileLock = new FileSemaphore();

/**
 * Sincroniza dinámicamente el estado físico de vault/ con el archivo de telemetría consolidado.
 * Lee los archivos de control_progreso.json y actualiza las listas de archivos de disco.
 */
async function syncTelemetryFromDisk() {
    try {
        let telemetryData = null;
        if (await existsAsync(TELEMETRY_PATH)) {
            const raw = await fs.promises.readFile(TELEMETRY_PATH, 'utf8');
            const cleanRaw = raw.replace(/^\uFEFF/, '');
            telemetryData = JSON.parse(cleanRaw);
        } else {
            telemetryData = { system_config: {}, timestamp: '', agent_flow: {}, novels: [] };
        }

        if (!(await existsAsync(VAULT_DIR))) {
            await fs.promises.mkdir(VAULT_DIR, { recursive: true });
        }

        const entries = await fs.promises.readdir(VAULT_DIR, { withFileTypes: true });
        const novelsInVault = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                novelsInVault.push(entry.name);
            }
        }

        const updatedNovels = [];
        const baseNovels = telemetryData.novels || [];

        for (const novelId of novelsInVault) {
            const novelDir = path.join(VAULT_DIR, novelId);
            const progressPath = path.join(novelDir, 'bases_datos', 'control_progreso.json');
            const candadoPath = path.join(novelDir, 'bases_datos', 'candado_proyecto.json');

            if (!(await existsAsync(progressPath))) continue;

            const progressRaw = await fs.promises.readFile(progressPath, 'utf8');
            const progress = JSON.parse(progressRaw.replace(/^\uFEFF/, ''));

            let candado = {};
            if (await existsAsync(candadoPath)) {
                const candadoRaw = await fs.promises.readFile(candadoPath, 'utf8');
                candado = JSON.parse(candadoRaw.replace(/^\uFEFF/, ''));
            }

            const origenDir = path.join(novelDir, '01_origen');
            const crudoDir = path.join(novelDir, '02_crudo');
            const finalDir = path.join(novelDir, '03_final');

            let origenFiles = [];
            if (await existsAsync(origenDir)) {
                const files = await fs.promises.readdir(origenDir);
                origenFiles = files.filter(f => f.endsWith('.txt') && f !== '.gitkeep');
            }

            let crudoFiles = [];
            if (await existsAsync(crudoDir)) {
                const files = await fs.promises.readdir(crudoDir);
                crudoFiles = files.filter(f => f !== '.gitkeep');
            }

            let finalFiles = [];
            if (await existsAsync(finalDir)) {
                finalFiles = await getFilesRecursive(finalDir, '.md');
            }

            const baseNovel = baseNovels.find(n => n.id === novelId) || {};

            const lastProcessed = progress.last_processed_chapter || 0;
            const executionHistory = progress.execution_history || [];
            const pendingQueue = progress.pending_queue || [];

            const processedChapterIds = executionHistory.map(h => h.chapter_id);
            const pendingChaptersCount = origenFiles.filter(f => {
                const id = f.replace('.txt', '');
                return !processedChapterIds.includes(id);
            }).length;

            const nextPendingChapterNum = lastProcessed + 1;
            const nextPendingChapterName = `capitulo_${String(nextPendingChapterNum).padStart(3, '0')}.txt`;

            updatedNovels.push({
                id: novelId,
                name: candado.novel_name || baseNovel.name || novelId.replace(/_/g, ' ').toUpperCase(),
                source_language: candado.source_language || baseNovel.source_language || 'zh',
                target_language: candado.target_language || baseNovel.target_language || 'es_global_neutro',
                status: 'ACTIVE',
                files_origen: origenFiles.length,
                origen_files_list: origenFiles,
                files_crudo: crudoFiles.length,
                crudo_files_list: crudoFiles,
                files_final: finalFiles.length,
                final_files_list: finalFiles,
                last_processed_chapter: lastProcessed,
                pending_chapters: pendingChaptersCount,
                next_pending_chapter_num: nextPendingChapterNum,
                next_pending_chapter_name: nextPendingChapterName,
                execution_history: executionHistory,
                pending_queue: pendingQueue
            });
        }

        telemetryData.novels = updatedNovels;
        telemetryData.timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + ' LOCAL';

        await safeWriteFileAsync(TELEMETRY_PATH, telemetryData);
        cachedTelemetry = telemetryData;
        broadcastTelemetry(cachedTelemetry);
        console.log('[TELEMETRY SYNC] Telemetría consolidada unificada y transmitida por WebSockets.');
    } catch (err) {
        console.error('[TELEMETRY SYNC ERROR] Fallo al sincronizar telemetría física:', err);
    }
}

/**
 * Simula de forma asíncrona la traducción del capítulo por el pipeline de agentes de BATT.
 * Al cabo de 4 segundos, el capítulo transiciona de forma autónoma al estado completado y se notifica por WebSocket.
 */
/**
 * Realiza una llamada HTTP a la API de Gemini utilizando fetch integrado nativo de Node.js (v18+).
 * Implementa reintentos exponenciales automáticos, tolerancia a fallas y un fallback de
 * simulación interactiva de alta fidelidad si no se detecta una clave de API válida.
 * 
 * @param {string} agentId - Identificador único del agente que procesa (ej. 'traductor-universal').
 * @param {string} systemInstruction - Reglas del sistema y prompt del agente.
 * @param {string} userPrompt - El contenido o entrada de texto que debe procesar el agente.
 * @returns {Promise<string>} - El texto de respuesta limpio emitido por Gemini o simulado.
 */
async function callGeminiAPI(agentId, systemInstruction, userPrompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Si no hay API key o tiene valor placeholder, pasamos a la simulación interactiva de alta fidelidad de inmediato.
    if (!apiKey || apiKey === 'tu_clave_aqui' || apiKey.startsWith('YOUR_') || apiKey.trim() === '') {
        console.warn(`[GEMINI API] Clave no detectada o genérica para '${agentId}'. Ejecutando simulación de alta fidelidad.`);
        // Simular un pequeño retardo de procesamiento realista (1.2 segundos) para emular el flujo asíncrono
        await new Promise(resolve => setTimeout(resolve, 1200));
        return generateSimulatedAgentResponse(agentId, userPrompt);
    }

    // Obtener el modelo asignado al agente de la configuración
    let model = 'gemini-1.5-flash'; // Fallback por defecto si no hay configuración
    try {
        const configPath = path.join(CONFIG_DIR, 'configuration.json');
        if (await existsAsync(configPath)) {
            const raw = await fs.promises.readFile(configPath, 'utf8');
            const config = JSON.parse(raw);
            if (config.model_routing && config.model_routing[agentId]) {
                model = config.model_routing[agentId];
            }
        }
    } catch (err) {
        console.warn(`[GEMINI API] No se pudo leer el enrutamiento de modelo para '${agentId}'. Usando fallback '${model}'.`, err);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 8192
        }
    };

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
                
                // Si es un rate limit (429) o error del servidor (5xx), aplicamos backoff y reintentamos
                if (response.status === 429 || response.status >= 500) {
                    retries--;
                    console.warn(`[GEMINI API] Error recuperable (${response.status}) para '${agentId}'. Reintentando en ${delay}ms... Reintentos restantes: ${retries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }
                
                throw new Error(`API Error: ${errMsg}`);
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Formato de respuesta de Gemini inválido o vacío.');
            }

        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error(`[GEMINI API] Error crítico definitivo tras reintentos para '${agentId}':`, err);
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

/**
 * Generador interactivo de respuestas de simulación literarias de alta calidad
 * para garantizar el funcionamiento sin fallos y costo cero.
 * 
 * @param {string} agentId - Identificador del agente.
 * @param {string} userPrompt - Contenido provisto.
 * @returns {string} - Texto simulado de alta calidad literaria.
 */
function generateSimulatedAgentResponse(agentId, userPrompt) {
    // Intentar extraer el número de capítulo
    const chapterMatch = userPrompt.match(/capitulo_(\d+)/i) || userPrompt.match(/Capítulo\s*(\d+)/i);
    const num = chapterMatch ? parseInt(chapterMatch[1]) : 1;
    
    switch (agentId) {
        case 'traductor-universal':
            return `[SIMULACIÓN TRADUCCIÓN LITERAL — AGENTE TRADUCTOR-UNIVERSAL]\n# Capítulo ${num} — Un Amanecer de Sangre y Jade\n\nEl viento soplaba furioso sobre la Cumbre del Emperador Celestial. Lin Fan sostenía su espada rota, con la túnica empapada en sangre. Había regresado del abismo cósmico después de diez mil años de exilio espiritual. Su mirada estaba serena, llena de una determinación inquebrantable. El Dao del Origen Celestial fluía silencioso en sus venas restauradas.`;
            
        case 'corrector-lqa':
            return `[REPORTE DE CORRECCIÓN ORTOTIPOGRÁFICA Y LQA — AGENTE CORRECTOR-LQA]\n# Capítulo ${num} — Un Amanecer de Sangre y Jade\n\nEl viento aullaba ferozmente sobre la Cumbre del Emperador Celestial. Lin Fan empuñaba su espada quebrada, con su túnica empapada de sangre. (╬ಠ益ಠ)\n\nHabía retornado del abismo cósmico tras diez mil años de exilio espiritual. Su mirada reflejaba una serenidad absoluta, desbordante de una determinación inquebrantable. (•̀ᴗ•́)ו ̑̑\n\nEl Dao del Origen Celestial fluía con sigilo a través de sus venas restauradas, sintonizándose con el latido de la galaxia. (✿◠‿✿)\n\n---\n*Reporte LQA: Estilo refinado, consistencia de honoríficos verificada al 100%, flujo de prosa fluido de xianxia clásica.*`;
            
        case 'localizador-cultural':
            return `[ADAPTACIÓN CULTURAL Y NOTAS — AGENTE LOCALIZADOR-CULTURAL]\n# Capítulo ${num} — Un Amanecer de Sangre y Jade\n\nEl viento aullaba ferozmente sobre la Cumbre del Emperador Celestial. Lin Fan empuñaba su espada quebrada, con su túnica empapada de sangre. (╬ಠ益ಠ)\n\nHabía retornado del abismo cósmico tras diez mil años de exilio espiritual. Su mirada reflejaba una serenidad absoluta, desbordante de una determinación inquebrantable. (•̀ᴗ•́)ו ̑̑\n\nEl Dao del Origen Celestial fluía con sigilo a través de sus venas restauradas, sintonizándose con el latido de la galaxia. (✿◠‿✿)\n\n---\n\n> **Nota del Localizador Cultural:** La Cumbre del Emperador Celestial (*Tiandifeng*) representa el punto geográfico más alto de la mitología del cultivo de almas, conectando la tierra con el Palacio de Jade en los cielos. La espada rota simboliza la ruptura de su antiguo lazo kármico terrenal antes de su ascensión inmortal.`;
            
        case 'extractor-historico':
            return `[EXTRACCIÓN DE GLOSARIO — AGENTE EXTRACTOR-HISTÓRICO]\n### Nuevos Términos del Capítulo ${num}:\n- **Lin Fan** (林凡): El soberano de la espada celestial retornado tras 10,000 años. Determinación indomable.\n- **Cumbre del Emperador Celestial** (天帝峰 — *Tiandifeng*): Montaña mitológica y nexo de ascensión cósmica.\n- **Dao del Origen Celestial** (天源道): La ley mística primordial que Lin Fan domina en sus venas.`;
            
        case 'archivista-indexador':
            return `[CRÓNICA Y RESUMEN — AGENTE ARCHIVISTA-INDEXADOR]\n### Crónica de Eventos - Capítulo ${num}:\nLin Fan reaparece misteriosamente en la Cumbre del Emperador Celestial luego de diez mil años de exilio en el vacío. Gravemente herido pero con su cultivo interior del Dao del Origen restaurado y en perfecto equilibrio con el cosmos.`;
            
        case 'director-arcos':
            return `[ANÁLISIS DE RITMO Y ARCOS — AGENTE DIRECTOR-ARCOS]\n### Evaluación de Dirección Narrativa - Capítulo ${num}:\n- **Ritmo:** Alto-tenso. Presenta un inicio de novela explosivo con el retorno de Lin Fan.\n- **Desarrollo de Personaje:** Lin Fan muestra madurez mental y maestría emocional típica de un cultivador inmortal experimentado.\n- **Arco del Capítulo:** Apertura del Arco "El Retorno del Cultivador Divino". Estructura de tensión balanceada de manera óptima.`;
            
        default:
            return `Respuesta simulada para el agente ${agentId}.`;
    }
}

// Variable de bloqueo del worker para prevenir colisiones asíncronas
let isProcessingQueue = false;

/**
 * Orquestador principal continuo del sistema de traducción de agentes asíncronos (Queue Worker).
 * Escanea de forma continua el directorio vault/ buscando novelas con capítulos pendientes en cola.
 * Procesa secuencialmente cada capítulo a través de las 6 personalidades de IA del pipeline,
 * actualizando en tiempo real la telemetría, glosarios e interactividad del WebSocket.
 */
async function startQueueWorker() {
    console.log('[QUEUE WORKER] Orquestador de colas de agentes asíncronos enlazado.');
    
    setInterval(async () => {
        if (isProcessingQueue) return; // Si ya está ocupado procesando, esperar al siguiente ciclo
        
        try {
            if (!(await existsAsync(VAULT_DIR))) return;
            
            const entries = await fs.promises.readdir(VAULT_DIR, { withFileTypes: true });
            const novels = entries.filter(e => {
                try {
                    return e.isDirectory();
                } catch {
                    return false;
                }
            }).map(e => e.name);
            
            for (const novelId of novels) {
                const novelDir = path.join(VAULT_DIR, novelId);
                const progressPath = path.join(novelDir, 'bases_datos', 'control_progreso.json');
                
                if (!(await existsAsync(progressPath))) continue;
                
                let progress = null;
                try {
                    const raw = await fs.promises.readFile(progressPath, 'utf8');
                    progress = JSON.parse(raw.replace(/^\uFEFF/, ''));
                } catch (e) {
                    console.error(`[QUEUE WORKER] No se pudo leer control_progreso.json para ${novelId}:`, e);
                    continue;
                }
                
                if (!progress.pending_queue || progress.pending_queue.length === 0) continue;
                
                // ¡Encontramos un capítulo pendiente! Adquirir bloqueo de cola
                isProcessingQueue = true;
                const chapterItem = progress.pending_queue[0];
                const chapterId = chapterItem.chapter_id;
                const fileName = chapterItem.file_name;
                
                console.log(`[QUEUE WORKER] Detectado capítulo '${chapterId}' para la novela '${novelId}' en cola.`);
                
                try {
                    await processChapterThroughPipeline(novelId, chapterId, fileName, progress, progressPath);
                } catch (err) {
                    console.error(`[QUEUE WORKER ERROR] Falla al procesar capítulo ${chapterId} de ${novelId}:`, err);
                    await markChapterAsFailed(novelId, chapterId, progress, progressPath, err.message);
                } finally {
                    isProcessingQueue = false;
                }
                
                break; // Procesar una novela/capítulo a la vez por ciclo para balance de I/O
            }
        } catch (err) {
            console.error('[QUEUE WORKER CRITICAL ERROR] Falla en bucle del worker:', err);
            isProcessingQueue = false;
        }
    }, 3000); // Monitoreo ágil cada 3 segundos
}

/**
 * Mapea códigos de idiomas a descripciones legibles por la IA en español.
 * @param {string|string[]} codes - Código o lista de códigos de idiomas.
 * @returns {string} - Descripción textual legible por humanos e IAs.
 */
function mapLanguageCodesToText(codes) {
    const LANG_MAP = {
        'zh': 'Chino (Idioma de origen, respetando honoríficos, modismos de cultivo y Chengyu)',
        'ko': 'Coreano (Idioma de origen, respetando expresiones locales y dialectos)',
        'ja': 'Japonés (Idioma de origen, respetando sufijos honoríficos -san, -sama, -kun, etc.)',
        'ru': 'Ruso (Idioma de origen, adaptando nombres rusos clásicos)',
        'de': 'Alemán (Idioma de origen)',
        'es_global_neutro': 'Español Neutro (Estilo Literario clásico para novelas ligeras de xianxia)',
        'es': 'Español Neutro (Estilo Literario clásico para novelas ligeras de xianxia)',
        'en_literary': 'Inglés Literario (Estilo de prosa de alta fidelidad, con fluidez narrativa)',
        'en': 'Inglés Literario (Estilo de prosa de alta fidelidad, con fluidez narrativa)',
        'it_literary': 'Italiano Literario (Estilo elegante, manteniendo el ritmo narrativo)',
        'it': 'Italiano Literario (Estilo elegante, manteniendo el ritmo narrativo)',
        'sr_cyrillic': 'Serbio en Alfabeto Cirílico (Mapeando con precisión la entonación lírica)'
    };

    const codesArray = Array.isArray(codes) ? codes : [codes];
    const resolvedNames = codesArray.map(code => {
        const cleanCode = code.trim().toLowerCase();
        return LANG_MAP[cleanCode] || cleanCode.toUpperCase();
    });

    if (resolvedNames.length === 0) return 'Español Neutro';
    if (resolvedNames.length === 1) return resolvedNames[0];
    
    // Si hay múltiples idiomas de destino, los unimos de forma elegante
    const last = resolvedNames.pop();
    return `${resolvedNames.join(', ')} e ${last}`;
}

/**
 * Procesa de forma secuencial un capítulo a través de las 6 fases de agentes de BATT.

 * Actualiza en caliente los archivos de origen, crudo, final y actualiza las bases de datos md.
 */
async function processChapterThroughPipeline(novelId, chapterId, fileName, progress, progressPath) {
    const novelDir = resolveSafePath(VAULT_DIR, novelId);
    const originPath = resolveSafePath(novelDir, '01_origen', fileName);
    
    if (!(await existsAsync(originPath))) {
        throw new Error(`El archivo de origen '${fileName}' no existe físicamente en el disco duro.`);
    }
    
    const sourceText = await fs.promises.readFile(originPath, 'utf8');
    if (!sourceText.trim()) {
        throw new Error(`El archivo de origen '${fileName}' está completamente vacío.`);
    }

    // Resolver los idiomas dinámicamente desde candado_proyecto.json
    const candadoPath = path.join(novelDir, 'bases_datos', 'candado_proyecto.json');
    let sourceLanguageCode = 'zh';
    let targetLanguagesCodes = ['es_global_neutro'];

    if (await existsAsync(candadoPath)) {
        try {
            const candadoRaw = await fs.promises.readFile(candadoPath, 'utf8');
            const candado = JSON.parse(candadoRaw.replace(/^\uFEFF/, ''));
            
            sourceLanguageCode = candado.source_language || 'zh';
            
            // Soportar tanto target_languages (múltiple) como target_language (singular clásico)
            if (candado.target_languages && Array.isArray(candado.target_languages)) {
                targetLanguagesCodes = candado.target_languages;
            } else if (candado.target_language) {
                targetLanguagesCodes = [candado.target_language];
            }
        } catch (err) {
            console.warn(`[PIPELINE] No se pudo leer candado_proyecto.json para obtener idiomas de ${novelId}. Usando valores por defecto (zh->es).`, err);
        }
    }

    const sourceLangText = mapLanguageCodesToText(sourceLanguageCode);
    const targetLangsText = mapLanguageCodesToText(targetLanguagesCodes);

    console.log(`[PIPELINE] Idiomas detectados para la novela '${novelId}': Origen = ${sourceLanguageCode} (${sourceLangText}) ➔ Destino = ${targetLanguagesCodes.join(', ')} (${targetLangsText})`);

    // Inicializar estados de telemetría de procesamiento interactivo para que la UI de la SPA brille en tiempo real
    emitAgentProgress(novelId, chapterId, 'traductor-universal', 'processing', 10);

    let currentText = sourceText;
    const agentOutputs = {};

    // 1. Traductor Universal
    console.log(`[PIPELINE] [1/6] Procesando 'traductor-universal' para ${novelId} ➔ ${chapterId}...`);
    const systemPromptTraductor = await getAgentPrompt('traductor-universal', sourceLangText, targetLangsText);
    agentOutputs['traductor-universal'] = await callGeminiAPI('traductor-universal', systemPromptTraductor, currentText);
    emitAgentProgress(novelId, chapterId, 'corrector-lqa', 'processing', 30);

    // 2. Corrector LQA
    console.log(`[PIPELINE] [2/6] Procesando 'corrector-lqa' para ${novelId} ➔ ${chapterId}...`);
    const systemPromptCorrector = await getAgentPrompt('corrector-lqa', sourceLangText, targetLangsText);
    agentOutputs['corrector-lqa'] = await callGeminiAPI('corrector-lqa', systemPromptCorrector, agentOutputs['traductor-universal']);
    emitAgentProgress(novelId, chapterId, 'localizador-cultural', 'processing', 50);

    // 3. Localizador Cultural
    console.log(`[PIPELINE] [3/6] Procesando 'localizador-cultural' para ${novelId} ➔ ${chapterId}...`);
    const systemPromptLocalizador = await getAgentPrompt('localizador-cultural', sourceLangText, targetLangsText);
    agentOutputs['localizador-cultural'] = await callGeminiAPI('localizador-cultural', systemPromptLocalizador, agentOutputs['corrector-lqa']);
    emitAgentProgress(novelId, chapterId, 'extractor-historico', 'processing', 70);

    // Guardar archivos intermedios inmediatamente en 02_crudo/
    const crudoDir = resolveSafePath(novelDir, '02_crudo');
    await fs.promises.mkdir(crudoDir, { recursive: true });
    await safeWriteFileAsync(path.join(crudoDir, `${chapterId}_crudo.txt`), agentOutputs['traductor-universal']);
    await safeWriteFileAsync(path.join(crudoDir, `${chapterId}_lqa.txt`), agentOutputs['corrector-lqa']);

    // El texto final traducido es el del Localizador Cultural (contiene prosa estilizada + notas culturales)
    const finalContent = agentOutputs['localizador-cultural'];

    // 4. Extractor Histórico
    console.log(`[PIPELINE] [4/6] Procesando 'extractor-historico' para ${novelId} ➔ ${chapterId}...`);
    const glosarioPath = resolveSafePath(novelDir, 'bases_datos', 'glosario_elenco.md');
    let glosarioContent = '';
    if (await existsAsync(glosarioPath)) {
        glosarioContent = await fs.promises.readFile(glosarioPath, 'utf8');
    }
    const systemPromptExtractor = await getAgentPrompt('extractor-historico', sourceLangText, targetLangsText);
    const extractorPrompt = `Glosario actual:\n\n${glosarioContent}\n\nCapítulo Traducido:\n\n${finalContent}\n\nAnaliza el capítulo e integra los nuevos personajes, sectas, reinos y técnicas de cultivo al glosario. Devuelve el glosario completo actualizado en formato markdown limpio.`;
    agentOutputs['extractor-historico'] = await callGeminiAPI('extractor-historico', systemPromptExtractor, extractorPrompt);
    emitAgentProgress(novelId, chapterId, 'archivista-indexador', 'processing', 80);

    // Guardar actualización de glosario
    await safeWriteFileAsync(glosarioPath, agentOutputs['extractor-historico']);

    // 5. Archivista e Indexador
    console.log(`[PIPELINE] [5/6] Procesando 'archivista-indexador' para ${novelId} ➔ ${chapterId}...`);
    const cronicaPath = resolveSafePath(novelDir, 'bases_datos', 'indice_cronologico.md');
    let cronicaContent = '';
    if (await existsAsync(cronicaPath)) {
        cronicaContent = await fs.promises.readFile(cronicaPath, 'utf8');
    }
    const systemPromptArchivista = await getAgentPrompt('archivista-indexador', sourceLangText, targetLangsText);
    const archivistaPrompt = `Índice cronológico actual:\n\n${cronicaContent}\n\nCapítulo Traducido:\n\n${finalContent}\n\nAgrega el resumen cronológico y los hitos del capítulo al índice cronológico. Devuelve la crónica completa actualizada en formato markdown limpio.`;
    agentOutputs['archivista-indexador'] = await callGeminiAPI('archivista-indexador', systemPromptArchivista, archivistaPrompt);
    emitAgentProgress(novelId, chapterId, 'director-arcos', 'processing', 90);

    // Guardar actualización de índice cronológico
    await safeWriteFileAsync(cronicaPath, agentOutputs['archivista-indexador']);

    // 6. Director de Arcos
    console.log(`[PIPELINE] [6/6] Procesando 'director-arcos' para ${novelId} ➔ ${chapterId}...`);
    const perfilPath = resolveSafePath(novelDir, 'bases_datos', 'perfil_novela.md');
    let perfilContent = '';
    if (await existsAsync(perfilPath)) {
        perfilContent = await fs.promises.readFile(perfilPath, 'utf8');
    }
    const systemPromptDirector = await getAgentPrompt('director-arcos', sourceLangText, targetLangsText);
    const directorPrompt = `Perfil de la novela actual:\n\n${perfilContent}\n\nCapítulo Traducido:\n\n${finalContent}\n\nEvalúa los arcos de personajes y el ritmo narrativo del nuevo capítulo, e intégralo al perfil de la novela. Devuelve el perfil completo actualizado en formato markdown limpio.`;
    agentOutputs['director-arcos'] = await callGeminiAPI('director-arcos', systemPromptDirector, directorPrompt);
    emitAgentProgress(novelId, chapterId, 'director-arcos', 'processing', 95);

    // Guardar actualización de perfil de la novela
    await safeWriteFileAsync(perfilPath, agentOutputs['director-arcos']);

    // Escribir notas de traducción
    const notasPath = resolveSafePath(novelDir, 'bases_datos', 'notas_traduccion.md');
    let notasContent = '';
    if (await existsAsync(notasPath)) {
        notasContent = await fs.promises.readFile(notasPath, 'utf8');
    }
    const capNumOnly = chapterId.replace(/[^0-9]/g, '');
    const notasActualizadas = `${notasContent}\n\n### Notas del Capítulo ${capNumOnly}\n${agentOutputs['localizador-cultural'].substring(agentOutputs['localizador-cultural'].indexOf('>') !== -1 ? agentOutputs['localizador-cultural'].indexOf('>') : 0)}`;
    await safeWriteFileAsync(notasPath, notasActualizadas);

    // Guardar el archivo final traducido en 03_final/
    const finalDir = resolveSafePath(novelDir, '03_final');
    await fs.promises.mkdir(finalDir, { recursive: true });
    await safeWriteFileAsync(path.join(finalDir, `${chapterId}_final.md`), finalContent);

    // Quitar el primer elemento de la cola
    progress.pending_queue.shift();

    // Extraer título aproximado para el historial
    const chapterNumStr = chapterId.replace(/[^0-9]/g, '');
    const cleanChapterNum = parseInt(chapterNumStr) || 1;
    let titleEs = `Capítulo ${cleanChapterNum}`;
    const titleMatch = finalContent.match(/#\s*Capítulo\s*\d+\s*[—-]\s*(.+)/i) || finalContent.match(/#\s*(.+)/);
    if (titleMatch && titleMatch[1]) {
        titleEs = titleMatch[1].trim();
    }

    // Registrar en el historial de ejecución
    if (!progress.execution_history) progress.execution_history = [];
    progress.execution_history.push({
        chapter_id: chapterId,
        title_es: titleEs,
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
        processed_by_agents: SAFE_AGENT_IDS
    });

    // Actualizar punteros de progreso de la novela
    if (cleanChapterNum > progress.last_processed_chapter) {
        progress.last_processed_chapter = cleanChapterNum;
        progress.last_processed_date = new Date().toISOString().split('T')[0];
    }

    // Escribir los cambios en disco duro
    await safeWriteFileAsync(progressPath, progress);
    console.log(`[PIPELINE COMPLETED] Capítulo ${chapterId} traducido y procesado exitosamente por los 6 agentes.`);

    // Emitir telemetría final en caliente y notificar éxito absoluto al WebSocket
    emitAgentProgress(novelId, chapterId, 'director-arcos', 'completed', 100);
    await syncTelemetryFromDisk();
}

/**
 * Recupera el prompt del agente desde su archivo markdown correspondiente e inyecta dinámicamente los idiomas de origen y destino.
 * 
 * @param {string} agentId - Identificador del agente.
 * @param {string} [sourceLanguageText] - Idioma de origen formateado en español natural.
 * @param {string} [targetLanguagesText] - Idiomas de destino formateados en español natural.
 * @returns {Promise<string>} - Reglas del sistema con placeholders reemplazados.
 */
async function getAgentPrompt(agentId, sourceLanguageText = 'Chino', targetLanguagesText = 'Español Neutro (Estilo Literario)') {
    const rulePath = path.join(AGENT_RULES_DIR, `${agentId}.md`);
    let content = `Eres el agente ${agentId}. Traduce y procesa literatura clásica de xianxia con maestría y sin perder contexto.`;
    
    if (await existsAsync(rulePath)) {
        content = await fs.promises.readFile(rulePath, 'utf8');
    }
    
    // Reemplazar placeholders dinámicos de forma interactiva
    content = content.replace(/\{source_language\}/g, sourceLanguageText);
    content = content.replace(/\{target_languages\}/g, targetLanguagesText);
    content = content.replace(/\{target_language\}/g, targetLanguagesText); // Por retrocompatibilidad
    
    return content;
}

/**
 * Marca un capítulo de novela en cola como fallido de manera segura e interactiva.
 */
async function markChapterAsFailed(novelId, chapterId, progress, progressPath, errorMessage) {
    try {
        console.warn(`[PIPELINE FAIL] Marcando capítulo ${chapterId} como FAILED en ${novelId}. Razón: ${errorMessage}`);
        
        // Quitarlo de la cola
        progress.pending_queue.shift();
        
        // Registrar en historial como fallido
        if (!progress.execution_history) progress.execution_history = [];
        progress.execution_history.push({
            chapter_id: chapterId,
            title_es: `Fallo: ${chapterId}`,
            timestamp: new Date().toISOString(),
            status: "FAILED",
            error: errorMessage,
            processed_by_agents: []
        });
        
        await safeWriteFileAsync(progressPath, progress);
        
        // Emitir estado fallido por WebSocket
        emitAgentProgress(novelId, chapterId, 'traductor-universal', 'error', 0, errorMessage);
        await syncTelemetryFromDisk();
    } catch (e) {
        console.error('[PIPELINE FAIL MARKER ERROR] Falló al marcar error del capítulo:', e);
    }
}

/**
 * Transmite de forma interactiva el progreso de un agente en caliente mediante WebSockets.
 * Esto mantiene sincronizada la SPA 'Gestor de Agentes' de forma dinámica.
 */
function emitAgentProgress(novelId, chapterId, agentId, status, percent, error = null) {
    const wsPayload = {
        type: 'AGENT_TELEMETRY',
        timestamp: new Date().toISOString(),
        novel_id: novelId,
        chapter_id: chapterId,
        agent_id: agentId,
        status: status, // 'processing' | 'completed' | 'error'
        percent: percent,
        error: error
    };
    
    // Broadcast en caliente
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            try {
                client.send(JSON.stringify(wsPayload));
            } catch (err) {
                console.error('[WS BROADCAST PROGRESS] Fallo al enviar actualización del agente:', err);
            }
        }
    });
}

// const fileLock = new FileSemaphore(); // Removido por duplicidad en la declaración global del archivo

/**
 * @route POST /api/novels
 * @description Crea un nuevo proyecto de novela en vault/ basándose en las plantillas del sistema.
 */
app.post('/api/novels', async (req, res) => {
    const { id, name, source_language, target_language } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Falta ID identificador de la novela.' });
    }

    try {
        // Validación estricta del ID para evitar cualquier carácter de path traversal o vulnerabilidad en Windows
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
        if (cleanId !== id) {
            return res.status(400).json({ error: 'El ID de la novela contiene caracteres no permitidos. Use solo letras, números, guiones o guiones bajos.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, cleanId);
        const basesDatosDir = resolveSafePath(novelDir, 'bases_datos');

        if (await existsAsync(novelDir)) {
            return res.status(409).json({ error: 'La novela especificada ya existe en el disco duro local.' });
        }

        // Crear estructura física de directorios de novela en disco de manera asíncrona
        await fs.promises.mkdir(novelDir, { recursive: true });
        await fs.promises.mkdir(basesDatosDir, { recursive: true });
        await fs.promises.mkdir(resolveSafePath(novelDir, '01_origen'), { recursive: true });
        await fs.promises.mkdir(resolveSafePath(novelDir, '02_crudo'), { recursive: true });
        await fs.promises.mkdir(resolveSafePath(novelDir, '03_final'), { recursive: true });

        // Inyectar plantillas por defecto en bases_datos/
        const templates = {
            'template_elenco_historico.md': 'glosario_elenco.md',
            'template_resumen.md': 'indice_cronologico.md',
            'template_notas_culturales.md': 'notas_traduccion.md',
            'template_vista_director.md': 'perfil_novela.md'
        };

        for (const [template, dest] of Object.entries(templates)) {
            const srcPath = resolveSafePath(TEMPLATES_DIR, template);
            const destPath = resolveSafePath(basesDatosDir, dest);
            if (await existsAsync(srcPath)) {
                await fs.promises.copyFile(srcPath, destPath);
            }
        }

        // Crear configuración de candado_proyecto.json inicial
        const candado = {
            novel_id: cleanId,
            novel_name: name || cleanId.replace(/_/g, ' ').toUpperCase(),
            pipeline_active: true,
            safety_lockout: false,
            source_language: source_language || 'zh',
            target_language: target_language || 'es_global_neutro',
            operational_restrictions: {
                prevent_overwrite_final_chapters: true,
                allow_background_analytics: true
            }
        };

        // Crear control de progreso inicial
        const progreso = {
            novel_id: cleanId,
            last_processed_chapter: 0,
            last_processed_date: new Date().toISOString().split('T')[0],
            execution_history: [],
            pending_queue: []
        };

        await safeWriteFileAsync(resolveSafePath(basesDatosDir, 'candado_proyecto.json'), candado);
        await safeWriteFileAsync(resolveSafePath(basesDatosDir, 'control_progreso.json'), progreso);

        await syncTelemetryFromDisk();

        return res.status(201).json({ success: true, message: `Estructura para "${name}" creada exitosamente en el disco.` });
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Identificador de novela inválido.' : `Fallo al inicializar novela física: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});

/**
 * @route DELETE /api/novels/:id
 * @description Elimina físicamente el proyecto de novela del disco.
 */
app.delete('/api/novels/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
        if (cleanId !== id) {
            return res.status(400).json({ error: 'Identificador de novela inválido.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, cleanId);

        if (!(await existsAsync(novelDir))) {
            return res.status(404).json({ error: 'La novela solicitada no existe en el disco duro.' });
        }
        
        await fs.promises.rm(novelDir, { recursive: true, force: true });
        await syncTelemetryFromDisk();
        return res.json({ success: true, message: `Carpeta del proyecto "${id}" descartada del disco físico.` });
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Identificador de novela inválido.' : `Error de descarte físico: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});

/**
 * @route POST /api/chapters/upload
 * @description Recibe un capítulo en formato plano, sanitiza su nombre y lo escribe en 01_origen/
 */
app.post('/api/chapters/upload', express.raw({ type: 'text/plain', limit: '10mb' }), async (req, res) => {
    const novelId = req.headers['x-novel-id'];
    const filename = req.headers['x-file-name'];

    if (!novelId || !filename) {
        return res.status(400).json({ error: 'Faltan cabeceras requeridas: x-novel-id o x-file-name.' });
    }

    try {
        const text = req.body.toString('utf8');

        // Sanitización rigurosa de nombres de archivos para evitar fallos en Windows/PowerShell
        const cleanName = filename
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remover marcas diacríticas/acentos
            .replace(/[^a-zA-Z0-9_\.-]/g, "_") // Reemplazar caracteres especiales por guiones bajos
            .toLowerCase();

        const cleanNovelId = novelId.replace(/[^a-zA-Z0-9_-]/g, "");
        if (cleanNovelId !== novelId) {
            return res.status(400).json({ error: 'Identificador de novela inválido.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, cleanNovelId);
        const destPath = resolveSafePath(novelDir, '01_origen', cleanName);

        if (!(await existsAsync(novelDir))) {
            return res.status(404).json({ error: 'El proyecto de novela de destino no existe.' });
        }

        await fileLock.acquire(async () => {
            await safeWriteFileAsync(destPath, text);
        });

        await syncTelemetryFromDisk();

        return res.status(201).json({ 
            success: true, 
            filename: cleanName, 
            message: 'Capítulo crudo inyectado, sanitizado y guardado exitosamente.' 
        });
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Identificador de novela o archivo inválido.' : `Fallo en almacenamiento físico del capítulo: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});


/**
 * @route POST /api/telemetry/update
 * @description Recibe y actualiza los datos unificados de telemetría en memoria para alto rendimiento (cero I/O).
 */
app.post('/api/telemetry/update', (req, res) => {
    try {
        cachedTelemetry = req.body;
        
        // Broadcast en tiempo real por WebSockets
        broadcastTelemetry(cachedTelemetry);
        
        return res.json({ success: true, message: 'Telemetría en memoria actualizada con éxito y transmitida por WebSockets.' });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al actualizar telemetría en memoria: ${err.message}` });
    }
});

/**
 * @route GET /api/telemetry
 * @description Retorna los datos unificados de telemetría desde memoria caché de alto rendimiento o fallback de disco.
 */
app.get('/api/telemetry', async (req, res) => {
    try {
        // Optimización prioritaria: Retornar caché en memoria si existe
        if (cachedTelemetry) {
            return res.json(cachedTelemetry);
        }

        // Fallback secundario de lectura de disco (arranque inicial)
        let telemetryData = null;
        await fileLock.acquire(async () => {
            if (fs.existsSync(TELEMETRY_PATH)) {
                const raw = await fs.promises.readFile(TELEMETRY_PATH, 'utf8');
                const cleanRaw = raw.replace(/^\uFEFF/, '');
                telemetryData = JSON.parse(cleanRaw);
                cachedTelemetry = telemetryData; // Calentar caché en memoria
            }
        });

        if (!telemetryData) {
            return res.status(404).json({ error: 'La telemetría no se encuentra en memoria ni en disco físico.' });
        }

        return res.json(telemetryData);
    } catch (err) {
        return res.status(500).json({ error: `Fallo en el puente de telemetría: ${err.message}` });
    }
});

/**
 * @route POST /api/chapters/delegate
 * @description Encola físicamente un capítulo en bases_datos/control_progreso.json para que el watcher inicie el pipeline.
 */
app.post('/api/chapters/delegate', async (req, res) => {
    const { novelId, chapterId, fileName } = req.body;
    if (!novelId || !chapterId || !fileName) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos: novelId, chapterId o fileName.' });
    }

    try {
        const safeNovelId = novelId.replace(/[^a-zA-Z0-9_-]/g, "");
        const safeChapterId = chapterId.replace(/[^a-zA-Z0-9_-]/g, "");

        if (safeNovelId !== novelId || safeChapterId !== chapterId) {
            return res.status(400).json({ error: 'Identificadores de novela o capítulo inválidos.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, safeNovelId);
        const progressPath = resolveSafePath(novelDir, 'bases_datos', 'control_progreso.json');

        if (!(await existsAsync(progressPath))) {
            return res.status(404).json({ error: 'El archivo de control de progreso no existe para esta novela.' });
        }

        let success = false;
        let msg = '';

        await fileLock.acquire(async () => {
            const raw = await fs.promises.readFile(progressPath, 'utf8');
            const cleanRaw = raw.replace(/^\uFEFF/, '');
            const progress = JSON.parse(cleanRaw);

            if (!progress.pending_queue) {
                progress.pending_queue = [];
            }

            // Comprobar si ya está en la cola o completado
            const isQueued = progress.pending_queue.some(q => q.chapter_id === safeChapterId);
            const isCompleted = progress.execution_history && progress.execution_history.some(h => h.chapter_id === safeChapterId);

            if (isCompleted) {
                msg = 'El capítulo ya ha sido procesado de principio a fin por el pipeline.';
            } else if (isQueued) {
                msg = 'El capítulo ya se encuentra en cola de espera activa.';
                success = true;
            } else {
                progress.pending_queue.push({
                    chapter_id: safeChapterId,
                    file_name: fileName,
                    queued_at: new Date().toISOString()
                });
                await safeWriteFileAsync(progressPath, progress);
                msg = 'Capítulo encolado exitosamente en el disco local para los agentes de BATT.';
                success = true;
            }
        });

        if (success) {
            await syncTelemetryFromDisk();
        }

        return res.json({ success, message: msg });
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Identificador de novela o capítulo inválido.' : `Error al delegar capítulo en disco: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});


/**
 * @route GET /api/chapters/view
 * @description Envía el archivo traducido markdown (.md) desde 03_final/ en formato stream de texto.
 */
app.get('/api/chapters/view', async (req, res) => {
    const { novelId, chapterId } = req.query;
    if (!novelId || !chapterId) {
        return res.status(400).json({ error: 'Faltan parámetros de consulta obligatorios: novelId y chapterId.' });
    }

    try {
        // Prevención estricta de vulnerabilidades de Directory Traversal
        const safeNovelId = novelId.replace(/[^a-zA-Z0-9_-]/g, "");
        const safeChapterId = chapterId.replace(/[^a-zA-Z0-9_-]/g, "");

        if (safeNovelId !== novelId || safeChapterId !== chapterId) {
            return res.status(400).json({ error: 'Identificadores de novela o capítulo inválidos.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, safeNovelId);
        const finalDir = resolveSafePath(novelDir, '03_final');
        
        // Localizar el archivo de manera recursiva dentro de la carpeta final/
        const filename = `${safeChapterId}_final.md`;
        const foundPath = await findFileRecursive(finalDir, filename);

        if (!foundPath) {
            return res.status(404).json({ error: 'El capítulo traducido final especificado no existe en el disco duro.' });
        }

        // Blindaje de seguridad post-descubrimiento para evitar Path Traversal (CWE-22)
        const relativeSegment = path.relative(finalDir, foundPath);
        const filePath = resolveSafePath(finalDir, relativeSegment);
        
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Identificadores de novela o capítulo inválidos.' : `Fallo al transmitir stream de lectura del capítulo: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});



/**
 * @route POST /api/chapters/delegate-all
 * @description Encola todos los capítulos de origen pendientes de la novela en el control de progreso
 */
app.post('/api/chapters/delegate-all', async (req, res) => {
    const { novelId } = req.body;
    if (!novelId) {
        return res.status(400).json({ error: 'Falta novelId en la solicitud.' });
    }

    try {
        const safeNovelId = novelId.replace(/[^a-zA-Z0-9_-]/g, "");
        if (safeNovelId !== novelId) {
            return res.status(400).json({ error: 'Identificador de novela inválido.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, safeNovelId);
        const progPath = resolveSafePath(novelDir, 'bases_datos', 'control_progreso.json');
        const origenDir = resolveSafePath(novelDir, '01_origen');

        if (!(await existsAsync(progPath)) || !(await existsAsync(origenDir))) {
            return res.status(404).json({ error: 'Estructura física del proyecto corrupta o inexistente.' });
        }

        let progreso = null;
        const newlyDelegated = [];
        await fileLock.acquire(async () => {
            const raw = await fs.promises.readFile(progPath, 'utf8');
            progreso = JSON.parse(raw);

            const files = await fs.promises.readdir(origenDir);
            const origenFiles = files.filter(f => f.endsWith('.txt') && f !== '.gitkeep');
            
            origenFiles.forEach(file => {
                const chapterId = file.replace('.txt', '');
                const yaCompletado = progreso.execution_history.some(h => h.chapter_id === chapterId);
                const yaEnCola = progreso.pending_queue.some(p => p.chapter_id === chapterId);

                if (!yaCompletado && !yaEnCola) {
                    const item = {
                        chapter_id: chapterId,
                        file_name: file,
                        queued_at: new Date().toISOString()
                    };
                    progreso.pending_queue.push(item);
                    newlyDelegated.push(item);
                }
            });

            await safeWriteFileAsync(progPath, progreso);
        });

        if (newlyDelegated.length > 0) {
            await syncTelemetryFromDisk();
        }

        return res.json({ 
            success: true, 
            message: 'Todos los capítulos pendientes han sido agregados a la cola del pipeline local.',
            pending_queue: progreso ? progreso.pending_queue : []
        });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al delegar todo el pipeline: ${err.message}` });
    }
});


/**
 * Obtiene de manera asíncrona la lista de todos los identificadores de agentes leyendo el directorio de reglas.
 * 
 * @returns {Promise<string[]>} - Lista única de identificadores de agentes.
 */
async function getDynamicAgentIds() {
    try {
        const files = await fs.promises.readdir(AGENT_RULES_DIR);
        const agentIds = files
            .filter(file => file.endsWith('.md'))
            .map(file => path.basename(file, '.md'));
            
        // Asegurarse de que al menos los CORE_AGENT_IDS estén presentes
        const uniqueIds = Array.from(new Set([...CORE_AGENT_IDS, ...agentIds]));
        return uniqueIds;
    } catch (err) {
        console.error('[AGENT CONFIG] Error leyendo directorio de agentes:', err);
        return CORE_AGENT_IDS;
    }
}

/**
 * @route GET /api/config/agents
 * @description Obtiene la lista de todos los agentes con sus prompts y modelos asignados de forma dinámica.
 */
app.get('/api/config/agents', async (req, res) => {
    try {
        const configPath = path.join(CONFIG_DIR, 'configuration.json');
        let configuration = {};
        if (await existsAsync(configPath)) {
            const raw = await fs.promises.readFile(configPath, 'utf8');
            configuration = JSON.parse(raw);
        }

        const modelRouting = configuration.model_routing || {};
        const agentsData = [];
        const dynamicIds = await getDynamicAgentIds();

        for (const agentId of dynamicIds) {
            const rulePath = path.join(AGENT_RULES_DIR, `${agentId}.md`);
            let prompt = '';
            if (await existsAsync(rulePath)) {
                prompt = await fs.promises.readFile(rulePath, 'utf8');
            }

            agentsData.push({
                id: agentId,
                model: modelRouting[agentId] || 'gemini-1.5-pro',
                prompt: prompt,
                is_core: CORE_AGENT_IDS.includes(agentId)
            });
        }

        return res.json({ success: true, agents: agentsData });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al obtener configuración de agentes: ${err.message}` });
    }
});


/**
 * @route POST /api/config/agents
 * @description Crea o actualiza de forma segura el modelo o prompt de un agente con semáforos de escritura.
 */
app.post('/api/config/agents', async (req, res) => {
    const { id, model, prompt } = req.body;
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Identificador de agente no válido.' });
    }

    // Sanitización básica para evitar Path Traversal (CWE-22)
    const sanitizedId = id.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedId !== id) {
        return res.status(400).json({ error: 'El identificador contiene caracteres no permitidos.' });
    }

    try {
        await fileLock.acquire(async () => {
            // 1. Actualizar el modelo en configuration.json
            const configPath = path.join(CONFIG_DIR, 'configuration.json');
            if (await existsAsync(configPath)) {
                const raw = await fs.promises.readFile(configPath, 'utf8');
                const configuration = JSON.parse(raw);
                if (!configuration.model_routing) {
                    configuration.model_routing = {};
                }
                if (model) {
                    configuration.model_routing[id] = model;
                }
                await safeWriteFileAsync(configPath, configuration);
            }

            // 2. Actualizar el prompt (reglas) en .agents/rules/{id}.md
            if (prompt !== undefined) {
                const rulePath = path.join(AGENT_RULES_DIR, `${id}.md`);
                await safeWriteFileAsync(rulePath, prompt);
            }
        });

        return res.json({ success: true, message: `Configuración del agente "${id}" actualizada con éxito.` });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al escribir configuración del agente: ${err.message}` });
    }
});


/**
 * @route DELETE /api/config/agents/:id
 * @description Elimina físicamente un agente personalizado si no es un agente del core.
 */
app.delete('/api/config/agents/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Se requiere el ID del agente.' });
    }

    if (CORE_AGENT_IDS.includes(id)) {
        return res.status(400).json({ error: 'No está permitido eliminar agentes del core del sistema.' });
    }

    // Sanitización básica para evitar Path Traversal (CWE-22)
    const sanitizedId = id.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedId !== id) {
        return res.status(400).json({ error: 'El identificador del agente contiene caracteres no permitidos.' });
    }

    try {
        await fileLock.acquire(async () => {
            // 1. Eliminar de configuration.json si existe en model_routing
            const configPath = path.join(CONFIG_DIR, 'configuration.json');
            if (await existsAsync(configPath)) {
                const raw = await fs.promises.readFile(configPath, 'utf8');
                const configuration = JSON.parse(raw);
                if (configuration.model_routing && configuration.model_routing[id]) {
                    delete configuration.model_routing[id];
                    await safeWriteFileAsync(configPath, configuration);
                }
            }

            // 2. Eliminar archivo físico de disco .agents/rules/{id}.md
            const rulePath = path.join(AGENT_RULES_DIR, `${id}.md`);
            if (await existsAsync(rulePath)) {
                await fs.promises.unlink(rulePath);
            }
        });

        return res.json({ success: true, message: `Agente "${id}" eliminado exitosamente.` });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al eliminar el agente: ${err.message}` });
    }
});


/**
 * @route GET /api/config/kaomojis
 * @description Obtiene el catálogo oficial de Kaomojis.
 */
app.get('/api/config/kaomojis', async (req, res) => {
    try {
        const kaomojiPath = path.join(CONFIG_DIR, 'palette_kaomojis.json');
        if (await existsAsync(kaomojiPath)) {
            const raw = await fs.promises.readFile(kaomojiPath, 'utf8');
            const cleanRaw = raw.replace(/^\uFEFF/, '');
            return res.json(JSON.parse(cleanRaw));
        } else {
            return res.status(404).json({ error: 'La paleta oficial de Kaomojis no se encuentra.' });
        }
    } catch (err) {
        return res.status(500).json({ error: `Fallo al obtener la paleta de Kaomojis: ${err.message}` });
    }
});


/**
 * @route POST /api/config/kaomojis
 * @description Actualiza la paleta de Kaomojis con semáforos de escritura en disco.
 */
app.post('/api/config/kaomojis', async (req, res) => {
    try {
        const kaomojiPath = path.join(CONFIG_DIR, 'palette_kaomojis.json');
        const newPalette = req.body;

        if (!newPalette || typeof newPalette !== 'object' || !newPalette.matrix) {
            return res.status(400).json({ error: 'La paleta provista tiene un formato inválido.' });
        }

            await safeWriteFileAsync(kaomojiPath, newPalette);

        return res.json({ success: true, message: 'Paleta oficial de Kaomojis actualizada exitosamente en disco.' });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al escribir la paleta de Kaomojis: ${err.message}` });
    }
});


/**
 * @route GET /api/novels/:id/databases
 * @description Obtiene el listado de archivos Markdown de bases de datos de una novela.
 */
app.get('/api/novels/:id/databases', async (req, res) => {
    const { id } = req.params;
    try {
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
        if (cleanId !== id) {
            return res.status(400).json({ error: 'Identificador de novela inválido.' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, cleanId);
        const basesDatosDir = resolveSafePath(novelDir, 'bases_datos');

        if (!(await existsAsync(basesDatosDir))) {
            return res.status(404).json({ error: 'Las bases de datos para esta novela no existen.' });
        }

        const files = await fs.promises.readdir(basesDatosDir);
        const mdFiles = files.filter(f => f.endsWith('.md') && f !== '.gitkeep');

        return res.json({ success: true, databases: mdFiles });
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Acceso denegado.' : `Error al leer bases de datos: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});

/**
 * @route GET /api/novels/:id/databases/:file
 * @description Obtiene el contenido plano de un archivo de base de datos Markdown específico.
 */
app.get('/api/novels/:id/databases/:file', async (req, res) => {
    const { id, file } = req.params;
    try {
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
        const cleanFile = file.replace(/[^a-zA-Z0-9_\.-]/g, "");

        if (cleanId !== id || cleanFile !== file) {
            return res.status(400).json({ error: 'Identificadores inválidos.' });
        }

        if (!cleanFile.endsWith('.md')) {
            return res.status(400).json({ error: 'Solo se permite acceder a archivos Markdown (.md).' });
        }

        const novelDir = resolveSafePath(VAULT_DIR, cleanId);
        const filePath = resolveSafePath(novelDir, 'bases_datos', cleanFile);

        if (!(await existsAsync(filePath))) {
            return res.status(404).json({ error: `La base de datos "${file}" no existe.` });
        }

        const content = await fs.promises.readFile(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.send(content);
    } catch (err) {
        const isPathError = err.message.includes('Path Traversal detectado');
        const status = isPathError ? 400 : 500;
        const msg = isPathError ? 'Acceso denegado.' : `Error al leer base de datos: ${err.message}`;
        return res.status(status).json({ error: msg });
    }
});

/**
 * @route GET /api/config/rules-globales
 * @description Retorna el texto plano del archivo rules_globales.md.
 */
app.get('/api/config/rules-globales', async (req, res) => {
    try {
        const rulesPath = path.join(CONFIG_DIR, 'rules_globales.md');
        if (!(await existsAsync(rulesPath))) {
            return res.status(404).json({ error: 'El archivo de reglas globales no se encuentra.' });
        }
        const content = await fs.promises.readFile(rulesPath, 'utf8');
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.send(content);
    } catch (err) {
        return res.status(500).json({ error: `Error al leer reglas globales: ${err.message}` });
    }
});

/**
 * @route POST /api/config/rules-globales
 * @description Actualiza el archivo rules_globales.md de manera atómica con semáforos.
 */
app.post('/api/config/rules-globales', express.text({ type: 'text/markdown', limit: '5mb' }), async (req, res) => {
    try {
        const rulesPath = path.join(CONFIG_DIR, 'rules_globales.md');
        const newContent = req.body;

        if (typeof newContent !== 'string' || !newContent.trim()) {
            return res.status(400).json({ error: 'El contenido de las reglas no puede estar vacío.' });
        }

        await fileLock.acquire(async () => {
            await safeWriteFileAsync(rulesPath, newContent);
        });

        return res.json({ success: true, message: 'Reglas globales de traducción actualizadas con éxito en disco.' });
    } catch (err) {
        return res.status(500).json({ error: `Fallo al escribir las reglas globales: ${err.message}` });
    }
});


let debounceTimer = null;
/**
 * Dispara la sincronización de telemetría de forma debounceda para evitar saturación de I/O en disco.
 */
function triggerTelemetrySyncDebounced() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        console.log('[WATCHER] Cambio en disco detectado de forma reactiva. Sincronizando telemetría...');
        await syncTelemetryFromDisk();
    }, 1000);
}

server.listen(PORT, async () => {
    console.log(`[BATT BRIDGE] Servidor local puente operando en http://localhost:${PORT} (Express & WebSockets)`);
    await syncTelemetryFromDisk();
    
    // Activar el watcher nativo de Node.js sobre vault/ de forma segura contra fallos en Windows
    if (fs.existsSync(VAULT_DIR)) {
        try {
            fs.watch(VAULT_DIR, { recursive: true }, (eventType, filename) => {
                try {
                    // Validar existencia de vault para evitar excepciones en Windows si desaparece el directorio
                    if (!fs.existsSync(VAULT_DIR)) return;
                    
                    // Ignorar archivos de base de datos internos o de telemetría para evitar bucles de sincronización
                    if (filename && (filename.includes('control_progreso.json') || filename.includes('telemetry_bridge.json') || filename.includes('candado_proyecto.json') || filename.endsWith('.tmp'))) {
                        return;
                    }
                    triggerTelemetrySyncDebounced();
                } catch (callbackErr) {
                    console.error('[WATCHER CALLBACK ERROR] Error no crítico capturado en evento de vigilante:', callbackErr);
                }
            });
            console.log('[WATCHER] Vigilante de archivos recursivo nativo montado con éxito en: ' + VAULT_DIR);
        } catch (err) {
            console.error('[WATCHER ERROR] Fallo al iniciar fs.watch en vault/:', err);
        }
    }
    
    // Lanzar el worker asíncrono en segundo plano
    startQueueWorker();
});
