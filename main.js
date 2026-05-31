/**
 * @file main.js
 * @description Inicializador y orquestador central del frontend SPA modular de BATT Enterprise.
 * Soporta barra inferior rápida interactiva para móviles y unificación de modales de Bootstrap.
 * @author BATT Principal Automation Engineer
 */

import './src/shared/style/main.scss';

import { Kernel } from './src/core/kernel.js';
import { globalState } from './src/core/state/State.js';
import { globalEventBus } from './src/core/eventBus/EventBus.js';
import { globalRouter } from './src/core/router/Router.js';
import { ApiClient } from './src/core/api/ApiClient.js';

// Importar componentes de Layout y Overlay
import { Header } from './src/shared/ui/layouts/Header.js';
import { Sidebar } from './src/shared/ui/layouts/Sidebar.js';
import { SettingsPanel } from './src/shared/ui/layouts/SettingsPanel.js';
import { globalToast } from './src/shared/ui/overlay/Toast.js';
import { globalModal } from './src/shared/ui/overlay/Modal.js';

class AppOrchestrator {
    constructor() {
        this.header = new Header();
        this.sidebar = new Sidebar();
        this.settingsPanel = new SettingsPanel();
        this.ws = null;
        this.wsReconnectTimeoutId = null;
        this.wsReconnectAttempts = 0;
        this.unsubscribes = [];
        this.serverDownNotified = false;
    }

    /**
     * Devuelve la plantilla del contenedor base dinámico que albergará toda la aplicación.
     * Incorpora la barra de navegación rápida inferior para terminales móviles y táctiles.
     * @returns {string}
     */
    baseTemplate() {
        return `
            <div class="bg-glow bg-glow-1"></div>
            <div class="bg-glow bg-glow-2"></div>

            <div class="container-fluid px-0 dashboard-container-new flex-layout-global">
                <!-- Sección lateral izquierda: Navegación compacta (AI Studio style) -->
                <aside id="layout-sidebar" class="layout-sidebar-left"></aside>

                <!-- Sección principal central: Playground de Trabajo -->
                <section class="main-workspace-center" id="main-telemetry-panel-container">
                    <header id="layout-header" class="workspace-header-container"></header>
                    
                    <div id="main-telemetry-panel" class="workspace-content-body p-4">
                        <!-- Contenedor destino para las vistas SPA (Router) -->
                        <div id="spa-view-container" class="spa-view-content-new"></div>
                    </div>
                </section>

                <!-- Sección lateral derecha: Run Settings / Ajustes de IA -->
                <aside id="layout-sidebar-right" class="layout-sidebar-right-panel"></aside>
            </div>

            <!-- Barra de navegación inferior rápida fija (Estilo PWA App) visible en móviles y tabletas -->
            <nav class="bottom-nav-bar-responsive d-xl-none fixed-bottom py-2 px-3 shadow-lg">
                <div class="d-flex justify-content-around align-items-center">
                    <button class="bottom-nav-item btn-bottom-tab d-flex flex-column align-items-center border-0 bg-transparent py-1 text-muted" id="bottom-tab-stats">
                        <span class="material-symbols-outlined">monitoring</span>
                        <span>Telemetría</span>
                    </button>
                    <button class="bottom-nav-item btn-bottom-tab d-flex flex-column align-items-center border-0 bg-transparent py-1 text-muted" id="bottom-tab-agents">
                        <span class="material-symbols-outlined">smart_toy</span>
                        <span>Agentes</span>
                    </button>
                    <button class="bottom-nav-item btn-bottom-tab d-flex flex-column align-items-center border-0 bg-transparent py-1 text-muted" id="bottom-tab-reader">
                        <span class="material-symbols-outlined">book_5</span>
                        <span>Lector</span>
                    </button>
                    <button class="bottom-nav-item btn-bottom-tab d-flex flex-column align-items-center border-0 bg-transparent py-1 text-muted" id="bottom-tab-diagnostics">
                        <span class="material-symbols-outlined">build_circle</span>
                        <span>Diagnósticos</span>
                    </button>
                </div>
            </nav>
        `;
    }

    /**
     * Inicializa el esqueleto de la SPA dentro de la etiqueta #app del index.html.
     */
    initSkeleton() {
        const appNode = document.getElementById('app');
        if (!appNode) {
            console.error('[App] No se encontró el punto de anclaje <div id="app"></div> en index.html.');
            return;
        }
        appNode.innerHTML = this.baseTemplate();
    }

