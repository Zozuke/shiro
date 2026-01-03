const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Middlewares - AUMENTAR LÍMITE
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta ABSOLUTA al archivo respuestas.json
const RESPUESTAS_PATH = path.join(__dirname, 'respuestas.json');

// Asegurar que respuestas.json exista CON ESTRUCTURA CORRECTA
if (!fs.existsSync(RESPUESTAS_PATH)) {
    const initialData = {
        global_vars: {},
        intenciones: {}
    };
    fs.writeFileSync(RESPUESTAS_PATH, JSON.stringify(initialData, null, 2));
    console.log('✅ respuestas.json creado con estructura inicial');
} else {
    console.log('📁 respuestas.json ya existe');
}

// Guardar respuestas - VERSIÓN MEJORADA
app.post('/save-respuestas', (req, res) => {
    console.log('📝 POST /save-respuestas recibido');
    console.log('📊 Datos recibidos keys:', Object.keys(req.body));

    // VERIFICAR lo que realmente llega
    if (!req.body) {
        console.error('❌ ERROR: Body vacío');
        return res.status(400).json({
            ok: false,
            error: 'No se recibieron datos'
        });
    }

    // Validar estructura mínima
    if (typeof req.body !== 'object') {
        console.error('❌ ERROR: Body no es objeto');
        return res.status(400).json({
            ok: false,
            error: 'Datos deben ser un objeto JSON'
        });
    }

    // Asegurar estructura
    const dataToSave = {
        global_vars: req.body.global_vars || {},
        intenciones: req.body.intenciones || {}
    };

    console.log('📈 Estadísticas a guardar:');
    console.log('   Variables globales:', Object.keys(dataToSave.global_vars).length);
    console.log('   Intenciones:', Object.keys(dataToSave.intenciones).length);

    // Listar intenciones para debug
    if (dataToSave.intenciones && Object.keys(dataToSave.intenciones).length > 0) {
        console.log('   Lista de intenciones:');
        Object.keys(dataToSave.intenciones).forEach((key, i) => {
            const intent = dataToSave.intenciones[key];
            console.log(`     ${i+1}. ${key} (${intent.patterns?.length || 0} patrones)`);
        });
    }

    // Guardar de forma SINCRÓNICA para mejor control
    try {
        fs.writeFileSync(
            RESPUESTAS_PATH,
            JSON.stringify(dataToSave, null, 2),
            'utf8'
        );

        console.log('✅ Archivo guardado exitosamente');
        console.log('📂 Ubicación:', RESPUESTAS_PATH);

        // Verificar que se guardó correctamente
        const savedData = fs.readFileSync(RESPUESTAS_PATH, 'utf8');
        const parsed = JSON.parse(savedData);
        console.log('📋 Verificación post-guardado:');
        console.log('   Intenciones guardadas:', Object.keys(parsed.intenciones).length);

        res.json({
            ok: true,
            message: 'Datos guardados correctamente',
            stats: {
                global_vars: Object.keys(dataToSave.global_vars).length,
                intenciones: Object.keys(dataToSave.intenciones).length
            }
        });

    } catch (err) {
        console.error('❌ ERROR REAL AL GUARDAR:', err);
        res.status(500).json({
            ok: false,
            error: err.message,
            details: 'Error de escritura en disco'
        });
    }
});

// Cargar respuestas - VERSIÓN MEJORADA
app.get('/load-respuestas', (req, res) => {
    console.log('📥 GET /load-respuestas solicitado');

    if (!fs.existsSync(RESPUESTAS_PATH)) {
        console.error('❌ Archivo no existe');
        return res.json({
            global_vars: {},
            intenciones: {}
        });
    }

    try {
        const data = fs.readFileSync(RESPUESTAS_PATH, 'utf8');
        const parsed = JSON.parse(data);

        console.log('📊 Datos cargados:');
        console.log('   Variables globales:', Object.keys(parsed.global_vars || {}).length);
        console.log('   Intenciones:', Object.keys(parsed.intenciones || {}).length);

        // Asegurar estructura
        const responseData = {
            global_vars: parsed.global_vars || {},
            intenciones: parsed.intenciones || {}
        };

        res.json(responseData);

    } catch (e) {
        console.error('❌ ERROR al cargar/parsear:', e);
        res.json({
            global_vars: {},
            intenciones: {}
        });
    }
});

// Ruta de verificación
app.get('/debug', (req, res) => {
    const fileExists = fs.existsSync(RESPUESTAS_PATH);
    let fileSize = 0;
    let fileContent = '{}';

    if (fileExists) {
        try {
            fileContent = fs.readFileSync(RESPUESTAS_PATH, 'utf8');
            fileSize = Buffer.byteLength(fileContent, 'utf8');
            JSON.parse(fileContent); // Validar JSON
        } catch (e) {
            fileContent = 'INVALID JSON: ' + e.message;
        }
    }

    res.json({
        status: 'online',
        respuestas_json: {
            exists: fileExists,
            size_kb: (fileSize / 1024).toFixed(2),
            path: RESPUESTAS_PATH,
            content_preview: fileContent.substring(0, 500) + '...'
        },
        endpoints: {
            save: 'POST /save-respuestas',
            load: 'GET /load-respuestas',
            debug: 'GET /debug'
        }
    });
});

// Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log('🚀 Panel web en http://localhost:' + PORT);
    console.log('📁 Archivo respuestas.json:', RESPUESTAS_PATH);
    console.log('🔍 Debug: http://localhost:' + PORT + '/debug');
    console.log('\n⚠️  VERIFICA:');
    console.log('1. Tu HTML debe estar en /public');
    console.log('2. Las peticiones deben ser a http://localhost:3000/save-respuestas');
    console.log('3. Revisa la consola del navegador (F12)');
});
