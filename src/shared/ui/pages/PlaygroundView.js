/**
 * @file PlaygroundView.js
 * @description Vista del Playground de Modelos interactivo de BATT Enterprise diseñado al 100% estilo Google AI Studio.
 * Presenta una grilla premium (CSS Grid 3x2) de exploración de capacidades cognitivas y un chat/prompt unificado en la base.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../../core/state/State.js';
import { globalRouter } from '../../../core/router/Router.js';
import { globalToast } from '../overlay/Toast.js';

export class PlaygroundView {
    // Registro estático de listeners de eventos para prevenir memory leaks
    static listeners = {};

    /**
     * Renderiza la interfaz modular del Playground estilo Google AI Studio.
     * @param {string} containerId - Identificador del nodo anclaje del DOM.
     * @param {Object|null} data - Datos adicionales de renderizado (opcional).
     * @returns {Promise<void>}
     */
    static async render(containerId, data = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = globalState.get();

        // 1. Inyectar estructura HTML premium con clases semánticas, flex y grid
        container.innerHTML = `
            <div class="playground-container scrollbar-premium">
                <!-- Parte Superior: Título conLook Google AI Studio y Conmutador de Modos (Models / Agents) -->
                <div class="playground-header">
                    <h1 class="playground-title">Explore BATT models</h1>
                    
                    <div class="playground-toggle-switch select-none" id="playground-mode-toggle">
                        <button class="toggle-btn active" data-mode="models">Models</button>
                        <button class="toggle-btn" data-mode="agents">Agents</button>
                    </div>
                </div>

                <!-- Parte Media: Grilla de Modelos (CSS Grid: 3 columnas x 2 filas) -->
                <div class="playground-grid" id="playground-cards-grid">
                    <!-- Tarjeta 1: Featured -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(228, 161, 27, 0.1); color: var(--color-accent-yellow);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
                        </div>
                        <h3 class="card-title">Featured</h3>
                        <p class="card-description">Test out our most advanced and newest localization models tuned for Xianxia and Wuxia literature.</p>
                    </div>

                    <!-- Tarjeta 2: Code and Chat -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(11, 87, 208, 0.1); color: var(--color-primary);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">chat</span>
                        </div>
                        <h3 class="card-title">Code and Chat</h3>
                        <p class="card-description">Build chatbots, orchestrate autonomous agents, and write local automation scripts with BATT Engine v3.</p>
                    </div>

                    <!-- Tarjeta 3: Image Generation -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(184, 27, 108, 0.1); color: var(--color-accent-pink);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">image</span>
                        </div>
                        <h3 class="card-title">Image Generation</h3>
                        <p class="card-description">Synthesize and edit custom graphic assets and character illustrations with Nano Banana and Imagen.</p>
                    </div>

                    <!-- Tarjeta 4: Video Generation -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(20, 164, 77, 0.1); color: var(--color-accent-green);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">movie</span>
                        </div>
                        <h3 class="card-title">Video Generation</h3>
                        <p class="card-description">Generate dynamic cinematic teasers and translation timelines with Veo models and local GPU pipeline.</p>
                    </div>

                    <!-- Tarjeta 5: Speech and Music -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(220, 76, 100, 0.1); color: var(--color-accent-red);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">mic</span>
                        </div>
                        <h3 class="card-title">Speech and Music</h3>
                        <p class="card-description">Explore our high-fidelity text-to-speech audiobooks synthesizer and local music transcription engine.</p>
                    </div>

                    <!-- Tarjeta 6: Real-time -->
                    <div class="playground-card" data-action="chapter-reader">
                        <div class="card-icon-wrapper" style="background-color: rgba(168, 199, 250, 0.15); color: var(--color-primary);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">bolt</span>
                        </div>
                        <h3 class="card-title">Real-time</h3>
                        <p class="card-description">Orchestrate real-time localized stream pipelines and low-latency voice actions using Live API endpoints.</p>
                    </div>
                </div>

                <!-- Enlace de Construcción (Lanzador al Lector de Capítulos) -->
                <div class="playground-link-row">
                    <button class="btn-start-building" id="btn-playground-start-building">
                        <span>Start building</span>
                        <span class="material-symbols-outlined fs-6 select-none" style="vertical-align: middle;">arrow_forward</span>
                    </button>
                </div>

                <!-- Parte Inferior: Caja de Chat Interactiva Unificada (AI Studio Style) -->
                <div class="playground-bottom-chat-container">
                    <div class="playground-bottom-chat-box">
                        <!-- Entrada de Texto de Usuario -->
                        <input type="text" class="chat-input" id="playground-chat-text-input" 
                               placeholder="Start typing a prompt to see what our models can do" />
                        
                        <!-- Barra de Acciones y Modos Rápidos -->
                        <div class="chat-actions-row">
                            <div class="chat-actions-left select-none">
                                <button class="chat-action-btn" title="Ocultar entrada" id="btn-chat-toggle-visibility">
                                    <span class="material-symbols-outlined fs-5">visibility_off</span>
                                </button>
                                <button class="chat-action-btn-flat" id="btn-chat-tools">
                                    <span class="material-symbols-outlined fs-5">terminal</span>
                                    <span>Tools</span>
                                </button>
                                <div class="chat-pill-google-search" id="pill-chat-search">
                                    <span class="material-symbols-outlined fs-5" style="font-variation-settings: 'FILL' 1; font-weight: bold;">public</span>
                                    <span>Grounding with Google Search</span>
                                    <span class="material-symbols-outlined pill-close" id="btn-close-grounding">close</span>
                                </div>
                            </div>
                            <div class="chat-actions-right select-none">
                                <button class="chat-action-btn" title="Activar micrófono" id="btn-chat-mic">
                                    <span class="material-symbols-outlined fs-5">mic</span>
                                </button>
                                <button class="chat-action-btn" title="Agregar archivo o contexto" id="btn-chat-add-file">
                                    <span class="material-symbols-outlined fs-5">add_circle</span>
                                </button>
                                <button class="btn-run-chat" id="btn-playground-run-chat">
                                    <span>Run</span>
                                    <span class="material-symbols-outlined fs-6">play_arrow</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 2. Registrar controladores de eventos interactivos
        this.setupEventListeners();
    }

    /**
     * Configura de forma higiénica todos los controladores del DOM para la vista.
     */
    static setupEventListeners() {
        // A. Conmutador de modo Models / Agents
        const modeToggle = document.getElementById('playground-mode-toggle');
        if (modeToggle) {
            const handler = (e) => {
                const btn = e.target.closest('.toggle-btn');
                if (!btn) return;

                modeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.getAttribute('data-mode');
                globalToast.show(`Visualización conmutada a la matriz de ${mode === 'models' ? 'Modelos Cognitivos' : 'Agentes Autónomos'}.`, 'info');
            };
            modeToggle.addEventListener('click', handler);
            this.listeners['modeToggle'] = { el: modeToggle, event: 'click', fn: handler };
        }

        // B. Lanzador al Lector tradicional (Start Building)
        const startBuildingBtn = document.getElementById('btn-playground-start-building');
        if (startBuildingBtn) {
            const handler = () => {
                this.navigateToReader();
            };
            startBuildingBtn.addEventListener('click', handler);
            this.listeners['startBuilding'] = { el: startBuildingBtn, event: 'click', fn: handler };
        }

        // C. Tarjetas de modelos interactivas (Redirigen al lector al hacer click)
        const cardsGrid = document.getElementById('playground-cards-grid');
        if (cardsGrid) {
            const handler = (e) => {
                const card = e.target.closest('.playground-card');
                if (!card) return;

                const cardTitle = card.querySelector('.card-title').innerText;
                globalToast.show(`Cargando entorno de traducción preconfigurado para: ${cardTitle}`, 'success');
                
                // Transicionar de forma elegante al lector de capítulos
                setTimeout(() => {
                    this.navigateToReader();
                }, 300);
            };
            cardsGrid.addEventListener('click', handler);
            this.listeners['cardsClick'] = { el: cardsGrid, event: 'click', fn: handler };
        }

        // D. Botón Run / Ctrl+Enter en el Chat de la base
        const runBtn = document.getElementById('btn-playground-run-chat');
        const textInput = document.getElementById('playground-chat-text-input');
        if (runBtn && textInput) {
            const handler = () => {
                const prompt = textInput.value.trim();
                if (!prompt) {
                    globalToast.show('Por favor, escribe un prompt directivo en el chat antes de ejecutar.', 'warning');
                    return;
                }

                globalToast.show(`Procesando directiva local: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"`, 'success');
                textInput.value = '';
            };
            runBtn.addEventListener('click', handler);
            this.listeners['runClick'] = { el: runBtn, event: 'click', fn: handler };

            // Control de tecla Enter / Ctrl+Enter
            const keyHandler = (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handler();
                }
            };
            textInput.addEventListener('keydown', keyHandler);
            this.listeners['inputKeyDown'] = { el: textInput, event: 'keydown', fn: keyHandler };
        }

        // E. Botón cerrar Grounding Search (Oculta la píldora azul)
        const btnCloseGrounding = document.getElementById('btn-close-grounding');
        const pillChatSearch = document.getElementById('pill-chat-search');
        if (btnCloseGrounding && pillChatSearch) {
            const handler = (e) => {
                e.stopPropagation(); // Evitar disparar clicks del contenedor de la píldora
                pillChatSearch.style.display = 'none';
                globalToast.show('Búsqueda en Google (Grounding) desactivada temporalmente.', 'info');
            };
            btnCloseGrounding.addEventListener('click', handler);
            this.listeners['closeGrounding'] = { el: btnCloseGrounding, event: 'click', fn: handler };
        }

        // F. Botones de herramientas del chat (Dummies informativos estilo Google AI Studio)
        const btnChatToggleVisibility = document.getElementById('btn-chat-toggle-visibility');
        if (btnChatToggleVisibility) {
            const handler = () => {
                globalToast.show('Ocultando elementos pesados para maximizar fps en hardware de gama baja.', 'info');
            };
            btnChatToggleVisibility.addEventListener('click', handler);
            this.listeners['toggleVisibility'] = { el: btnChatToggleVisibility, event: 'click', fn: handler };
        }

        const btnChatTools = document.getElementById('btn-chat-tools');
        if (btnChatTools) {
            const handler = () => {
                globalToast.show('Accediendo al control de herramientas locales integradas (Run-Time).', 'info');
            };
            btnChatTools.addEventListener('click', handler);
            this.listeners['chatTools'] = { el: btnChatTools, event: 'click', fn: handler };
        }

        const btnChatMic = document.getElementById('btn-chat-mic');
        if (btnChatMic) {
            const handler = () => {
                globalToast.show('El micrófono está en espera. Activa el canal de audio en Windows.', 'info');
            };
            btnChatMic.addEventListener('click', handler);
            this.listeners['chatMic'] = { el: btnChatMic, event: 'click', fn: handler };
        }

        const btnChatAddFile = document.getElementById('btn-chat-add-file');
        if (btnChatAddFile) {
            const handler = () => {
                globalToast.show('Arrastra y suelta (Drag and Drop) archivos de texto para alimentarlos directamente.', 'info');
            };
            btnChatAddFile.addEventListener('click', handler);
            this.listeners['chatAddFile'] = { el: btnChatAddFile, event: 'click', fn: handler };
        }
    }

    /**
     * Navegación coordinada al Lector de capítulos tradicional traspasando los datos correspondientes.
     */
    static navigateToReader() {
        const state = globalState.get();
        const telemetry = state.telemetry;
        const activeNovel = telemetry ? telemetry.novels.find(n => n.id === state.activeNovelId) : null;

        // Disparar navegación mediante el enrutador central
        globalRouter.navigate('chapter-reader', 'spa-view-container', activeNovel);
    }

    /**
     * Limpieza sistemática de escuchadores y suscripciones para erradicar memory leaks.
     */
    static destroy() {
        // Remover todos los listeners registrados en esta vista
        Object.entries(this.listeners).forEach(([key, config]) => {
            if (config && config.el) {
                config.el.removeEventListener(config.event, config.fn);
            }
        });
        this.listeners = {};
        console.log('[PlaygroundView] Desmontaje exitoso: listeners removidos y referencias liberadas (0 memory leaks).');
    }
}

export default PlaygroundView;
