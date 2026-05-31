/**
 * @file ReaderView.js
 * @description Vista del Playground Lector interactivo de BATT Enterprise estilo Google AI Studio.
 * Integra visualización literaria premium, caja de prompt inferior para directivas de IA,
 * inyección interactiva drag-and-drop de archivos planos y delegación asíncrona de agentes.
 * @author BATT Principal Automation Engineer
 */

import { ApiClient } from '../../../core/api/ApiClient.js';
import { globalState } from '../../../core/state/State.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';

export class ReaderView {
    // Referencias para control de fugas de memoria
    static containerId = null;
    static activeNovelId = null;
    static unsubscribes = [];
    static listeners = {};

    /**
     * Renderiza la estructura del Playground Lector interactivo.
     * @param {string} containerId - ID del elemento destino.
     * @param {Object} [data] - Datos opcionales.
     */
    static async render(containerId, data = null) {
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = globalState.get();
        const telemetry = state.telemetry;

        // Si no está en línea, mostramos cortafuegos visual premium offline
        if (!state.isOnline) {
            container.innerHTML = `
                <div class="reader-empty-wrapper border border-theme rounded-4 p-5 text-center my-4" style="background: var(--color-surface-variant);">
                    <div class="reader-empty-state">
                        <span class="material-symbols-outlined text-danger fs-1 mb-3 animate-pulse" style="font-variation-settings: 'FILL' 1;">cloud_off</span>
                        <p class="text-main fw-bold mb-2 fs-5">Canal de Telemetría Fuera de Línea</p>
                        <p class="text-muted small max-width-md mx-auto mb-4">
                            La conexión local en tiempo real con el servidor de Windows se ha interrumpido (Puerto 3000). 
                            Los archivos de traducción están seguros en su disco duro.
                        </p>
                        <div class="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-body border-theme text-muted font-mono" style="font-size: 11px;">
                            <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
                            <span>Esperando reconexión asíncrona con el puerto 3000...</span>
                        </div>
                    </div>
                </div>
            `;
            // Registrar los listeners necesarios para repintar al reconectar
            this.setupEventListeners(state.activeNovelId);
            return;
        }

        const activeNovel = telemetry ? telemetry.novels.find(n => n.id === state.activeNovelId) : null;

        // Si no hay ninguna novela activa, mostramos el empty state de Playground
        if (!activeNovel) {
            container.innerHTML = `
                <div class="reader-empty-wrapper border border-theme rounded-4 p-5 text-center my-4">
                    <div class="reader-empty-state">
                        <span class="material-symbols-outlined text-primary fs-1 mb-3" style="font-variation-settings: 'FILL' 1;">book_5</span>
                        <p class="text-main fw-bold mb-1 fs-5">No se ha seleccionado ningún proyecto activo.</p>
                        <p class="text-muted small max-width-sm mx-auto mb-0">Seleccione un proyecto en el dropdown de la barra izquierda (o en la barra superior si está en móvil) para abrir el Playground de traducción.</p>
                    </div>
                </div>
            `;
            // Registrar event listeners de telemetría para repintar si se carga
            this.setupEventListeners(state.activeNovelId);
            return;
        }

        // Renderizado del Playground Trilateral estilo Google AI Studio con mejoras Premium
        container.innerHTML = `
            <div class="reader-modular-container d-flex flex-column h-100 justify-content-between gap-3">
                <!-- Barra de Herramientas Superior: Selector de capítulos y controles de visualización -->
                <div class="reader-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div class="d-flex align-items-center gap-2.5 flex-grow-1" style="max-width: 320px;">
                        <span class="material-symbols-outlined text-primary fs-5" style="font-variation-settings: 'FILL' 1;">chrome_reader_mode</span>
                        <select class="form-select select-premium select-sm rounded-pill py-2 px-4 shadow-sm" id="view-reader-chapter-selector" style="font-size: 13px;">
                            <option value="">Seleccione un capítulo a visualizar...</option>
                            ${this.renderChapterOptions(activeNovel)}
                        </select>
                    </div>

                    <!-- Controles Premium de Lector Flotante (Kindle/Medium Style) -->
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        <div class="reader-typography-controls-wrapper">
                            <!-- Selector Serif/Sans -->
                            <button class="btn-typo-control" id="view-reader-font-serif" title="Fuente Literaria Serif">Serif</button>
                            <button class="btn-typo-control" id="view-reader-font-sans" title="Fuente Moderna Sans">Sans</button>
                            
                            <div class="control-group-divider"></div>
                            
                            <!-- Tamaño de Letra Zoom -->
                            <button class="btn-typo-control" id="view-reader-zoom-out" title="Reducir letra (A-)">A-</button>
                            <button class="btn-typo-control" id="view-reader-zoom-in" title="Aumentar letra (A+)">A+</button>
                            
                            <div class="control-group-divider"></div>
                            
                            <!-- Interlineado (Line-Height) -->
                            <button class="btn-typo-control" id="view-reader-line-compact" title="Interlineado Compacto">1.4</button>
                            <button class="btn-typo-control" id="view-reader-line-normal" title="Interlineado Cómodo">1.7</button>
                            <button class="btn-typo-control" id="view-reader-line-wide" title="Interlineado Amplio">2.0</button>
                            
                            <div class="control-group-divider"></div>
                            
                            <!-- Temas de Lectura Estéticos -->
                            <div class="theme-dot-selector dot-system" id="view-reader-theme-system" title="Tema Sistema"></div>
                            <div class="theme-dot-selector dot-sepia" id="view-reader-theme-sepia" title="Tema Sepia Cálido"></div>
                            <div class="theme-dot-selector dot-night" id="view-reader-theme-night" title="Tema Noche Profunda"></div>
                            <div class="theme-dot-selector dot-forest" id="view-reader-theme-forest" title="Tema Bosque Selva"></div>
                        </div>

                        <!-- Botones de Acción Secundarios -->
                        <button class="btn-reader-secondary shadow-sm" id="view-reader-btn-open-glossary" title="Glosario del Elenco">
                            <span class="material-symbols-outlined fs-5">menu_book</span>
                            <span>Glosario</span>
                        </button>
                        
                        <button class="btn-reader-secondary shadow-sm" id="view-reader-btn-export-chapter" title="Descargar capítulo en Markdown plano (.md)">
                            <span class="material-symbols-outlined fs-5">download</span>
                            <span>Exportar</span>
                        </button>
                    </div>
                </div>

                <!-- Caja Central: Visor del Lector de Prosa Literaria -->
                <div class="reader-body-premium p-4 flex-grow-1 spa-view-content-new" id="view-reader-content-box" style="overflow-y: auto; max-height: calc(100vh - 300px); min-height: 250px;">
                    <div class="text-center p-5 text-muted">
                        <span class="material-symbols-outlined fs-2 d-block mb-3" style="animation: geminiShine 4s infinite;">auto_awesome</span>
                        <p class="m-0 small">Seleccione un capítulo de la barra superior para renderizar la prosa localizada en Markdown.</p>
                    </div>
                </div>

                <!-- Caja de Prompt Inferior Estilo Google AI Studio (AUD-05) -->
                <div class="ai-studio-prompt-box-wrapper w-100">
                    <textarea class="prompt-textarea" id="view-reader-prompt-textarea" rows="2" placeholder="Opcional: Escribe directivas de IA de un solo uso en caliente (ej. 'Traduce el capítulo manteniendo los Kaomojis con énfasis en comedia literaria')..."></textarea>
                    
                    <div class="prompt-box-footer">
                        <!-- Lado izquierdo: Área de Ingestión / Drag & Drop compacta -->
                        <div class="footer-tools flex-grow-1 me-3">
                            <div class="ai-studio-drag-drop-zone d-flex align-items-center gap-2 py-1 px-3" id="view-reader-drag-drop-zone">
                                <span class="material-symbols-outlined text-primary fs-5">cloud_upload</span>
                                <span class="text-muted" style="font-size: 11.5px; user-select: none;">Inyectar .txt por Drag & Drop o click</span>
                                <input type="file" id="view-reader-file-input" accept=".txt" class="d-none">
                            </div>
                        </div>

                        <!-- Lado derecho: Botones de ejecución rápida -->
                        <div class="footer-actions flex-shrink-0">
                            <button class="btn btn-google-action d-inline-flex align-items-center gap-2" id="view-reader-btn-execute" disabled>
                                <span class="material-symbols-outlined fs-5">bolt</span>
                                Ejecutar Traducción
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Cajón de Glosario Flotante Deslizable (Glassmorphism Sidebar) -->
                <div class="glossary-drawer" id="view-reader-glossary-drawer">
                    <div class="drawer-header">
                        <h3 class="fs-6 fw-bold m-0 text-main d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-5">book_5</span>
                            <span>Glosario de Campo</span>
                        </h3>
                        <button class="btn-typo-control d-inline-flex align-items-center justify-content-center" id="view-reader-btn-close-glossary" title="Cerrar Glosario" style="width: 28px; height: 28px; padding: 0; border-radius: 50%;">
                            <span class="material-symbols-outlined fs-5">close</span>
                        </button>
                    </div>
                    <div class="drawer-body">
                        <div class="glossary-search-wrapper">
                            <span class="material-symbols-outlined search-icon-fixed">search</span>
                            <input type="text" class="glossary-search-input" id="view-reader-glossary-search" placeholder="Buscar en el glosario...">
                        </div>
                        <div class="glossary-rendered-content" id="view-reader-glossary-content">
                            <div class="text-center py-4 text-muted">
                                <span class="material-symbols-outlined fs-3 mb-2" style="color: var(--color-text-muted);">menu_book</span>
                                <p class="small m-0">Abra el glosario para sincronizar.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Aplicar preferencias tipográficas antes de registrar listeners
        this.applyTypographyPreferences();

        this.setupEventListeners(state.activeNovelId);
    }

    /**
     * Renderiza las opciones de capítulos indexados.
     * @param {Object} novel - Datos del proyecto.
     * @returns {string} - Código HTML resultante.
     */
    static renderChapterOptions(novel) {
        let origenFiles = novel.origen_files_list || [];
        let finalFiles = novel.final_files_list || [];

        if (origenFiles.length === 0) return '';

        // Ordenar numéricamente los capítulos
        const sortedChapters = [...origenFiles].sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });

        return sortedChapters.map(file => {
            const cleanId = file.replace('.txt', '');
            const cleanName = cleanId.replace('capitulo_', 'Capítulo ');
            const isTranslated = finalFiles.some(f => f.includes(`${cleanId}_final.md`));

            if (isTranslated) {
                return `<option value="${cleanId}">${cleanName} — ✓ Completado</option>`;
            } else {
                return `<option value="${cleanId}" class="text-warning">${cleanName} — ⚡ Pendiente (Origen)</option>`;
            }
        }).join('');
    }

    /**
     * Registra todos los event listeners e higiene reactiva de la vista.
     */
    static setupEventListeners(novelId) {
        this.activeNovelId = novelId;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Limpiar suscripciones anteriores antes de registrar nuevas
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        // 1. Selector de Capítulos
        const selector = container.querySelector('#view-reader-chapter-selector');
        if (selector) {
            const handler = async (e) => {
                const chapterId = e.target.value;
                await this.loadChapter(chapterId);
            };
            selector.addEventListener('change', handler);
            this.listeners['chapterSelector'] = { el: selector, event: 'change', fn: handler };
        }

        // 2. Botón de Ejecutar Traducción de IA
        const executeBtn = container.querySelector('#view-reader-btn-execute');
        if (executeBtn) {
            const handler = async () => {
                const chapterSelector = container.querySelector('#view-reader-chapter-selector');
                const promptTextarea = container.querySelector('#view-reader-prompt-textarea');
                
                if (!chapterSelector || !chapterSelector.value) return;
                const chapterId = chapterSelector.value;
                const customPrompt = promptTextarea ? promptTextarea.value.trim() : '';

                globalEventBus.emit('toast:show', {
                    message: `🚀 Activando agentes autónomos para traducir el capítulo "${chapterId}".`,
                    type: 'success'
                });

                executeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Ejecutando...';
                executeBtn.disabled = true;

                try {
                    // Sincronizar instrucciones del sistema en localStorage si existen antes de delegar
                    if (customPrompt) {
                        localStorage.setItem('batt-system-instructions', customPrompt);
                    }

                    const result = await ApiClient.delegateChapter(this.activeNovelId, chapterId, `${chapterId}.txt`);
                    
                    globalEventBus.emit('toast:show', {
                        message: result.message || `✓ Capítulo ${chapterId} encolado en disco correctamente.`,
                        type: result.success ? 'success' : 'warn'
                    });

                    // Limpiar textarea después del éxito
                    if (promptTextarea) promptTextarea.value = '';

                } catch (err) {
                    globalEventBus.emit('toast:show', {
                        message: `❌ Error al delegar traducción: ${err.message}`,
                        type: 'error'
                    });
                } finally {
                    executeBtn.innerHTML = '<span class="material-symbols-outlined fs-5">bolt</span>Ejecutar Traducción';
                    executeBtn.disabled = false;
                    await this.loadChapter(chapterId);
                }
            };
            executeBtn.addEventListener('click', handler);
            this.listeners['executeClick'] = { el: executeBtn, event: 'click', fn: handler };
        }

        // 3. Drag & Drop de Ingestión Directa en la Caja de Prompt
        const dropZone = container.querySelector('#view-reader-drag-drop-zone');
        const fileInput = container.querySelector('#view-reader-file-input');
        
        if (dropZone && fileInput) {
            // Click en la zona abre el explorador
            const clickHandler = () => fileInput.click();
            dropZone.addEventListener('click', clickHandler);
            this.listeners['dropZoneClick'] = { el: dropZone, event: 'click', fn: clickHandler };

            // Selección de archivo
            const fileHandler = async (e) => {
                const file = e.target.files[0];
                if (file) await this.handleFileUpload(file);
            };
            fileInput.addEventListener('change', fileHandler);
            this.listeners['fileInputChange'] = { el: fileInput, event: 'change', fn: fileHandler };

            // Drag Enter
            const enterHandler = (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            };
            dropZone.addEventListener('dragenter', enterHandler);
            this.listeners['dropZoneEnter'] = { el: dropZone, event: 'dragenter', fn: enterHandler };

            // Drag Over
            const overHandler = (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            };
            dropZone.addEventListener('dragover', overHandler);
            this.listeners['dropZoneOver'] = { el: dropZone, event: 'dragover', fn: overHandler };

            // Drag Leave
            const leaveHandler = (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            };
            dropZone.addEventListener('dragleave', leaveHandler);
            this.listeners['dropZoneLeave'] = { el: dropZone, event: 'dragleave', fn: leaveHandler };

            // Drop
            const dropHandler = async (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) await this.handleFileUpload(file);
            };
            dropZone.addEventListener('drop', dropHandler);
            this.listeners['dropZoneDrop'] = { el: dropZone, event: 'drop', fn: dropHandler };
        }

        // 4. Mejoras Premium: Controles de Tipografía, Temas y Acciones Literarias
        
        // Fuentes
        const btnSerif = container.querySelector('#view-reader-font-serif');
        if (btnSerif) {
            const handler = () => {
                localStorage.setItem('batt-reader-font-family', 'serif');
                this.applyTypographyPreferences();
            };
            btnSerif.addEventListener('click', handler);
            this.listeners['fontSerifClick'] = { el: btnSerif, event: 'click', fn: handler };
        }

        const btnSans = container.querySelector('#view-reader-font-sans');
        if (btnSans) {
            const handler = () => {
                localStorage.setItem('batt-reader-font-family', 'sans');
                this.applyTypographyPreferences();
            };
            btnSans.addEventListener('click', handler);
            this.listeners['fontSansClick'] = { el: btnSans, event: 'click', fn: handler };
        }

        // Zoom Letra
        const btnZoomOut = container.querySelector('#view-reader-zoom-out');
        if (btnZoomOut) {
            const handler = () => {
                let size = parseFloat(localStorage.getItem('batt-reader-font-size') || '17.5');
                size = Math.max(14, size - 1);
                localStorage.setItem('batt-reader-font-size', size.toString());
                this.applyTypographyPreferences();
            };
            btnZoomOut.addEventListener('click', handler);
            this.listeners['zoomOutClick'] = { el: btnZoomOut, event: 'click', fn: handler };
        }

        const btnZoomIn = container.querySelector('#view-reader-zoom-in');
        if (btnZoomIn) {
            const handler = () => {
                let size = parseFloat(localStorage.getItem('batt-reader-font-size') || '17.5');
                size = Math.min(24, size + 1);
                localStorage.setItem('batt-reader-font-size', size.toString());
                this.applyTypographyPreferences();
            };
            btnZoomIn.addEventListener('click', handler);
            this.listeners['zoomInClick'] = { el: btnZoomIn, event: 'click', fn: handler };
        }

        // Interlineado
        const btnLineCompact = container.querySelector('#view-reader-line-compact');
        if (btnLineCompact) {
            const handler = () => {
                localStorage.setItem('batt-reader-line-height', '1.4');
                this.applyTypographyPreferences();
            };
            btnLineCompact.addEventListener('click', handler);
            this.listeners['lineCompactClick'] = { el: btnLineCompact, event: 'click', fn: handler };
        }

        const btnLineNormal = container.querySelector('#view-reader-line-normal');
        if (btnLineNormal) {
            const handler = () => {
                localStorage.setItem('batt-reader-line-height', '1.7');
                this.applyTypographyPreferences();
            };
            btnLineNormal.addEventListener('click', handler);
            this.listeners['lineNormalClick'] = { el: btnLineNormal, event: 'click', fn: handler };
        }

        const btnLineWide = container.querySelector('#view-reader-line-wide');
        if (btnLineWide) {
            const handler = () => {
                localStorage.setItem('batt-reader-line-height', '2.0');
                this.applyTypographyPreferences();
            };
            btnLineWide.addEventListener('click', handler);
            this.listeners['lineWideClick'] = { el: btnLineWide, event: 'click', fn: handler };
        }

        // Temas de lectura
        const themes = ['system', 'sepia', 'night', 'forest'];
        themes.forEach(t => {
            const el = container.querySelector(`#view-reader-theme-${t}`);
            if (el) {
                const handler = () => {
                    localStorage.setItem('batt-reader-theme', t);
                    this.applyTypographyPreferences();
                };
                el.addEventListener('click', handler);
                this.listeners[`theme${t}Click`] = { el: el, event: 'click', fn: handler };
            }
        });

        // Control de Cajón de Glosario
        const drawer = container.querySelector('#view-reader-glossary-drawer');
        const btnOpenGlossary = container.querySelector('#view-reader-btn-open-glossary');
        const btnCloseGlossary = container.querySelector('#view-reader-btn-close-glossary');
        const glossarySearch = container.querySelector('#view-reader-glossary-search');

        if (btnOpenGlossary && drawer) {
            const handler = () => {
                drawer.classList.add('open');
                this.loadGlossary();
            };
            btnOpenGlossary.addEventListener('click', handler);
            this.listeners['openGlossaryClick'] = { el: btnOpenGlossary, event: 'click', fn: handler };
        }

        if (btnCloseGlossary && drawer) {
            const handler = () => {
                drawer.classList.remove('open');
            };
            btnCloseGlossary.addEventListener('click', handler);
            this.listeners['closeGlossaryClick'] = { el: btnCloseGlossary, event: 'click', fn: handler };
        }

        if (glossarySearch) {
            const handler = (e) => {
                this.filterGlossary(e.target.value);
            };
            glossarySearch.addEventListener('input', handler);
            this.listeners['glossarySearchInput'] = { el: glossarySearch, event: 'input', fn: handler };
        }

        // Botón de Exportación en Markdown
        const btnExport = container.querySelector('#view-reader-btn-export-chapter');
        if (btnExport) {
            const handler = async () => {
                const chapterSelector = container.querySelector('#view-reader-chapter-selector');
                if (!chapterSelector || !chapterSelector.value) {
                    globalEventBus.emit('toast:show', {
                        message: '⚠️ Por favor, seleccione un capítulo completado para poder exportarlo.',
                        type: 'warn'
                    });
                    return;
                }
                const chapterId = chapterSelector.value;
                btnExport.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Exportando...';
                btnExport.disabled = true;

                try {
                    const markdown = await ApiClient.getChapterContent(this.activeNovelId, chapterId);
                    
                    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${chapterId}_final.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    globalEventBus.emit('toast:show', {
                        message: `✓ Capítulo "${chapterId}" descargado de forma exitosa en formato Markdown.`,
                        type: 'success'
                    });
                } catch (err) {
                    globalEventBus.emit('toast:show', {
                        message: `❌ Error al exportar capítulo: ${err.message}`,
                        type: 'error'
                    });
                } finally {
                    btnExport.innerHTML = '<span class="material-symbols-outlined fs-5">download</span><span>Exportar</span>';
                    btnExport.disabled = false;
                }
            };
            btnExport.addEventListener('click', handler);
            this.listeners['exportClick'] = { el: btnExport, event: 'click', fn: handler };
        }

        // Suscripción reactiva para repintar la vista si la telemetría se actualiza
        const subTelemetry = globalEventBus.on('state:telemetry', (data) => {
            if (data.newValue && this.activeNovelId) {
                const activeNovel = data.newValue.novels.find(n => n.id === this.activeNovelId);
                const selector = container.querySelector('#view-reader-chapter-selector');
                if (selector && activeNovel) {
                    const savedVal = selector.value;
                    selector.innerHTML = `<option value="">Seleccione un capítulo a visualizar...</option>` + this.renderChapterOptions(activeNovel);
                    selector.value = savedVal;
                }
            }
        });

        // Suscripción reactiva al cambio de conexión
        const subOnline = globalEventBus.on('state:isOnline', () => {
            this.render(this.containerId);
        });

        this.unsubscribes.push(subTelemetry, subOnline);
    }

    /**
     * Recupera y aplica las preferencias tipográficas y de tema persistidas en disco.
     */
    static applyTypographyPreferences() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const contentBox = container.querySelector('#view-reader-content-box');
        if (!contentBox) return;

        // Leer configuraciones persistidas
        const fontSize = localStorage.getItem('batt-reader-font-size') || '17.5';
        const fontFamily = localStorage.getItem('batt-reader-font-family') || 'serif';
        const lineHeight = localStorage.getItem('batt-reader-line-height') || '1.7';
        const theme = localStorage.getItem('batt-reader-theme') || 'system';

        // Aplicar estilos locales al contenedor
        contentBox.style.setProperty('--reader-font-size', `${fontSize}px`);
        contentBox.style.setProperty('--reader-line-height', lineHeight);

        // Actualizar fuentes
        contentBox.classList.remove('font-reader-serif', 'font-reader-sans');
        contentBox.classList.add(`font-reader-${fontFamily}`);

        // Actualizar temas
        contentBox.classList.remove('theme-reader-sepia', 'theme-reader-night', 'theme-reader-forest');
        if (theme !== 'system') {
            contentBox.classList.add(`theme-reader-${theme}`);
        }

        // Actualizar los estados visuales (clase active) en los controles
        const btnSerif = container.querySelector('#view-reader-font-serif');
        const btnSans = container.querySelector('#view-reader-font-sans');
        if (btnSerif && btnSans) {
            btnSerif.classList.toggle('active', fontFamily === 'serif');
            btnSans.classList.toggle('active', fontFamily === 'sans');
        }

        const btnLineCompact = container.querySelector('#view-reader-line-compact');
        const btnLineNormal = container.querySelector('#view-reader-line-normal');
        const btnLineWide = container.querySelector('#view-reader-line-wide');
        if (btnLineCompact && btnLineNormal && btnLineWide) {
            btnLineCompact.classList.toggle('active', lineHeight === '1.4');
            btnLineNormal.classList.toggle('active', lineHeight === '1.7');
            btnLineWide.classList.toggle('active', lineHeight === '2.0');
        }

        // Actualizar dots de temas
        const dotSystem = container.querySelector('#view-reader-theme-system');
        const dotSepia = container.querySelector('#view-reader-theme-sepia');
        const dotNight = container.querySelector('#view-reader-theme-night');
        const dotForest = container.querySelector('#view-reader-theme-forest');
        if (dotSystem && dotSepia && dotNight && dotForest) {
            dotSystem.classList.toggle('active', theme === 'system');
            dotSepia.classList.toggle('active', theme === 'sepia');
            dotNight.classList.toggle('active', theme === 'night');
            dotForest.classList.toggle('active', theme === 'forest');
        }
    }

    /**
     * Carga de forma asíncrona el archivo glosario_elenco.md de la novela activa y lo renderiza.
     */
    static async loadGlossary() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const contentDiv = container.querySelector('#view-reader-glossary-content');
        if (!contentDiv) return;

        // Si ya hay un glosario guardado en memoria para esta novela, evitamos consumo de red innecesario
        if (this.currentGlossaryNovelId === this.activeNovelId && this.glossaryHtml) {
            contentDiv.innerHTML = this.glossaryHtml;
            // Limpiar buscador al abrir
            const searchInput = container.querySelector('#view-reader-glossary-search');
            if (searchInput) searchInput.value = '';
            return;
        }

        contentDiv.innerHTML = `
            <div class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                <p class="small m-0">Consumiendo glosario de forma asíncrona...</p>
            </div>
        `;

        try {
            const rawMarkdown = await ApiClient.getNovelDatabaseContent(this.activeNovelId, 'glosario_elenco.md');
            
            // Si el backend responde sin error pero vacío o no lo encuentra, el texto plano puede venir vacío
            if (!rawMarkdown || rawMarkdown.trim() === '' || rawMarkdown.includes('ENOENT') || rawMarkdown.includes('error')) {
                throw new Error("No se ha configurado un glosario_elenco.md válido para esta novela.");
            }

            const parsedHtml = this.parseMarkdown(rawMarkdown);
            this.glossaryHtml = parsedHtml;
            this.currentGlossaryNovelId = this.activeNovelId;
            contentDiv.innerHTML = parsedHtml;

            // Limpiar buscador al cargar nuevo
            const searchInput = container.querySelector('#view-reader-glossary-search');
            if (searchInput) searchInput.value = '';

        } catch (err) {
            this.glossaryHtml = null;
            this.currentGlossaryNovelId = null;
            contentDiv.innerHTML = `
                <div class="text-center py-4 px-2 text-muted">
                    <span class="material-symbols-outlined fs-2 mb-2 text-warning">warning</span>
                    <p class="small fw-semibold text-main mb-1">Sin Glosario de Elenco</p>
                    <p class="small text-muted m-0" style="font-size: 11px; line-height: 1.4;">
                        No se encontró "glosario_elenco.md" en la carpeta de bases de datos del proyecto local.
                    </p>
                </div>
            `;
        }
    }

    /**
     * Filtra reactivamente el contenido visual del glosario sobre el DOM.
     * @param {string} rawQuery - Término de búsqueda escrito.
     */
    static filterGlossary(rawQuery) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const contentDiv = container.querySelector('#view-reader-glossary-content');
        if (!contentDiv || !this.glossaryHtml) return;

        const query = rawQuery.toLowerCase().trim();

        // Si la consulta está vacía, repintar el glosario completo
        if (!query) {
            contentDiv.innerHTML = this.glossaryHtml;
            return;
        }

        // Si no está vacía, restaurar el html original completo primero
        contentDiv.innerHTML = this.glossaryHtml;

        const liElements = contentDiv.querySelectorAll('li');
        let matchCount = 0;

        liElements.forEach(li => {
            const text = li.textContent.toLowerCase();
            if (text.includes(query)) {
                li.style.display = '';
                matchCount++;
            } else {
                li.style.display = 'none';
            }
        });

        // Filtrar y ocultar cabeceras h3 vacías
        const h3Elements = contentDiv.querySelectorAll('h3');
        h3Elements.forEach(h3 => {
            let sibling = h3.nextElementSibling;
            let hasVisibleLi = false;
            while (sibling && sibling.tagName !== 'H3') {
                if (sibling.tagName === 'UL') {
                    const lis = sibling.querySelectorAll('li');
                    lis.forEach(li => {
                        if (li.style.display !== 'none') {
                            hasVisibleLi = true;
                        }
                    });
                }
                sibling = sibling.nextElementSibling;
            }
            h3.style.display = hasVisibleLi ? '' : 'none';
        });

        // Mensaje de sin resultados
        let noResultsMsg = contentDiv.querySelector('.glossary-no-results');
        if (matchCount === 0) {
            if (!noResultsMsg) {
                const msg = document.createElement('div');
                msg.className = 'glossary-no-results text-center py-4 text-muted';
                msg.innerHTML = `
                    <span class="material-symbols-outlined d-block fs-3 mb-2" style="color: var(--color-text-muted);">search_off</span>
                    <p class="small m-0">No se encontraron coincidencias para "${rawQuery}".</p>
                `;
                contentDiv.appendChild(msg);
            }
        } else {
            if (noResultsMsg) noResultsMsg.remove();
        }
    }

    /**
     * Carga y renderiza el contenido del capítulo seleccionado en el visor central.
     * @param {string} chapterId - Nombre de capítulo sin extensión.
     */
    static async loadChapter(chapterId) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const contentBox = container.querySelector('#view-reader-content-box');
        const executeBtn = container.querySelector('#view-reader-btn-execute');
        
        if (!contentBox) return;

        if (!chapterId) {
            contentBox.innerHTML = `
                <div class="text-center p-5 text-muted">
                    <span class="material-symbols-outlined fs-2 d-block mb-3" style="animation: geminiShine 4s infinite;">auto_awesome</span>
                    <p class="m-0 small">Seleccione un capítulo de la barra superior para renderizar la prosa localizada en Markdown.</p>
                </div>
            `;
            if (executeBtn) executeBtn.disabled = true;
            return;
        }

        const state = globalState.get();
        const activeNovel = state.telemetry ? state.telemetry.novels.find(n => n.id === this.activeNovelId) : null;
        
        const isTranslated = activeNovel && activeNovel.final_files_list 
            ? activeNovel.final_files_list.some(f => f.includes(`${chapterId}_final.md`)) 
            : false;
        
        const isQueued = activeNovel && activeNovel.pending_queue
            ? activeNovel.pending_queue.some(q => q.chapter_id === chapterId)
            : false;

        // Si el capítulo está completado, habilitamos la lectura
        if (isTranslated) {
            if (executeBtn) executeBtn.disabled = true; // No es necesario volver a traducir

            try {
                contentBox.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center p-5 text-muted">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        <span class="small font-mono">Cargando traducción de forma asíncrona desde el disco...</span>
                    </div>
                `;
                
                const markdown = await ApiClient.getChapterContent(this.activeNovelId, chapterId);
                
                contentBox.innerHTML = `
                    <div class="markdown-rendered py-1">
                        ${this.parseMarkdown(markdown)}
                    </div>
                `;
                
                // Hacer scroll-top suave de visualización del capítulo
                contentBox.scrollTop = 0;

            } catch (err) {
                contentBox.innerHTML = `
                    <div class="alert alert-danger d-flex align-items-center gap-2 rounded-3 py-3 px-4 border-0">
                        <span class="material-symbols-outlined text-danger">error</span>
                        <span class="text-danger small fw-semibold">Error de lectura física: ${err.message}</span>
                    </div>
                `;
            }
            return;
        }

        // Si el capítulo está en cola
        if (isQueued) {
            if (executeBtn) executeBtn.disabled = true;
            contentBox.innerHTML = `
                <div class="reader-pending-container p-5 rounded-4 text-center border-warning-subtle" style="background: rgba(234,179,8,0.03);">
                    <span class="material-symbols-outlined text-warning fs-1 animated-pulse mb-3">schedule</span>
                    <h3 class="reader-pending-title text-main fw-bold fs-5 mb-2">Traducción Literaria En Cola</h3>
                    <p class="reader-pending-description text-muted small mb-4 mx-auto" style="max-width: 480px;">
                        El capítulo original <strong>${chapterId}.txt</strong> está actualmente encolado y a la espera de ser procesado secuencialmente por el Queue Worker de BATT.
                    </p>
                </div>
            `;
            return;
        }

        // Si el capítulo está pendiente de procesar
        if (executeBtn) executeBtn.disabled = false; // Habilitamos la traducción
        contentBox.innerHTML = `
            <div class="reader-pending-container p-5 rounded-4 text-center border border-dashed" style="border-color: var(--color-border-card) !important;">
                <span class="material-symbols-outlined text-primary fs-1 mb-3">hourglass_empty</span>
                <h3 class="reader-pending-title text-main fw-bold fs-5 mb-2">Traducción Literaria Pendiente</h3>
                <p class="reader-pending-description text-muted small mb-0 mx-auto" style="max-width: 480px;">
                    El archivo original <strong>${chapterId}.txt</strong> se encuentra en disco pero aún no ha sido traducido por el pipeline de agentes de BATT.
                </p>
                <small class="text-muted d-block mt-2 font-mono fs-8">Pulse el botón "Ejecutar Traducción" abajo para iniciar el proceso en Windows.</small>
            </div>
        `;
    }

    /**
     * Gestiona la carga de archivos crudos .txt al disco mediante ApiClient.
     * @param {File} file - Archivo.
     */
    static async handleFileUpload(file) {
        if (!file.name.toLowerCase().endsWith('.txt')) {
            globalEventBus.emit('toast:show', {
                message: 'Formato de archivo inválido. Utilice exclusivamente archivos planos (.txt).',
                type: 'error'
            });
            return;
        }

        globalEventBus.emit('toast:show', {
            message: `Subiendo y sanitizando capítulo "${file.name}" en disco duro...`,
            type: 'info'
        });

        try {
            await ApiClient.uploadChapter(this.activeNovelId, file);
            
            globalEventBus.emit('toast:show', {
                message: `Capítulo "${file.name}" inyectado exitosamente en disk.`,
                type: 'success'
            });

            // Recargar telemetría para repintar las opciones de capítulos
            const updatedTelemetry = await ApiClient.getTelemetry();
            globalState.set({ telemetry: updatedTelemetry });

        } catch (err) {
            globalEventBus.emit('toast:show', {
                message: `Fallo crítico de ingestión: ${err.message}`,
                type: 'error'
            });
        }
    }

    /**
     * Motor parser Markdown literario premium libre de dependencias.
     * @param {string} md - Texto original en Markdown.
     * @returns {string} - Código HTML resultante.
     */
    static parseMarkdown(md) {
        if (!md) return '';

        let html = this.escapeHtml(md);

        // 1. Convertir cabeceras (#, ##, ###)
        html = html.replace(/^### (.*?)$/gm, '<h3 class="fs-5 fw-bold text-main mt-4 mb-3">$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2 class="fs-4 fw-bold text-main mt-4 mb-3">$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1 class="fs-3 fw-bold text-main mt-4 mb-3">$1</h1>');

        // 2. Bloques de citas / notas del traductor: > texto
        html = html.replace(/^&gt; (.*?)$/gm, '<blockquote class="translator-note">$1</blockquote>');

        // 3. Líneas divisoras estéticas: ---
        html = html.replace(/^---$/gm, '<hr class="reader-divider">');

        // 4. Negritas: **texto**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 5. Cursivas: *texto*
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 6. Detección y envoltura de Kaomojis para micro-animación en caliente
        html = html.replace(/(\([^\)]*(?:[✿◠‿✿|╬|ಠ益ಠ|•̀ᴗ•́|و|̑̑|◕‿◕|\^_\^|╯|°|□|）|╯|︵|┻|━|┻|｡|♥|‿|♥|｡|￣|▽|￣|⊙|⊙|ಠ|ಠ|╥|╥|ʘ|ʘ|★|☆|▼|▲|☉|☉|Θ|─|ゞ|シ|。|ミ|彡|✿|ノ|ಥ|益|ೃ|ꐦ|இ|⌯|'|•|`|๑|°|´|▽|•|̀|ᴗ|•|́|و|̑|̑])[^\)]*\))/g, '<span class="kaomoji-highlight">$1</span>');

        // 7. Reemplazar saltos de línea por párrafos literarios reales
        const lines = html.split(/\n{2,}/);
        const paragraphHtml = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
                return trimmed;
            }
            return `<p class="prose-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return paragraphHtml;
    }

    /**
     * Sanitiza caracteres HTML para evitar vulnerabilidades de script inyectado (XSS).
     */
    static escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Destruye el componente de la memoria del navegador, liberando timers y removiendo listeners de forma explícita.
     */
    static destroy() {
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        Object.entries(this.listeners).forEach(([key, config]) => {
            if (config && config.el) {
                config.el.removeEventListener(config.event, config.fn);
            }
        });
        this.listeners = {};
        this.activeNovelId = null;
        this.containerId = null;

        console.log('[ReaderView] Visor Playground desmantelado de memoria con éxito (0 leaks).');
    }
}

export default ReaderView;
