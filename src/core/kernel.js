/**
 * @file kernel.js
 * @description Núcleo de arranque (Kernel) para la inicialización ordenada del framework SPA.
 * @author BATT Principal Automation Engineer
 */

import { Autoload } from './autoload.js';
import { ApiClient } from './api/ApiClient.js';
import { globalState } from './state/State.js';
import { globalEventBus } from './eventBus/EventBus.js';
import { globalRouter } from './router/Router.js';

class Kernel {
    /**
     * Arranca los módulos y el ciclo de vida del frontend unificado.
     */
    static async boot() {
        console.log('[Kernel] Iniciando secuencia de encendido del framework SPA (BATT Engine)...');
        
        try {
            // 1. Inicializar el autoloader de módulos
            Autoload.init();

            // 2. Cargar telemetría inicial en caliente
            console.log('[Kernel] Solicitando estado del disco unificado al servidor puente...');
            const telemetry = await ApiClient.getTelemetry();
            
            // 3. Determinar novela activa predeterminada
            let activeNovelId = null;
            if (telemetry && telemetry.novels && telemetry.novels.length > 0) {
                activeNovelId = telemetry.novels[0].id;
            }

            // 4. Inyectar estado inicial reactivo
            globalState.set({
                telemetry: telemetry,
                activeNovelId: activeNovelId,
                activeTab: 'stats'
            });

            console.log('[Kernel] Estado reactivo configurado de forma inicial.');

            // 5. Notificar encendido completado
            globalEventBus.emit('kernel:booted', telemetry);
            console.log('[Kernel] Inicialización de servicios del core completada de manera exitosa.');
        } catch (err) {
            console.error('[Kernel] Fallo crítico durante el arranque del núcleo:', err);
            // Inyectar estado con telemetría vacía ante fallo del servidor Express
            globalState.set({
                telemetry: { novels: [] },
                activeNovelId: null,
                activeTab: 'stats'
            });
            globalEventBus.emit('kernel:booted', { novels: [] });
        }
    }
}

export default Kernel;
export { Kernel };
