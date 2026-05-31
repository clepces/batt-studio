/**
 * @file State.js
 * @description Gestión de estado reactivo global centralizado con notificaciones de cambio a través de EventBus.
 * @author BATT Principal Automation Engineer
 */

import { globalEventBus } from '../eventBus/EventBus.js';

class State {
    constructor() {
        this._state = {
            activeNovelId: null,
            telemetry: null,
            activeTab: 'stats',
            readerChapter: null,
            isOnline: false
        };
    }

    /**
     * Obtiene el estado actual de forma segura.
     * @returns {Object} Clon del estado para evitar mutaciones directas.
     */
    get() {
        return { ...this._state };
    }

    /**
     * Actualiza una o más propiedades del estado global y notifica los cambios.
     * @param {Object} partialState Objeto con las propiedades a actualizar.
     */
    set(partialState) {
        let hasChanges = false;
        const oldState = { ...this._state };

        Object.keys(partialState).forEach(key => {
            if (this._state[key] !== partialState[key]) {
                this._state[key] = partialState[key];
                hasChanges = true;
                // Emitir evento específico de cambio de propiedad
                globalEventBus.emit(`state:${key}`, {
                    newValue: partialState[key],
                    oldValue: oldState[key]
                });
            }
        });

        if (hasChanges) {
            // Emitir evento de cambio global
            globalEventBus.emit('state:change', this._state);
        }
    }
}

export const globalState = new State();
if (typeof window !== 'undefined') {
    window.globalState = globalState;
}

