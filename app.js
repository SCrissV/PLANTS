// VARIABLES GLOBALES
let database = [];
const historyKey = 'euca_history_v1';

// ELEMENTOS DOM
const views = ['view-scan', 'view-history', 'view-wiki'];
const navItems = document.querySelectorAll('.nav-item');
const loading = document.getElementById('loading');
const geoStatus = document.getElementById('geo-status');
const preview = document.getElementById('preview');
const laser = document.getElementById('laser');
const placeholder = document.getElementById('placeholder-ui');
const latestResultDiv = document.getElementById('latest-result');
const historyListDiv = document.getElementById('history-list');
const wikiListDiv = document.getElementById('wiki-list');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabase();
    loadHistory();
    renderWiki();
});

// EVENT LISTENERS
document.getElementById('cameraInput').addEventListener('change', handleImageUpload);
document.getElementById('galleryInput').addEventListener('change', handleImageUpload);

// 1. CARGA DE DATOS
async function loadDatabase() {
    try {
        const response = await fetch('./data.json');
        const data = await response.json();
        database = data.diagnoses;
    } catch (error) {
        console.error("Error cargando JSON", error);
        alert("Error: Abre esto con Live Server");
    }
}

// 2. NAVEGACIÓN
window.navTo = function(viewId, element) {
    // Ocultar todas las vistas
    views.forEach(v => document.getElementById(v).classList.remove('active'));
    // Mostrar la deseada
    document.getElementById(viewId).classList.add('active');
    
    // Actualizar nav
    navItems.forEach(n => n.classList.remove('active'));
    element.classList.add('active');

    if(viewId === 'view-history') loadHistory();
}

// 3. PROCESAMIENTO DE IMAGEN
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (event) => {
        preview.src = event.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Iniciar Análisis
        startAnalysis(event.target.result);
    }
    reader.readAsDataURL(file);
}

// 4. LÓGICA DE ANÁLISIS (SIMULACIÓN + GPS)
function startAnalysis(imageData) {
    loading.style.display = 'flex';
    laser.style.display = 'block';
    
    // Intentar obtener GPS Real
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                finalizeAnalysis(imageData, coords);
            },
            () => {
                finalizeAnalysis(imageData, "GPS no disponible");
            }
        );
    } else {
        finalizeAnalysis(imageData, "N/A");
    }
}

function finalizeAnalysis(imageData, coords) {
    // Simular tiempo de espera de la IA
    setTimeout(() => {
        // Seleccionar enfermedad aleatoria
        const randomDiagnosis = database[Math.floor(Math.random() * database.length)];
        
        // Crear objeto de registro
        const report = {
            id: Date.now(),
            diagnosis: randomDiagnosis,
            date: new Date().toLocaleString(),
            coords: coords,
            image: imageData // Nota: Guardar Base64 llena localStorage rápido, pero sirve para demo
        };

        saveToHistory(report);
        showResultCard(report);
        
        loading.style.display = 'none';
        laser.style.display = 'none';
    }, 2500);
}

// 5. RENDERIZADO DE RESULTADOS
function showResultCard(report) {
    const data = report.diagnosis;
    
    const html = `
        <div class="result-card" style="border-left-color: ${data.color}">
            <div class="meta-info">
                <span><i class="fas fa-calendar"></i> ${report.date}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${report.coords}</span>
            </div>
            
            <h2 style="color: ${data.color}; margin: 0;">${data.status}</h2>
            <h3 style="margin-top: 5px;">${data.name}</h3>
            <p style="font-style: italic; color: #888;">${data.scientific_name}</p>
            
            <p>${data.description}</p>
            
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong style="color: var(--primary);">PROTOCOLOS ACTIVADOS:</strong>
                <ul class="care-list" style="padding-left: 0; list-style: none;">
                    ${data.care_instructions.map(c => `<li><i class="fas fa-check"></i> ${c}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    latestResultDiv.innerHTML = html;
}

// 6. GESTIÓN DEL HISTORIAL (LocalStorage)
function saveToHistory(report) {
    const currentHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
    currentHistory.unshift(report); // Agregar al inicio
    // Limitar a los últimos 10 para no llenar memoria
    if(currentHistory.length > 10) currentHistory.pop();
    localStorage.setItem(historyKey, JSON.stringify(currentHistory));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem(historyKey)) || [];
    
    if (history.length === 0) {
        historyListDiv.innerHTML = '<p style="text-align:center; color:#666; margin-top:30px">Historial Vacío</p>';
        return;
    }

    historyListDiv.innerHTML = history.map(item => `
        <div class="history-item">
            <img src="${item.image}" class="hist-thumb">
            <div class="hist-content">
                <h4 style="color: ${item.diagnosis.color}">${item.diagnosis.name}</h4>
                <div class="hist-date">${item.date}</div>
                <div class="hist-date"><i class="fas fa-map-pin"></i> ${item.coords}</div>
            </div>
        </div>
    `).join('');
}

window.clearHistory = function() {
    if(confirm("¿Borrar todos los registros?")) {
        localStorage.removeItem(historyKey);
        loadHistory();
    }
}

// 7. RENDERIZAR WIKI
function renderWiki() {
    // Esperar un poco a que cargue la DB si es necesario
    setTimeout(() => {
        if(!database.length) return;
        
        wikiListDiv.innerHTML = database.map(d => `
            <div class="wiki-item">
                <div>
                    <strong style="color: white; font-size: 1.1rem;">${d.name}</strong><br>
                    <span style="color: #666; font-style:italic;">${d.scientific_name}</span>
                </div>
                <span class="wiki-tag" style="background: ${d.color}20; color: ${d.color}; border: 1px solid ${d.color}">
                    ${d.status}
                </span>
            </div>
        `).join('');
    }, 500);
}