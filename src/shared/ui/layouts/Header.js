/**
 * @file Header.js
 * @description Componente de control superior unificado estilo Google AI Studio.
 * Muestra información del proyecto activo, estado del puente REST, controles de rendimiento,
 * alternador de tema claro/oscuro y botones bidireccionales para expandir/colapsar ambos paneles laterales.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../../core/state/State.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';
import { ApiClient } from '../../../core/api/ApiClient.js';

export class Header {
    constructor() {
        this.container = null;
        this.unsubscribes = [];
        this.listeners = {};
        this.intervalId = null;
    }

    /**
     * Devuelve el marcado HTML del encabezado superior.
     * @returns {string}
     */
    template() {
        const activeTheme = localStorage.getItem('batt-theme') || 'dark';
        const themeIcon = activeTheme === 'dark' ? 'light_mode' : 'dark_mode';
        const themeTitle = activeTheme === 'dark' ? 'Alternar a Tema Claro' : 'Alternar a Tema Oscuro';

        const activePerf = localStorage.getItem('batt-perf-mode') || 'premium';
        const perfIcon = activePerf === 'light' ? 'bolt' : 'speed';
        const perfTitle = activePerf === 'light' ? 'Alternar a Rendimiento Premium' : 'Alternar a Modo Ahorro';

        const isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
        const sidebarIcon = isSidebarCollapsed ? 'menu' : 'menu_open';

        return `
            <!-- Lado Izquierdo: Botón Sidebar Izquierdo e Información de Novela (Playground Breadcrumbs) -->
            <div class="header-left-block d-flex align-items-center gap-3">
                <button class="btn btn-toggle-sidebar d-none d-lg-flex align-items-center justify-content-center" id="header-btn-toggle-left-sidebar" title="Alternar menú lateral izquierdo">
                    <span class="material-symbols-outlined fs-5" id="header-sidebar-icon">${sidebarIcon}</span>
                </button>
                
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-semibold text-main" style="font-size: 15px; font-family: var(--font-sans); letter-spacing: -0.15px;">Playground</span>
                    <span class="text-muted fs-6 select-none" style="opacity: 0.5;">/</span>
                    <span class="fw-medium text-muted-theme" id="header-novel-title" style="font-size: 13.5px;">Cargando proyecto...</span>
                    <span class="badge lang-badge-new rounded-pill px-2 py-0.5 ms-1" id="header-novel-lang" style="font-size: 9.5px; font-family: var(--font-mono); font-weight: 600;">-- ➔ --</span>
                </div>

                <!-- Dropdown compacto selector de novela exclusivo para móviles (d-lg-none) -->
                <div class="mobile-project-selector d-lg-none ms-2">
                    <select class="form-select select-premium select-sm rounded-pill py-1 px-2.5" id="header-mobile-novel-selector" style="font-size: 11.5px; max-width: 140px;">
                        <option value="">Cargando...</option>
                    </select>
                </div>
            </div>

            <!-- Lado Derecho: Estado del Puente, Botones de Tema, Rendimiento y Alternancia de Ajustes -->
            <div class="header-right-block d-flex align-items-center gap-2">
                <span class="system-timestamp text-muted fs-8 font-mono d-none d-sm-inline" id="header-system-time">CARGANDO RECURSOS...</span>
                
                <div class="d-flex align-items-center gap-2 border-end-theme pe-3 d-none d-md-flex me-1">
                    <span id="header-bridge-status-text" class="fw-bold" style="color:var(--color-accent-green); font-size:11px; letter-spacing:0.25px;">PUENTE CONECTANDO</span>
                    <span class="status-indicator running" id="header-bridge-indicator"></span>
                </div>

                <!-- Botones circulares estilo Google AI Studio -->
                <button class="theme-switch-btn" id="header-btn-share" title="Compartir traducción actual">
                    <span class="material-symbols-outlined fs-5">share</span>
                </button>

                <button class="theme-switch-btn" id="header-btn-compare" title="Comparar modelos de lenguaje">
                    <span class="material-symbols-outlined fs-5">compare_arrows</span>
                </button>

                <button class="theme-switch-btn" id="header-btn-add" title="Crear nuevo prompt de traducción">
                    <span class="material-symbols-outlined fs-5">add</span>
                </button>

                <button class="theme-switch-btn" id="header-btn-more" title="Más opciones de visualización">
                    <span class="material-symbols-outlined fs-5">more_vert</span>
                </button>

                <!-- Interruptor de Rendimiento / Modo Ahorro -->
                <button class="theme-switch-btn" id="header-btn-toggle-performance" title="${perfTitle}">
                    <span class="material-symbols-outlined fs-5">${perfIcon}</span>
                </button>

                <!-- Interruptor de Tema Claro/Oscuro -->
                <button class="theme-switch-btn" id="header-btn-toggle-theme" title="${themeTitle}">
                    <span class="material-symbols-outlined fs-5">${themeIcon}</span>
                </button>

                <!-- Botón de Alternancia de Ajustes Ejecución Derechos (Solución AUD-02) -->
                <button class="theme-switch-btn btn-toggle-settings-right d-none d-lg-flex" id="header-btn-toggle-right-sidebar" title="Alternar panel de ajustes (Run Settings)">
                    <span class="material-symbols-outlined fs-5">tune</span>
                </button>
            </div>
        `;
    }

    /**
     * Renderiza el encabezado superior en el elemento contenedor correspondiente.
     * @param {HTMLElement} parentElement - Contenedor HTML destino.
     */
    render(parentElement) {
        this.container = parentElement;
        this.container.className = 'main-header d-flex justify-content-between align-items-center pb-2.5 border-bottom-theme mb-3';
        this.container.innerHTML = this.template();

        this.init();
    }

    /**
     * Inicializa lógica de tiempo, listeners del DOM y suscripciones globales.
     */
    init() {
        this.updateTime();
        this.intervalId = setInterval(() => this.updateTime(), 1000);

        this.setupStateSubscriptions();
        this.setupDomEvents();
        
        // Cargar estado inicial
        const state = globalState.get();
        this.updateSelectedNovelHeader(state);
        this.populateMobileSelector(state.telemetry, state.activeNovelId);
        this.updateBridgeStatus(state.isOnline);
    }

    /**
     * Configura las suscripciones reactivas globales.
     */
    setupStateSubscriptions() {
        // Escucha transversal para actualizar textos de novela e indicador del puente
        const subStateChange = globalEventBus.on('state:change', (state) => {
            this.updateSelectedNovelHeader(state);
        });

        const subTelemetry = globalEventBus.on('state:telemetry', (data) => {
            const state = globalState.get();
            this.updateBridgeStatus(state.isOnline);
            this.populateMobileSelector(state.telemetry, state.activeNovelId);
        });

        const subOnline = globalEventBus.on('state:isOnline', (data) => {
            const state = globalState.get();
            this.updateBridgeStatus(state.isOnline);
            this.populateMobileSelector(state.telemetry, state.activeNovelId);
        });

        // Escucha de rendimiento desde el SettingsPanel para mantener el icono alineado
        const subPerf = globalEventBus.on('performance:change', (perfMode) => {
            const btn = this.container.querySelector('#header-btn-toggle-performance');
            if (btn) {
                const iconEl = btn.querySelector('.material-symbols-outlined');
                if (iconEl) {
                    iconEl.innerText = perfMode === 'light' ? 'bolt' : 'speed';
                }
                btn.title = perfMode === 'light' ? 'Alternar a Rendimiento Premium' : 'Alternar a Modo Ahorro';
            }
        });

        // Sincronizar dinámicamente el icono de la Sidebar cuando sea colapsada/expandida transversalmente
        const subSidebarToggle = globalEventBus.on('sidebar:toggle', (isCollapsed) => {
            const iconEl = this.container.querySelector('#header-sidebar-icon');
            if (iconEl) {
                iconEl.innerText = isCollapsed ? 'menu' : 'menu_open';
            }
        });

        this.unsubscribes.push(subStateChange, subTelemetry, subOnline, subPerf, subSidebarToggle);
    }

    /**
     * Configura los event listeners del DOM.
     */
    setupDomEvents() {
        // 1. Alternancia de menú lateral izquierdo (Sidebar)
        const toggleLeftBtn = this.container.querySelector('#header-btn-toggle-left-sidebar');
        if (toggleLeftBtn) {
            const handler = () => {
                const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
                localStorage.setItem('batt-sidebar-collapsed', isCollapsed ? 'true' : 'false');
                globalEventBus.emit('sidebar:toggle', isCollapsed);
            };
            toggleLeftBtn.addEventListener('click', handler);
            this.listeners['toggleLeft'] = { el: toggleLeftBtn, event: 'click', fn: handler };
        }

        // 2. Alternancia de panel de ajustes derecho (SettingsPanel) - Solución AUD-02
        const toggleRightBtn = this.container.querySelector('#header-btn-toggle-right-sidebar');
        if (toggleRightBtn) {
            const handler = () => {
                const isCollapsed = document.body.classList.toggle('settings-collapsed');
                localStorage.setItem('batt-settings-collapsed', isCollapsed ? 'true' : 'false');
                globalEventBus.emit('settings:toggle', isCollapsed);
            };
            toggleRightBtn.addEventListener('click', handler);
            this.listeners['toggleRight'] = { el: toggleRightBtn, event: 'click', fn: handler };
        }

        // 2.5. Funciones para los nuevos botones circulares estilo Google AI Studio
        const shareBtn = this.container.querySelector('#header-btn-share');
        if (shareBtn) {
            const handler = () => {
                const state = globalState.get();
                if (state.telemetry && state.telemetry.novels && state.activeNovelId) {
                    const novel = state.telemetry.novels.find(n => n.id === state.activeNovelId);
                    if (novel) {
                        navigator.clipboard.writeText(JSON.stringify(novel, null, 2))
                            .then(() => {
                                globalEventBus.emit('toast:show', {
                                    message: `Proyecto "${novel.name}" copiado al portapapeles en formato JSON de intercambio.`,
                                    type: 'success'
                                });
                            })
                            .catch(() => {
                                globalEventBus.emit('toast:show', {
                                    message: 'Error de permisos: no se pudo escribir en el portapapeles.',
                                    type: 'error'
                                });
                            });
                    }
                } else {
                    globalEventBus.emit('toast:show', {
                        message: 'No hay ningún proyecto activo cargado para compartir.',
                        type: 'warn'
                    });
                }
            };
            shareBtn.addEventListener('click', handler);
            this.listeners['share'] = { el: shareBtn, event: 'click', fn: handler };
        }

        const compareBtn = this.container.querySelector('#header-btn-compare');
        if (compareBtn) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'Comparación A/B: Selecciona y evalúa la prosa literaria de dos modelos de Gemini en paralelo.',
                    type: 'info'
                });
            };
            compareBtn.addEventListener('click', handler);
            this.listeners['compare'] = { el: compareBtn, event: 'click', fn: handler };
        }

        const addBtn = this.container.querySelector('#header-btn-add');
        if (addBtn) {
            const handler = () => {
                globalEventBus.emit('modal:open', 'create-novel');
            };
            addBtn.addEventListener('click', handler);
            this.listeners['addBtn'] = { el: addBtn, event: 'click', fn: handler };
        }

        const moreBtn = this.container.querySelector('#header-btn-more');
        if (moreBtn) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'Opciones de visualización: Usa la Paleta de comandos (Ctrl + /) para atajos avanzados.',
                    type: 'info'
                });
            };
            moreBtn.addEventListener('click', handler);
            this.listeners['moreBtn'] = { el: moreBtn, event: 'click', fn: handler };
        }

        // 3. Alternancia de rendimiento / modo ahorro
        const togglePerfBtn = this.container.querySelector('#header-btn-toggle-performance');
        if (togglePerfBtn) {
            const handler = () => {
                const isLowPerf = document.body.classList.toggle('low-perf-mode');
                const newPerfMode = isLowPerf ? 'light' : 'premium';
                localStorage.setItem('batt-perf-mode', newPerfMode);

                const iconEl = togglePerfBtn.querySelector('.material-symbols-outlined');
                if (iconEl) {
                    iconEl.innerText = newPerfMode === 'light' ? 'bolt' : 'speed';
                }
                togglePerfBtn.title = newPerfMode === 'light' ? 'Alternar a Rendimiento Premium' : 'Alternar a Modo Ahorro';

                globalEventBus.emit('performance:change', newPerfMode);
                globalEventBus.emit('toast:show', {
                    message: newPerfMode === 'light'
                        ? 'Modo Ahorro de Energía activado. Interfaz optimizada para hardware limitado.'
                        : 'Efectos visuales y animaciones premium restaurados.',
                    type: 'success'
                });
            };
            togglePerfBtn.addEventListener('click', handler);
            this.listeners['togglePerf'] = { el: togglePerfBtn, event: 'click', fn: handler };
        }

        // 4. Alternancia de Tema Claro/Oscuro
        const toggleThemeBtn = this.container.querySelector('#header-btn-toggle-theme');
        if (toggleThemeBtn) {
            const handler = () => {
                const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-bs-theme', newTheme);
                localStorage.setItem('batt-theme', newTheme);

                const iconEl = toggleThemeBtn.querySelector('.material-symbols-outlined');
                if (iconEl) {
                    iconEl.innerText = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
                }
                toggleThemeBtn.title = newTheme === 'dark' ? 'Alternar a Tema Claro' : 'Alternar a Tema Oscuro';

                globalEventBus.emit('theme:change', newTheme);
                globalEventBus.emit('toast:show', {
                    message: `Tema ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado.`,
                    type: 'success'
                });
            };
            toggleThemeBtn.addEventListener('click', handler);
            this.listeners['toggleTheme'] = { el: toggleThemeBtn, event: 'click', fn: handler };
        }

        // 5. Selector móvil de novela activa (exclusivo móvil)
        const mobileSelector = this.container.querySelector('#header-mobile-novel-selector');
        if (mobileSelector) {
            const handler = (e) => {
                const novelId = e.target.value;
                if (novelId) {
                    globalState.set({ activeNovelId: novelId });
                }
            };
            mobileSelector.addEventListener('change', handler);
            this.listeners['mobileSelector'] = { el: mobileSelector, event: 'change', fn: handler };
        }
    }

    /**
     * Actualiza los textos de visualización de la novela seleccionada en el Header.
     * @param {Object} state - Estado global reactivo.
     */
    updateSelectedNovelHeader(state) {
        const titleEl = this.container.querySelector('#header-novel-title');
        const langEl = this.container.querySelector('#header-novel-lang');

        if (!titleEl || !langEl) return;

        if (!state.isOnline) {
            titleEl.innerText = 'Desconectado';
            langEl.innerText = 'PUENTE OFFLINE';
            return;
        }

        if (!state.telemetry || !state.telemetry.novels || state.telemetry.novels.length === 0) {
            titleEl.innerText = 'Sin proyectos indexados';
            langEl.innerText = '-- ➔ --';
            return;
        }

        const novel = state.telemetry.novels.find(n => n.id === state.activeNovelId);
        if (novel) {
            titleEl.innerText = novel.name;
            langEl.innerText = `${novel.source_language.toUpperCase()} ➔ ${novel.target_language.toUpperCase()}`;
        } else {
            titleEl.innerText = 'Seleccione una novela';
            langEl.innerText = '-- ➔ --';
        }
    }

    /**
     * Llena el dropdown móvil con los proyectos disponibles.
     */
    populateMobileSelector(telemetry, activeId) {
        const selector = this.container.querySelector('#header-mobile-novel-selector');
        if (!selector) return;

        const state = globalState.get();
        if (!state.isOnline) {
            selector.innerHTML = `<option value="">Servidor fuera de línea</option>`;
            selector.disabled = true;
            return;
        }

        selector.disabled = false;
        if (!telemetry || !telemetry.novels || telemetry.novels.length === 0) {
            selector.innerHTML = `<option value="">Sin proyectos</option>`;
            return;
        }

        selector.innerHTML = telemetry.novels.map(novel => {
            const isSelected = novel.id === activeId ? 'selected' : '';
            return `<option value="${novel.id}" ${isSelected}>${novel.name}</option>`;
        }).join('');
    }

    /**
     * Actualiza el reloj del sistema de Windows en tiempo real.
     */
    updateTime() {
        const timeEl = this.container.querySelector('#header-system-time');
        if (!timeEl) return;
        const now = new Date();
        timeEl.innerText = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' LOCAL';
    }

    /**
     * Actualiza visualmente el indicador de estado del servidor puente REST.
     * @param {boolean} online - Si Express está en línea.
     */
    updateBridgeStatus(online) {
        const statusText = this.container.querySelector('#header-bridge-status-text');
        const indicator = this.container.querySelector('#header-bridge-indicator');
        const pulse = this.container.querySelector('#header-pulse'); // O de body

        if (!statusText || !indicator) return;

        if (online) {
            statusText.innerText = 'PUENTE ACTIVO';
            statusText.style.color = 'var(--color-accent-green)';
            indicator.className = 'status-indicator running';
        } else {
            statusText.innerText = 'FUERA DE LÍNEA';
            statusText.style.color = 'var(--color-accent-red)';
            indicator.className = 'status-indicator offline';
        }
    }

    /**
     * Desmonta el componente deteniendo temporizadores e hilos de eventos para mitigar memory leaks.
     */
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        Object.entries(this.listeners).forEach(([key, config]) => {
            if (config && config.el) {
                config.el.removeEventListener(config.event, config.fn);
            }
        });
        this.listeners = {};
        this.container = null;

        console.log('[Header] Encabezado superior desmantelado (0 leaks).');
    }
}

export default Header;
