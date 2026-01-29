document.addEventListener('DOMContentLoaded', () => {

  // --- CONFIGURAÇÕES ---
  const SENHA_CORRETA = "1234";
  const TEMPO_TOTAL_VIAGEM_HORAS = 6;

  // Coordenadas de Referência (Montes Claros -> Maringá)
  // OSRM usa Longitude,Latitude. O Leaflet usa Latitude,Longitude.
  const startCoords = [-43.8750, -16.7350]; // Long, Lat
  const endCoords = [-51.9330, -23.4200];   // Long, Lat

  let map, polyline, carMarker;
  let fullRoute = []; // Será preenchido pela API

  // --- VINCULA O BOTÃO ---
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', verificarCodigo);
  }

  // --- FUNÇÕES ---

  function verificarCodigo() {
    const input = document.getElementById('access-code');
    const errorMsg = document.getElementById('error-msg');
    const overlay = document.getElementById('login-overlay');
    const infoCard = document.getElementById('info-card');

    if (input.value === SENHA_CORRETA) {
      if (!localStorage.getItem('inicioViagem')) {
        localStorage.setItem('inicioViagem', Date.now());
      }

      // Mostra carregando enquanto busca a rota
      const btn = document.getElementById('btn-login');
      btn.innerText = "Carregando rota...";
      btn.disabled = true;

      // Busca a rota real na estrada
      buscarRotaReal().then(() => {
        overlay.style.display = 'none';
        infoCard.style.display = 'flex';
        iniciarMapa();
      }).catch(err => {
        console.error(err);
        alert("Erro ao carregar a rota. Verifique sua internet.");
        btn.innerText = "Tentar Novamente";
        btn.disabled = false;
      });

    } else {
      errorMsg.style.display = 'block';
      input.style.borderColor = 'red';
    }
  }

  // NOVA FUNÇÃO: Busca o desenho da estrada via API OSRM
  async function buscarRotaReal() {
    // URL da API pública do OSRM (Gratuita para projetos pequenos)
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      // A API devolve [Long, Lat], mas o Leaflet precisa de [Lat, Long]
      // Vamos inverter as coordenadas aqui:
      fullRoute = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    } else {
      throw new Error("Rota não encontrada");
    }
  }

  function iniciarMapa() {
    if (map) return;

    // Centraliza no início da rota
    map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB', maxZoom: 18
    }).addTo(map);

    const truckIcon = L.divIcon({
      className: 'car-marker',
      html: '<div class="car-icon">🚛</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    carMarker = L.marker(fullRoute[0], { icon: truckIcon }).addTo(map);

    L.marker(fullRoute[fullRoute.length - 1]).addTo(map)
      .bindPopup("Destino Final: Maringá/PR").openPopup();

    // Inicia Loop
    setInterval(atualizarPosicaoTempoReal, 1000);
    atualizarPosicaoTempoReal();
  }

  function atualizarPosicaoTempoReal() {
    if (fullRoute.length === 0) return;

    const inicio = parseInt(localStorage.getItem('inicioViagem'));
    const agora = Date.now();
    const tempoDecorridoMs = agora - inicio;
    const tempoTotalMs = TEMPO_TOTAL_VIAGEM_HORAS * 60 * 60 * 1000;

    let progresso = tempoDecorridoMs / tempoTotalMs;

    const timeBadge = document.getElementById('time-badge');

    if (progresso >= 1) {
      progresso = 1;
      if(timeBadge) {
        timeBadge.innerText = "ENTREGUE";
        timeBadge.style.color = "green";
        timeBadge.style.backgroundColor = "#ccffcc";
      }
    } else {
      const horasRestantes = ((tempoTotalMs - tempoDecorridoMs) / (1000 * 60 * 60)).toFixed(1);
      if(timeBadge) {
        timeBadge.innerText = `CHEGADA EM ${horasRestantes}h`;
      }
    }

    const posicaoAtual = getCoordenadaPorProgresso(progresso);

    if(carMarker) {
      carMarker.setLatLng(posicaoAtual);

      // Opcional: Faz o mapa seguir o caminhão
      // map.panTo(posicaoAtual);
    }

    desenharLinhaRestante(posicaoAtual, progresso);
  }

  function getCoordenadaPorProgresso(pct) {
    // Agora fullRoute tem milhares de pontos, então a curva será perfeita
    const totalPontos = fullRoute.length - 1;
    const pontoVirtual = pct * totalPontos;

    const indexAnterior = Math.floor(pontoVirtual);
    const indexProximo = Math.ceil(pontoVirtual);

    if (indexAnterior >= totalPontos) return fullRoute[totalPontos];

    const p1 = fullRoute[indexAnterior];
    const p2 = fullRoute[indexProximo];

    const resto = pontoVirtual - indexAnterior;

    const lat = p1[0] + (p2[0] - p1[0]) * resto;
    const lng = p1[1] + (p2[1] - p1[1]) * resto;

    return [lat, lng];
  }

  function desenharLinhaRestante(posicaoAtual, pct) {
    if (polyline) map.removeLayer(polyline);

    const indexAtual = Math.floor(pct * (fullRoute.length - 1));

    // Desenha apenas do ponto atual até o final
    // slice pode ser pesado se o array for gigante, mas para <10k pontos é ok em Desktop/Mobile modernos
    const rotaRestante = [posicaoAtual, ...fullRoute.slice(indexAtual + 1)];

    polyline = L.polyline(rotaRestante, {
      color: '#2e7d32',
      weight: 5,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(map);
  }
});
