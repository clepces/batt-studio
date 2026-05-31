/**
 * @file AgentFlowView.js
 * @description Vista modular e interactiva premium del Orquestador de Flujos de Agentes (No-Code Agent Flow) con estilo Gemini Dark.
 * Implementa un lienzo SVG con curvas de Bézier dinámicas, cuadrícula estilo blueprint, Glassmorphism, telemetría
 * WebSocket en tiempo real con pulsos de energía fluidos y panel lateral interactivo para inspección de cognition.
 * @author BATT Principal Automation Engineer
 */

import { ApiClient } from '../../../core/api/ApiClient.js';
import { globalEventBus } from '../../../core/eventBus/EventBus.js';
import { globalState } from '../../../core/state/State.js';

export class AgentFlowView {
    static containerId = null;
    static activeAgentId = null;
    static flowData = null;
    static agentsConfig = [];
    static activeProcesses = {}; // Almacena el estado en caliente de cada agente por id: { status, percent, chapter_id, error }
    static wsTelemetryUnsubscribe = null;
    static stateChangeUnsubscribe = null;

    // Posicionamiento de nodos en el lienzo para pantallas de escritorio (zigzag de 3x2)
    static desktopNodePositions = [
        { x: 120, y: 120 }, // 1. traductor-universal
        { x: 440, y: 120 }, // 2. corrector-lqa
        { x: 760, y: 120 }, // 3. localizador-cultural
        { x: 760, y: 380 }, // 4. extractor-historico
        { x: 440, y: 380 }, // 5. archivista-indexador
        { x: 120, y: 380 }  // 6. director-arcos
    ];

