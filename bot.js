const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Importar manejador de mensajes
const MessageHandler = require('./handlers/messageHandler');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.authState = null;
        this.messageHandler = new MessageHandler();
        this.isConnected = false;
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync('./config.json')) {
                return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }

        return {
            prefix: '!',
            admins: [],
            autoReply: true,
            similarityThreshold: 0.6,
            maxResponses: 5
        };
    }

    async connect() {
        try {
            console.log(chalk.blue('🚀 Iniciando bot de WhatsApp...'));

            // Cargar estado de autenticación
            const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

            // Crear socket
            this.sock = makeWASocket({
                auth: state,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false
            });

            // Guardar credenciales cuando se actualicen
            this.sock.ev.on('creds.update', saveCreds);

            // Evento QR
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log(chalk.yellow('📱 Escanea este código QR con WhatsApp:'));
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== 401;
                    console.log(chalk.red('⚠️  Conexión cerrada, reconectando...'));

                    if (shouldReconnect) {
                        setTimeout(() => this.connect(), 3000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    console.log(chalk.green('✅ Bot conectado exitosamente!'));
                    this.showBotInfo();
                }
            });

            // Evento de mensajes
            this.sock.ev.on('messages.upsert', async (m) => {
                const message = m.messages[0];

                // Ignorar mensajes propios y sin contenido
                if (!message.message || message.key.fromMe) return;

                try {
                    await this.messageHandler.processMessage(message, this.sock);
                } catch (error) {
                    console.error(chalk.red('Error procesando mensaje:'), error);
                }
            });

            // Evento de recepción de mensajes
            this.sock.ev.on('messages.reaction', (reaction) => {
                console.log(chalk.cyan('Reacción recibida:'), reaction);
            });

        } catch (error) {
            console.error(chalk.red('❌ Error al conectar:'), error);
            setTimeout(() => this.connect(), 5000);
        }
    }

    showBotInfo() {
        console.log(chalk.cyan('\n📊 Información del Bot:'));
        console.log(chalk.cyan('├── Respuestas cargadas:', Object.keys(this.messageHandler.responses.intenciones).length));
        console.log(chalk.cyan('├── Variables globales:', Object.keys(this.messageHandler.responses.global_vars).length));
        console.log(chalk.cyan('└── Estado: LISTO\n'));

        // Mostrar comandos disponibles
        console.log(chalk.yellow('🤖 Comandos disponibles:'));
        console.log(chalk.yellow('├── !actualizar - Recargar respuestas.json'));
        console.log(chalk.yellow('├── !estado - Ver estado del bot'));
        console.log(chalk.yellow('├── !ayuda - Mostrar ayuda'));
        console.log(chalk.yellow('└── !admin [comando] - Comandos de administrador\n'));
    }

    async sendMessage(jid, text, options = {}) {
        if (!this.sock || !this.isConnected) return;

        try {
            await this.sock.sendMessage(jid, { text: text }, options);
        } catch (error) {
            console.error(chalk.red('Error enviando mensaje:'), error);
        }
    }
}

// Iniciar bot
const bot = new WhatsAppBot();
bot.connect();

// Manejar cierre
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Apagando bot...'));
    process.exit(0);
});
