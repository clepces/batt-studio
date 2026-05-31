/**
 * @file EstadisticaView.js
 * @description Vista unificada de telemetría y agentes rediseñada de forma premium al estilo Google Gemini.
 * Ofrece acceso rápido a archivos locales a través de modales responsivos de disco duro local,
 * garantizando cero desbordamientos visuales y contrastes de WCAG de 100% (Claro/Oscuro).
 * @author BATT Principal Automation Engineer
 */

import { ProgressTracker } from './ProgressTracker.js';
import { TokenChart } from './TokenChart.js';
import { ApiClient } from '../../core/api/ApiClient.js';
import { globalEventBus } from '../../core/eventBus/EventBus.js';
import { globalState } from '/src/core/state/State.js';


export class EstadisticaView {
    constructor() {
        this.containerId = null;
    }

    // Almacenamos el manejador de eventos estáticamente para poder removerlo en destroy()
    static handleDelegateClick = null;
    static activeContainerId = null;

    /**
     * Renderiza el módulo completo de estadísticas para una novela seleccionada.
     * @param {string} containerId - ID del contenedor en el DOM.
     * @param {Object} novel - Objeto de datos de la novela actual de la telemetría.
     */
    static async render(containerId, novel) {
        this.activeContainerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) return;

        const stateInstance = typeof globalState !== 'undefined' ? globalState : window.globalState;
        const state = stateInstance ? stateInstance.get() : { isOnline: false };

        if (!state.isOnline) {
            container.innerHTML = `
                <div class="statistics-empty-wrapper border border-theme rounded-4 p-5 text-center my-4" style="background: var(--color-surface-variant);">
                    <div class="statistics-empty-state">
                        <span class="material-symbols-outlined text-danger fs-1 mb-3 animate-pulse">wifi_off</span>
                        <p class="text-main fw-bold mb-2 fs-5">Telemetría Inactiva (Puente Desconectado)</p>
                        <p class="text-muted small max-width-md mx-auto mb-4">
                            No es posible recibir telemetría de disco ni métricas de procesamiento de Express ya que el servidor local está apagado o inaccesible (Puerto 3000).
                        </p>
                        <div class="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-body border-theme text-muted font-mono" style="font-size: 11px;">
                            <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
                            <span>Esperando reconexión asíncrona del puente...</span>
                        </div>
                    </div>
                </div>
            `;
            // Registrar event listeners vacíos/limpios para evitar errores de clicks
            this.setupEventListeners(container, {}, null);
            return;
        }

