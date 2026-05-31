/**
 * @file ProgressTracker.js
 * @description Generador modular dinámico de barras de avance de traducción del pipeline,
 * con acceso interactivo a la explicación cognitiva de agentes a través de modales.
 * @author BATT Principal Automation Engineer
 */

export class ProgressTracker {
    /**
     * Devuelve el marcado HTML y cálculos para el widget de avance.
     * @param {number} lastProcessed - Capítulos traducidos con éxito.
     * @param {number} pending - Capítulos cargados en cola de procesamiento.
     * @returns {string}
     */
    static template(lastProcessed, pending) {
        const processedVal = parseInt(lastProcessed) || 0;
        const pendingVal = parseInt(pending) || 0;
        const total = processedVal + pendingVal;
        const percentage = total > 0 ? ((processedVal / total) * 100).toFixed(1) : '0.0';

        return `
            <div class="progress-widget-box pipeline-progress-card h-100 p-4 rounded-4 shadow-sm border border-theme d-flex flex-column justify-content-between">
                <div>
                    <div class="progress-header d-flex justify-content-between align-items-center mb-3">
                        <span class="widget-label text-muted small fw-bold text-uppercase">Progreso del Pipeline</span>
                        <span class="widget-value highlight-value font-mono fw-black fs-4 text-primary">${percentage}%</span>
                    </div>
                    
                    <div class="progress-bar-container bg-surface-variant rounded-pill overflow-hidden mb-3" style="height: 8px;">
                        <div class="progress-bar-fill progress-glow-bar rounded-pill" style="width: ${percentage}%; height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>

                    <div class="progress-ratios d-flex justify-content-between small text-muted mb-4">
                        <span class="ratio-item d-flex align-items-center gap-1.5">
                            <span class="pulse-dot active bg-success" style="width:6px; height:6px;"></span>
                            Procesados: <strong class="text-success badge bg-success-glow border border-success-subtle px-2.5 py-1.5 rounded-pill font-mono">${processedVal} caps.</strong>
                        </span>
                        <span class="ratio-item d-flex align-items-center gap-1.5">
                            <span class="pulse-dot active bg-warning" style="width:6px; height:6px;"></span>
                            En Bodega: <strong class="text-warning badge bg-warning-glow border border-warning-subtle px-2.5 py-1.5 rounded-pill font-mono">${pendingVal} caps.</strong>
                        </span>
                    </div>
                </div>

                <!-- Botón interactivo de explicación de pipeline para descongestionar el dashboard principal -->
                <div class="d-flex align-items-center justify-content-between mt-auto p-3 rounded-4 border border-theme" style="background: var(--color-surface-variant); border: 1px solid var(--color-border-card) !important;">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-symbols-outlined text-primary fs-5">auto_awesome</span>
                        <span class="small fw-bold text-main" style="font-size: 12px;">Pipeline Cognitivo</span>
                    </div>
                    <button class="btn btn-premium-secondary btn-sm py-1.5 px-3 rounded-pill" id="btn-learn-pipeline-more" style="font-size: 11px; font-weight:700;">
                        Saber más
                    </button>
                </div>
            </div>
        `;
    }
}

export default ProgressTracker;
