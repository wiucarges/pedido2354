// Aguarda o HTML carregar completamente antes de rodar o script
document.addEventListener('DOMContentLoaded', () => {

  // --- CONFIGURAÇÕES ---
  const SENHA_CORRETA = "1234";
  const TEMPO_TOTAL_VIAGEM_HORAS = 6;

  // --- ROTA (Montes Claros -> Maringá) ---
  const fullRoute = [
    [-16.7350, -43.8750], // Montes Claros
    [-17.2000, -44.4000],
    [-18.5122, -44.5550],
    [-19.4658, -44.2467],
    [-19.9600, -44.0300], // BH
    [-20.8000, -44.8000],
    [-22.2000, -45.9000],
    [-22.9000, -47.0000], // Campinas
    [-23.8000, -48.0000],
    [-24.9500, -49.0000],
    [-23.4200, -51.9330]  // Maringá
  ];

  let map, polyline, carMarker;

  // --- VINCULA O BOTÃO (A CORREÇÃO DO ERRO ESTÁ AQUI) ---
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
      // Lógica de Persistência
      if (!localStorage.getItem('inicioViagem')) {
        localStorage.setItem('inicioViagem', Date.now());
      }

      // Esconde Login e Mostra Mapa
      overlay.style.display = 'none';
      infoCard.style.display = 'flex'; // Exibe o card que estava oculto

      iniciarMapa();
    } else {
      errorMsg.style.display = 'block';
      // Animação de erro (opcional)
      input.style.borderColor = 'red';
    }
  }

  function iniciarMapa() {
    // Evita reinicializar se já existir
    if (map) return;

    map = L.map('map', { zoomControl: false }).setView(fullRoute[0], 6);

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
    const inicio = parseInt(localStorage.getItem('inicioViagem'));
    const agora = Date.now();
    const tempoDecorridoMs = agora - inicio;
    // Dica: Para testes rápidos, diminua o valor abaixo (ex: * 0.01)
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

    if(carMarker) carMarker.setLatLng(posicaoAtual);

    desenharLinhaRestante(posicaoAtual, progresso);
  }

  function getCoordenadaPorProgresso(pct) {
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
    const rotaRestante = [posicaoAtual, ...fullRoute.slice(indexAtual + 1)];

    polyline = L.polyline(rotaRestante, {
      color: '#2e7d32',
      weight: 5,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(map);
  }

});
