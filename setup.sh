#!/data/data/com.termux/files/usr/bin/bash

echo "========================================"
echo "  SETUP BOT WHATSAPP (TERMUX)"
echo "========================================"
echo ""

# Verificar Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[*] Instalando Node.js..."
    pkg update -y
    pkg install nodejs -y
else
    echo "[✓] Node.js ya instalado: $(node -v)"
fi

# Verificar npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[✗] npm no está disponible"
    exit 1
else
    echo "[✓] npm disponible: $(npm -v)"
fi

# Inicializar proyecto si no existe
if [ ! -f package.json ]; then
    echo "[*] Inicializando proyecto Node.js..."
    npm init -y
else
    echo "[✓] package.json encontrado"
fi

# Instalar dependencias principales necesarias para panel y bot
echo "[*] Instalando dependencias principales..."
npm install express fs-extra chalk@4 qrcode-terminal string-similarity

# Instalar Baileys
echo "[*] Instalando Baileys..."
npm install @whiskeysockets/baileys

# Crear respuestas.json si no existe
if [ ! -f respuestas.json ]; then
    echo "[*] Creando respuestas.json..."
    cat > respuestas.json << 'EOF'
{
  "global_vars": {
    "saludos": ["Hola", "Buenas"],
    "nombreBot": ["Bot WhatsApp"]
  },
  "intenciones": {}
}
EOF
fi

# Crear bot.js base si no existe
if [ ! -f bot.js ]; then
    echo "[*] Creando bot.js base..."
    cat > bot.js << 'EOF'
console.log("Bot WhatsApp aún no implementado");
EOF
fi

# Crear admin.js base si no existe (panel web)
if [ ! -f admin.js ]; then
    echo "[*] Creando admin.js base..."
    cat > admin.js << 'EOF'
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const RESPUESTAS_PATH = path.join(__dirname, 'respuestas.json');

app.post('/save-respuestas', (req, res) => {
    fs.writeFile(
        RESPUESTAS_PATH,
        JSON.stringify(req.body, null, 2),
        err => {
            if (err) {
                console.error('ERROR REAL:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ ok: true });
        }
    );
});

app.get('/load-respuestas', (req, res) => {
    fs.readFile(RESPUESTAS_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'No existe' });
        }
        res.json(JSON.parse(data));
    });
});

app.listen(3000, () => {
    console.log('Panel web en http://localhost:3000');
});

// Mantener el proceso vivo
setInterval(() => {}, 1000);
EOF
fi

echo ""
echo "========================================"
echo "  SETUP COMPLETADO"
echo "========================================"
echo ""
echo "Ahora puedes ejecutar:"
echo "  node admin.js    --> Para levantar el panel web"
echo "  node bot.js      --> Para iniciar el bot de WhatsApp"
