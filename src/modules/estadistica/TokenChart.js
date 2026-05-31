/**
 * @file TokenChart.js
 * @description Widget de telemetría premium para el monitoreo del Orquestador de Agentes Locales BATT,
 * de acuerdo con las directrices locales de Antigravity.
 * @author BATT Principal Automation Engineer
 */

export class TokenChart {
    /**
     * Genera el HTML enriquecido para el estado del Orquestador de Agentes Locales.
     * @returns {string}
     */
    static template() {
        return `
            <div class="financial-widget-box agentic-orchestrator-card">
                <div class="orchestrator-header">
                    <span class="widget-label">Orquestador de Agentes Locales BATT</span>
                    <div class="env-status-badge">
                        <span class="status-pulse-dot"></span>
                        <span class="status-text">LOCAL COOPERATIVE</span>
                    </div>
                </div>

                <div class="orchestrator-body">
                    <!-- Mapa de Enrutamiento de Modelos de Inteligencia Artificial -->
                    <div class="routing-map-container">
                        <div class="routing-title">Enrutamiento de Modelos de IA (Antigravity Core)</div>
                        
                        <div class="routing-row">
                            <span class="agent-role">traductor-universal</span>
                            <span class="arrow-indicator">➔</span>
                            <span class="model-tag tag-pro">gemini-1.5-pro</span>
                        </div>
                        <div class="routing-row">
                            <span class="agent-role">corrector-lqa</span>
                            <span class="arrow-indicator">➔</span>
                            <span class="model-tag tag-pro">gemini-1.5-pro</span>
                        </div>
                        <div class="routing-row">
                            <span class="agent-role">localizador-cultural</span>
                            <span class="arrow-indicator">➔</span>
                            <span class="model-tag tag-flash">gemini-1.5-flash</span>
                        </div>
                    </div>

                    <!-- Barras de integridad y guardrails de seguridad local -->
                    <div class="guardrails-container">
                        <div class="routing-title">Guardrails de Integridad en Disco</div>
                        
                        <div class="guardrail-item">
                            <div class="guardrail-desc">
                                <span>Control de Semáforo I/O (FileSemaphore)</span>
                                <span class="guardrail-status-tag tag-ok">ACTIVO</span>
                            </div>
                            <div class="guardrail-bar"><div class="guardrail-fill" style="width: 100%"></div></div>
                        </div>

                        <div class="guardrail-item">
                            <div class="guardrail-desc">
                                <span>Prevención de Sobreescritura Final (Candeado)</span>
                                <span class="guardrail-status-tag tag-ok">PROTEGIDO</span>
                            </div>
                            <div class="guardrail-bar"><div class="guardrail-fill" style="width: 100%"></div></div>
                        </div>
                    </div>
                </div>
                
                <p class="budget-desc orchestrator-footer">
                    Ecosistema Antigravity Activo — Modos cooperativos en disco local unificado de alta velocidad.
                </p>
            </div>
        `;
    }
}

export default TokenChart;
