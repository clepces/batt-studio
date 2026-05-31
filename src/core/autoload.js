/**
 * @file autoload.js
 * @description Registro y autocarga modular de componentes, vistas y módulos del sistema.
 * @author BATT Principal Automation Engineer
 */

import { globalRouter } from './router/Router.js';
import { EstadisticaView } from '../modules/estadistica/EstadisticaView.js';
import { PlaygroundView } from '../shared/ui/pages/PlaygroundView.js';
import { ReaderView } from '../shared/ui/pages/ReaderView.js';
import { DiagnosticsView } from '../shared/ui/pages/DiagnosticsView.js';
import { AgentSettingsView } from '../shared/ui/pages/AgentSettingsView.js';
import { AgentFlowView } from '../shared/ui/pages/AgentFlowView.js';

class Autoload {
    /**
     * Inicializa y registra todos los módulos activos del Dashboard en el Enrutador.
     */
    static init() {
        console.log('[Autoload] Registrando vistas del sistema en el router core...');
        
        // Registrar módulos de negocio y compartidos en el Router central
        globalRouter.register('stats', EstadisticaView);
        globalRouter.register('reader', PlaygroundView);
        globalRouter.register('chapter-reader', ReaderView);
        globalRouter.register('diagnostics', DiagnosticsView);
        globalRouter.register('agents', AgentSettingsView);
        globalRouter.register('flow', AgentFlowView);

        console.log('[Autoload] Carga y vinculación de módulos de negocio completada exitosamente.');
    }
}

export default Autoload;
export { Autoload };