    /**
     * Renderiza e inicializa el Constructor Visual de Flujos de Agentes.
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
                        <span class="material-symbols-outlined text-danger fs-1 mb-3 animate-pulse">hub</span>
                        <p class="text-main fw-bold mb-2 fs-5">Orquestador de Flujos Desconectado</p>
                        <p class="text-muted small max-width-md mx-auto mb-4">
                            No es posible renderizar el lienzo de flujos de agentes ni ver las conexiones en tiempo real si el servidor puente está desconectado (Puerto 3000).
                        </p>
                        <div class="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-body border-theme text-muted font-mono" style="font-size: 11px;">
                            <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
                            <span>Esperando reconexión del servidor...</span>
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
                    <span class="small">Iniciando lienzo interactivo y cargando secuencia de .config/agent_studio_flow.json...</span>
                </div>
            `;

            // 1. Cargar el JSON del flujo y los agentes del disco
            const [flowRes, agentsRes] = await Promise.all([
                ApiClient.getFlowSequence().catch(() => null),
                ApiClient.getAgents().catch(() => ({ agents: [] }))
            ]);

            this.flowData = flowRes || this.getFallbackFlow();
            this.agentsConfig = agentsRes.agents || [];

            // Por defecto, seleccionar el primer agente del flujo para ver sus detalles en el panel derecho
            if (!this.activeAgentId && this.flowData.pipeline_sequence.length > 0) {
                this.activeAgentId = this.flowData.pipeline_sequence[0].agent_id;
            }

            // 2. Renderizar interfaz principal estructurada
            this.renderLayout(container);

            // 3. Dibujar las conexiones del diagrama de flujo (curvas Bézier en SVG)
            this.drawFlowDiagram();

            // 4. Registrar escuchadores de eventos interactivos y telemetría WebSocket
            this.setupEventListeners();
            this.setupTelemetrySubscriber();

        } catch (err) {
            container.innerHTML = `
                <div class="alert alert-danger d-flex align-items-center gap-2 rounded-3 py-3 px-4 border-0 error-glow-banner">
                    <span class="material-symbols-outlined text-danger">error</span>
                    <span class="text-danger small fw-semibold">Error al cargar Orquestador de Flujos: ${err.message}</span>
                </div>
            `;
        }
    }

    /**
     * Layout base con estilo premium de Google AI Studio / Gemini Dark.
     */
    static renderLayout(container) {
        container.innerHTML = `
            <style>
                /* Estilo del lienzo estilo blueprint */
                .flow-canvas-wrapper {
                    position: relative;
                    width: 100%;
                    height: 560px;
                    background-color: #0b0d14;
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
                    background-size: 20px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.5);
                }
                .flow-svg-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                }
                .flow-nodes-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 2;
                }
                /* Nodos con Glassmorphism y bordes iluminados */
                .flow-node-card {
                    position: absolute;
                    width: 250px;
                    background: rgba(25, 28, 41, 0.7);
                    backdrop-filter: blur(8px);
                    border: 1.5px solid rgba(255, 255, 255, 0.06);
                    border-radius: 10px;
                    padding: 12px 14px;
                    color: var(--color-text-main);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    user-select: none;
                }
                .flow-node-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(0, 210, 255, 0.3);
                    box-shadow: 0 8px 25px rgba(0, 210, 255, 0.15);
                }
                .flow-node-card.active-inspection {
                    border-color: #00d2ff;
                    box-shadow: 0 0 20px rgba(0, 210, 255, 0.2);
                    background: rgba(0, 210, 255, 0.03);
                }
                .flow-node-card.processing {
                    border-color: #f59e0b;
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
                    background: rgba(245, 158, 11, 0.02);
                    animation: flow-node-pulse 2s infinite ease-in-out;
                }
                .flow-node-card.completed {
                    border-color: #10b981;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
                }
                .flow-node-card.error {
                    border-color: #ef4444;
                    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
                    animation: flow-node-error-shake 0.5s ease-in-out;
                }
                @keyframes flow-node-pulse {
                    0%, 100% { transform: scale(1); border-color: rgba(245, 158, 11, 0.5); }
                    50% { transform: scale(1.02); border-color: rgba(245, 158, 11, 0.9); }
                }
                @keyframes flow-node-error-shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-4px); }
                    40%, 80% { transform: translateX(4px); }
                }
                /* Conector Bézier glow */
                .flow-bezier-wire {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.08);
                    stroke-width: 2.5;
                    transition: all 0.5s ease;
                }
                .flow-bezier-wire.active-wire {
                    stroke: url(#gemini-glow-grad);
                    stroke-width: 3.5;
                    filter: drop-shadow(0 0 8px rgba(0, 210, 255, 0.5));
                }
                .flow-bezier-wire.completed-wire {
                    stroke: #10b981;
                    stroke-width: 2.5;
                    opacity: 0.6;
                }
            </style>

            <div class="agent-flow-dashboard-wrapper animate-fade-in">
                <!-- Encabezado del Orquestador -->
                <div class="d-flex justify-content-between align-items-center gap-3 border-bottom-theme pb-3 mb-4 flex-wrap">
                    <div>
                        <h2 class="fs-4 fw-bold text-main m-0 d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined text-primary fs-3">hub</span>
                            Constructor de Flujos de Agentes (No-Code Flow)
                        </h2>
                        <p class="text-muted small m-0">Supervise visualmente el procesamiento literario secuencial de los 6 agentes de BATT.</p>
                    </div>
                    <div class="d-flex gap-2.5 align-items-center">
                        <span class="badge rounded-pill bg-dark-subtle text-primary border border-primary-subtle font-mono px-2.5 py-1" style="font-size: 11px;">
                            ${this.flowData.pipeline_name} v${this.flowData.version}
                        </span>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5" id="btn-reset-flow-ui">
                            <span class="material-symbols-outlined" style="font-size: 14px;">sync</span>
                            Refrescar Lienzo
                        </button>
                    </div>
                </div>

                <div class="row g-4">
                    <!-- Columna Izquierda: Lienzo de Dibujo del Grafo -->
                    <div class="col-12 col-xxl-9">
                        <div class="flow-canvas-wrapper" id="flow-canvas-parent">
                            <!-- Lienzo SVG para dibujar los cables de conexión Bézier -->
                            <svg class="flow-svg-canvas" id="flow-svg-canvas-el">
                                <defs>
                                    <!-- Gradiente para el cable activo -->
                                    <linearGradient id="gemini-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#00d2ff" />
                                        <stop offset="50%" stop-color="#3b82f6" />
                                        <stop offset="100%" stop-color="#8b5cf6" />
                                    </linearGradient>
                                    <!-- Flecha indicadora de dirección de flujo -->
                                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="rgba(255, 255, 255, 0.15)"/>
                                    </marker>
                                    <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#00d2ff"/>
                                    </marker>
                                    <marker id="arrow-completed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#10b981"/>
                                    </marker>
                                </defs>
                                <g id="flow-svg-wires-group"></g>
                            </svg>

                            <!-- Contenedor HTML Flotante para los Nodos de Agente -->
                            <div class="flow-nodes-container" id="flow-nodes-container-el">
                                ${this.renderNodeCards()}
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Panel de Inspección Lateral de Cognición -->
                    <div class="col-12 col-xxl-3" id="flow-inspection-panel">
                        ${this.renderInspectionPanel()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza las tarjetas de los nodos flotantes basándose en el pipeline_sequence.
     */
    static renderNodeCards() {
        const sequence = this.flowData.pipeline_sequence;
        return sequence.map((step, idx) => {
            const pos = this.desktopNodePositions[idx] || { x: 50 + idx * 100, y: 150 };
            const isActive = step.agent_id === this.activeAgentId;
            const liveState = this.activeProcesses[step.agent_id] || { status: 'idle', percent: 0 };
            
            let statusClass = '';
            if (liveState.status === 'processing') statusClass = 'processing';
            else if (liveState.status === 'completed') statusClass = 'completed';
            else if (liveState.status === 'error') statusClass = 'error';

            const activeClass = isActive ? 'active-inspection' : '';
            const formattedName = step.agent_id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const configAgent = this.agentsConfig.find(a => a.id === step.agent_id) || {};
            const shortModel = configAgent.model ? configAgent.model.replace('gemini-', '') : '1.5-flash';

            // Determinar íconos estéticos para cada tipo de agente
            let icon = 'smart_toy';
            if (step.agent_id === 'traductor-universal') icon = 'translate';
            else if (step.agent_id === 'corrector-lqa') icon = 'spellcheck';
            else if (step.agent_id === 'localizador-cultural') icon = 'language';
            else if (step.agent_id === 'extractor-historico') icon = 'manage_search';
            else if (step.agent_id === 'archivista-indexador') icon = 'book_5';
            else if (step.agent_id === 'director-arcos') icon = 'movie';

            return `
                <div class="flow-node-card ${statusClass} ${activeClass}" 
                     id="node-card-${step.agent_id}" 
                     data-node-agent-id="${step.agent_id}" 
                     style="left: ${pos.x}px; top: ${pos.y}px;">
                    
                    <div class="d-flex align-items-center justify-content-between mb-1.5">
                        <span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle font-mono text-uppercase" style="font-size: 8.5px; font-weight: 700;">
                            Paso ${step.step}
                        </span>
                        <span class="badge rounded-pill bg-dark-subtle text-muted border border-theme text-monospace" style="font-size: 8.5px;">
                            ${shortModel}
                        </span>
                    </div>

                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-primary fs-5">${icon}</span>
                        <span class="fw-bold text-main text-truncate small" style="letter-spacing: -0.1px;">${formattedName}</span>
                    </div>

                    <!-- Pequeño bar de telemetría de progreso interior -->
                    <div class="flow-node-progress-bar-container bg-dark rounded overflow-hidden" style="height: 4px; width: 100%;">
                        <div class="flow-node-progress-fill transition-all" 
                             id="node-fill-${step.agent_id}"
                             style="height: 100%; width: ${liveState.percent || (liveState.status === 'completed' ? 100 : 0)}%; background: ${liveState.status === 'error' ? '#ef4444' : liveState.status === 'completed' ? '#10b981' : '#00d2ff'};">
                        </div>
                    </div>

                    <div class="d-flex align-items-center justify-content-between mt-1.5 font-mono" style="font-size: 9px;">
                        <span class="text-muted text-uppercase" id="node-status-text-${step.agent_id}">${liveState.status.toUpperCase()}</span>
                        <span class="text-primary fw-bold" id="node-percent-text-${step.agent_id}">${liveState.percent ? liveState.percent + '%' : liveState.status === 'completed' ? '100%' : '0%'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Dibuja los cables conectores con curvas Bézier sutiles.
     */
    static drawFlowDiagram() {
        const svgGroup = document.getElementById('flow-svg-wires-group');
        if (!svgGroup) return;

        svgGroup.innerHTML = ''; // Limpiar cables anteriores

        const sequence = this.flowData.pipeline_sequence;
        for (let i = 0; i < sequence.length - 1; i++) {
            const stepFrom = sequence[i];
            const stepTo = sequence[i + 1];

            const posFrom = this.desktopNodePositions[i];
            const posTo = this.desktopNodePositions[i + 1];

            if (!posFrom || !posTo) continue;

            // El punto de salida es la derecha (o el centro) del nodo From
            // El punto de entrada es la izquierda (o el centro) del nodo To
            // Ancho del nodo es 250px, alto es ~86px
            let x1 = posFrom.x + 250;
            let y1 = posFrom.y + 43;

            let x2 = posTo.x;
            let y2 = posTo.y + 43;

            // Si es la conexión de bajada (de 3 a 4, que están en la misma columna)
            if (i === 2) {
                x1 = posFrom.x + 125;
                y1 = posFrom.y + 86;

                x2 = posTo.x + 125;
                y2 = posTo.y;
            }

            // Si es conexión hacia la izquierda (retorno de 4 a 5 y de 5 a 6)
            if (i >= 3) {
                x1 = posFrom.x;
                y1 = posFrom.y + 43;

                x2 = posTo.x + 250;
                y2 = posTo.y + 43;
            }

            // Calcular la trayectoria de la curva Bézier
            const pathData = this.calculateBezierPath(x1, y1, x2, y2, i);

            // Determinar estado de la conexión según los estados de procesamiento activos
            const stateFrom = this.activeProcesses[stepFrom.agent_id] || { status: 'idle' };
            const stateTo = this.activeProcesses[stepTo.agent_id] || { status: 'idle' };

            let wireClass = 'flow-bezier-wire';
            let marker = 'url(#arrow)';

            if (stateFrom.status === 'processing' || stateTo.status === 'processing') {
                wireClass = 'flow-bezier-wire active-wire';
                marker = 'url(#arrow-active)';
            } else if (stateFrom.status === 'completed' && stateTo.status === 'completed') {
                wireClass = 'flow-bezier-wire completed-wire';
                marker = 'url(#arrow-completed)';
            }

            // Crear el cable de conexión SVG
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', pathData);
            pathEl.setAttribute('class', wireClass);
            pathEl.setAttribute('marker-end', marker);
            pathEl.setAttribute('id', `wire-${stepFrom.agent_id}-to-${stepTo.agent_id}`);

            svgGroup.appendChild(pathEl);

            // Inyectar un pulso de luz animado dinámico si el canal está activo (procesándose)
            if (stateFrom.status === 'processing' || (stateFrom.status === 'completed' && stateTo.status === 'processing')) {
                const pulseEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                pulseEl.setAttribute('r', '5');
                pulseEl.setAttribute('fill', '#00d2ff');
                pulseEl.setAttribute('filter', 'drop-shadow(0 0 6px #00d2ff)');

                const animateEl = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
                animateEl.setAttribute('dur', '1.8s');
                animateEl.setAttribute('repeatCount', 'indefinite');
                animateEl.setAttribute('path', pathData);

                pulseEl.appendChild(animateEl);
                svgGroup.appendChild(pulseEl);
            }
        }
    }

    /**
     * Calcula la curva de Bézier según la orientación de la conexión para evitar quiebres.
     */
    static calculateBezierPath(x1, y1, x2, y2, index) {
        // Conexión vertical descendente (Paso 3 a Paso 4)
        if (index === 2) {
            const dy = Math.abs(y2 - y1) * 0.5;
            return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
        }
        // Conexiones horizontales (izquierda a derecha o derecha a izquierda)
        const dx = Math.abs(x2 - x1) * 0.5;
        if (x1 < x2) {
            // Izquierda a derecha
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        } else {
            // Derecha a izquierda (línea de retorno inferior)
            return `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
        }
    }

    /**
     * Renderiza el panel de inspección lateral para el agente seleccionado.
     */
    static renderInspectionPanel() {
        const step = this.flowData.pipeline_sequence.find(s => s.agent_id === this.activeAgentId);
        if (!step) {
            return `
                <div class="card-premium p-4 rounded-4 text-center text-muted" style="height: 100%;">
                    <span class="material-symbols-outlined fs-2 mb-2">info</span>
                    <p class="small m-0">Seleccione un nodo del flujo para inspeccionar su cognición en vivo.</p>
                </div>
            `;
        }

        const formattedName = step.agent_id
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const configAgent = this.agentsConfig.find(a => a.id === step.agent_id) || {};
        const liveState = this.activeProcesses[step.agent_id] || { status: 'idle', percent: 0, chapter_id: '--' };

        return `
            <div class="card-premium p-4 rounded-4 border border-theme d-flex flex-column gap-4 animate-fade-in" style="height: 100%; background: var(--color-bg-card);">
                <!-- Cabecera del Panel -->
                <div class="border-bottom-theme pb-2.5">
                    <div class="d-flex align-items-center justify-content-between mb-1">
                        <span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle font-mono" style="font-size: 10px;">
                            COGNITION INSPECTOR
                        </span>
                        <span class="badge rounded-pill bg-success-subtle text-success" style="font-size: 9px; font-weight: 700;">
                            PASO ${step.step}
                        </span>
                    </div>
                    <h3 class="fs-5 fw-bold text-main m-0">${formattedName}</h3>
                    <code class="text-muted small">${step.agent_id}</code>
                </div>

                <!-- Detalles Técnicos de Entrada/Salida -->
                <div class="d-flex flex-column gap-3 font-mono" style="font-size: 11px;">
                    <div>
                        <span class="text-muted d-block text-uppercase small" style="font-size: 8.5px; font-weight: 700;">Rol del Pipeline</span>
                        <span class="text-main fw-semibold">${step.role}</span>
                    </div>
                    <div>
                        <span class="text-muted d-block text-uppercase small" style="font-size: 8.5px; font-weight: 700;">Modelo routed</span>
                        <span class="badge rounded-pill bg-dark-subtle text-primary border border-primary-subtle py-1 px-2.5 mt-1">
                            ${configAgent.model || 'gemini-1.5-flash'}
                        </span>
                    </div>
                    <div class="border-top-theme pt-2.5">
                        <span class="text-muted d-block text-uppercase small" style="font-size: 8.5px; font-weight: 700;">Archivo Origen / Entrada</span>
                        <span class="text-main text-truncate d-block mt-0.5" title="${step.input_path}">
                            <span class="material-symbols-outlined fs-6 text-muted me-1.5 align-middle">folder_open</span>
                            <code>${step.input_path}</code>
                        </span>
                    </div>
                    <div>
                        <span class="text-muted d-block text-uppercase small" style="font-size: 8.5px; font-weight: 700;">Destino de Salida</span>
                        <span class="text-main text-truncate d-block mt-0.5" title="${step.output_path || step.targets?.join(', ')}">
                            <span class="material-symbols-outlined fs-6 text-muted me-1.5 align-middle">task</span>
                            <code>${step.output_path || step.targets?.join(', ')}</code>
                        </span>
                    </div>
                </div>

                <!-- Estado del Proceso en Caliente -->
                <div class="border-top-theme pt-3.5">
                    <h4 class="fs-7 fw-bold text-main mb-3 d-flex align-items-center gap-1.5">
                        <span class="material-symbols-outlined text-primary fs-5 animate-pulse">sensors</span>
                        Telemetría en Vivo
                    </h4>
                    <div class="p-3 bg-surface rounded-3 border border-theme d-flex flex-column gap-2.5">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted small">Capítulo Activo:</span>
                            <span class="text-main fw-bold font-mono small">${liveState.chapter_id || '--'}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted small">Estado:</span>
                            <span class="badge rounded-pill ${liveState.status === 'processing' ? 'bg-warning-subtle text-warning' : liveState.status === 'completed' ? 'bg-success-subtle text-success' : 'bg-dark-subtle text-muted'} text-uppercase font-mono" style="font-size: 9px;">
                                ${liveState.status}
                            </span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted small">Progreso:</span>
                            <span class="text-primary fw-bold font-mono small">${liveState.percent ? liveState.percent + '%' : liveState.status === 'completed' ? '100%' : '0%'}</span>
                        </div>
                    </div>

                    ${liveState.error ? `
                        <div class="alert alert-danger mt-3 p-2.5 rounded-3 d-flex align-items-start gap-1.5 border-0 font-mono" style="font-size: 10px;">
                            <span class="material-symbols-outlined text-danger fs-6 mt-0.5">error</span>
                            <div class="overflow-hidden">
                                <span class="fw-bold d-block text-danger">EXCEPCIÓN EN EL NODO:</span>
                                <span class="text-danger small word-break">${liveState.error}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Botón de acceso directo a sus reglas de prompts -->
                <button class="btn btn-sm btn-outline-primary rounded-pill py-2 w-100 d-flex align-items-center justify-content-center gap-1.5 mt-auto" id="btn-inspect-go-rules" data-go-agent-id="${step.agent_id}">
                    <span class="material-symbols-outlined" style="font-size: 15px;">terminal</span>
                    Calibrar Prompt del Agente
                </button>
            </div>
        `;
    }

    /**
     * Enlaza los escuchadores de clicks interactivos utilizando delegación de eventos para higiene de memoria.
     */
    static setupEventListeners() {
        const parent = document.getElementById('flow-canvas-parent');
        if (!parent) return;

        // Delegación de clicks en los nodos flotantes
        this.canvasClickHandler = (e) => {
            const card = e.target.closest('.flow-node-card');
            if (card) {
                e.preventDefault();
                const agentId = card.getAttribute('data-node-agent-id');
                this.activeAgentId = agentId;

                // Quitar clase activa a todas las tarjetas y añadirla a la seleccionada
                parent.querySelectorAll('.flow-node-card').forEach(c => c.classList.remove('active-inspection'));
                card.classList.add('active-inspection');

                // Repintar el panel de inspección lateral derecho
                const panel = document.getElementById('flow-inspection-panel');
                if (panel) {
                    panel.innerHTML = this.renderInspectionPanel();
                }
            }
        };

        parent.addEventListener('click', this.canvasClickHandler);

        // Botón de refrescar lienzo
        const btnReset = document.getElementById('btn-reset-flow-ui');
        if (btnReset) {
            btnReset.addEventListener('click', (e) => {
                e.preventDefault();
                globalEventBus.emit('toast:show', { message: 'Lienzo SVG de flujos reinicializado.', type: 'info' });
                this.render(this.containerId);
            });
        }

        // Delegación de click en el botón de "Calibrar Prompt del Agente" del panel de inspección
        const inspectionWrapper = document.getElementById('flow-inspection-panel');
        if (inspectionWrapper) {
            this.inspectButtonHandler = (e) => {
                const btn = e.target.closest('#btn-inspect-go-rules');
                if (btn) {
                    e.preventDefault();
                    const agentId = btn.getAttribute('data-go-agent-id');
                    
                    // Seteamos el ID del agente activo en el gestor y conmutamos la pestaña
                    import('./AgentSettingsView.js').then(module => {
                        module.default.activeAgentId = agentId;
                        module.default.activeSubTab = 'agents';
                        globalState.set({ activeTab: 'agents' });
                    });
                }
            };
            inspectionWrapper.addEventListener('click', this.inspectButtonHandler);
        }
    }

    /**
     * Se subscribe al EventBus del WebSocket para capturar el progreso en vivo de la telemetría del agente.
     */
    static setupTelemetrySubscriber() {
        // Suscribirse a las actualizaciones asíncronas AGENT_TELEMETRY que viajan por el bus
        this.wsTelemetryUnsubscribe = globalEventBus.on('ws:agent_telemetry', (data) => {
            const { agent_id, status, percent, chapter_id, error } = data;

            // Actualizar el estado temporal de memoria de procesos
            this.activeProcesses[agent_id] = {
                status: status,
                percent: percent,
                chapter_id: chapter_id,
                error: error
            };

            // 1. Actualizar visualmente la tarjeta de nodo específica del DOM en caliente sin redibujar todo
            const nodeEl = document.getElementById(`node-card-${agent_id}`);
            if (nodeEl) {
                // Remover clases de estado anteriores
                nodeEl.classList.remove('processing', 'completed', 'error');
                
                if (status === 'processing') nodeEl.classList.add('processing');
                else if (status === 'completed') nodeEl.classList.add('completed');
                else if (status === 'error') nodeEl.classList.add('error');

                // Actualizar barra de progreso interna
                const fillEl = document.getElementById(`node-fill-${agent_id}`);
                if (fillEl) {
                    fillEl.style.width = `${percent}%`;
                    fillEl.style.background = status === 'error' ? '#ef4444' : status === 'completed' ? '#10b981' : '#00d2ff';
                }

                // Actualizar textos de estado y porcentaje
                const statusTxt = document.getElementById(`node-status-text-${agent_id}`);
                const percentTxt = document.getElementById(`node-percent-text-${agent_id}`);
                if (statusTxt) statusTxt.innerText = status.toUpperCase();
                if (percentTxt) percentTxt.innerText = `${percent}%`;
            }

            // 2. Redibujar las conexiones Bézier para reflejar flujos y glow activos
            this.drawFlowDiagram();

            // 3. Si el agente que se actualizó es el que se está inspeccionando actualmente, repintar el panel lateral
            if (agent_id === this.activeAgentId) {
                const panel = document.getElementById('flow-inspection-panel');
                if (panel) {
                    panel.innerHTML = this.renderInspectionPanel();
                }
            }
        });

        // Suscribirse a cambios generales para resetear estados al cambiar de novela
        this.stateChangeUnsubscribe = globalEventBus.on('state:activeNovelId', () => {
            // Limpiar estados de progreso acumulados del proyecto anterior
            this.activeProcesses = {};
            this.render(this.containerId);
        });
    }

    /**
     * Devuelve una secuencia de flujo fallback preconfigurada por si falla la lectura de disco.
     */
    static getFallbackFlow() {
        return {
            "pipeline_name": "BATT Agentic Sequential Flow",
            "version": "1.0.0",
            "pipeline_sequence": [
                { "step": 1, "agent_id": "traductor-universal", "role": "Traducción literal directa de origen a borrador crudo", "input_path": "01_origen/{chapter_id}.txt", "output_path": "02_crudo/{chapter_id}_crudo.txt" },
                { "step": 2, "agent_id": "corrector-lqa", "role": "Aplicación de reglas ortotípicas, tono divino e inyección de Kaomojis", "input_path": "02_crudo/{chapter_id}_crudo.txt", "output_path": "02_crudo/{chapter_id}_lqa.txt" },
                { "step": 3, "agent_id": "localizador-cultural", "role": "Conversión de formatos regionales, Pinyin y empaquetado final", "input_path": "02_crudo/{chapter_id}_lqa.txt", "output_path": "03_final/Volumen_{current_volume}/{chapter_id}_final.md" },
                { "step": 4, "agent_id": "extractor-historico", "role": "Minería incremental de entidades, personajes y ubicaciones geográficas", "input_path": "03_final/Volumen_{current_volume}/{chapter_id}_final.md", "targets": ["bases_datos/glosario_elenco.md", "bases_datos/mapa_geografia.md"] },
                { "step": 5, "agent_id": "archivista-indexador", "role": "Indexación jerárquica del nodo y resumen de 3 líneas", "input_path": "03_final/Volumen_{current_volume}/{chapter_id}_final.md", "targets": ["bases_datos/indice_cronologico.md"] },
                { "step": 6, "agent_id": "director-arcos", "role": "Mantenimiento del progreso y sincronización de paneles de control", "input_path": "bases_datos/indice_cronologico.md", "targets": ["bases_datos/control_progreso.json", "dashboard_global.md"] }
            ]
        };
    }

    /**
     * Desmantela la vista de flujos de la memoria limpiando timers, callbacks, y suscripciones del bus de eventos.
     */
    static destroy() {
        // Remover listeners de clicks
        const parent = document.getElementById('flow-canvas-parent');
        if (parent && this.canvasClickHandler) {
            parent.removeEventListener('click', this.canvasClickHandler);
        }
        const inspectionWrapper = document.getElementById('flow-inspection-panel');
        if (inspectionWrapper && this.inspectButtonHandler) {
            inspectionWrapper.removeEventListener('click', this.inspectButtonHandler);
        }

        // Cancelar suscripciones asíncronas del EventBus
        if (this.wsTelemetryUnsubscribe) {
            this.wsTelemetryUnsubscribe();
            this.wsTelemetryUnsubscribe = null;
        }
        if (this.stateChangeUnsubscribe) {
            this.stateChangeUnsubscribe();
            this.stateChangeUnsubscribe = null;
        }

        this.canvasClickHandler = null;
        this.inspectButtonHandler = null;
        this.flowData = null;
        this.agentsConfig = [];
        console.log('[AgentFlowView] Lienzo del Orquestador desmontado de memoria y liberado (0 leaks).');
    }
}

export default AgentFlowView;