        if (!novel) {
            container.innerHTML = `
                <div class="statistics-empty-wrapper border border-theme rounded-4 p-5 text-center">
                    <div class="statistics-empty-state">
                        <span class="material-symbols-outlined text-primary fs-1 mb-3">folder_off</span>
                        <p class="text-main fw-bold mb-1 fs-5">No hay un proyecto de novela activo o seleccionado.</p>
                        <p class="text-muted small">Inicialice uno nuevo desde la barra lateral izquierda.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Sanitización rápida de datos de listas
        const origenFiles = novel.origen_files_list || [];
        const crudoFiles = novel.crudo_files_list || [];
        const finalFiles = novel.final_files_list || [];

        const filesOrigenCount = origenFiles.length ?? 0;
        const filesCrudoCount = crudoFiles.length ?? 0;
        const filesFinalCount = finalFiles.length ?? 0;

        // Banner de alerta para mercancía pendiente en bodega de origen
        const pendingCount = novel.pending_chapters ?? 0;
        const alertBanner = pendingCount > 0 ? `
            <div class="pending-alert-banner alert alert-warning d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 p-4 rounded-4 border-0 mb-4 shadow-sm">
                <div class="d-flex align-items-center gap-3">
                    <span class="material-symbols-outlined text-warning fs-1 animated-pulse">bolt</span>
                    <div>
                        <h4 class="alert-heading fs-6 fw-bold m-0 text-main mb-1">¡MERCANCÍA PENDIENTE EN BODEGA DE ORIGEN!</h4>
                        <p class="m-0 text-muted small">Se han detectado <strong>${pendingCount}</strong> capítulo(s) sin procesar en la carpeta <code>01_origen/</code>. Puedes delegar su traducción de forma automática.</p>
                    </div>
                </div>
                <button class="btn btn-premium-action btn-delegate-all-pending d-flex align-items-center gap-2 py-2.5 px-4 rounded-pill" data-novel-id="${novel.id}">
                    <span class="material-symbols-outlined fs-5">bolt</span>
                    🚀 Delegar Todo el Pipeline
                </button>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="statistics-modular-layout">
                ${alertBanner}
                
                <!-- Fila de widgets reactivos de avance y control de agentes (Google Gemini Pill Grid) -->
                <div class="row g-4 mb-4">
                    <div class="col-12 col-md-6">
                        ${ProgressTracker.template(novel.last_processed_chapter, novel.pending_chapters)}
                    </div>
                    <div class="col-12 col-md-6">
                        ${TokenChart.template()}
                    </div>
                </div>

                <!-- Cabecera de Sección: Estado Físico del Disco Local -->
                <div class="d-flex flex-column mb-3">
                    <h3 class="fs-5 fw-bold text-main m-0 d-flex align-items-center gap-2">
                        <span class="material-symbols-outlined text-primary">analytics</span>
                        Estado Físico del Disco Local
                    </h3>
                    <p class="text-muted small m-0 ms-4">Explorador rápido de archivos de la novela (/vault/${novel.id}/)</p>
                </div>

                <!-- Tarjetas Físicas de carpetas (Descongestionadas y 100% responsivas en Grid) -->
                <div class="row g-4 mb-5">
                    <div class="col-12 col-md-4">
                        <div class="phys-box h-100 phys-origen glass-card-nested p-4 rounded-4 shadow-sm border border-theme d-flex flex-column justify-content-between btn-open-disk-modal" 
                             data-folder="origen">
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold text-main d-flex align-items-center gap-2">
                                        <span class="material-symbols-outlined text-success">folder_zip</span>
                                        Bodega 01_origen/
                                    </span>
                                    <span class="badge bg-success-glow text-success rounded-pill px-3 py-1.5 fs-6 fw-bold">${filesOrigenCount}</span>
                                </div>
                                <span class="text-muted small d-block mb-3">Textos originales importados (.txt)</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mt-4 text-success fw-bold" style="font-size: 12px;">
                                <span class="d-flex align-items-center gap-1">
                                    <span class="material-symbols-outlined fs-5">explore</span>
                                    Explorar Bodega
                                </span>
                                <span class="material-symbols-outlined fs-5">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-12 col-md-4">
                        <div class="phys-box h-100 phys-crudo glass-card-nested p-4 rounded-4 shadow-sm border border-theme d-flex flex-column justify-content-between btn-open-disk-modal" 
                             data-folder="crudo">
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold text-main d-flex align-items-center gap-2">
                                        <span class="material-symbols-outlined text-warning">draft</span>
                                        Borradores 02_crudo/
                                    </span>
                                    <span class="badge bg-warning-glow text-warning rounded-pill px-3 py-1.5 fs-6 fw-bold">${filesCrudoCount}</span>
                                </div>
                                <span class="text-muted small d-block mb-3">Archivos intermedios y reportes LQA</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mt-4 text-warning fw-bold" style="font-size: 12px;">
                                <span class="d-flex align-items-center gap-1">
                                    <span class="material-symbols-outlined fs-5">explore</span>
                                    Explorar Borradores
                                </span>
                                <span class="material-symbols-outlined fs-5">arrow_forward</span>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-4">
                        <div class="phys-box h-100 phys-final glass-card-nested p-4 rounded-4 shadow-sm border border-theme d-flex flex-column justify-content-between btn-open-disk-modal" 
                             data-folder="final">
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold text-main d-flex align-items-center gap-2">
                                        <span class="material-symbols-outlined text-info">done_all</span>
                                        Salida 03_final/
                                    </span>
                                    <span class="badge bg-info-glow text-info rounded-pill px-3 py-1.5 fs-6 fw-bold">${filesFinalCount}</span>
                                </div>
                                <span class="text-muted small d-block mb-3">Traducciones literarias terminadas (.md)</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mt-4 text-info fw-bold" style="font-size: 12px;">
                                <span class="d-flex align-items-center gap-1">
                                    <span class="material-symbols-outlined fs-5">explore</span>
                                    Explorar Salidas
                                </span>
                                <span class="material-symbols-outlined fs-5">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Historial Reciente de Operaciones y Flujo (Registro Maestro) -->
                <div class="recent-transactions-box card-premium glass-card p-4 rounded-4 shadow-sm mb-4">
                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom-theme">
                        <h3 class="fs-5 fw-bold text-main m-0 d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary">history</span>
                            Registro Maestro de Transacciones (Cola de Disco)
                        </h3>
                        <div class="origen-status-summary-badge d-flex flex-wrap align-items-center gap-2 bg-surface-variant rounded-pill px-3 py-1.5 small text-muted">
                            <span>Bodega: <strong>${filesOrigenCount}</strong></span>
                            <span class="text-muted-theme">|</span>
                            <span class="text-success fw-bold">${novel.last_processed_chapter} completos</span>
                            <span class="text-muted-theme">|</span>
                            <span class="text-warning fw-bold">${novel.pending_chapters} pendientes</span>
                        </div>
                    </div>
                    
                    <div class="table-responsive history-table-wrapper-new">
                        <table class="table table-hover align-middle mb-0 text-theme">
                            <thead>
                                <tr>
                                    <th class="border-0 px-4">Capítulo</th>
                                    <th class="border-0">Estatus Técnico</th>
                                    <th class="border-0">Fecha de Acción</th>
                                    <th class="border-0 px-4">Integrantes de IA / Acciones de Pipeline</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderUnifiedHistoryRows(novel)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // 5. Vincular listeners reactivos mediante delegación de eventos para evitar fugas de memoria
        this.setupEventListeners(container, novel, novel.id);
    }

