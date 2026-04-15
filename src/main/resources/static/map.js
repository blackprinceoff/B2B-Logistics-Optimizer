var map = L.map('map').setView([49.84, 24.03], 13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

var legend = L.control({position: 'bottomright'});
legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML += '<b>Легенда маршрутів</b><br><br>';
    div.innerHTML += '<i style="background: #198754"></i> З вантажем (ORDER)<br>';
    div.innerHTML += '<i style="background: #0d6efd;"></i> Холостий (TRANSFER)<br>';
    div.innerHTML += '<i style="background: #6c757d;"></i> Добирання (COMMUTE)<br>';
    div.innerHTML += '<i style="background: #dc3545"></i> Аварія (BREAKDOWN)';
    return div;
};
legend.addTo(map);

var layerGroup = L.layerGroup().addTo(map);

const locations = {
    "1": {lat: 49.8327, lng: 23.9992, name: "Гараж (Городоцька)"},
    "2": {lat: 49.8406, lng: 24.0297, name: "Залізничний вокзал"},
    "3": {lat: 49.8440, lng: 24.0262, name: "Оперний театр"},
    "4": {lat: 49.8125, lng: 23.9561, name: "Аеропорт"},
    "5": {lat: 49.7958, lng: 24.0538, name: "Сихів (Шувар)"},
    "6": {lat: 49.7738, lng: 23.9785, name: "King Cross"},
    "7": {lat: 49.8351, lng: 24.0145, name: "Політехніка"},
    "8": {lat: 49.8252, lng: 24.0378, name: "IT Park"},
    "9": {lat: 49.8499, lng: 24.0224, name: "Forum Lviv"},
    "10": {lat: 49.8484, lng: 24.0393, name: "Високий Замок"},
    "11": {lat: 49.8600, lng: 23.9000, name: "Епіцентр (Кільцева)"},
    "12": {lat: 49.8150, lng: 24.1300, name: "Винники (Госпіталь)"}
};

function loadSchedule() {
    document.getElementById('segments-list').innerHTML = '<div style="text-align:center; padding:20px;">🔄 Обчислення графа...</div>';
    fetch('/api/optimize')
        .then(response => response.json())
        .then(data => processData(data))
        .catch(err => alert("Помилка: " + err));
}

async function processData(result) {
    layerGroup.clearLayers();
    document.getElementById('segments-list').innerHTML = '';

    const segmentsArray = result.segments || result.schedule || [];

    let totalDist = 0;
    segmentsArray.forEach(s => totalDist += (s.distanceKm || 0));

    document.getElementById('total-profit').innerText = result.totalProfit.toFixed(2) + " грн";
    document.getElementById('total-profit').className = result.totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
    document.getElementById('completed-orders').innerText = result.completedOrders || 0;
    document.getElementById('total-distance').innerText = totalDist.toFixed(1) + " км";

    for (const [key, loc] of Object.entries(locations)) {
        L.circleMarker([loc.lat, loc.lng], {radius: 5, color: '#212529', fillColor: '#fff', fillOpacity: 1})
            .bindPopup(`<b>${loc.name}</b>`).addTo(layerGroup);
    }

    for (const seg of segmentsArray) {
        addCard(seg);
        await drawRouteReal(seg);
    }
}

function addCard(seg) {
    let card = document.createElement('div');
    let isCommute = seg.type === 'TRANSFER' && (seg.profitOrCost > -20 || -100 > seg.profitOrCost);
    let cardType = isCommute ? 'COMMUTE' : seg.type;

    card.className = `card card-${cardType}`;
    let timeStart = seg.startTime.split('T')[1].substr(0,5);
    let timeEnd = seg.endTime.split('T')[1].substr(0,5);
    let locStart = locations[seg.startLocationId]?.name || "Гараж";
    let locEnd = locations[seg.endLocationId]?.name || "Гараж";
    let title = isCommute ? 'ДОБИРАННЯ' : seg.type;

    card.innerHTML = `
        <div class="stat-row">
            <span class="status-badge status-${cardType}">${title}</span>
            <span style="font-weight:bold; color: #555;">ID: ${seg.vehicleId}</span>
        </div>
        <div style="font-size: 0.9em; margin: 10px 0; font-weight: 500;">
            ${locStart} ➡ ${locEnd}
        </div>
        <div class="stat-row" style="color: #666;">
            <span>🕒 ${timeStart} - ${timeEnd}</span>
            <span>🛣 ${seg.distanceKm.toFixed(1)} км</span>
        </div>
        <div class="stat-row" style="margin-top:8px; border-top:1px solid #eee; padding-top:8px;">
            <span>Фінансовий результат:</span>
            <span class="${seg.profitOrCost >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${seg.profitOrCost.toFixed(2)} грн
            </span>
        </div>
    `;
    document.getElementById('segments-list').appendChild(card);
}

async function drawRouteReal(seg) {
    if (!locations[seg.startLocationId] || !locations[seg.endLocationId]) return;
    let start = locations[seg.startLocationId], end = locations[seg.endLocationId];

    if (start === end && seg.type === 'BREAKDOWN') {
        L.marker([start.lat, start.lng]).addTo(layerGroup).bindPopup(`<b style="color:red">АВАРІЯ!</b><br>ID: ${seg.vehicleId}`);
        return;
    }

    let url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    try {
        let response = await fetch(url);
        let json = await response.json();
        if (json.routes && json.routes.length > 0) {
            let color = '#6c757d', weight = 3, dashArray = null;
            if (seg.type === 'ORDER') { color = '#198754'; weight = 5; }
            else if (seg.type === 'TRANSFER' && -100 > seg.profitOrCost) { color = '#6c757d'; dashArray = '5, 8'; }
            else if (seg.type === 'TRANSFER') { color = '#0d6efd'; dashArray = '8, 8'; }

            L.geoJSON(json.routes[0].geometry, { style: { color, weight, dashArray } })
                .bindPopup(`<b>${seg.type}</b><br>Прибуток: ${seg.profitOrCost.toFixed(2)} грн`)
                .addTo(layerGroup);
        }
    } catch (e) {
        L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {color: 'gray', dashArray: '5,5'}).addTo(layerGroup);
    }
}