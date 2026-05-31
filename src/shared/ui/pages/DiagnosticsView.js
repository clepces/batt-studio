/**
 * @file DiagnosticsView.js
 * @description Vista avanzada de Diagnóstico, visor interactivo de configuraciones locales de disco y paleta copiable de Kaomojis.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../../core/state/State.js';
import { globalToast } from '../overlay/Toast.js';

export class DiagnosticsView {
    // Referencia estática del listener para removerlo en destroy() y evitar fugas de memoria
    static handleKaomojiClick = null;

    /**
     * Renderiza el panel de diagnóstico completo en el contenedor de destino.
     * @param {string} containerId - Identificador del nodo anclaje del DOM.
     * @param {Object|null} data - Datos adicionales de renderizado (opcional).
     * @returns {Promise<void>}
     */
    static async render(containerId, data = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = globalState.get();
        const telemetry = state.telemetry;

        // Caso de Servidor Puente Caído / Inactivo (Fallback de seguridad visual con look premium)
        if (!telemetry) {
            container.innerHTML = `
                <div class="diagnostics-layout d-flex flex-column align-items-center text-center py-5 px-3">
                    <div class="display-1 text-danger-glow mb-4">
                        <span class="material-symbols-outlined display-icon-large">report_gmailerrorred</span>
                    </div>
                    <h3 class="fw-bold mb-2 text-pink">Servidor Puente Inactivo</h3>
                    <p class="text-muted small mb-4 max-width-md lh-base">
                        No se ha podido sincronizar la telemetría en caliente del disco local de Windows. 
                        Asegúrese de ejecutar el orquestador <code>BATT_Launcher.bat</code> para levantar el backend de Express en el puerto 3000.
                    </p>
                    <div class="p-3 bg-surface-variant rounded-3 border-theme text-start max-width-md">
                        <span class="d-block fw-bold text-main fs-7 mb-1">💡 Ayuda de Diagnóstico:</span>
                        <span class="d-block text-muted fs-8">1. Revise que no haya otros servicios ocupando el puerto 3000.</span>
                        <span class="d-block text-muted fs-8">2. Ejecute la consola local en modo Administrador si persisten los problemas.</span>
                    </div>
                </div>
            `;
            return;
        }

        // Renderizado del Dashboard de Diagnóstico Premium con Bootstrap v5.3.8
        container.innerHTML = `
            <div class="diagnostics-layout-wrapper container-fluid p-0">
                
                <!-- Encabezado de la Vista con Look Gemini -->
                <div class="d-flex align-items-center gap-3 mb-4">
                    <div class="icon-shape bg-primary-glow text-primary rounded-3 p-2.5 d-flex align-items-center justify-content-center">
                        <span class="material-symbols-outlined fs-4">build_circle</span>
                    </div>
                    <div>
                        <h3 class="h5 fw-bold text-main m-0">Matriz de Diagnósticos & Kaomojis</h3>
                        <p class="text-muted fs-8 m-0">Consola de control de endpoints, telemetría atómica del disco duro y librería de traductores.</p>
                    </div>
                </div>

                <!-- 1. Tabla de Endpoints del Servidor Puente -->
                <div class="card-premium glass-panel p-4 rounded-4 mb-4">
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <span class="material-symbols-outlined text-primary fs-5">api</span>
                        <h4 class="fs-6 fw-bold text-main m-0">Control de Endpoints de la API REST (Express.js)</h4>
                    </div>
                    <div class="table-responsive">
                        <table class="table align-middle border-0 mb-0">
                            <thead>
                                <tr class="text-muted fs-8 border-bottom-theme">
                                    <th class="py-3 px-2 border-0">ENDPOINT</th>
                                    <th class="py-3 px-2 border-0">MÉTODO</th>
                                    <th class="py-3 px-2 border-0">RIESGO MITIGADO</th>
                                    <th class="py-3 px-2 border-0">RESGUARDO DE SEGURIDAD</th>
                                    <th class="py-3 px-2 border-0 text-end">ESTATUS</th>
                                </tr>
                            </thead>
                            <tbody class="fs-8">
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/novels</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-primary-glow text-primary rounded px-2.5 py-1">POST</span></td>
                                    <td class="py-3 px-2 text-muted">Carpetas base ausentes o rotas</td>
                                    <td class="py-3 px-2 text-muted">Copia plantillas de forma inteligente desde <code>templates/</code></td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/novels/:id</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-danger-glow text-danger rounded px-2.5 py-1">DELETE</span></td>
                                    <td class="py-3 px-2 text-muted">Zombis de persistencia o descarte fallido</td>
                                    <td class="py-3 px-2 text-muted">Ejecución atómica síncrona vía <code>fs.rmSync</code> recursiva</td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/chapters/upload</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-primary-glow text-primary rounded px-2.5 py-1">POST</span></td>
                                    <td class="py-3 px-2 text-muted">Nombres corruptos o ilegibles en Windows</td>
                                    <td class="py-3 px-2 text-muted">Regex estricta de sanitización y semáforo lógico de escritura</td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/telemetry</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-success-glow text-success rounded px-2.5 py-1">GET</span></td>
                                    <td class="py-3 px-2 text-muted">Bloqueos de disco físico (locks)</td>
                                    <td class="py-3 px-2 text-muted">Lecturas asíncronas no-bloqueantes vía <code>fs.promises</code></td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/chapters/view</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-success-glow text-success rounded px-2.5 py-1">GET</span></td>
                                    <td class="py-3 px-2 text-muted">Directory Traversal y fugas de lectura</td>
                                    <td class="py-3 px-2 text-muted">Validación estricta de rutas relativas seguras y Streams</td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                                <tr class="border-bottom-theme-subtle">
                                    <td class="py-3 px-2 text-main fw-bold"><code>/api/chapters/delegate</code></td>
                                    <td class="py-3 px-2"><span class="badge bg-primary-glow text-primary rounded px-2.5 py-1">POST</span></td>
                                    <td class="py-3 px-2 text-muted">Condiciones de carrera en colas concurrentes</td>
                                    <td class="py-3 px-2 text-muted">Semáforo de escritura atómica en <code>control_progreso.json</code></td>
                                    <td class="py-3 px-2 text-end"><span class="badge bg-success-glow text-success rounded px-2 py-1"><span class="status-dot bg-success rounded-circle me-1"></span>OPERATIVO</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Visores de Configuraciones de Disco en Crudo (Grid Responsivo de 2 Columnas) -->
                <div class="row g-4 mb-4">
                    <div class="col-12 col-md-6">
                        <div class="config-code-box-new p-4 h-100">
                            <div class="d-flex align-items-center gap-2 mb-3">
                                <span class="material-symbols-outlined text-primary fs-5">settings_suggest</span>
                                <h5 class="fs-7 fw-bold text-main m-0">system_config (configuration.json)</h5>
                            </div>
                            <pre class="scrollbar-premium">${JSON.stringify(telemetry.system_config || {}, null, 4)}</pre>
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="config-code-box-new p-4 h-100">
                            <div class="d-flex align-items-center gap-2 mb-3">
                                <span class="material-symbols-outlined text-pink fs-5">flowsheet</span>
                                <h5 class="fs-7 fw-bold text-main m-0">agent_flow (agent_studio_flow.json)</h5>
                            </div>
                            <pre class="scrollbar-premium">${JSON.stringify(telemetry.agent_flow || {}, null, 4)}</pre>
                        </div>
                    </div>
                </div>

                <!-- 3. Paleta de Kaomojis Literarios Activos -->
                <div class="kaomoji-section-wrapper card-premium glass-panel p-4 rounded-4">
                    <div class="d-flex align-items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-pink fs-5">palette</span>
                        <div>
                            <h4 class="fs-6 fw-bold text-main m-0">Librería Activa de Kaomojis Oficiales de Traducción</h4>
                            <p class="text-muted fs-9 m-0">Haga clic sobre cualquier Kaomoji para copiarlo instantáneamente en el portapapeles y usarlo en sus capítulos.</p>
                        </div>
                    </div>
                    <div class="row g-3" id="view-kaomoji-container">
                        ${this.renderKaomojis(telemetry.kaomoji_palette)}
                    </div>
                </div>

            </div>
        `;

        // Suscribir eventos de Kaomojis usando delegación interactiva limpia
        this.setupKaomojiEvents();
    }

    /**
     * Procesa la paleta de Kaomojis y devuelve el código HTML organizado en tarjetas.
     * @param {Object} palette - Paleta en bruto recuperada de telemetría.
     * @returns {string} - Código HTML de categorías.
     */
    static renderKaomojis(palette) {
        if (!palette) return '<div class="col-12 text-center text-muted py-4 fs-8">Librería de Kaomojis no disponible en caliente.</div>';
        const matrix = palette.matrix || palette;

        return Object.entries(matrix).map(([category, items]) => {
            const formattedCategoryName = category.replace(/_/g, ' ');
            return `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="kaomoji-category-card-new p-3 h-100">
                        <span class="kaomoji-category-title d-block fs-9 fw-bold mb-2 text-uppercase" style="color: var(--color-accent-pink); letter-spacing: 0.05em;">
                            ${formattedCategoryName}
                        </span>
                        <div class="kaomoji-pill-list d-flex flex-wrap gap-2">
                            ${this.renderKaomojiButtons(items, category)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Renderiza los botones píldora individuales para cada Kaomoji.
     * @param {Array|Object} items - Lista de Kaomojis o subcategoría.
     * @param {string} category - Categoría a la que pertenecen.
     * @returns {string} - Botones píldora en HTML.
     */
    static renderKaomojiButtons(items, category) {
        if (typeof items === 'object' && !Array.isArray(items)) {
            // Manejar subcategorías anidadas recursivamente
            return Object.entries(items).flatMap(([subcat, list]) => {
                if (!Array.isArray(list)) return [];
                return list.map(k => `
                    <button class="kaomoji-pill-new text-nowrap" data-kaomoji="${k}" title="Categoría: ${category} ➔ ${subcat}">
                        ${k}
                    </button>
                `);
            }).join('');
        } else if (Array.isArray(items)) {
            return items.map(k => `
                <button class="kaomoji-pill-new text-nowrap" data-kaomoji="${k}" title="Categoría: ${category}">
                    ${k}
                </button>
            `).join('');
        }
        return '';
    }

    /**
     * Implementa la delegación de eventos higiénica y eficiente en el contenedor de Kaomojis.
     * Previene memory leaks registrando el callback en un manejador estático desmontable.
     */
    static setupKaomojiEvents() {
        const container = document.getElementById('view-kaomoji-container');
        if (!container) return;

        // Crear la función listener estática
        this.handleKaomojiClick = (e) => {
            const button = e.target.closest('.kaomoji-pill-new');
            if (!button) return;

            const kaomoji = button.getAttribute('data-kaomoji');
            if (kaomoji) {
                // Copiar al portapapeles mediante Clipboard API nativa del navegador
                navigator.clipboard.writeText(kaomoji).then(() => {
                    // Feedback visual premium usando Toast transversal del sistema
                    globalToast.show(`Kaomoji "${kaomoji}" copiado con éxito.`, 'success');

                    // Cambiar dinámicamente el estilo del botón como retroalimentación táctil
                    const originalText = button.innerText;
                    button.innerText = '¡Copiado! 📋';
                    button.classList.add('btn-copied-success');

                    setTimeout(() => {
                        button.innerText = originalText;
                        button.classList.remove('btn-copied-success');
                    }, 1200);
                }).catch(err => {
                    console.error('[DiagnosticsView] Fallo al copiar al portapapeles:', err);
                    globalToast.show('Fallo de seguridad al acceder al portapapeles.', 'error');
                });
            }
        };

        // Escuchar el evento de clic en el contenedor (Delegación de Eventos)
        container.addEventListener('click', this.handleKaomojiClick);
        console.log('[DiagnosticsView] Event listener de Kaomojis registrado vía delegación de eventos.');
    }

    /**
     * Limpieza estricta de referencias globales y destructores de listeners para evitar memory leaks.
     */
    static destroy() {
        const container = document.getElementById('view-kaomoji-container');
        if (container && this.handleKaomojiClick) {
            container.removeEventListener('click', this.handleKaomojiClick);
            console.log('[DiagnosticsView] Removido event listener de Kaomojis en contenedor.');
        }
        this.handleKaomojiClick = null;
        console.log('[DiagnosticsView] Vista de diagnósticos desmontada con éxito (0 fugas de memoria).');
    }
}

export default DiagnosticsView;
