/**
 * @file AgentSettingsView.js
 * @description Vista modular premium para el panel "Gestor de Agentes" y calibración visual de Kaomojis.
 * @author BATT Principal Automation Engineer
 */

import { ApiClient } from '../../../core/api/ApiClient.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';

export class AgentSettingsView {
    // Referencias para evitar fugas de memoria
    static agents = [];
    static activeAgentId = 'traductor-universal';
    static kaomojiPalette = null;
    static activeSubTab = 'agents'; // 'agents', 'kaomojis' o 'rules_globales'
    static globalRulesContent = '';
    static containerId = null;

    // Handlers guardados estáticamente para remoción explícita
    static handleSubTabClick = null;
    static handleAgentSelect = null;
    static handleSaveAgent = null;
    static handleSaveKaomojis = null;
    static handleAddKaomoji = null;
    static handleCreateAgent = null;

    /**
     * Renderiza la estructura del panel de configuración de agentes y kaomojis.
     * @param {string} containerId - ID del contenedor destino.
     */
    static async render(containerId, data = null) {
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = globalState.get();
        if (!state.isOnline) {
            container.innerHTML = `
                <div class="statistics-empty-wrapper border border-theme rounded-4 p-5 text-center my-4" style="background: var(--color-surface-variant);">
                    <div class="statistics-empty-state">
                        <span class="material-symbols-outlined text-danger fs-1 mb-3 animate-pulse">smart_toy</span>
                        <p class="text-main fw-bold mb-2 fs-5">Gestor de Agentes Desconectado</p>
                        <p class="text-muted small max-width-md mx-auto mb-4">
                            No es posible configurar los prompts de los agentes ni editar la paleta de Kaomojis si el servidor local está desconectado (Puerto 3000).
                        </p>
                        <div class="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-body border-theme text-muted font-mono" style="font-size: 11px;">
                            <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
                            <span>Esperando reconexión asíncrona del puente...</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        try {
            container.innerHTML = `
                <div class="d-flex align-items-center justify-content-center p-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span class="small">Estableciendo puente asíncrono con .config y cargando agentes...</span>
                </div>
            `;

            // 1. Cargar agentes, kaomojis y reglas globales en paralelo de forma asíncrona
            const [agentsRes, kaomojiRes, rulesRes] = await Promise.all([
                ApiClient.getAgents().catch(err => {
                    console.error('[AgentSettings] Error cargando agentes:', err);
                    return { success: false, agents: [] };
                }),
                ApiClient.getKaomojis().catch(err => {
                    console.error('[AgentSettings] Error cargando kaomojis:', err);
                    return null;
                }),
                ApiClient.getGlobalRules().catch(err => {
                    console.error('[AgentSettings] Error cargando reglas globales:', err);
                    return '';
                })
            ]);

            this.agents = agentsRes.agents || [];
            this.kaomojiPalette = kaomojiRes;
            this.globalRulesContent = rulesRes;

            // 2. Renderizar interfaz principal estructurada
            this.renderLayout(container);

            // 3. Registrar escuchadores de eventos limpios
            this.setupEventListeners();

        } catch (err) {
            container.innerHTML = `
                <div class="alert alert-danger d-flex align-items-center gap-2 rounded-3 py-3 px-4 border-0 error-glow-banner">
                    <span class="material-symbols-outlined text-danger">error</span>
                    <span class="text-danger small fw-semibold">Fallo al inicializar Gestor de Agentes: ${err.message}</span>
                </div>
            `;
        }
    }

    /**
     * Genera y escribe la plantilla visual estructurada.
     */
    static renderLayout(container) {
        const isAgentsActive = this.activeSubTab === 'agents';
        const isKaomojisActive = this.activeSubTab === 'kaomojis';
        const isRulesActive = this.activeSubTab === 'rules_globales';

        container.innerHTML = `
            <style>
                .btn-agent-pill-glass {
                    background: rgba(255, 255, 255, 0.015);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.25s ease;
                }
                .btn-agent-pill-glass:hover {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-1px);
                }
                .active-agent-pill-glass {
                    background: rgba(13, 110, 253, 0.08);
                    border: 1px solid rgba(13, 110, 253, 0.25);
                    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.08);
                    position: relative;
                }
                .active-agent-pill-glass::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 20%;
                    bottom: 25%;
                    width: 3px;
                    background: #0d6efd;
                    border-radius: 0 4px 4px 0;
                }
                .text-hover-danger:hover {
                    color: #ef4444 !important;
                }
                .agent-pill-wrapper:hover .btn-delete-agent-action {
                    opacity: 1 !important;
                }
                .btn-delete-agent-action {
                    opacity: 0.5;
                    transition: opacity 0.2s ease, color 0.2s ease;
                }
            </style>
            <div class="agents-settings-wrapper animate-fade-in">
                <!-- Selector interno de sub-pestañas visuales -->
                <div class="d-flex gap-3 mb-4 border-bottom-theme pb-2 justify-content-between align-items-center flex-wrap">
                    <div class="sub-tabs-pills d-flex p-1 bg-surface-variant rounded-pill gap-1 shadow-sm">
                        <button class="sub-tab-btn rounded-pill px-3 py-1.5 border-0 d-flex align-items-center gap-2 small ${isAgentsActive ? 'active' : ''}" data-subtab="agents">
                            <span class="material-symbols-outlined fs-6">smart_toy</span>
                            Cognición & Prompts
                        </button>
                        <button class="sub-tab-btn rounded-pill px-3 py-1.5 border-0 d-flex align-items-center gap-2 small ${isKaomojisActive ? 'active' : ''}" data-subtab="kaomojis">
                            <span class="material-symbols-outlined fs-6">mood</span>
                            Paleta Kaomojis
                        </button>
                        <button class="sub-tab-btn rounded-pill px-3 py-1.5 border-0 d-flex align-items-center gap-2 small ${isRulesActive ? 'active' : ''}" data-subtab="rules_globales">
                            <span class="material-symbols-outlined fs-6">gavel</span>
                            Reglas Globales
                        </button>
                    </div>
                    <div class="text-muted small d-none d-sm-block">
                        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1">v2.6.0 SECURE</span>
                    </div>
                </div>
 
                <!-- 1. Panel de Agentes de IA -->
                <div id="settings-agents-panel" class="settings-sub-panel ${isAgentsActive ? '' : 'd-none'}">
                    <div class="row g-4">
                        <!-- Sidebar Izquierdo: Selección de Agente -->
                        <div class="col-12 col-md-4 col-xxl-3 border-end-theme-md pe-md-4 d-flex flex-column">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h3 class="fs-6 fw-bold text-main m-0">Cognición del Pipeline</h3>
                                <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 d-flex align-items-center gap-1.5 transition-all" id="btn-trigger-create-agent" style="font-size: 11px; font-weight: 600;">
                                    <span class="material-symbols-outlined" style="font-size: 14px;">add</span>
                                    Nuevo
                                </button>
                            </div>
                            <div class="d-flex flex-column gap-2 overflow-y-auto" id="agents-selector-list" style="max-height: calc(100vh - 280px);">
                                ${this.renderAgentsSelectorList()}
                            </div>
                        </div>
 
                        <!-- Panel Derecho: Edición de Prompt y Modelo -->
                        <div class="col-12 col-md-8 col-xxl-9 ps-md-4" id="agent-editor-container">
                            ${this.renderAgentEditor()}
                        </div>
                    </div>
                </div>
 
                <!-- 2. Panel de Kaomojis -->
                <div id="settings-kaomojis-panel" class="settings-sub-panel ${isKaomojisActive ? '' : 'd-none'}">
                    ${this.renderKaomojisPanel()}
                </div>

                <!-- 3. Panel de Reglas Globales (Constitución Lingüística) -->
                <div id="settings-rules-panel" class="settings-sub-panel ${isRulesActive ? '' : 'd-none'}">
                    ${this.renderRulesPanel()}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza el panel editor de la Constitución Lingüística (Reglas Globales).
     */
    static renderRulesPanel() {
        const rules = this.globalRulesContent || '';
        return `
            <div class="rules-globales-editor d-flex flex-column gap-4 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center border-bottom-theme pb-3 flex-wrap gap-3">
                    <div>
                        <h3 class="fs-5 fw-bold text-main m-0 d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-4">gavel</span>
                            Constitución Lingüística (Reglas Globales)
                        </h3>
                        <p class="text-muted small m-0">Define las directrices transversales de estilo, tono, traducción y corrección LQA para todos los agentes.</p>
                    </div>
                    <button class="btn btn-premium-action py-2.5 px-4 d-flex align-items-center gap-2" id="btn-save-global-rules">
                        <span class="material-symbols-outlined fs-5">save</span>
                        Guardar Constitución
                    </button>
                </div>

                <div class="card-premium p-4 rounded-4 border border-theme" style="background: var(--color-bg-card); border-color: var(--color-border-card);">
                    <div class="form-group d-flex flex-column gap-3">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <label for="global-rules-textarea" class="small fw-bold text-main d-flex align-items-center gap-1.5">
                                <span class="material-symbols-outlined text-primary fs-5">description</span>
                                Archivo .config/rules_globales.md (Markdown)
                            </label>
                            <span class="badge rounded-pill bg-dark-subtle text-primary border border-primary-subtle text-monospace" style="font-size: 10px; font-weight: 500;">
                                UTF-8 ATOMIC
                            </span>
                        </div>
                        <textarea class="form-control textarea-premium rounded-3 p-4 font-monospace small" 
                                  id="global-rules-textarea" 
                                  rows="18" 
                                  placeholder="# Directrices Globales de Traducción..."
                                  style="font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', Courier, monospace; min-height: 400px; line-height: 1.6; resize: vertical; background: rgba(0, 0, 0, 0.2); color: var(--color-text-main); border: 1px solid var(--color-border-theme);">${rules}</textarea>
                    </div>
                </div>

                <div class="alert alert-info d-flex align-items-start gap-2.5 rounded-3 py-3 px-4 border-0" style="background: rgba(13, 110, 253, 0.05); border-left: 4px solid #0d6efd !important;">
                    <span class="material-symbols-outlined text-primary" style="font-size: 20px; margin-top: 2px;">info</span>
                    <div class="small">
                        <span class="fw-bold text-primary d-block mb-1">Nota del Compilador</span>
                        <span class="text-muted">Cualquier cambio guardado aquí será inyectado de forma asíncrona como contexto del sistema en la fase de traducción y auditoría LQA de todas las novelas del ecosistema. Evite borrar directrices estructurales fundamentales.</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la lista lateral de botones de agentes con estética Glassmorphism y botones de eliminación.
     */
    static renderAgentsSelectorList() {
        if (this.agents.length === 0) {
            return '<p class="text-muted small text-center py-4">No se detectaron agentes en el disco duro.</p>';
        }

        return this.agents.map(agent => {
            const isActive = agent.id === this.activeAgentId;
            const activeClass = isActive ? 'active-agent-pill-glass' : 'btn-agent-pill-glass';
            const formattedName = agent.id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const shortModel = agent.model ? agent.model.replace('gemini-', '') : '1.5-pro';

            const deleteButtonHtml = !agent.is_core 
                ? `
                    <button class="btn-delete-agent-action border-0 bg-transparent p-1 text-muted text-hover-danger rounded transition-colors ms-2" 
                            title="Eliminar agente personalizado" 
                            data-delete-agent-id="${agent.id}">
                        <span class="material-symbols-outlined fs-6">delete</span>
                    </button>
                  `
                : '';

            return `
                <div class="agent-pill-wrapper position-relative d-flex align-items-center w-100 mb-2 transition-all rounded-3 ${activeClass}" data-agent-id="${agent.id}" style="cursor: pointer;">
                    <div class="d-flex flex-column flex-grow-1 overflow-hidden py-2 px-3 data-select-agent-trigger">
                        <div class="d-flex align-items-center gap-2 overflow-hidden">
                            <span class="material-symbols-outlined fs-5 flex-shrink-0 text-primary">robot_2</span>
                            <span class="text-truncate small fw-bold text-main m-0">${formattedName}</span>
                        </div>
                        <div class="d-flex align-items-center justify-content-between mt-1 ps-4 opacity-75">
                            <span class="badge rounded-pill bg-dark-subtle text-primary border border-primary-subtle text-monospace" style="font-size: 9px; font-weight: 500;">
                                ${shortModel}
                            </span>
                            ${agent.is_core ? '<span class="badge rounded-pill bg-success-subtle text-success text-uppercase" style="font-size: 8px;">Core</span>' : '<span class="badge rounded-pill bg-info-subtle text-info text-uppercase" style="font-size: 8px;">Custom</span>'}
                        </div>
                    </div>
                    <div class="pe-2 d-flex align-items-center">
                        ${deleteButtonHtml}
                        <span class="material-symbols-outlined fs-6 text-muted flex-shrink-0">chevron_right</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Genera el HTML para el panel editor del agente activo.
     */
    static renderAgentEditor() {
        const agent = this.agents.find(a => a.id === this.activeAgentId);
        if (!agent) {
            return `
                <div class="text-center p-5 text-muted">
                    <span class="material-symbols-outlined fs-2 d-block mb-3">face_sad</span>
                    <p class="m-0 small">Seleccione un agente cognitivo de la lista lateral para calibrar...</p>
                </div>
            `;
        }

        const formattedName = agent.id
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return `
            <div class="agent-editor-form d-flex flex-column gap-4 animate-fade-in">
                <div class="d-flex justify-content-between align-items-center gap-3 border-bottom-theme pb-2.5 flex-wrap">
                    <div>
                        <h4 class="fs-5 fw-bold text-main m-0">${formattedName}</h4>
                        <span class="text-muted small">ID Sistema: <code>${agent.id}</code></span>
                    </div>
                    
                    <div class="d-flex align-items-center gap-2">
                        <label for="agent-model-select" class="small fw-semibold text-main m-0">Modelo routed:</label>
                        <select class="form-select select-premium rounded-pill py-1.5 px-3 small border border-theme" id="agent-model-select" style="min-width: 160px;">
                            <option value="gemini-1.5-pro" ${agent.model === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
                            <option value="gemini-1.5-flash" ${agent.model === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
                            <option value="gemini-2.0-flash" ${agent.model === 'gemini-2.0-flash' || agent.model === 'gemini-2.0-flash-exp' ? 'selected' : ''}>Gemini 2.0 Flash</option>
                        </select>
                    </div>
                </div>

                <div class="form-group d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <label for="agent-prompt-textarea" class="small fw-bold text-main d-flex align-items-center gap-1.5">
                            <span class="material-symbols-outlined text-primary fs-5">terminal</span>
                            Instrucciones del Sistema y Prompt Primario (Markdown)
                        </label>
                        <span class="text-muted small opacity-75">Reglas de comportamiento del agente</span>
                    </div>
                    <textarea class="form-control textarea-premium rounded-3 p-3 text-monospace small" 
                              id="agent-prompt-textarea" 
                              rows="14" 
                              placeholder="Escriba las reglas del sistema para este agente literario aquí..."
                              style="font-family: 'Courier New', Courier, monospace; min-height: 320px; line-height: 1.5; resize: vertical;">${agent.prompt || ''}</textarea>
                </div>

                <div class="d-flex justify-content-end gap-2.5">
                    <button class="btn btn-premium-action py-2.5 px-4 d-flex align-items-center gap-2" id="btn-save-agent-settings">
                        <span class="material-symbols-outlined fs-5">save</span>
                        Guardar Reglas de Agente
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Muestra un diálogo modal interactivo para la creación de un nuevo agente.
     */
    static showCreateAgentModal() {
        const oldModal = document.getElementById('create-agent-modal-custom');
        if (oldModal) oldModal.remove();

        const modalHtml = `
            <div class="modal fade" id="create-agent-modal-custom" tabindex="-1" aria-labelledby="createAgentModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content card-premium p-4 rounded-4" style="background: var(--color-bg-card); border: 1px solid var(--color-border-card);">
                        <div class="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                            <h5 class="modal-title fw-bold text-main fs-5 d-flex align-items-center gap-2" id="createAgentModalLabel">
                                <span class="material-symbols-outlined text-primary">robot_2</span>
                                Crear Agente Cognitivo
                            </h5>
                            <button type="button" class="btn-close shadow-none border-0 bg-transparent text-theme-main" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body border-0 pt-3">
                            <form id="create-agent-form-inner">
                                <div class="mb-3">
                                    <label for="new-agent-id" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">ID del Agente (Minúsculas y guiones)</label>
                                    <input type="text" id="new-agent-id" required placeholder="ej: traductor-espejo" class="form-control" style="font-family: var(--font-mono);">
                                </div>
                                <div class="mb-3">
                                    <label for="new-agent-model" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">Modelo routed:</label>
                                    <select id="new-agent-model" class="form-select">
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="new-agent-prompt" class="form-label text-muted small fw-bold text-uppercase" style="font-size: 11px;">Prompt / Instrucciones del Sistema</label>
                                    <textarea id="new-agent-prompt" required placeholder="Instrucciones en Markdown..." class="form-control" rows="6" style="font-family: 'Courier New', Courier, monospace; line-height: 1.4;"></textarea>
                                </div>
                                <div class="d-flex justify-content-end gap-2 pt-2">
                                    <button type="button" class="btn btn-premium-secondary py-2 px-4 rounded-pill" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-premium-action py-2 px-4 rounded-pill d-flex align-items-center gap-1.5" id="btn-submit-new-agent">
                                        <span class="material-symbols-outlined fs-5">save</span>
                                        Escribir en Disco
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml.trim();
        document.body.appendChild(wrapper.firstChild);

        const modalEl = document.getElementById('create-agent-modal-custom');
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();

        const form = document.getElementById('create-agent-form-inner');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-new-agent');
            const id = document.getElementById('new-agent-id').value.trim().toLowerCase();
            const model = document.getElementById('new-agent-model').value;
            const prompt = document.getElementById('new-agent-prompt').value;

            const idRegex = /^[a-z0-9_-]+$/;
            if (!idRegex.test(id)) {
                globalEventBus.emit('toast:show', {
                    message: 'El ID de agente solo puede contener letras minúsculas, números, guiones y guiones bajos.',
                    type: 'error'
                });
                return;
            }

            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Escribiendo...';
            btnSubmit.disabled = true;

            try {
                const res = await ApiClient.saveAgent(id, model, prompt);
                if (res.success) {
                    globalEventBus.emit('toast:show', {
                        message: `✓ Agente "${id}" creado y guardado físicamente en disco.`,
                        type: 'success'
                    });
                    modalInstance.hide();
                    
                    const wrapperEl = document.querySelector('.agents-settings-wrapper');
                    const containerId = wrapperEl.parentElement.id;
                    this.activeAgentId = id;
                    await this.render(containerId);
                } else {
                    throw new Error(res.error || 'Respuesta insatisfactoria de la API.');
                }
            } catch (err) {
                globalEventBus.emit('toast:show', {
                    message: `❌ Error al crear agente: ${err.message}`,
                    type: 'error'
                });
            } finally {
                btnSubmit.innerHTML = '<span class="material-symbols-outlined fs-5">save</span>Escribir en Disco';
                btnSubmit.disabled = false;
            }
        });
    }

    /**
     * Muestra una confirmación técnica interactiva para eliminar un agente personalizado.
     */
    static async confirmDeleteAgent(agentId) {
        const formattedName = agentId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const confirmed = confirm(`¿Está seguro de que desea eliminar permanentemente el agente "${formattedName}"? Esta acción borrará su archivo físico .md de disco y su configuración.`);
        if (!confirmed) return;

        try {
            globalEventBus.emit('toast:show', {
                message: `Removiendo archivo físico del agente "${agentId}"...`,
                type: 'info'
            });

            const res = await ApiClient.deleteAgent(agentId);
            if (res.success) {
                globalEventBus.emit('toast:show', {
                    message: `✓ Agente "${agentId}" eliminado con éxito.`,
                    type: 'success'
                });

                if (this.activeAgentId === agentId) {
                    this.activeAgentId = 'traductor-universal';
                }

                const wrapperEl = document.querySelector('.agents-settings-wrapper');
                const containerId = wrapperEl.parentElement.id;
                await this.render(containerId);
            } else {
                throw new Error(res.error || 'No se pudo eliminar el agente.');
            }
        } catch (err) {
            globalEventBus.emit('toast:show', {
                message: `❌ Fallo al eliminar agente: ${err.message}`,
                type: 'error'
            });
        }
    }

    /**
     * Genera el HTML para el editor de Kaomojis.
     */
    static renderKaomojisPanel() {
        if (!this.kaomojiPalette || !this.kaomojiPalette.matrix) {
            return `
                <div class="text-center p-5 border border-theme rounded-4">
                    <span class="material-symbols-outlined text-warning fs-1 mb-3">mood_bad</span>
                    <p class="text-main fw-bold">Paleta de Kaomojis no encontrada.</p>
                    <p class="text-muted small">Asegúrese de que el archivo <code>palette_kaomojis.json</code> existe en la carpeta .config del proyecto.</p>
                </div>
            `;
        }

        const renderCategoryBlock = (categoryKey, title, icon, isPhysical) => {
            const items = isPhysical 
                ? this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey] || []
                : this.kaomojiPalette.matrix.emociones_personajes[categoryKey] || [];

            const formattedCatName = categoryKey.replace(/_/g, ' ');

            return `
                <div class="kaomoji-category-card glass-card-nested p-4 rounded-4 border border-theme d-flex flex-column gap-3 mb-4 animate-fade-in" data-category="${categoryKey}" data-type="${isPhysical ? 'physical' : 'emotional'}">
                    <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                        <div class="d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-5">${icon}</span>
                            <h4 class="fs-6 fw-bold text-main m-0 text-capitalize">${title}</h4>
                        </div>
                        <span class="text-muted small text-monospace opacity-75">matrix.${isPhysical ? 'estados_fisicos_biologicos' : 'emociones_personajes'}.${categoryKey}</span>
                    </div>

                    <div class="kaomojis-badges-grid d-flex flex-wrap gap-2.5 py-1">
                        ${items.map((kao, idx) => `
                            <div class="kao-badge-item d-flex align-items-center gap-2 py-1.5 px-3 bg-surface border border-theme rounded-pill transition-all" data-index="${idx}">
                                <span class="kao-glyph font-monospace small text-main fw-bold" contenteditable="true" spellcheck="false">${this.escapeHtml(kao)}</span>
                                <button class="btn-delete-kao border-0 bg-transparent p-0 d-flex align-items-center text-muted text-hover-danger transition-colors" title="Remover Kaomoji" data-index="${idx}">
                                    <span class="material-symbols-outlined fs-6">close</span>
                                </button>
                            </div>
                        `).join('')}

                        <button class="btn btn-add-kao border border-dashed border-primary rounded-pill py-1.5 px-3 d-inline-flex align-items-center gap-1 text-primary small transition-colors hover-bg-primary-subtle" data-category="${categoryKey}" data-type="${isPhysical ? 'physical' : 'emotional'}">
                            <span class="material-symbols-outlined fs-5">add</span>
                            Agregar
                        </button>
                    </div>
                </div>
            `;
        };

        return `
            <div class="kaomojis-palette-editor d-flex flex-column gap-4">
                <div class="d-flex justify-content-between align-items-center border-bottom-theme pb-3 flex-wrap gap-3">
                    <div>
                        <h3 class="fs-5 fw-bold text-main m-0">Paleta Oficial de Kaomojis Literarios</h3>
                        <p class="text-muted small m-0">Calibre la matriz expresiva que el <strong>Agente Corrector-LQA</strong> inyectará en las novelas.</p>
                    </div>
                    <button class="btn btn-premium-action py-2.5 px-4 d-flex align-items-center gap-2" id="btn-save-kaomojis-palette">
                        <span class="material-symbols-outlined fs-5">check_circle</span>
                        Guardar Paleta de Kaomojis
                    </button>
                </div>

                <div class="row g-4">
                    <!-- Columna Izquierda: Emociones de Personajes -->
                    <div class="col-12 col-lg-6">
                        <h3 class="fs-6 fw-bold text-main mb-3 pb-1 border-bottom-theme d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-5">theater_comedy</span>
                            Emociones de Personajes
                        </h3>
                        ${renderCategoryBlock('burla_sarcasmo_desprecio', 'Burla, Sarcasmo & Desprecio', 'mood_bad', false)}
                        ${renderCategoryBlock('miedo_terror_vulnerabilidad', 'Miedo, Terror & Vulnerabilidad', 'severe_cold', false)}
                        ${renderCategoryBlock('enamoramiento_aprecio_interes', 'Enamoramiento, Aprecio & Interés', 'favorite', false)}
                    </div>

                    <!-- Columna Derecha: Estados Físicos / Biológicos -->
                    <div class="col-12 col-lg-6">
                        <h3 class="fs-6 fw-bold text-main mb-3 pb-1 border-bottom-theme d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-5">medical_services</span>
                            Estados Físicos & Biológicos
                        </h3>
                        ${renderCategoryBlock('debilidad_tos_cancer', 'Debilidad, Tos & Cáncer', 'sick', true)}
                        ${renderCategoryBlock('aura_divina_omnisciencia', 'Aura Divina & Omnisciencia', 'auto_awesome', true)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Conecta los escuchadores de eventos interactivos asegurando higiene de memoria.
     */
    /**
     * Conecta el escuchador de eventos centralizado mediante delegación de eventos para higiene de memoria.
     */
    static setupEventListeners() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Limpiar el manejador de eventos anterior si ya existía para evitar acumulaciones
        if (this.globalClickHandler) {
            container.removeEventListener('click', this.globalClickHandler);
        }

        // Definir el manejador de eventos centralizado por delegación de clicks
        this.globalClickHandler = async (e) => {
            // 1. Selector interno de sub-pestañas visuales
            const subTabBtn = e.target.closest('.sub-tab-btn');
            if (subTabBtn) {
                e.preventDefault();
                const targetTab = subTabBtn.getAttribute('data-subtab');
                this.activeSubTab = targetTab;
 
                // Actualizar clases activas en botones
                container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
                subTabBtn.classList.add('active');
 
                // Conmutar visibilidad de paneles secundarios
                const agentsPanel = document.getElementById('settings-agents-panel');
                const kaomojisPanel = document.getElementById('settings-kaomojis-panel');
                const rulesPanel = document.getElementById('settings-rules-panel');
 
                if (targetTab === 'agents') {
                    if (agentsPanel) agentsPanel.classList.remove('d-none');
                    if (kaomojisPanel) kaomojisPanel.classList.add('d-none');
                    if (rulesPanel) rulesPanel.classList.add('d-none');
                } else if (targetTab === 'kaomojis') {
                    if (agentsPanel) agentsPanel.classList.add('d-none');
                    if (kaomojisPanel) kaomojisPanel.classList.remove('d-none');
                    if (rulesPanel) rulesPanel.classList.add('d-none');
                } else {
                    if (agentsPanel) agentsPanel.classList.add('d-none');
                    if (kaomojisPanel) kaomojisPanel.classList.add('d-none');
                    if (rulesPanel) rulesPanel.classList.remove('d-none');
                }
                return;
            }

            // 2. Selección de agente lateral (click en la zona de datos del wrapper)
            const selectTrigger = e.target.closest('.data-select-agent-trigger');
            if (selectTrigger) {
                e.preventDefault();
                const pill = selectTrigger.closest('.agent-pill-wrapper');
                if (pill) {
                    const agentId = pill.getAttribute('data-agent-id');
                    this.activeAgentId = agentId;
                    
                    // Repintar lista de selección lateral
                    const listContainer = document.getElementById('agents-selector-list');
                    if (listContainer) {
                        listContainer.innerHTML = this.renderAgentsSelectorList();
                    }

                    // Repintar editor de prompt derecho
                    const editorContainer = document.getElementById('agent-editor-container');
                    if (editorContainer) {
                        editorContainer.innerHTML = this.renderAgentEditor();
                    }
                }
                return;
            }

            // 3. Eliminación de agente lateral (click en el botón eliminar)
            const deleteBtn = e.target.closest('.btn-delete-agent-action');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const agentId = deleteBtn.getAttribute('data-delete-agent-id');
                this.confirmDeleteAgent(agentId);
                return;
            }

            // 4. Botón para crear nuevo agente ("Nuevo")
            const btnCreateTrigger = e.target.closest('#btn-trigger-create-agent');
            if (btnCreateTrigger) {
                e.preventDefault();
                this.showCreateAgentModal();
                return;
            }

            // 5. Botón para guardar reglas del agente activo
            const btnSaveAgent = e.target.closest('#btn-save-agent-settings');
            if (btnSaveAgent) {
                e.preventDefault();
                this.saveAgentSettings(btnSaveAgent);
                return;
            }

            // 6. Botón para guardar paleta de kaomojis
            const btnSaveKaomojis = e.target.closest('#btn-save-kaomojis-palette');
            if (btnSaveKaomojis) {
                e.preventDefault();
                this.saveKaomojisPalette(btnSaveKaomojis);
                return;
            }

            // 7. Botón para agregar kaomoji a una categoría
            const btnAddKao = e.target.closest('.btn-add-kao');
            if (btnAddKao) {
                e.preventDefault();
                const categoryKey = btnAddKao.getAttribute('data-category');
                const type = btnAddKao.getAttribute('data-type');
                this.addKaomoji(categoryKey, type);
                return;
            }

            // 8. Botón para eliminar un kaomoji individual
            const btnDeleteKao = e.target.closest('.btn-delete-kao');
            if (btnDeleteKao) {
                e.preventDefault();
                const card = btnDeleteKao.closest('.kaomoji-category-card');
                if (card) {
                    const categoryKey = card.getAttribute('data-category');
                    const type = card.getAttribute('data-type');
                    const idx = parseInt(btnDeleteKao.getAttribute('data-index'));
                    this.deleteKaomoji(categoryKey, type, idx);
                }
                return;
            }

            // 9. Botón para guardar reglas globales (Constitución)
            const btnSaveRules = e.target.closest('#btn-save-global-rules');
            if (btnSaveRules) {
                e.preventDefault();
                this.saveGlobalRulesSettings(btnSaveRules);
                return;
            }
        };

        // Escuchar el evento click en el contenedor de forma centralizada
        container.addEventListener('click', this.globalClickHandler);
    }

    /**
     * Guarda la configuración del agente activo (modelo y prompt).
     */
    static async saveAgentSettings(btnSave) {
        const modelSelect = document.getElementById('agent-model-select');
        const promptTextarea = document.getElementById('agent-prompt-textarea');
        if (!modelSelect || !promptTextarea) return;

        const selectedModel = modelSelect.value;
        const promptValue = promptTextarea.value;

        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando...';
        btnSave.disabled = true;

        try {
            const res = await ApiClient.saveAgent(this.activeAgentId, selectedModel, promptValue);
            if (res.success) {
                globalEventBus.emit('toast:show', {
                    message: `✓ Configuración del agente "${this.activeAgentId}" actualizada exitosamente en disco.`,
                    type: 'success'
                });
                
                // Actualizar en el estado local de memoria cacheada
                const agent = this.agents.find(a => a.id === this.activeAgentId);
                if (agent) {
                    agent.model = selectedModel;
                    agent.prompt = promptValue;
                }
            } else {
                throw new Error(res.error || 'Respuesta insatisfactoria de la API.');
            }
        } catch (err) {
            globalEventBus.emit('toast:show', {
                message: `❌ Error al escribir prompt en disco: ${err.message}`,
                type: 'error'
            });
        } finally {
            btnSave.innerHTML = '<span class="material-symbols-outlined fs-5">save</span>Guardar Reglas de Agente';
            btnSave.disabled = false;
        }
    }

    /**
     * Guarda la Constitución Lingüística (Reglas Globales) en disco físico.
     */
    static async saveGlobalRulesSettings(btnSave) {
        const rulesTextarea = document.getElementById('global-rules-textarea');
        if (!rulesTextarea) return;

        const updatedRules = rulesTextarea.value;

        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando Constitución...';
        btnSave.disabled = true;

        try {
            const res = await ApiClient.saveGlobalRules(updatedRules);
            if (res.success) {
                globalEventBus.emit('toast:show', {
                    message: '✓ Constitución Lingüística global guardada y consolidada en disco físico.',
                    type: 'success'
                });
                this.globalRulesContent = updatedRules;
            } else {
                throw new Error(res.error || 'Respuesta insatisfactoria de la API.');
            }
        } catch (err) {
            globalEventBus.emit('toast:show', {
                message: `❌ Error al escribir Constitución: ${err.message}`,
                type: 'error'
            });
        } finally {
            btnSave.innerHTML = '<span class="material-symbols-outlined fs-5">save</span>Guardar Constitución';
            btnSave.disabled = false;
        }
    }

    /**
     * Guarda la paleta oficial de Kaomojis literarios.
     */
    static async saveKaomojisPalette(btnSavePalette) {
        btnSavePalette.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Escribiendo en disco...';
        btnSavePalette.disabled = true;

        try {
            // Extraer los valores en vivo de los bloques contenteditable para enviarlos actualizados
            const categories = document.querySelectorAll('.kaomoji-category-card');
            categories.forEach(card => {
                const categoryKey = card.getAttribute('data-category');
                const type = card.getAttribute('data-type');
                
                const glyphSpans = card.querySelectorAll('.kao-glyph');
                const updatedList = Array.from(glyphSpans).map(span => span.innerText.trim()).filter(text => text !== '');

                if (type === 'physical') {
                    this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey] = updatedList;
                } else {
                    this.kaomojiPalette.matrix.emociones_personajes[categoryKey] = updatedList;
                }
            });

            const res = await ApiClient.saveKaomojis(this.kaomojiPalette);
            if (res.success) {
                globalEventBus.emit('toast:show', {
                    message: '✓ Matriz expresiva de Kaomojis guardada exitosamente en .config/palette_kaomojis.json.',
                    type: 'success'
                });
            } else {
                throw new Error(res.error || 'Fallo al escribir archivo.');
            }
        } catch (err) {
            globalEventBus.emit('toast:show', {
                message: `❌ Error al guardar paleta: ${err.message}`,
                type: 'error'
            });
        } finally {
            btnSavePalette.innerHTML = '<span class="material-symbols-outlined fs-5">check_circle</span>Guardar Paleta de Kaomojis';
            btnSavePalette.disabled = false;
        }
    }

    /**
     * Agrega un nuevo Kaomoji por defecto en la categoría especificada.
     */
    static addKaomoji(categoryKey, type) {
        const newKao = '(✿◠‿✿)'; // Kaomoji inicial por defecto
        
        if (type === 'physical') {
            if (!this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey]) {
                this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey] = [];
            }
            this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey].push(newKao);
        } else {
            if (!this.kaomojiPalette.matrix.emociones_personajes[categoryKey]) {
                this.kaomojiPalette.matrix.emociones_personajes[categoryKey] = [];
            }
            this.kaomojiPalette.matrix.emociones_personajes[categoryKey].push(newKao);
        }

        // Redibujar el panel de Kaomojis
        const panel = document.getElementById('settings-kaomojis-panel');
        if (panel) {
            panel.innerHTML = this.renderKaomojisPanel();
        }
    }

    /**
     * Elimina un Kaomoji específico de la categoría especificada por su índice.
     */
    static deleteKaomoji(categoryKey, type, idx) {
        if (type === 'physical') {
            this.kaomojiPalette.matrix.estados_fisicos_biologicos[categoryKey].splice(idx, 1);
        } else {
            this.kaomojiPalette.matrix.emociones_personajes[categoryKey].splice(idx, 1);
        }

        // Redibujar el panel de Kaomojis
        const panel = document.getElementById('settings-kaomojis-panel');
        if (panel) {
            panel.innerHTML = this.renderKaomojisPanel();
        }
    }

    /**
     * Limpieza atómica de referencias para higiene de memoria de Vanilla JS.
     */
    static destroy() {
        const container = document.getElementById(this.containerId);
        if (container && this.globalClickHandler) {
            container.removeEventListener('click', this.globalClickHandler);
        }
        this.globalClickHandler = null;
        this.agents = [];
        this.kaomojiPalette = null;
        console.log('[AgentSettingsView] Panel desmantelado y desmontado de memoria (0 leaks).');
    }
}

export default AgentSettingsView;
