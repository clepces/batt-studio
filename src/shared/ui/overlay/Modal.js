/**
 * @file Modal.js
 * @description Sistema de ventanas modales dinámicas e interactivas de Bootstrap v5.3.8 para BATT Enterprise.
 * Controla la inicialización de novelas, explicación técnica de pipeline y explorador de disco local.
 * Cumple con estándares de legibilidad WCAG y limpieza absoluta para prevención de memory leaks.
 * @author BATT Principal Automation Engineer
 */

import { globalEventBus } from '../../../core/eventBus/EventBus.js';
import { globalState } from '../../../core/state/State.js';
import { ApiClient } from '../../../core/api/ApiClient.js';

export class Modal {
    constructor() {
        this.unsubscribes = [];
        this.instances = {}; // Almacenará las instancias nativas de bootstrap.Modal
        this.diskModalFiles = []; // Guarda temporalmente los archivos para búsqueda/filtro
        this.diskModalFolderType = '';
        this.handleSearchInput = null;
        this.handleFormSubmit = null;
    }

    /**
     * Devuelve el marcado HTML para el Modal de Creación de Novela (Bootstrap).
     * @returns {string}
     */
    createNovelTemplate() {
        return `
            <div class="modal fade" id="create-novel-modal-bootstrap" tabindex="-1" aria-labelledby="createNovelModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content card-premium p-4 rounded-4" style="background: var(--color-bg-card); border: 1px solid var(--color-border-card);">
                        <div class="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                            <h5 class="modal-title fw-bold text-main fs-5 d-flex align-items-center gap-2" id="createNovelModalLabel">
                                <span class="material-symbols-outlined text-primary">library_add</span>
                                Inicializar Proyecto de Novela
                            </h5>
                            <button type="button" class="btn-close shadow-none border-0 bg-transparent text-theme-main" data-bs-dismiss="modal" aria-label="Close" style="filter: var(--bs-transition);"></button>
                        </div>
                        <div class="modal-body border-0 pt-3">
                            <form id="create-novel-form">
                                <div class="mb-3">
                                    <label for="novel-form-id" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">ID Corto de Novela (Carpeta física en disco)</label>
                                    <input type="text" id="novel-form-id" required placeholder="ej: de_yi_chongsheng" class="form-control" style="font-family: var(--font-mono);">
                                </div>
                                <div class="mb-3">
                                    <label for="novel-form-name" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">Nombre de Presentación de la Novela</label>
                                    <input type="text" id="novel-form-name" required placeholder="ej: La Reencarnación de Oro" class="form-control">
                                </div>
                                <div class="row g-3 mb-3">
                                    <div class="col-12">
                                        <label for="novel-form-src" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">Idioma Origen</label>
                                        <select id="novel-form-src" class="form-select">
                                            <option value="zh">Chino (ZH) - Xianxia/Wuxia/Xuanhuan</option>
                                            <option value="ko">Coreano (KO) - Novelas de Cultivo</option>
                                            <option value="ja">Japonés (JA) - Novelas Ligeras/Anime</option>
                                            <option value="ru">Ruso (RU) - Literatura Clásica</option>
                                        </select>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label text-muted small fw-bold text-uppercase d-block" style="font-size: 11px;">Idiomas Destino (Traducción Simultánea)</label>
                                        <div class="p-3 rounded-3" style="background: rgba(255,255,255,0.03); border: 1px solid var(--color-border-card); max-height: 150px; overflow-y: auto;">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input tgt-lang-check" type="checkbox" value="es_global_neutro" id="tgt-es" checked>
                                                <label class="form-check-label small text-main fw-semibold" for="tgt-es">
                                                    Español Neutro (Estilo Literario clásico de Xianxia)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input tgt-lang-check" type="checkbox" value="en_literary" id="tgt-en">
                                                <label class="form-check-label small text-main fw-semibold" for="tgt-en">
                                                    Inglés Literario (Prosa de alta fidelidad)
                                                </label>
                                            </div>
                                            <div class="form-check mb-2">
                                                <input class="form-check-input tgt-lang-check" type="checkbox" value="it_literary" id="tgt-it">
                                                <label class="form-check-label small text-main fw-semibold" for="tgt-it">
                                                    Italiano Literario (Estilo elegante y rítmico)
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input tgt-lang-check" type="checkbox" value="sr_cyrillic" id="tgt-sr">
                                                <label class="form-check-label small text-main fw-semibold" for="tgt-sr">
                                                    Serbio en Alfabeto Cirílico (Entonación lírica)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="d-flex justify-content-end gap-2">
                                    <button type="button" class="btn btn-premium-secondary py-2 px-4 rounded-pill" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-premium-action py-2 px-4 rounded-pill">Escribir en Disco</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Devuelve el marcado HTML para el Modal de Explicación del Pipeline (Bootstrap).
     * @returns {string}
     */
    pipelineExplanationTemplate() {
        return `
            <div class="modal fade" id="pipeline-explanation-modal" tabindex="-1" aria-labelledby="pipelineExplanationModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content card-premium p-4 rounded-4" style="background: var(--color-bg-card); border: 1px solid var(--color-border-card);">
                        <div class="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                            <h5 class="modal-title fw-bold text-main fs-5 d-flex align-items-center gap-2" id="pipelineExplanationModalLabel">
                                <span class="material-symbols-outlined text-primary">auto_awesome</span>
                                Funcionamiento Técnico del Pipeline BATT
                            </h5>
                            <button type="button" class="btn-close shadow-none border-0 bg-transparent text-theme-main" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body border-0 pt-3 text-main">
                            <p class="text-muted small mb-4">
                                BATT (Buca Automation Translation & Tooling) opera bajo una arquitectura de orquestación cognitiva en segundo plano, maximizando el uso de la capa gratuita y asegurando traducciones de calidad editorial.
                            </p>
                            
                            <div class="row g-3 mb-4">
                                <div class="col-12 col-md-6">
                                    <div class="p-3 rounded-4 h-100 border border-theme" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                                        <div class="d-flex align-items-center gap-2 mb-2 text-primary">
                                            <span class="material-symbols-outlined fs-5">translate</span>
                                            <span class="fw-bold small text-uppercase" style="font-size: 11px;">1. Fase de Ingesta & Borrador</span>
                                        </div>
                                        <p class="small text-muted m-0" style="line-height: 1.5; font-size: 12px;">
                                            El capítulo original <code>.txt</code> en Chino o Coreano es leído por el Agente de Lectura. Se realiza una segmentación por párrafos y una primera traducción literal equilibrando terminología.
                                        </p>
                                    </div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <div class="p-3 rounded-4 h-100 border border-theme" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                                        <div class="d-flex align-items-center gap-2 mb-2 text-success">
                                            <span class="material-symbols-outlined fs-5">rate_review</span>
                                            <span class="fw-bold small text-uppercase" style="font-size: 11px;">2. Fase LQA (Calidad Ortosemántica)</span>
                                        </div>
                                        <p class="small text-muted m-0" style="line-height: 1.5; font-size: 12px;">
                                            Un agente corrector procesa el borrador buscando incoherencias sintácticas, inyectando de forma interactiva <strong>Kaomojis contextuales</strong> y aplicando reglas tipográficas profesionales.
                                        </p>
                                    </div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <div class="p-3 rounded-4 h-100 border border-theme" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                                        <div class="d-flex align-items-center gap-2 mb-2 text-warning">
                                            <span class="material-symbols-outlined fs-5">local_library</span>
                                            <span class="fw-bold small text-uppercase" style="font-size: 11px;">3. Localización Cultural</span>
                                        </div>
                                        <p class="small text-muted m-0" style="line-height: 1.5; font-size: 12px;">
                                            Se adaptan modismos, proverbios antiguos y términos de época a un <strong>Español Neutro Global literario y fluido</strong> que conserve el espíritu y el tono original de la obra.
                                        </p>
                                    </div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <div class="p-3 rounded-4 h-100 border border-theme" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                                        <div class="d-flex align-items-center gap-2 mb-2 text-info">
                                            <span class="material-symbols-outlined fs-5">database</span>
                                            <span class="fw-bold small text-uppercase" style="font-size: 11px;">4. Indexación & Salida</span>
                                        </div>
                                        <p class="small text-muted m-0" style="line-height: 1.5; font-size: 12px;">
                                            Se genera el archivo final <code>_final.md</code> de alto contraste. Paralelamente, se inyectan vocablos y glosarios actualizados para retroalimentar de forma incremental las traducciones de capítulos futuros.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-premium-action py-2 px-4 rounded-pill" data-bs-dismiss="modal">Entendido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Devuelve el marcado HTML para el Modal de Desglose Físico de Disco Duro (Bootstrap).
     * @returns {string}
     */
    diskBreakdownTemplate() {
        return `
            <div class="modal fade" id="disk-breakdown-modal" tabindex="-1" aria-labelledby="diskBreakdownModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content card-premium p-4 rounded-4" style="background: var(--color-bg-card); border: 1px solid var(--color-border-card);">
                        <div class="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                            <h5 class="modal-title fw-bold text-main fs-5 d-flex align-items-center gap-2" id="diskBreakdownModalLabel">
                                <span class="material-symbols-outlined text-primary animate-pulse" id="disk-modal-icon">folder</span>
                                <span id="disk-modal-title">Explorador Físico</span>
                            </h5>
                            <button type="button" class="btn-close shadow-none border-0 bg-transparent text-theme-main" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body border-0 pt-3">
                            <p class="text-muted small mb-3">
                                Listado físico real indexado en la carpeta del disco duro local <code id="disk-modal-folder-path" style="font-family: var(--font-mono);">vault/</code>. Use el buscador para filtrarlos.
                            </p>
                            
                            <div class="input-group mb-3">
                                <span class="input-group-text border-0 bg-surface-variant text-muted rounded-start-pill" style="border: 1px solid var(--color-border-card) !important; border-right: 0 !important;">
                                    <span class="material-symbols-outlined fs-5">search</span>
                                </span>
                                <input type="text" id="disk-file-search" class="form-control border-0 bg-surface-variant rounded-end-pill py-2.5" placeholder="Buscar archivos en disco... (ej: capitulo_001)" style="border: 1px solid var(--color-border-card) !important; border-left: 0 !important; color: var(--color-text-main) !important;">
                            </div>
                            
                            <div class="border border-theme rounded-4 p-3" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                                <div id="disk-files-list-modal-container" class="d-flex flex-wrap gap-2 overflow-auto align-content-start" style="max-height: 300px; min-height: 100px;">
                                    <!-- Contenido dinámico -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pt-0 justify-content-between">
                            <span class="text-muted small fw-semibold" id="disk-modal-counter">Cargando...</span>
                            <button type="button" class="btn btn-premium-action py-2 px-4 rounded-pill" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Inicializa el sistema inyectando los modales de Bootstrap al DOM y registrando los eventos.
     */
    init() {
        // 1. Inyectar Modal de Creación de Novela
        if (!document.getElementById('create-novel-modal-bootstrap')) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.createNovelTemplate().trim();
            document.body.appendChild(wrapper.firstChild);
        }

        // 2. Inyectar Modal de Explicación del Pipeline
        if (!document.getElementById('pipeline-explanation-modal')) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.pipelineExplanationTemplate().trim();
            document.body.appendChild(wrapper.firstChild);
        }

        // 3. Inyectar Modal de Desglose Físico de Disco Duro
        if (!document.getElementById('disk-breakdown-modal')) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.diskBreakdownTemplate().trim();
            document.body.appendChild(wrapper.firstChild);
        }

        // 4. Instanciar modales utilizando la API nativa de Bootstrap v5.3.8
        this.instances['create-novel'] = new bootstrap.Modal(document.getElementById('create-novel-modal-bootstrap'));
        this.instances['pipeline-explanation'] = new bootstrap.Modal(document.getElementById('pipeline-explanation-modal'));
        this.instances['disk-breakdown'] = new bootstrap.Modal(document.getElementById('disk-breakdown-modal'));

        // 5. Suscribirse a eventos globales para la apertura
        const subOpen = globalEventBus.on('modal:open', (data) => {
            if (typeof data === 'string') {
                this.open(data);
            } else if (data && typeof data === 'object') {
                if (data.type === 'disk-breakdown') {
                    this.openDiskBreakdown(data);
                } else if (data.type === 'create-novel') {
                    this.open('create-novel');
                } else if (data.type === 'pipeline-explanation') {
                    this.open('pipeline-explanation');
                }
            }
        });

        this.unsubscribes.push(subOpen);
        this.setupEvents();
    }

    /**
     * Abre un modal estático o simple.
     * @param {string} type - Tipo de modal.
     */
    open(type) {
        const modal = this.instances[type];
        if (modal) {
            modal.show();
            
            if (type === 'create-novel') {
                setTimeout(() => {
                    const input = document.getElementById('novel-form-id');
                    if (input) input.focus();
                }, 400);
            }
        }
    }

    /**
     * Abre el modal de desglose físico de archivos del disco duro inyectando el contenido en caliente.
     * @param {Object} data - Datos dinámicos de los archivos.
     */
    openDiskBreakdown(data) {
        const { folder, folderName, folderIcon, files, novelId } = data;
        this.diskModalFiles = files || [];
        this.diskModalFolderType = folder;

        // Actualizar datos del header del modal
        const iconEl = document.getElementById('disk-modal-icon');
        const titleEl = document.getElementById('disk-modal-title');
        const pathEl = document.getElementById('disk-modal-folder-path');

        if (iconEl) {
            iconEl.innerText = folderIcon || 'folder';
            iconEl.className = `material-symbols-outlined text-${folder === 'origen' ? 'success' : folder === 'crudo' ? 'warning' : 'info'}`;
        }
        if (titleEl) titleEl.innerText = `Desglose Físico: /vault/${novelId}/${folderName}`;
        if (pathEl) pathEl.innerText = `vault/${novelId}/${folderName}`;

        // Resetear input de búsqueda
        const searchInput = document.getElementById('disk-file-search');
        if (searchInput) searchInput.value = '';

        // Renderizar todos los archivos inicialmente
        this.renderDiskFiles(this.diskModalFiles);

        // Mostrar modal de Bootstrap
        this.open('disk-breakdown');
    }

    /**
     * Renderiza los badges de archivos dentro del contenedor del modal.
     * @param {Array} filteredFiles - Lista de archivos filtrados.
     */
    renderDiskFiles(filteredFiles) {
        const container = document.getElementById('disk-files-list-modal-container');
        const counterEl = document.getElementById('disk-modal-counter');
        if (!container) return;

        if (!filteredFiles || filteredFiles.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5 w-100 text-muted">
                    <span class="material-symbols-outlined fs-2 d-block mb-2">find_in_page</span>
                    <span class="small italic">No se encontraron archivos en este filtro.</span>
                </div>
            `;
            if (counterEl) counterEl.innerText = 'Mostrando 0 de 0 archivos';
            return;
        }

        const type = this.diskModalFolderType;

        if (type === 'crudo') {
            // Renderizar con agrupaciones de capítulos
            const crudoGroups = {};
            filteredFiles.forEach(file => {
                const match = file.match(/^(capitulo_\d+)/);
                const key = match ? match[1] : 'otros';
                if (!crudoGroups[key]) crudoGroups[key] = [];
                crudoGroups[key].push(file);
            });

            let renderHtml = '';
            Object.entries(crudoGroups).forEach(([capKey, files]) => {
                const capLabel = capKey.replace('capitulo_', 'Capítulo ');
                const fileBadges = files.map(f => {
                    const isLqa = f.includes('_lqa');
                    const suffix = isLqa ? 'LQA' : 'Crudo';
                    const badgeClass = isLqa ? 'bg-info-glow text-info border-info-subtle' : 'bg-warning-glow text-warning border-warning-subtle';
                    return `<span class="badge ${badgeClass} border px-2.5 py-1.5 rounded-pill small fw-bold" title="${f}" style="font-size: 11px;">${suffix}</span>`;
                }).join(' ');

                renderHtml += `
                    <div class="crudo-group-card p-3 mb-2 rounded-4 border border-theme d-flex align-items-center justify-content-between w-100" style="background: var(--color-bg-card); border: 1px solid var(--color-border-card) !important;">
                        <span class="group-title fw-bold text-main" style="font-family: var(--font-mono);">${capLabel}</span>
                        <div class="group-files-flex d-flex gap-2">
                            ${fileBadges}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = `<div class="w-100">${renderHtml}</div>`;
        } else {
            // Renderizado regular de badges en origen y final con contrates 100%
            const bgGlowClass = type === 'origen' ? 'bg-success-glow text-success border-success-subtle' : 'bg-info-glow text-info border-info-subtle';
            const icon = type === 'origen' ? 'text_snippet' : 'book_5';
            
            container.innerHTML = filteredFiles.map(file => `
                <div class="badge ${bgGlowClass} border px-3 py-2.5 rounded-3 d-flex align-items-center gap-2 fw-semibold" style="font-family: var(--font-mono); font-size: 11px; text-transform: none;">
                    <span class="material-symbols-outlined fs-6">${icon}</span>
                    ${file}
                </div>
            `).join('');
        }

        if (counterEl) {
            counterEl.innerText = `Mostrando ${filteredFiles.length} de ${this.diskModalFiles.length} archivos`;
        }
    }

    /**
     * Configura eventos de formularios, clicks e inputs de búsqueda.
     */
    setupEvents() {
        // Remover listeners previos para evitar fugas de memoria
        const searchInput = document.getElementById('disk-file-search');
        if (searchInput) {
            if (this.handleSearchInput) {
                searchInput.removeEventListener('input', this.handleSearchInput);
            }
            this.handleSearchInput = (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (!query) {
                    this.renderDiskFiles(this.diskModalFiles);
                } else {
                    const filtered = this.diskModalFiles.filter(file => file.toLowerCase().includes(query));
                    this.renderDiskFiles(filtered);
                }
            };
            searchInput.addEventListener('input', this.handleSearchInput);
        }

        // Formulario de Creación de Novelas (Bootstrap Modal)
        const form = document.getElementById('create-novel-form');
        if (form) {
            if (this.handleFormSubmit) {
                form.removeEventListener('submit', this.handleFormSubmit);
            }
            this.handleFormSubmit = async (e) => {
                e.preventDefault();

                const idVal = document.getElementById('novel-form-id').value.trim();
                const nameVal = document.getElementById('novel-form-name').value.trim();
                const srcVal = document.getElementById('novel-form-src').value;
                
                const checkedLangs = Array.from(document.querySelectorAll('.tgt-lang-check:checked')).map(el => el.value);
                if (checkedLangs.length === 0) {
                    globalEventBus.emit('toast:show', {
                        message: 'Debe seleccionar al menos un idioma de destino para la traducción.',
                        type: 'error'
                    });
                    return;
                }

                const idRegex = /^[a-z0-9_-]+$/;
                if (!idRegex.test(idVal)) {
                    globalEventBus.emit('toast:show', {
                        message: 'El ID de novela solo puede contener letras minúsculas, números, guiones y guiones bajos.',
                        type: 'error'
                    });
                    return;
                }

                const payload = {
                    id: idVal,
                    name: nameVal,
                    source_language: srcVal,
                    target_language: checkedLangs[0], // Por retrocompatibilidad con novelas viejas
                    target_languages: checkedLangs      // Arreglo completo para traducción múltiple
                };

                try {
                    globalEventBus.emit('toast:show', {
                        message: `Escribiendo estructura física de "${nameVal}" en Windows...`,
                        type: 'info'
                    });

                    const response = await ApiClient.createNovel(payload);
                    
                    globalEventBus.emit('toast:show', {
                        message: response.message || `Proyecto "${nameVal}" creado con éxito.`,
                        type: 'success'
                    });

                    // Ocultar modal mediante Bootstrap
                    this.instances['create-novel'].hide();

                    const updatedTelemetry = await ApiClient.getTelemetry();
                    globalState.set({
                        telemetry: updatedTelemetry,
                        activeNovelId: idVal
                    });

                } catch (err) {
                    globalEventBus.emit('toast:show', {
                        message: `Fallo de escritura física en disco: ${err.message}`,
                        type: 'error'
                    });
                }
            };
            form.addEventListener('submit', this.handleFormSubmit);
        }
    }

    /**
     * Limpia recursos y destruye listeners y modales de Bootstrap.
     */
    destroy() {
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        // Remover listeners explícitamente para evitar leaks
        const searchInput = document.getElementById('disk-file-search');
        if (searchInput && this.handleSearchInput) {
            searchInput.removeEventListener('input', this.handleSearchInput);
        }
        this.handleSearchInput = null;

        const form = document.getElementById('create-novel-form');
        if (form && this.handleFormSubmit) {
            form.removeEventListener('submit', this.handleFormSubmit);
        }
        this.handleFormSubmit = null;

        // Destruir instancias de Bootstrap de forma higiénica
        Object.entries(this.instances).forEach(([key, modal]) => {
            if (modal) {
                modal.hide();
                if (typeof modal.dispose === 'function') {
                    modal.dispose();
                }
            }
        });
        this.instances = {};

        // Eliminar elementos del DOM
        ['create-novel-modal-bootstrap', 'pipeline-explanation-modal', 'disk-breakdown-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

        console.log('[Modal] Sistema de modales de Bootstrap desmantelado limpiamente de memoria (0 leaks).');
    }
}

export const globalModal = new Modal();
export default globalModal;
