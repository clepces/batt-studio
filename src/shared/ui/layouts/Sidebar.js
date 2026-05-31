/**
 * @file Sidebar.js
 * @description Componente modular de barra lateral izquierda rediseñado al 100% estilo Google AI Studio.
 * Integra la selección de proyecto en el dropdown de la marca superior, menú vertical de navegación plegable,
 * botones minimalistas de acción inferior y perfil de usuario PRO con el degradado de Gemini.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../../core/state/State.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';
import { ApiClient } from '../../../core/api/ApiClient.js';

export class Sidebar {
    constructor() {
        this.container = null;
        this.unsubscribes = [];
        this.listeners = {};
    }

    /**
     * Devuelve el marcado HTML de la barra de navegación lateral izquierda.
     * @returns {string}
     */
    template() {
        const state = globalState.get();
        const activeTab = state.activeTab || 'reader';

        return `
            <!-- Parte Superior: Marca de BATT con Dropdown Selector de Proyectos (AI Studio Style) -->
            <div class="sidebar-top-section d-flex align-items-center justify-content-between w-100 gap-2">
                <div class="dropdown flex-grow-1 brand-dropdown-container">
                    <button class="btn btn-brand-dropdown d-flex align-items-center justify-content-between w-100 py-2 px-2.5 rounded-3" type="button" id="brandDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="height: 42px;">
                        <div class="d-flex align-items-center gap-2 text-truncate">
                            <span class="material-symbols-outlined text-primary select-none brand-icon" style="font-variation-settings: 'FILL' 1, 'wght' 700; font-size: 22px;">architecture</span>
                            <div class="brand-text-block text-start text-truncate">
                                <h2 class="m-0 fw-semibold text-main text-truncate" id="brand-active-novel-name" style="font-size: 13.5px; letter-spacing: -0.15px; font-family: var(--font-sans);">Cargando...</h2>
                            </div>
                        </div>
                        <span class="material-symbols-outlined fs-6 text-muted dropdown-arrow select-none">keyboard_arrow_down</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-brand shadow-lg p-2 rounded-3 border-theme w-100" aria-labelledby="brandDropdown" id="sidebar-novel-dropdown-list">
                        <li class="px-3 py-2 text-muted text-center" style="font-size: 11px;">Cargando proyectos...</li>
                    </ul>
                </div>
                <!-- Botón colapsador exclusivo para pantallas pequeñas (< 1200px) -->
                <button class="btn-sidebar-arrow d-flex d-xl-none align-items-center justify-content-center" id="btn-collapse-sidebar-left" title="Contraer menú lateral izquierdo" style="width: 32px; height: 32px; flex-shrink: 0; background-color: var(--color-surface-variant); border: 1px solid var(--color-border-card); border-radius: 50%;">
                    <span class="material-symbols-outlined fs-5">menu_open</span>
                </button>
            </div>

            <!-- Parte Media: Menú de Navegación Vertical Estilo Google AI Studio -->
            <nav class="sidebar-nav-menu d-flex flex-column gap-1 flex-grow-1 w-100 mt-4">
                <!-- Ítem 1: Playground -->
                <button class="btn-sidebar-nav-item ${activeTab === 'reader' ? 'active' : ''}" data-tab="reader" title="Ir al Playground Lector">
                    <span class="material-symbols-outlined fs-5 icon">edit_note</span>
                    <span class="label">Playground</span>
                </button>
                
                <!-- Ítem 2: Build con acordeón -->
                <div class="sidebar-collapsible-menu-wrapper expanded" id="build-collapsible-wrapper">
                    <button class="btn-sidebar-nav-item d-flex justify-content-between align-items-center w-100" id="btn-build-menu-toggle" title="Alternar herramientas de construcción">
                        <div class="d-flex align-items-center gap-3">
                            <span class="material-symbols-outlined fs-5 icon">construction</span>
                            <span class="label">Build</span>
                        </div>
                        <span class="material-symbols-outlined fs-6 chevron-arrow text-muted">keyboard_arrow_down</span>
                    </button>
                    <div class="collapsible-submenu-container mt-1 d-flex flex-column gap-1">
                        <button class="btn-sidebar-subnav-item ${activeTab === 'agents' ? 'active' : ''}" data-tab="agents" title="Gestor de Agentes Autónomos">
                            <span class="material-symbols-outlined fs-5 icon">smart_toy</span>
                            <span class="label">Apps</span>
                        </button>
                        <button class="btn-sidebar-subnav-item ${activeTab === 'flow' ? 'active' : ''}" data-tab="flow" title="Constructor de Flujos Visuales (No-Code Agent Flow)">
                            <span class="material-symbols-outlined fs-5 icon">hub</span>
                            <span class="label">Flows</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-gallery-coming-soon" title="Galería de Plantillas BATT">
                            <span class="material-symbols-outlined fs-5 icon">gallery_thumbnail</span>
                            <span class="label">Gallery</span>
                        </button>
                    </div>
                </div>

                <!-- Ítem 3: Dashboard con acordeón extendido estilo Google AI Studio -->
                <div class="sidebar-collapsible-menu-wrapper expanded" id="dashboard-collapsible-wrapper">
                    <button class="btn-sidebar-nav-item d-flex justify-content-between align-items-center w-100" id="btn-dashboard-menu-toggle" title="Alternar panel de control">
                        <div class="d-flex align-items-center gap-3">
                            <span class="material-symbols-outlined fs-5 icon">space_dashboard</span>
                            <span class="label">Dashboard</span>
                        </div>
                        <span class="material-symbols-outlined fs-6 chevron-arrow text-muted">keyboard_arrow_down</span>
                    </button>
                    <div class="collapsible-submenu-container mt-1 d-flex flex-column gap-1">
                        <button class="btn-sidebar-subnav-item ${activeTab === 'stats' ? 'active' : ''}" data-tab="stats" title="Ver Telemetría & Agentes">
                            <span class="material-symbols-outlined fs-5 icon">monitoring</span>
                            <span class="label">Telemetría</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-keys-dummy" title="Claves de API">
                            <span class="material-symbols-outlined fs-5 icon">vpn_key</span>
                            <span class="label">API keys</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-projects-dummy" title="Proyectos">
                            <span class="material-symbols-outlined fs-5 icon">folder</span>
                            <span class="label">Projects</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-usage-dummy" title="Uso del Ecosistema">
                            <span class="material-symbols-outlined fs-5 icon">show_chart</span>
                            <span class="label">Usage</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-limits-dummy" title="Límites de frecuencia">
                            <span class="material-symbols-outlined fs-5 icon">speed</span>
                            <span class="label">Rate limits</span>
                        </button>
                        <button class="btn-sidebar-subnav-item btn-billing-dummy" title="Facturación y Gasto">
                            <span class="material-symbols-outlined fs-5 icon">payments</span>
                            <span class="label">Billing</span>
                        </button>
                    </div>
                </div>
                
                <!-- Ítem 4: Documentation (Diagnósticos) -->
                <button class="btn-sidebar-nav-item d-flex justify-content-between align-items-center ${activeTab === 'diagnostics' ? 'active' : ''}" data-tab="diagnostics" title="Herramientas de Diagnósticos">
                    <div class="d-flex align-items-center gap-3">
                        <span class="material-symbols-outlined fs-5 icon">menu_book</span>
                        <span class="label">Documentation</span>
                    </div>
                    <span class="material-symbols-outlined fs-6 text-muted-theme select-none" style="font-size: 14px;">open_in_new</span>
                </button>
            </nav>

            <!-- Parte Inferior: Fila de Botones Minimalistas y Cuenta de Usuario (AI Studio Profile) -->
            <div class="sidebar-footer-section d-flex flex-column gap-3 pt-3 border-top-theme w-100 mt-auto">
                
                <!-- Fila de Iconos de Acciones Rápidas Minimalistas (Search, What's new, Get key, Settings) -->
                <div class="sidebar-quick-actions-row d-flex justify-content-between align-items-center px-1">
                    <button class="btn-quick-icon-flat" id="btn-quick-search" title="Buscar comandos rápidos (Ctrl + /)">
                        <span class="material-symbols-outlined">search</span>
                    </button>
                    <button class="btn-quick-icon-flat" id="btn-quick-whatsnew" title="Novedades de BATT Enterprise">
                        <span class="material-symbols-outlined">campaign</span>
                    </button>
                    <button class="btn-quick-icon-flat" id="btn-quick-apikey" title="Obtener Llaves de API locales">
                        <span class="material-symbols-outlined">vpn_key</span>
                    </button>
                    <button class="btn-quick-icon-flat" id="btn-quick-settings" title="Ajustes Generales del Ecosistema">
                        <span class="material-symbols-outlined">settings</span>
                    </button>
                </div>

                <!-- Perfil del Ingeniero de BATT con badge PRO con degradado Gemini -->
                <div class="d-flex align-items-center justify-content-between profile-bar p-1.5 rounded-3" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card);">
                    <div class="d-flex align-items-center gap-2 text-truncate">
                        <div class="avatar-circle-gemini d-flex align-items-center justify-content-center fw-bold text-white select-none flex-shrink-0" style="width: 30px; height: 30px; border-radius: 50%; font-size: 11px; letter-spacing: -0.2px;">
                            B
                        </div>
                        <div class="profile-info text-truncate">
                            <span class="profile-name text-main fw-semibold d-block fs-8 text-truncate" style="line-height: 1.1;">BATT Principal</span>
                            <span class="profile-role text-muted d-block" style="font-size: 9.5px; line-height: 1.1;">Local Automator</span>
                        </div>
                    </div>
                    <span class="badge badge-premium-pro px-2 py-1 select-none flex-shrink-0" style="font-size: 8.5px; font-weight: 800; border-radius: 4px;">PRO</span>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la barra lateral izquierda en el elemento contenedor correspondiente.
     * @param {HTMLElement} parentElement - Contenedor HTML destino.
     */
    render(parentElement) {
        this.container = parentElement;
        this.container.className = 'sidebar-premium d-flex flex-column py-2.5 px-3 h-100 justify-content-between';
        this.container.id = 'layout-sidebar';
        this.container.innerHTML = this.template();

        this.init();
    }

    /**
     * Inicializa suscripciones de estado y controladores del DOM.
     */
    init() {
        this.setupStateSubscriptions();
        this.setupDomEvents();
        
        // Cargar datos iniciales de la lista de proyectos en la cabecera
        const state = globalState.get();
        if (state.telemetry) {
            this.populateNovelsSelector(state.telemetry, state.activeNovelId);
        }
    }

    /**
     * Configura suscripciones reactivas para reflejar cambios transversales.
     */
    setupStateSubscriptions() {
        // Redibujar la lista de novelas en el dropdown al actualizarse la telemetría del disco
        const subTelemetry = globalEventBus.on('state:telemetry', () => {
            const state = globalState.get();
            this.populateNovelsSelector(state.telemetry, state.activeNovelId);
        });

        const subOnline = globalEventBus.on('state:isOnline', () => {
            const state = globalState.get();
            this.populateNovelsSelector(state.telemetry, state.activeNovelId);
        });

        // Sincronizar el dropdown activo y el label con la novela activa
        const subActiveId = globalEventBus.on('state:activeNovelId', (data) => {
            const state = globalState.get();
            this.populateNovelsSelector(state.telemetry, data.newValue);
        });

        // Sincronizar el botón activo de navegación con el activeTab global
        const subActiveTab = globalEventBus.on('state:activeTab', (data) => {
            this.updateActiveTabClass(data.newValue);
        });

        this.unsubscribes.push(subTelemetry, subOnline, subActiveId, subActiveTab);
    }

    /**
     * Registra los controladores de eventos interactivos del DOM.
     */
    setupDomEvents() {
        // 0. Alternancia de menú lateral izquierdo en pantallas pequeñas (cerrar cajón)
        const collapseLeftBtn = this.container.querySelector('#btn-collapse-sidebar-left');
        if (collapseLeftBtn) {
            const handler = () => {
                document.body.classList.add('sidebar-collapsed');
                localStorage.setItem('batt-sidebar-collapsed', 'true');
                globalEventBus.emit('sidebar:toggle', true);
            };
            collapseLeftBtn.addEventListener('click', handler);
            this.listeners['collapseLeft'] = { el: collapseLeftBtn, event: 'click', fn: handler };
        }

        // 1. Alternancia de navegación vertical (Pestañas del Core y Subpestañas)
        const navMenu = this.container.querySelector('.sidebar-nav-menu');
        if (navMenu) {
            const handler = (e) => {
                const btn = e.target.closest('[data-tab]');
                if (!btn) return;
                
                const tab = btn.getAttribute('data-tab');
                globalState.set({ activeTab: tab });
            };
            navMenu.addEventListener('click', handler);
            this.listeners['navClick'] = { el: navMenu, event: 'click', fn: handler };
        }

        // 2. Acordeón plegable para el botón de Build (Apps / Gallery)
        const buildMenuToggle = this.container.querySelector('#btn-build-menu-toggle');
        const buildWrapper = this.container.querySelector('#build-collapsible-wrapper');
        if (buildMenuToggle && buildWrapper) {
            const handler = () => {
                buildWrapper.classList.toggle('expanded');
            };
            buildMenuToggle.addEventListener('click', handler);
            this.listeners['buildToggle'] = { el: buildMenuToggle, event: 'click', fn: handler };
        }

        // 2.5. Acordeón plegable para el botón de Dashboard (Telemetría / API Keys / Projects...)
        const dashboardMenuToggle = this.container.querySelector('#btn-dashboard-menu-toggle');
        const dashboardWrapper = this.container.querySelector('#dashboard-collapsible-wrapper');
        if (dashboardMenuToggle && dashboardWrapper) {
            const handler = () => {
                dashboardWrapper.classList.toggle('expanded');
            };
            dashboardMenuToggle.addEventListener('click', handler);
            this.listeners['dashboardToggle'] = { el: dashboardMenuToggle, event: 'click', fn: handler };
        }

        // 2.6. Manejadores para los botones de control secundarios (dummy) en el Dashboard
        const dummySelects = [
            '.btn-keys-dummy',
            '.btn-projects-dummy',
            '.btn-usage-dummy',
            '.btn-limits-dummy',
            '.btn-billing-dummy'
        ];
        dummySelects.forEach((selector, idx) => {
            const btn = this.container.querySelector(selector);
            if (btn) {
                const handler = () => {
                    const names = ['API Keys', 'Proyectos', 'Uso de Token', 'Rate limits', 'Facturación'];
                    globalEventBus.emit('toast:show', {
                        message: `Vista de control de "${names[idx]}": Operando bajo el Spark Plan local de BATT ($0.00 USD).`,
                        type: 'info'
                    });
                };
                btn.addEventListener('click', handler);
                this.listeners[`dummyBtn_${idx}`] = { el: btn, event: 'click', fn: handler };
            }
        });

        // 3. Galería de Plantillas (Coming Soon Toast)
        const galleryBtn = this.container.querySelector('.btn-sidebar-subnav-item.btn-gallery-coming-soon');
        if (galleryBtn) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'Próximamente: Galería premium de plantillas y modelos de agentes preconfigurados para BATT Enterprise.',
                    type: 'info'
                });
            };
            galleryBtn.addEventListener('click', handler);
            this.listeners['galleryClick'] = { el: galleryBtn, event: 'click', fn: handler };
        }

        // 4. Selector Dropdown Premium de Novelas en la Cabecera de Marca
        const dropdownList = this.container.querySelector('#sidebar-novel-dropdown-list');
        if (dropdownList) {
            const handler = (e) => {
                const item = e.target.closest('[data-novel-id]');
                if (item) {
                    const novelId = item.getAttribute('data-novel-id');
                    globalState.set({ activeNovelId: novelId });
                    return;
                }

                const createBtn = e.target.closest('#dropdown-btn-create-novel');
                if (createBtn) {
                    globalEventBus.emit('modal:open', 'create-novel');
                }
            };
            dropdownList.addEventListener('click', handler);
            this.listeners['dropdownClick'] = { el: dropdownList, event: 'click', fn: handler };
        }

        // 5. Botones de fila inferior (Search, What's new, Get API key, Settings) - Conexión con Command Palette
        const quickSearch = this.container.querySelector('#btn-quick-search');
        if (quickSearch) {
            const handler = () => {
                globalEventBus.emit('command-palette:open');
            };
            quickSearch.addEventListener('click', handler);
            this.listeners['quickSearch'] = { el: quickSearch, event: 'click', fn: handler };
        }

        const quickWhatsnew = this.container.querySelector('#btn-quick-whatsnew');
        if (quickWhatsnew) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'BATT Enterprise v2.5.0: Estabilización offline de disco, Toasts CSS premium e interfaz mimetizada con Google AI Studio v3.',
                    type: 'success'
                });
            };
            quickWhatsnew.addEventListener('click', handler);
            this.listeners['quickWhatsnew'] = { el: quickWhatsnew, event: 'click', fn: handler };
        }

        const quickApikey = this.container.querySelector('#btn-quick-apikey');
        if (quickApikey) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'Plan Spark Local: No se requieren llaves comerciales externas de pago. Operación 100% gratuita.',
                    type: 'success'
                });
            };
            quickApikey.addEventListener('click', handler);
            this.listeners['quickApikey'] = { el: quickApikey, event: 'click', fn: handler };
        }

        const quickSettings = this.container.querySelector('#btn-quick-settings');
        if (quickSettings) {
            const handler = () => {
                globalEventBus.emit('toast:show', {
                    message: 'Usa el panel de la derecha (Run settings) para ajustar la temperatura, el modelo cognitivo y el nivel de pensamiento de tus agentes.',
                    type: 'info'
                });
            };
            quickSettings.addEventListener('click', handler);
            this.listeners['quickSettings'] = { el: quickSettings, event: 'click', fn: handler };
        }
    }

    /**
     * Llena el listado dropdown con las novelas registradas de forma asíncrona.
     * @param {Object} telemetry - Telemetría de disco.
     * @param {string} activeId - ID de la novela activa.
     */
    populateNovelsSelector(telemetry, activeId) {
        const dropdownList = this.container.querySelector('#sidebar-novel-dropdown-list');
        const brandBtnLabel = this.container.querySelector('#brand-active-novel-name');
        if (!dropdownList || !brandBtnLabel) return;

        const state = globalState.get();
        if (!state.isOnline) {
            brandBtnLabel.innerText = 'Desconectado';
            brandBtnLabel.classList.add('text-danger');
            dropdownList.innerHTML = `
                <li class="px-3 py-2 text-danger text-center font-mono select-none" style="font-size: 11px;">
                    <span class="material-symbols-outlined fs-5 d-block mb-1 mx-auto">wifi_off</span>
                    Servidor fuera de línea
                </li>
            `;
            return;
        }

        brandBtnLabel.classList.remove('text-danger');

        if (!telemetry || !telemetry.novels || telemetry.novels.length === 0) {
            brandBtnLabel.innerText = 'BATT Studio';
            dropdownList.innerHTML = `
                <li class="px-3 py-2 text-muted text-center" style="font-size: 11.5px;">Sin novelas en disco</li>
                <li><hr class="dropdown-divider border-theme my-2"></li>
                <li>
                    <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-primary text-truncate rounded-2" id="dropdown-btn-create-novel">
                        <span class="material-symbols-outlined fs-5">add</span>
                        <span class="fw-semibold" style="font-size: 12px;">Crear nueva novela</span>
                    </button>
                </li>
            `;
            return;
        }

        const activeNovel = telemetry.novels.find(n => n.id === activeId);
        brandBtnLabel.innerText = activeNovel ? activeNovel.name : 'BATT Studio';

        let listHtml = telemetry.novels.map(novel => {
            const isSelected = novel.id === activeId;
            return `
                <li>
                    <button class="dropdown-item d-flex align-items-center justify-content-between py-2 px-2.5 rounded-2 ${isSelected ? 'active' : ''}" 
                            data-novel-id="${novel.id}" type="button">
                        <div class="d-flex align-items-center gap-2 text-truncate" style="max-width: 170px;">
                            <span class="material-symbols-outlined fs-5 text-muted-theme flex-shrink-0 select-none">book_5</span>
                            <span class="text-truncate fw-medium" style="font-size: 12.5px;">${novel.name}</span>
                        </div>
                        ${isSelected ? '<span class="material-symbols-outlined fs-6 text-primary flex-shrink-0 select-none">check</span>' : ''}
                    </button>
                </li>
            `;
        }).join('');

        listHtml += `
            <li><hr class="dropdown-divider border-theme my-2"></li>
            <li>
                <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-2.5 rounded-2 text-primary w-100" id="dropdown-btn-create-novel" type="button">
                    <span class="material-symbols-outlined fs-5 flex-shrink-0 select-none">add</span>
                    <span class="fw-semibold text-truncate" style="font-size: 12px;">Crear nueva novela</span>
                </button>
            </li>
        `;

        dropdownList.innerHTML = listHtml;
    }

    /**
     * Sincroniza la clase .active en la lista de botones de navegación.
     * @param {string} tabKey - Nombre del tab activo.
     */
    updateActiveTabClass(tabKey) {
        // Actualizar botones de primer nivel
        const navItems = this.container.querySelectorAll('.btn-sidebar-nav-item');
        navItems.forEach(btn => {
            const tab = btn.getAttribute('data-tab');
            if (tab === tabKey || (tab === 'reader' && tabKey === 'chapter-reader')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Actualizar subnavs del Build (Apps)
        const subnavItems = this.container.querySelectorAll('.btn-sidebar-subnav-item');
        subnavItems.forEach(btn => {
            const tab = btn.getAttribute('data-tab');
            if (tab === tabKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Desmonta el componente liberando observadores y removiendo listeners de forma explícita.
     */
    destroy() {
        // Desuscribir observables reactivos
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        // Remover de forma explícita todos los event listeners guardados
        Object.entries(this.listeners).forEach(([key, config]) => {
            if (config && config.el) {
                config.el.removeEventListener(config.event, config.fn);
            }
        });
        this.listeners = {};
        this.container = null;

        console.log('[Sidebar] Barra lateral desmantelada e higiene de memoria completada (0 leaks).');
    }
}

export default Sidebar;