    /**
     * Unifica la bodega de origen y el historial para renderizar todas las filas de la tabla.
     * Muestra tanto los capítulos completados como los pendientes con opciones de delegar.
     * @param {Object} novel - Datos de la novela actual.
     * @returns {string}
     */
    static renderUnifiedHistoryRows(novel) {
        const origenFiles = novel.origen_files_list || [];
        const history = novel.execution_history || [];
        const pendingQueue = novel.pending_queue || [];

        if (!origenFiles || origenFiles.length === 0) {
            return `
                <tr>
                    <td colspan="4" class="no-history-msg text-center p-5 text-muted small">
                        <span class="material-symbols-outlined fs-2 d-block mb-2">hourglass_empty</span>
                        Sin archivos inyectados en la bodega de origen para este proyecto.
                    </td>
                </tr>
            `;
        }

        // Ordenar numéricamente los capítulos del origen para presentarlos secuencialmente
        const sortedChapters = [...origenFiles].sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });

        return sortedChapters.map(file => {
            const capId = file.replace('.txt', '');
            const capLabel = capId.replace('capitulo_', 'Cap. ');
            
            // Buscar si ya existe un registro de ejecución completado en la telemetría
            const histItem = history.find(item => item.chapter_id === capId);
            const isQueued = pendingQueue.some(item => item.chapter_id === capId);

            if (histItem) {
                // Capítulo completamente procesado por el pipeline
                const titleEs = histItem.title_es ? ` — ${histItem.title_es}` : '';
                const timestamp = histItem.timestamp ? histItem.timestamp.split('T')[0] : 'N/D';
                const agents = (histItem.processed_by_agents || [])
                    .map(agent => `<span class="badge bg-primary-glow text-primary px-2.5 py-1.5 rounded-pill small fw-semibold border border-primary-subtle">${agent.split('_')[0]}</span>`)
                    .join(' ');

                return `
                    <tr class="row-completed">
                        <td class="px-4 text-theme">
                            <span class="material-symbols-outlined text-success me-2 fs-5 align-middle">task_alt</span>
                            <strong class="align-middle">${capLabel}</strong>${titleEs}
                        </td>
                        <td><span class="badge bg-success-glow text-success px-3 py-1.5 rounded-pill small fw-semibold border border-success-subtle">✓ PROCESADO</span></td>
                        <td class="text-muted small">${timestamp}</td>
                        <td class="px-4"><div class="agents-badges-flex gap-2 d-flex flex-wrap">${agents || 'N/A'}</div></td>
                    </tr>
                `;
            } else if (isQueued) {
                // Capítulo encolado en espera del procesamiento del agente cognitivo
                return `
                    <tr class="row-queued border-warning-subtle">
                        <td class="px-4 text-theme">
                            <span class="material-symbols-outlined text-warning me-2 fs-5 align-middle animated-pulse">schedule</span>
                            <strong class="align-middle">${capLabel}</strong> <span class="text-muted small">(.txt en pipeline)</span>
                        </td>
                        <td>
                            <span class="badge bg-warning-glow text-warning px-3 py-1.5 rounded-pill small fw-semibold border border-warning-subtle animated-pulse">⏳ EN COLA</span>
                        </td>
                        <td class="text-muted small">Pendiente de ejecución</td>
                        <td class="px-4">
                            <span class="text-warning small d-flex align-items-center gap-1.5 fw-semibold" style="font-size: 11px;">
                                <span class="material-symbols-outlined fs-6">info</span>
                                Dile a Antigravity en el chat que procese el capítulo para avanzar
                            </span>
                        </td>
                    </tr>
                `;
            } else {
                // Capítulo pendiente en origen (todavía no ha sido procesado ni encolado)
                return `
                    <tr class="row-pending">
                        <td class="px-4 text-theme">
                            <span class="material-symbols-outlined text-muted me-2 fs-5 align-middle">hourglass_empty</span>
                            <strong class="align-middle">${capLabel}</strong> <span class="text-muted small">(.txt plano)</span>
                        </td>
                        <td><span class="badge bg-surface-variant text-muted border border-secondary-subtle px-3 py-1.5 rounded-pill small fw-semibold">⚡ PENDIENTE</span></td>
                        <td class="text-muted small">Listo para procesar</td>
                        <td class="px-4">
                            <button class="btn btn-premium-action btn-sm btn-delegate-translation d-flex align-items-center gap-2 py-1.5 px-3 rounded-pill" 
                                    data-chapter="${capLabel}" 
                                    data-chapter-id="${capId}"
                                    data-novel-id="${novel.id}"
                                    data-file-name="${file}">
                                <span class="material-symbols-outlined fs-6">bolt</span>
                                Delegar Traducción
                            </button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }

    /**
     * Registra el manejador de eventos por delegación.
     */
    static setupEventListeners(container, novel, novelId) {
        // Remover listener anterior si existiese para prevenir duplicados y memory leaks
        if (this.handleDelegateClick) {
            container.removeEventListener('click', this.handleDelegateClick);
        }

        const origenFiles = novel.origen_files_list || [];
        const crudoFiles = novel.crudo_files_list || [];
        const finalFiles = novel.final_files_list || [];

        // Definir manejador de eventos local
        this.handleDelegateClick = async (e) => {
            // 1. Clic en "Saber más" del Pipeline Cognitivo
            const btnLearn = e.target.closest('#btn-learn-pipeline-more');
            if (btnLearn) {
                globalEventBus.emit('modal:open', 'pipeline-explanation');
                return;
            }

            // 2. Clic en las tarjetas físicas para ver el desglose en modales de disco duro
            const btnOpenDisk = e.target.closest('.btn-open-disk-modal');
            if (btnOpenDisk) {
                const folderType = btnOpenDisk.getAttribute('data-folder');
                let files = [];
                let folderName = '';
                let folderIcon = '';
                
                if (folderType === 'origen') {
                    files = origenFiles;
                    folderName = '01_origen/';
                    folderIcon = 'folder_zip';
                } else if (folderType === 'crudo') {
                    files = crudoFiles;
                    folderName = '02_crudo/';
                    folderIcon = 'draft';
                } else if (folderType === 'final') {
                    files = finalFiles;
                    folderName = '03_final/';
                    folderIcon = 'done_all';
                }
                
                globalEventBus.emit('modal:open', {
                    type: 'disk-breakdown',
                    folder: folderType,
                    folderName,
                    folderIcon,
                    files,
                    novelId: novel.id
                });
                return;
            }

            // 3. Delegar traducción individual
            const btn = e.target.closest('.btn-delegate-translation');
            if (btn) {
                const chapterId = btn.getAttribute('data-chapter-id') || btn.getAttribute('data-chapter').replace('Cap. ', 'capitulo_');
                const fileName = btn.getAttribute('data-file-name');

                // Emitir Toast reactivo de éxito de inyección
                globalEventBus.emit('toast:show', {
                    message: `🚀 Encolando "${fileName}" en el pipeline. El orquestador local BATT ha despertado al Agente de Traducción Universal...`,
                    type: 'info'
                });

                // Cambiar visualmente el estado del botón en caliente
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Encolando...';
                btn.disabled = true;
                btn.classList.add('processing');
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';

                try {
                    const result = await ApiClient.delegateChapter(novelId, chapterId, fileName);
                    globalEventBus.emit('toast:show', {
                        message: result.message || `✓ Capítulo ${chapterId} encolado correctamente en el pipeline.`,
                        type: result.success ? 'success' : 'warn'
                    });
                } catch (err) {
                    globalEventBus.emit('toast:show', {
                        message: `❌ Error de red al delegar traducción: ${err.message}`,
                        type: 'error'
                    });
                    // Restaurar botón en caso de error
                    btn.innerHTML = '<span class="material-symbols-outlined fs-6">bolt</span>Delegar Traducción';
                    btn.disabled = false;
                    btn.classList.remove('processing');
                    btn.style.opacity = '';
                    btn.style.cursor = 'pointer';
                }
                return;
            }

            // 4. Delegar traducción de todo el lote
            const btnAll = e.target.closest('.btn-delegate-all-pending');
            if (btnAll) {
                const novelIdAttr = btnAll.getAttribute('data-novel-id');
                
                globalEventBus.emit('toast:show', {
                    message: `🚀 Activando agentes de BATT para delegar secuencialmente la traducción de todos los capítulos pendientes de "${novelIdAttr.toUpperCase()}"...`,
                    type: 'success'
                });

                btnAll.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Encolando lote...';
                btnAll.disabled = true;
                btnAll.style.opacity = '0.6';
                btnAll.style.cursor = 'not-allowed';

                // Buscar todos los botones de delegar individuales en el DOM para la novela actual
                const pendingButtons = Array.from(container.querySelectorAll('.btn-delegate-translation'));
                
                if (pendingButtons.length === 0) {
                    btnAll.innerHTML = '<span class="material-symbols-outlined fs-5">bolt</span>🚀 Delegar Todo el Pipeline';
                    btnAll.disabled = false;
                    btnAll.style.opacity = '';
                    btnAll.style.cursor = 'pointer';
                    return;
                }

                // Delegamos cada capítulo secuencialmente para no saturar procesos ni crear bloqueos de archivo paralelos
                for (const pendingBtn of pendingButtons) {
                    const chapterId = pendingBtn.getAttribute('data-chapter-id') || pendingBtn.getAttribute('data-chapter').replace('Cap. ', 'capitulo_');
                    const fileName = pendingBtn.getAttribute('data-file-name');

                    pendingBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>...';
                    pendingBtn.disabled = true;
                    pendingBtn.classList.add('processing');
                    pendingBtn.style.opacity = '0.6';
                    pendingBtn.style.cursor = 'not-allowed';

                    try {
                        await ApiClient.delegateChapter(novelIdAttr, chapterId, fileName);
                    } catch (err) {
                        console.error(`Error delegando capítulo ${chapterId} en delegación en lote:`, err);
                    }
                }
            }
        };

        container.addEventListener('click', this.handleDelegateClick);
    }

    /**
     * Limpieza estricta de la vista al desmontarse para cumplimiento del code-hygiene.
     * Remueve los manejadores para evitar leaks en la Single Page Application.
     */
    static destroy() {
        if (this.activeContainerId && this.handleDelegateClick) {
            const container = document.getElementById(this.activeContainerId);
            if (container) {
                container.removeEventListener('click', this.handleDelegateClick);
            }
        }
        this.handleDelegateClick = null;
        this.activeContainerId = null;
        console.log('[EstadisticaView] Módulo de estadísticas desmontado limpiamente (sin memory leaks).');
    }
}

export default EstadisticaView;