    /**
     * Inicializa todos los layouts, overlays, escucha de eventos y arranca la aplicación.
     */
    async start() {
        console.log('[App] Construyendo interfaz visual modular en Vanilla JS...');
        
        // 1. Inyectar esqueleto base en el DOM
        this.initSkeleton();

        // 2. Inicializar Overlays Globales
        globalToast.init();
        globalModal.init();

        // 2.5 Sincronizar clases de colapso desde localStorage
        const sidebarCollapsed = localStorage.getItem('batt-sidebar-collapsed') === 'true';
        const settingsCollapsed = localStorage.getItem('batt-settings-collapsed') === 'true';
        if (sidebarCollapsed) document.body.classList.add('sidebar-collapsed');
        if (settingsCollapsed) document.body.classList.add('settings-collapsed');

        // 3. Renderizar Layouts en sus nodos contenedores
        const headerContainer = document.getElementById('layout-header');
        const sidebarContainer = document.getElementById('layout-sidebar');
        const sidebarRightContainer = document.getElementById('layout-sidebar-right');

        if (headerContainer) this.header.render(headerContainer);
        if (sidebarContainer) this.sidebar.render(sidebarContainer);
        if (sidebarRightContainer) this.settingsPanel.render(sidebarRightContainer);

        // 4. Registrar suscripciones reactivas y eventos
        this.setupStateSubscriptions();
        this.setupTabEvents();

        // 5. Encender el Kernel core
        await Kernel.boot();

        // 6. Inicializar el canal de WebSockets para comunicación reactiva en tiempo real
        this.initWebSocket();

        console.log('[App] Orquestación de interfaz de usuario cargada y activa.');
    }

    /**
     * Registra las suscripciones a eventos de cambio de estado reactivo.
     */
    setupStateSubscriptions() {
        // Al cambiar la novela activa, el tab activo, o la telemetría, repintamos la vista activa
        const subStateChange = globalEventBus.on('state:change', (state) => {
            this.handleNavigationUpdate(state);
        });

        // Escucha específica de novela activa para actualizar cabeceras locales del panel
        const subNovelChange = globalEventBus.on('state:activeNovelId', (data) => {
            this.updateSelectedNovelHeader();
        });

        const subOnlineChange = globalEventBus.on('state:isOnline', (data) => {
            this.updateSelectedNovelHeader();
        });

        this.unsubscribes.push(subStateChange, subNovelChange, subOnlineChange);
    }

    /**
     * Configura la alternancia interactiva de la barra inferior para móviles.
     */
    setupTabEvents() {
        const tabsBottom = {
            statsBottom: document.getElementById('bottom-tab-stats'),
            agentsBottom: document.getElementById('bottom-tab-agents'),
            readerBottom: document.getElementById('bottom-tab-reader'),
            diagnosticsBottom: document.getElementById('bottom-tab-diagnostics')
        };

        Object.entries(tabsBottom).forEach(([tabKey, tabBtn]) => {
            if (!tabBtn) return;
            tabBtn.addEventListener('click', () => {
                const cleanKey = tabKey.replace('Bottom', '');
                globalState.set({ activeTab: cleanKey });
            });
        });
    }

