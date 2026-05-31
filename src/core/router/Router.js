/**
 * @file Router.js
 * @description Enrutador local asíncrono para alternar entre vistas de manera fluida y modular.
 * @author BATT Principal Automation Engineer
 */

import { globalEventBus } from '../eventBus/EventBus.js';
import { globalState } from '../state/State.js';

class Router {
    constructor() {
        this.routes = {};
        this.currentView = null;
    }

    /**
     * Registra una vista o ruta modular.
     * @param {string} tabName Identificador de la pestaña/vista.
     * @param {Object} viewInstance Instancia de la vista con métodos render y destroy.
     */
    register(tabName, viewInstance) {
        this.routes[tabName] = viewInstance;
    }

    /**
     * Alterna y despliega la ruta/vista activa en el contenedor de destino.
     * @param {string} tabName Identificador de la pestaña/vista.
     * @param {string} containerId Contenedor destino en el DOM.
     * @param {any} data Datos opcionales para la renderización.
     */
    async navigate(tabName, containerId, data = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Limpieza de vista anterior para evitar fugas de memoria (memory leaks)
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }

        const view = this.routes[tabName];
        if (view) {
            this.currentView = view;
            container.innerHTML = ''; // Limpiar contenedor
            
            // Renderizar la nueva vista de forma asíncrona
            await view.render(containerId, data);
            
            // Actualizar estado de pestaña activa de forma sincronizada
            globalState.set({ activeTab: tabName });
            globalEventBus.emit('router:navigated', tabName);
        } else {
            console.warn(`[Router] La vista "${tabName}" no está registrada.`);
        }
    }
}

export const globalRouter = new Router();
