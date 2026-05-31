/**
 * @file SettingsPanel.js
 * @description Componente modular para el panel derecho de Run Settings estilo Google AI Studio.
 * Controla variables de ejecución de IA, ruteo de modelos, temperatura, e interruptores de rendimiento.
 * @author BATT Principal Automation Engineer
 */

import { globalState } from '../../../core/state/State.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';

export class SettingsPanel {
    constructor() {
        this.container = null;
        this.unsubscribes = [];
        this.listeners = {};
    }

    /**
     * Devuelve el marcado HTML de los ajustes de ejecución.
     * @returns {string}
     */
    template() {
        const state = globalState.get();
        const activePerf = localStorage.getItem('batt-perf-mode') || 'premium';
        const isLowPerf = activePerf === 'light';

        const activeModel = localStorage.getItem('batt-model-routing') || 'gemini-1.5-flash';
        const systemInstructions = localStorage.getItem('batt-system-instructions') || 
            'Eres un traductor literario experto. Traduce manteniendo el tono clásico, la epicidad de los Kaomojis y la coherencia cultural de las novelas chinas de Xianxia.';
        const temperature = parseFloat(localStorage.getItem('batt-temperature') || '0.3');
        const thinkingLevel = localStorage.getItem('batt-thinking-level') || 'high';
        const overwriteLock = localStorage.getItem('batt-overwrite-lock') === 'true';
        const groundingSearch = localStorage.getItem('batt-grounding-search') === 'true';

        return `
            <div class="settings-panel-content d-flex flex-column gap-4 h-100">
                <!-- Título y botón colapsador local -->
                <div class="d-flex align-items-center justify-content-between border-bottom-theme pb-2.5">
                    <div class="d-flex align-items-center gap-2">
                        <span class="material-symbols-outlined text-primary fs-5">tune</span>
                        <h3 class="m-0 fs-6 fw-bold text-main uppercase" style="letter-spacing: 0.5px;">Run settings</h3>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn-sidebar-arrow d-none d-lg-flex align-items-center justify-content-center" id="btn-settings-get-code" title="Obtener código SDK BATT" style="width: 24px; height: 24px;">
                            <span class="material-symbols-outlined fs-5">code</span>
                        </button>
                        <button class="btn-sidebar-arrow d-flex" id="btn-collapse-settings" title="Contraer ajustes de ejecución">
                            <span class="material-symbols-outlined fs-5">chevron_right</span>
                        </button>
                    </div>
                </div>

                <!-- Configuración del Modelo -->
                <div class="settings-group-new">
                    <label class="form-label text-muted fs-7 fw-semibold uppercase mb-2 d-block">Modelo de Gemini</label>
                    <select class="form-select select-premium rounded-3" id="settings-model-selector">
                        <option value="gemini-1.5-flash" ${activeModel === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash Preview</option>
                        <option value="gemini-1.5-pro" ${activeModel === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                    </select>
                    <small class="text-muted d-block mt-1.5 fs-8">Flash es ideal para velocidad; Pro para precisión y prosa profunda.</small>
                </div>

                <!-- Instrucciones del Sistema -->
                <div class="settings-group-new">
                    <label class="form-label text-muted fs-7 fw-semibold uppercase mb-2 d-block">System instructions</label>
                    <textarea class="form-control rounded-3 font-sans" id="settings-system-instructions" rows="4" style="font-size: 12.5px; line-height: 1.4;" placeholder="Opcional: Instrucciones de tono para los agentes...">${systemInstructions}</textarea>
                </div>

                <!-- Parámetro de Temperatura -->
                <div class="settings-group-new">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label text-muted fs-7 fw-semibold uppercase m-0">Temperature</label>
                        <span class="badge rounded bg-surface-variant text-primary font-mono fw-bold py-1 px-2 border border-theme" id="settings-temperature-badge" style="font-size: 11px;">${temperature.toFixed(1)}</span>
                    </div>
                    <input type="range" class="form-range" id="settings-temperature-slider" min="0" max="1" step="0.1" value="${temperature}">
                    <div class="d-flex justify-content-between text-muted fs-8 font-mono mt-1">
                        <span>Preciso (0.0)</span>
                        <span>Creativo (1.0)</span>
                    </div>
                </div>

                <!-- Nivel de Pensamiento -->
                <div class="settings-group-new">
                    <label class="form-label text-muted fs-7 fw-semibold uppercase mb-2 d-block">Thinking level</label>
                    <select class="form-select select-premium rounded-3" id="settings-thinking-level">
                        <option value="high" ${thinkingLevel === 'high' ? 'selected' : ''}>High</option>
                        <option value="medium" ${thinkingLevel === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="low" ${thinkingLevel === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>

                <!-- Interruptores / Toggles de Seguridad y Rendimiento -->
                <div class="settings-group-new d-flex flex-column gap-3 border-top-theme pt-3.5">
                    <label class="form-label text-muted fs-7 fw-semibold uppercase m-0 d-block">Filtros & Controles</label>
                    
                    <!-- Candado de Seguridad -->
                    <div class="form-check form-switch d-flex justify-content-between align-items-center p-0 m-0">
                        <div class="switch-label-block">
                            <span class="text-main fw-semibold fs-7 d-block">Candado de sobreescritura</span>
                            <small class="text-muted d-block fs-8">Evita pisar archivos finales traducidos.</small>
                        </div>
                        <input class="form-check-input fs-5 m-0 cursor-pointer" type="checkbox" role="switch" id="settings-overwrite-lock" ${overwriteLock ? 'checked' : ''}>
                    </div>

                    <!-- Modo Ahorro / Rendimiento en caliente -->
                    <div class="form-check form-switch d-flex justify-content-between align-items-center p-0 m-0">
                        <div class="switch-label-block">
                            <span class="text-main fw-semibold fs-7 d-block">Modo ahorro de energía</span>
                            <small class="text-muted d-block fs-8">Optimiza interfaz para la Phenom II.</small>
                        </div>
                        <input class="form-check-input fs-5 m-0 cursor-pointer" type="checkbox" role="switch" id="settings-low-perf-toggle" ${isLowPerf ? 'checked' : ''}>
                    </div>

                    <!-- Grounding con Google Search -->
                    <div class="form-check form-switch d-flex justify-content-between align-items-center p-0 m-0">
                        <div class="switch-label-block">
                            <span class="text-main fw-semibold fs-7 d-block">Búsqueda web activa</span>
                            <small class="text-muted d-block fs-8">Soporte de Google Search en traducción.</small>
                        </div>
                        <input class="form-check-input fs-5 m-0 cursor-pointer" type="checkbox" role="switch" id="settings-grounding-search" ${groundingSearch ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza el panel dentro del elemento contenedor.
     * @param {HTMLElement} parentElement - Contenedor.
     */
    render(parentElement) {
        this.container = parentElement;
        this.container.className = 'col-12 col-lg-3 d-flex flex-column py-3 px-3 border-start-theme';
        this.container.id = 'layout-sidebar-right';
        this.container.innerHTML = this.template();

        this.init();
    }

    /**
     * Inicializa los listeners interactivos y suscripciones reactivas del panel.
     */
    init() {
        this.setupStateSubscriptions();
        this.setupDomEvents();
    }

    /**
     * Se conecta con eventos del sistema.
     */
    setupStateSubscriptions() {
        // Escuchar cambios de rendimiento desde otros lados (ej. el Header) para sincronizar el toggle local
        const subPerf = globalEventBus.on('performance:change', (perfMode) => {
            const toggle = this.container.querySelector('#settings-low-perf-toggle');
            if (toggle) {
                toggle.checked = perfMode === 'light';
            }
        });

        this.unsubscribes.push(subPerf);
    }

    /**
     * Vincula los event listeners de los inputs de ajustes con persistencia.
     */
    setupDomEvents() {
        // 1. Selector de Modelo
        const modelSelector = this.container.querySelector('#settings-model-selector');
        if (modelSelector) {
            const handler = (e) => {
                const model = e.target.value;
                localStorage.setItem('batt-model-routing', model);
                globalEventBus.emit('toast:show', {
                    message: `Modelo enrutado a ${model === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash Preview' : 'Gemini 1.5 Pro'}.`,
                    type: 'success'
                });
            };
            modelSelector.addEventListener('change', handler);
            this.listeners['model'] = { el: modelSelector, event: 'change', fn: handler };
        }

        // 2. System Instructions
        const instructionsText = this.container.querySelector('#settings-system-instructions');
        if (instructionsText) {
            const handler = (e) => {
                localStorage.setItem('batt-system-instructions', e.target.value);
            };
            instructionsText.addEventListener('input', handler);
            this.listeners['instructions'] = { el: instructionsText, event: 'input', fn: handler };
        }

        // 3. Slider de Temperatura
        const tempSlider = this.container.querySelector('#settings-temperature-slider');
        const tempBadge = this.container.querySelector('#settings-temperature-badge');
        if (tempSlider && tempBadge) {
            const handler = (e) => {
                const tempVal = parseFloat(e.target.value);
                tempBadge.innerText = tempVal.toFixed(1);
                localStorage.setItem('batt-temperature', tempVal.toString());
            };
            tempSlider.addEventListener('input', handler);
            this.listeners['temperature'] = { el: tempSlider, event: 'input', fn: handler };
        }

        // 4. Thinking Level
        const thinkSelector = this.container.querySelector('#settings-thinking-level');
        if (thinkSelector) {
            const handler = (e) => {
                localStorage.setItem('batt-thinking-level', e.target.value);
            };
            thinkSelector.addEventListener('change', handler);
            this.listeners['thinking'] = { el: thinkSelector, event: 'change', fn: handler };
        }

        // 5. Candado de sobreescritura
        const lockToggle = this.container.querySelector('#settings-overwrite-lock');
        if (lockToggle) {
            const handler = (e) => {
                const locked = e.target.checked;
                localStorage.setItem('batt-overwrite-lock', locked.toString());
                globalEventBus.emit('toast:show', {
                    message: locked 
                        ? 'Candado de seguridad activado: Se impedirá sobreescribir archivos finales existentes.' 
                        : 'Advertencia: Sobreescritura de traducciones permitida libremente.',
                    type: locked ? 'success' : 'warn'
                });
            };
            lockToggle.addEventListener('change', handler);
            this.listeners['lock'] = { el: lockToggle, event: 'change', fn: handler };
        }

        // 6. Modo Ahorro / Bajo Rendimiento
        const perfToggle = this.container.querySelector('#settings-low-perf-toggle');
        if (perfToggle) {
            const handler = (e) => {
                const isLow = e.target.checked;
                const newMode = isLow ? 'light' : 'premium';
                
                // Conmutar clase física en document.body
                if (isLow) {
                    document.body.classList.add('low-perf-mode');
                } else {
                    document.body.classList.remove('low-perf-mode');
                }
                localStorage.setItem('batt-perf-mode', newMode);

                // Notificar transversalmente a otros layouts (ej. el Header)
                globalEventBus.emit('performance:change', newMode);

                globalEventBus.emit('toast:show', {
                    message: isLow 
                        ? 'Modo Ahorro de Energía activado. Interfaz optimizada para hardware limitado.' 
                        : 'Efectos visuales y animaciones premium restaurados.',
                    type: 'success'
                });
            };
            perfToggle.addEventListener('change', handler);
            this.listeners['perf'] = { el: perfToggle, event: 'change', fn: handler };
        }

        // 7. Búsqueda activa / Grounding
        const groundingToggle = this.container.querySelector('#settings-grounding-search');
        if (groundingToggle) {
            const handler = (e) => {
                localStorage.setItem('batt-grounding-search', e.target.checked.toString());
            };
            groundingToggle.addEventListener('change', handler);
            this.listeners['grounding'] = { el: groundingToggle, event: 'change', fn: handler };
        }

        // 8. Botón de colapso de ajustes con persistencia en localStorage
        const collapseBtn = this.container.querySelector('#btn-collapse-settings');
        if (collapseBtn) {
            const handler = () => {
                document.body.classList.add('settings-collapsed');
                localStorage.setItem('batt-settings-collapsed', 'true');
                globalEventBus.emit('settings:toggle', true);
            };
            collapseBtn.addEventListener('click', handler);
            this.listeners['collapse'] = { el: collapseBtn, event: 'click', fn: handler };
        }

        // 9. Botón Get Code (<>) para fragmentos de código del SDK de BATT
        const getCodeBtn = this.container.querySelector('#btn-settings-get-code');
        if (getCodeBtn) {
            const handler = () => {
                const model = localStorage.getItem('batt-model-routing') || 'gemini-1.5-flash';
                const temp = localStorage.getItem('batt-temperature') || '0.3';
                const sysInst = localStorage.getItem('batt-system-instructions') || '';
                
                const codeSnippet = `// SDK BATT Enterprise
import { BATTEnterprise } from '@batt/core';

const batt = new BATTEnterprise({
  apiKey: 'BATT_SPARK_FREE_PLAN_0_USD',
  model: '${model}',
  temperature: ${temp},
  systemInstructions: '${sysInst.replace(/'/g, "\\'")}'
});

const response = await batt.generate('Tu novela literaria...');`;

                globalEventBus.emit('toast:show', {
                    message: 'SDK BATT: ¡Snippet de código autogenerado copiado al portapapeles con éxito!',
                    type: 'success'
                });

                if (navigator.clipboard) {
                    navigator.clipboard.writeText(codeSnippet).catch(err => {
                        console.error('[Settings] Error al copiar al portapapeles:', err);
                    });
                }
            };
            getCodeBtn.addEventListener('click', handler);
            this.listeners['getCode'] = { el: getCodeBtn, event: 'click', fn: handler };
        }
    }

    /**
     * Limpia los event listeners y desuscribe observables para mitigar memory leaks de Vanilla JS.
     */
    destroy() {
        // Desuscribir observables
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];

        // Remover listeners del DOM de forma explícita
        Object.entries(this.listeners).forEach(([key, config]) => {
            if (config && config.el) {
                config.el.removeEventListener(config.event, config.fn);
            }
        });
        this.listeners = {};
        this.container = null;

        console.log('[SettingsPanel] Panel de ajustes desmontado e higiene de memoria completada (0 leaks).');
    }
}

export default SettingsPanel;
