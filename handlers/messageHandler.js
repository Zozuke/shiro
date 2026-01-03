onst fs = require('fs-extra');
const stringSimilarity = require('string-similarity');
const chalk = require('chalk');

class MessageHandler {
    constructor() {
        this.responses = this.loadResponses();
        this.messageHistory = new Map();
        this.similarityThreshold = 0.6;
        this.maxHistory = 100;
    }

    loadResponses() {
        try {
            if (fs.existsSync('./respuestas.json')) {
                const data = fs.readJsonSync('./respuestas.json');
                console.log(chalk.green('✅ respuestas.json cargado:'));
                console.log(chalk.cyan(`   └── ${Object.keys(data.intenciones || {}).length} intenciones`));
                console.log(chalk.cyan(`   └── ${Object.keys(data.global_vars || {}).length} variables globales`));
                return data;
            }
        } catch (error) {
            console.error(chalk.red('❌ Error cargando respuestas.json:'), error);
        }

        // Estructura por defecto
        return {
            global_vars: {},
            intenciones: {}
        };
    }

    reloadResponses() {
        this.responses = this.loadResponses();
        return this.responses;
    }

    extractText(message) {
        if (message.message?.conversation) {
            return message.message.conversation.toLowerCase().trim();
        }
        if (message.message?.extendedTextMessage?.text) {
            return message.message.extendedTextMessage.text.toLowerCase().trim();
        }
        return '';
    }

    // Coincidencia por similitud
    findBestMatch(text, patterns) {
        if (!text || !patterns || patterns.length === 0) return null;

        const matches = stringSimilarity.findBestMatch(text, patterns);
        const bestMatch = matches.bestMatch;

        if (bestMatch.rating >= this.similarityThreshold) {
            return {
                pattern: bestMatch.target,
                similarity: bestMatch.rating,
                index: matches.bestMatchIndex
            };
        }

        return null;
    }

    // Encontrar intención que coincida
    findMatchingIntent(text) {
        if (!text) return null;

        let bestIntent = null;
        let highestSimilarity = 0;

        // Buscar en todas las intenciones
        for (const [intentName, intent] of Object.entries(this.responses.intenciones)) {
            const match = this.findBestMatch(text, intent.patterns);

            if (match && match.similarity > highestSimilarity) {
                highestSimilarity = match.similarity;
                bestIntent = {
                    name: intentName,
                    data: intent,
                    match: match
                };
            }
        }

        return bestIntent;
    }

    // Reemplazar variables en plantilla
    replaceVariables(template, localVars = {}) {
        let result = template;

        // Reemplazar variables globales
        for (const [varName, varValues] of Object.entries(this.responses.global_vars)) {
            if (Array.isArray(varValues) && varValues.length > 0) {
                const randomValue = varValues[Math.floor(Math.random() * varValues.length)];
                const regex = new RegExp(`\\\${${varName}}`, 'gi');
                result = result.replace(regex, randomValue);
            }
        }

        // Reemplazar variables locales
        if (localVars) {
            for (const [varName, varValues] of Object.entries(localVars)) {
                if (Array.isArray(varValues) && varValues.length > 0) {
                    const randomValue = varValues[Math.floor(Math.random() * varValues.length)];
                    const regex = new RegExp(`\\\${${varName}}`, 'gi');
                    result = result.replace(regex, randomValue);
                }
            }
        }

        return result;
    }

    // Generar respuesta
    generateResponse(intent) {
        if (!intent || !intent.data.plantilla || intent.data.plantilla.length === 0) {
            return null;
        }

        // Seleccionar plantilla aleatoria
        const template = intent.data.plantilla[
            Math.floor(Math.random() * intent.data.plantilla.length)
        ];

        // Reemplazar variables
        let response = this.replaceVariables(template, intent.data.variables);

        // Agregar información de coincidencia (opcional, para debug)
        if (this.responses.debug) {
            response += `\n\n[Coincidencia: ${(intent.match.similarity * 100).toFixed(1)}% con "${intent.match.pattern}"]`;
        }

        return response;
    }

