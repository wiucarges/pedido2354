// 1. Configuração Inicial do Mapa
// Centralizado em SP para exemplo, sem controles de zoom para parecer "App Nativo"
const map = L.map('map', {
  zoomControl: false
}).setView([-23.550520, -46.633308], 15);

// 2. Adicionando o estilo do mapa (Tiles)
// 'Voyager' é o estilo mais limpo e próximo de apps de logística modernos
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 20
}).addTo(map);

// 3. Dados da Rota (Simulação de trajeto com curvas)
const routeCoordinates = [
  [-23.550520, -46.633308], // Início
  [-23.551200, -46.634000],
  [-23.552000, -46.635500],
  [-23.553500, -46.636000],
  [-23.554800, -46.637500],
  [-23.555500, -46.638000], // Fim
];

// 4. Desenho da Rota (Linha Azul)
const polyline = L.polyline(routeCoordinates, {
  color: '#4285F4', // Azul clássico de GPS
  weight: 6,
  opacity: 0.8,
  lineCap: 'round',
  lineJoin: 'round'
}).addTo(map);

// Ajusta o zoom para mostrar toda a rota de uma vez
map.fitBounds(polyline.getBounds(), { padding: [80, 80] });

// 5. Marcador de Destino (Pin final)
const endPoint = routeCoordinates[routeCoordinates.length - 1];
L.marker(endPoint).addTo(map)
  .bindPopup("<b>Destino Final</b><br>Entregar na portaria.")
  .openPopup();

// 6. Configuração do Carro
const carIcon = L.divIcon({
  className: 'car-marker',
  html: '<div class="car-icon">🚗</div>', // Pode substituir por <img> se quiser
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const carMarker = L.marker(routeCoordinates[0], { icon: carIcon }).addTo(map);

// 7. Lógica de Animação (Interpolation System)
let currentIndex = 0;

function moveCar() {
  // Verifica se chegou ao fim da rota
  if (currentIndex >= routeCoordinates.length - 1) {
    // Reinicia a simulação após 2 segundos (Loop)
    setTimeout(() => {
      currentIndex = 0;
      carMarker.setLatLng(routeCoordinates[0]);
      moveCar();
    }, 2000);
    return;
  }

  const startPoint = routeCoordinates[currentIndex];
  const endPoint = routeCoordinates[currentIndex + 1];

  // Configurações da velocidade da animação
  let step = 0;
  const totalSteps = 100; // Mais passos = movimento mais lento e suave

  function animateSegment() {
    step++;

    // Matemática para achar o ponto intermediário entre o início e o fim
    const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * (step / totalSteps);
    const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * (step / totalSteps);

    // Move o carro para a nova micropisição
    carMarker.setLatLng([lat, lng]);

    if (step < totalSteps) {
      requestAnimationFrame(animateSegment);
    } else {
      // Segmento concluído, vai para o próximo ponto da rota
      currentIndex++;
      moveCar();
    }
  }

  // Inicia a animação do segmento atual
  animateSegment();
}

// Inicia o motor após 1 segundo de carregamento
setTimeout(moveCar, 1000);
