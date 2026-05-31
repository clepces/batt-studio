/**
 * @file Toast.js
 * @description Componente transversal de alertas visuales (Toasts) dinámicas con atenuación y auto-cierre.
 * @author BATT Principal Automation Engineer
 */

import { globalEventBus } from '../../../core/eventBus/EventBus.js';

export class Toast {
    constructor() {
        this.container = null;
        this.unsubscribe = null;
        this.timeouts = [];
    }

    /**
     * Inicializa el contenedor global de Toasts en el DOM y se suscribe al bus de eventos.
     */
    init() {
        // Crear el contenedor de toasts si no existe
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }

        // Suscribirse a eventos de despliegue de alertas
        this.unsubscribe = globalEventBus.on('toast:show', (data) => {
            this.show(data.message, data.type || 'info');
        });
    }

    /**
     * Muestra una notificación visual en la pantalla.
     * @param {string} message - Mensaje en español técnico descriptivo.
     * @param {string} type - Tipo de notificación ('success', 'error', 'info', 'warn').
     */
    show(message, type = 'info') {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warn') icon = '⚠️';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close-btn">&times;</button>
        `;

        this.container.appendChild(toast);

        // Forzar reflow para animación CSS
        void toast.offsetWidth;
        toast.classList.add('visible');

        // Botón cerrar manual
        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(toast));
        }

        // Auto-cierre de seguridad tras 4 segundos
        const timerId = setTimeout(() => {
            this.dismiss(toast);
            this.timeouts = this.timeouts.filter(id => id !== timerId);
        }, 4000);

        this.timeouts.push(timerId);
    }

    /**
     * Desvanece y retira físicamente el Toast del DOM.
     * @param {HTMLElement} toast - Nodo del DOM correspondiente al Toast.
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.remove('visible');
        toast.classList.add('dismissing');
        
        // Esperar a que la transición CSS de opacidad y desplazamiento termine antes de retirar del DOM
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Libera recursos de eventos e hilos de ejecución de timers.
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.timeouts.forEach(clearTimeout);
        this.timeouts = [];
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
        console.log('[Toast] Gestor de alertas transversales desconectado con éxito.');
    }
}

export const globalToast = new Toast();
export default globalToast;