    async processMessage(message, sock) {
        try {
            const text = this.extractText(message);
            if (!text) return;

            const jid = message.key.remoteJid;
            const sender = message.key.participant || jid;

            console.log(chalk.cyan(`📩 Mensaje de ${jid.split('@')[0]}: ${text}`));

            // Manejar comandos especiales
            if (text.startsWith('!')) {
                await this.handleCommand(text, message, sock);
                return;
            }

            // Buscar intención que coincida
            const intent = this.findMatchingIntent(text);

            if (intent) {
                console.log(chalk.green(`   🎯 Intención: ${intent.name} (${(intent.match.similarity * 100).toFixed(1)}%)`));

                const response = this.generateResponse(intent);

                if (response) {
                    await sock.sendMessage(jid, { text: response });
                    console.log(chalk.green(`   💬 Respuesta enviada`));
                }
            } else {
                // Respuesta por defecto si no hay coincidencia
                if (text.includes('hola') || text.includes('buenas')) {
                    await sock.sendMessage(jid, {
                        text: '¡Hola! Soy un bot inteligente. ¿En qué puedo ayudarte?'
                    });
                }
            }

            // Guardar en historial
            this.saveToHistory(jid, text);

        } catch (error) {
            console.error(chalk.red('❌ Error procesando mensaje:'), error);
        }
    }

    async handleCommand(command, message, sock) {
        const jid = message.key.remoteJid;
        const args = command.split(' ');
        const cmd = args[0].toLowerCase();

        switch (cmd) {
            case '!actualizar':
            case '!reload':
                this.reloadResponses();
                await sock.sendMessage(jid, {
                    text: '✅ respuestas.json recargado exitosamente!'
                });
                break;

            case '!estado':
            case '!status':
                const statusText = `📊 Estado del Bot:\n` +
                    `├── Intenciones: ${Object.keys(this.responses.intenciones).length}\n` +
                    `├── Variables globales: ${Object.keys(this.responses.global_vars).length}\n` +
                    `├── Coincidencia mínima: ${(this.similarityThreshold * 100).toFixed(0)}%\n` +
                    `└── Total patrones: ${this.countAllPatterns()}`;
                await sock.sendMessage(jid, { text: statusText });
                break;

            case '!ayuda':
            case '!help':
                const helpText = `🤖 Comandos disponibles:\n` +
                    `├── !actualizar - Recargar respuestas.json\n` +
                    `├── !estado - Ver estadísticas del bot\n` +
                    `├── !ayuda - Mostrar esta ayuda\n` +
                    `├── !test [texto] - Probar coincidencia\n` +
                    `└── !debug [on/off] - Modo depuración`;
                await sock.sendMessage(jid, { text: helpText });
                break;

            case '!test':
                const testText = args.slice(1).join(' ');
                if (testText) {
                    const intent = this.findMatchingIntent(testText);
                    if (intent) {
                        const testResult = `✅ Coincidencia encontrada:\n` +
                            `├── Intención: ${intent.name}\n` +
                            `├── Patrón: "${intent.match.pattern}"\n` +
                            `└── Similitud: ${(intent.match.similarity * 100).toFixed(1)}%`;
                        await sock.sendMessage(jid, { text: testResult });
                    } else {
                        await sock.sendMessage(jid, {
                            text: `❌ No se encontró coincidencia para: "${testText}"`
                        });
                    }
                }
                break;

            case '!debug':
                const debugMode = args[1];
                this.responses.debug = debugMode === 'on';
                await sock.sendMessage(jid, {
                    text: `🔧 Modo depuración: ${this.responses.debug ? 'ACTIVADO' : 'DESACTIVADO'}`
                });
                break;
        }
    }

    countAllPatterns() {
        let total = 0;
        for (const intent of Object.values(this.responses.intenciones)) {
            total += (intent.patterns || []).length;
        }
        return total;
    }

    saveToHistory(jid, text) {
        if (!this.messageHistory.has(jid)) {
            this.messageHistory.set(jid, []);
        }

        const history = this.messageHistory.get(jid);
        history.push({
            text: text,
            timestamp: Date.now()
        });

        // Limitar historial
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }
}

module.exports = MessageHandler;
