/**
 * @file Error404.js
 * @description Vista estandarizada de contingencia (Error 404) para navegación a rutas inexistentes.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../core/state/State.js';

export class Error404 {
    /**
     * Renderiza la interfaz de error 404 dentro del contenedor seleccionado.
     * @param {string} containerId - ID del contenedor destino en el DOM.
     * @param {any} data - Datos de contexto.
     */
    static async render(containerId, data = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="error-404-container">
                <div class="error-glow-orb"></div>
                <h1 class="error-title">404</h1>
                <h2 class="error-subtitle">Módulo Fuera del Canal de Traducción</h2>
                <p class="error-desc">
                    El subsistema técnico solicitado no se encuentra indexado en la estructura del kernel.
                    Verifique que el módulo esté registrado en <code>src/core/autoload.js</code>.
                </p>
                <div class="error-actions">
                    <button class="btn-action" id="btn-error-home">↩️ Volver a Telemetría Core</button>
                </div>
            </div>
        `;

        this.setupEvents();
    }

    /**
     * Vincula los clicks interactivos de la vista de error.
     */
    static setupEvents() {
        const homeBtn = document.getElementById('btn-error-home');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                globalState.set({ activeTab: 'stats' });
            });
        }
    }

    /**
     * Método opcional de desmantelamiento de eventos para evitar fugas de memoria.
     */
    static destroy() {
        const homeBtn = document.getElementById('btn-error-home');
        if (homeBtn) {
            // El recolector de basura se encarga ya que el elemento es retirado por completo del DOM
        }
        console.log('[Error404] Desmontado.');
    }
}

export default Error404;
