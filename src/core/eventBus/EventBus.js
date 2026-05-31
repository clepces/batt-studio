/**
 * @file EventBus.js
 * @description Bus de eventos globales desacoplado para la comunicación entre módulos.
 * @author BATT Principal Automation Engineer
 */

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Se suscribe a un evento específico.
     * @param {string} event Nombre del evento.
     * @param {Function} callback Función de retorno.
     * @returns {Function} Función para desuscribirse de forma ágil y evitar memory leaks.
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        // Retornar función de desuscripción para higiene de memoria (code-hygiene.md)
        return () => this.off(event, callback);
    }

    /**
     * Remueve la suscripción a un evento.
     * @param {string} event Nombre del evento.
     * @param {Function} callback Función a remover.
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Emite un evento con datos asociados.
     * @param {string} event Nombre del evento.
     * @param {any} data Datos a transmitir.
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`[EventBus] Error ejecutando callback para el evento "${event}":`, err);
            }
        });
    }
}

export const globalEventBus = new EventBus();