    /**
     * Orquesta la conmutación de vistas SPA a través del Router central.
     * @param {Object} state - Copia del estado global reactivo.
     */
    async handleNavigationUpdate(state) {
        const { activeTab, activeNovelId, telemetry } = state;

        // Actualizar visualmente la clase .active en los botones de la barra inferior (móviles)
        const tabsBottom = {
            stats: document.getElementById('bottom-tab-stats'),
            agents: document.getElementById('bottom-tab-agents'),
            reader: document.getElementById('bottom-tab-reader'),
            diagnostics: document.getElementById('bottom-tab-diagnostics')
        };

        Object.entries(tabsBottom).forEach(([key, btn]) => {
            if (!btn) return;
            if (key === activeTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Encontrar novela activa actual en los datos
        let currentNovel = null;
        if (telemetry && telemetry.novels) {
            currentNovel = telemetry.novels.find(n => n.id === activeNovelId);
        }

        // Navegar dinámicamente y limpiar memoria de la vista anterior
        await globalRouter.navigate(activeTab, 'spa-view-container', currentNovel);
    }

    /**
     * Actualiza el encabezado de presentación de la novela seleccionada.
     */
    updateSelectedNovelHeader() {
        const state = globalState.get();
        const titleEl = document.getElementById('selected-novel-title');
        const langEl = document.getElementById('selected-novel-lang');

        if (!titleEl || !langEl) return;

        if (!state.isOnline) {
            titleEl.innerText = 'Desconectado';
            langEl.innerText = 'PUENTE OFFLINE';
            return;
        }

        if (!state.telemetry || !state.telemetry.novels || state.telemetry.novels.length === 0) {
            titleEl.innerText = 'Sin proyectos indexados';
            langEl.innerText = '-- ? --';
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
     * Inicializa la conexión WebSocket en tiempo real con el servidor puente.
     * Reemplaza el esquema de Polling periódico tradicional por empuje reactivo instantáneo.
     */
    initWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws';
        const wsUrl = `${wsProtocol}://${window.location.hostname || 'localhost'}:3000`;
        
        console.log(`[WS] Conectando al canal de telemetría reactiva: ${wsUrl}`);
        
        // Limpiar instancia previa si existe para evitar acumulaciones
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            try {
                this.ws.close();
            } catch (err) {
                // Silenciar error de cierre
            }
            this.ws = null;
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] Conexión establecida de forma exitosa.');
                globalState.set({ isOnline: true });
                this.serverDownNotified = false;
                this.wsReconnectAttempts = 0; // Resetear intentos al conectar con éxito
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Si el mensaje es una actualización parcial del progreso de un agente,
                    // lo emitimos como un evento específico sin sobreescribir la telemetría consolidada.
                    if (data && data.type === 'AGENT_TELEMETRY') {
                        globalEventBus.emit('ws:agent_telemetry', data);
                        return;
                    }

                    // Actualizar el estado reactivo global de telemetría consolidada
                    globalState.set({ telemetry: data, isOnline: true });

                    // Si no hay ninguna novela activa y ahora se obtuvieron, seleccionar la primera
                    const state = globalState.get();
                    if (!state.activeNovelId && data.novels && data.novels.length > 0) {
                        globalState.set({ activeNovelId: data.novels[0].id });
                    }
                    this.serverDownNotified = false;
                } catch (err) {
                    console.error('[WS] Error al decodificar paquete de telemetría reactiva:', err);
                }
            };

            this.ws.onclose = () => {
                this.handleWebSocketDisconnection();
            };

            this.ws.onerror = (err) => {
                console.error('[WS] Excepción en canal de comunicación:', err);
                if (this.ws) {
                    this.ws.close();
                }
            };
        } catch (err) {
            console.error('[WS] Fallo crítico al inicializar la instancia de WebSocket:', err);
            this.handleWebSocketDisconnection();
        }
    }

    /**
     * Gestiona el proceso de desconexión del canal de comunicación en tiempo real.
     * Muestra una advertencia visual al usuario e inicia el reintento de reconexión exponencial.
     */
    handleWebSocketDisconnection() {
        globalState.set({ telemetry: null, isOnline: false });

        if (!this.serverDownNotified) {
            this.serverDownNotified = true;
            globalEventBus.emit('toast:show', {
                message: 'Canal de telemetría reactiva perdido. Intentando reconexión en segundo plano...',
                type: 'warn'
            });
        }

        if (this.wsReconnectTimeoutId) {
            clearTimeout(this.wsReconnectTimeoutId);
        }

        // Algoritmo de backoff exponencial: aumenta el delay progresivamente entre 2s y 30s
        const delay = Math.min(2000 * Math.pow(1.5, this.wsReconnectAttempts), 30000);
        this.wsReconnectAttempts++;
        console.log(`[WS] Reintentando conexión en ${Math.round(delay / 1000)}s (intento #${this.wsReconnectAttempts})...`);

        this.wsReconnectTimeoutId = setTimeout(() => {
            this.initWebSocket();
        }, delay);
    }

    /**
     * Detiene los procesos activos y limpia suscripciones para evitar memory leaks.
     */
    destroy() {
        if (this.wsReconnectTimeoutId) {
            clearTimeout(this.wsReconnectTimeoutId);
            this.wsReconnectTimeoutId = null;
        }

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }
        
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        this.header.destroy();
        this.sidebar.destroy();
        this.settingsPanel.destroy();
        globalToast.destroy();
        globalModal.destroy();

        console.log('[App] Aplicación desmantelada completamente de memoria.');
    }
}

// Iniciar aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppOrchestrator();
    app.start();
});
