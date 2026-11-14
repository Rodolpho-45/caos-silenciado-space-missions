(function () {
  'use strict';
  var language = 'pt';
  var model = { mission: 'surveyor', step: 0 };
  var activeStepElement = null;
  var progressRaf = false;
  var labels = {
    pt: {
      surveyor: [
        ['A sonda em repouso', 'Role para separar as peças', 'CÂMERA TV', 'COLETOR DE SOLO', 'PAINEL SOLAR'],
        ['Da Terra ao espaço', 'O Atlas-Centaur entra em cena', 'ATLAS-CENTAUR', 'ÓRBITA TERRESTRE', 'RUMO À LUA'],
        ['Uma descida com dois saltos', 'O braço coletor investiga o terreno', 'PERNAS DE POUSO', 'PÁ COLETORA', 'SOLO LUNAR'],
        ['Um encontro após dois anos', 'Conrad e Bean chegam a 180 metros', 'SURVEYOR 3', 'MÓDULO APOLLO', 'OCEANUS PROCELLARUM']
      ],
      ingenuity: [
        ['Uma máquina compacta', 'Quatro pás em dois rotores', 'ROTOR SUPERIOR', 'PAINEL SOLAR', 'CORPO E BATERIAS'],
        ['Carona sob o rover', 'Perseverance leva Ingenuity até Marte', 'PERSEVERANCE', 'PROTEÇÃO DE VOO', 'INGENUITY'],
        ['O primeiro voo', 'As partes se separam para voar', 'ROTORES CONTRARROTATIVOS', '4 PÉS DE POUSO', 'CÂMERAS E SENSOR'],
        ['O voo 72', 'O rotor marca o fim da missão', 'PÁS DANIFICADAS', 'VALINOR HILLS', 'ÚLTIMO REGISTRO']
      ]
    },
    en: {
      surveyor: [
        ['The lander at rest', 'Scroll to separate the parts', 'TV CAMERA', 'SOIL SAMPLER', 'SOLAR ARRAY'],
        ['Earth to space', 'The Atlas-Centaur takes over', 'ATLAS-CENTAUR', 'EARTH ORBIT', 'LUNAR TRANSFER'],
        ['A descent with two bounces', 'The sampler tests the ground', 'LANDING LEGS', 'SURFACE SCOOP', 'LUNAR SOIL'],
        ['A return after two years', 'Conrad and Bean land 180 meters away', 'SURVEYOR 3', 'APOLLO MODULE', 'OCEANUS PROCELLARUM']
      ],
      ingenuity: [
        ['A compact aircraft', 'Four blades in two rotors', 'UPPER ROTOR', 'SOLAR ARRAY', 'FUSELAGE & BATTERIES'],
        ['A ride beneath the rover', 'Perseverance carries Ingenuity to Mars', 'PERSEVERANCE', 'FLIGHT SHIELD', 'INGENUITY'],
        ['The first flight', 'Parts separate for flight', 'COUNTER-ROTATING ROTORS', '4 LANDING LEGS', 'CAMERAS & SENSOR'],
        ['Flight 72', 'A rotor marks the mission’s end', 'DAMAGED BLADES', 'VALINOR HILLS', 'FINAL RECORD']
      ]
    }
  };

  function sendSceneState() {
    var copy = labels[language][model.mission][model.step] || labels[language][model.mission][0];
    document.documentElement.dataset.language = language;
    document.getElementById('scene-counter').textContent = String(model.step + 1).padStart(2, '0') + ' / 04';
    document.getElementById('scene-kicker').textContent = model.mission === 'surveyor' ? 'SURVEYOR 3 · ' + (language === 'pt' ? 'LUA' : 'MOON') : 'INGENUITY · MARS';
    document.getElementById('scene-title').textContent = copy[0];
    document.getElementById('scene-hint').textContent = copy[1];
    var tags = document.getElementById('scene-tags');
    tags.replaceChildren.apply(tags, copy.slice(2).map(function (label) {
      var tag = document.createElement('span');
      tag.textContent = label;
      return tag;
    }));
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      var active = (model.mission === 'surveyor' && link.hash === '#survey') || (model.mission === 'ingenuity' && link.hash === '#ingenuity');
      link.classList.toggle('is-active', active);
    });
    document.dispatchEvent(new CustomEvent('mission-scene', { detail: { mission: model.mission, step: model.step, language: language } }));
    sendSceneProgress();
  }

  function sendSceneProgress() {
    var missionMarkers = steps.filter(function (step) { return step.dataset.mission === model.mission; });
    if (!missionMarkers.length) return;
    var firstRect = missionMarkers[0].getBoundingClientRect();
    var lastRect = missionMarkers[missionMarkers.length - 1].getBoundingClientRect();
    var center = window.innerHeight * .53;
    var progress = Math.max(0, Math.min(1, (center - firstRect.top) / Math.max(lastRect.bottom - firstRect.top, 1)));
    document.dispatchEvent(new CustomEvent('mission-progress', { detail: {
      mission: model.mission,
      step: model.step,
      progress: progress
    }}));
  }

  function setLanguage(next) {
    language = next;
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-pt][data-en]').forEach(function (node) {
      var value = node.getAttribute(next === 'pt' ? 'data-pt' : 'data-en');
      if (value !== null) node.innerHTML = value;
    });
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-lang') === next));
    });
    document.querySelector('.language').setAttribute('aria-label', next === 'pt' ? 'Idioma' : 'Language');
    document.title = next === 'pt' ? 'CAOS silenciado — rastros em outros mundos' : 'CAOS silenciado — traces on other worlds';
    document.querySelector('meta[name="description"]').content = next === 'pt'
      ? 'Uma jornada 3D pelas máquinas da NASA que chegaram à Lua e a Marte — e pelo que deixaram para trás.'
      : 'A 3D journey through NASA machines that reached the Moon and Mars — and what they left behind.';
    sendSceneState();
  }

  document.querySelectorAll('[data-lang]').forEach(function (button) {
    button.addEventListener('click', function () { setLanguage(button.getAttribute('data-lang')); });
  });
  document.getElementById('rotate-toggle').addEventListener('click', function () {
    var button = this;
    var paused = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(paused));
    var label = button.querySelector('[data-pt]');
    label.setAttribute('data-pt', paused ? 'Retomar rotação' : 'Pausar rotação');
    label.setAttribute('data-en', paused ? 'Resume rotation' : 'Pause rotation');
    label.textContent = label.getAttribute(language === 'pt' ? 'data-pt' : 'data-en');
    document.dispatchEvent(new CustomEvent('scene-rotation', { detail: { paused: paused } }));
  });

  var steps = Array.from(document.querySelectorAll('.chapter-intro[data-mission][data-step], .story-step[data-mission][data-step]'));
  function activate(element) {
    var changed = model.mission !== element.dataset.mission || model.step !== (Number(element.dataset.step) || 0);
    activeStepElement = element;
    model.mission = element.dataset.mission;
    model.step = Number(element.dataset.step) || 0;
    if (changed) sendSceneState(); else sendSceneProgress();
  }
  function findActiveSection() {
    var center = window.innerHeight * .53;
    var best = null, bestDistance = Infinity;
    steps.forEach(function (step) {
      var rect = step.getBoundingClientRect();
      var distance = center < rect.top ? rect.top - center : center > rect.bottom ? center - rect.bottom : 0;
      if (distance < bestDistance) { best = step; bestDistance = distance; }
    });
    if (best) activate(best);
  }
  window.addEventListener('scroll', function () {
    if (progressRaf) return;
    progressRaf = true;
    requestAnimationFrame(function () { progressRaf = false; findActiveSection(); });
  }, { passive: true });
  window.addEventListener('resize', findActiveSection);
  window.addEventListener('hashchange', function () {
    if (location.hash === '#survey') { model.mission = 'surveyor'; model.step = 0; activeStepElement = steps.find(function (s) { return s.dataset.mission === 'surveyor'; }) || null; sendSceneState(); }
    if (location.hash === '#ingenuity') { model.mission = 'ingenuity'; model.step = 0; activeStepElement = steps.find(function (s) { return s.dataset.mission === 'ingenuity'; }) || null; sendSceneState(); }
  });
  activeStepElement = steps[0] || null;
  setLanguage('pt');
  sendSceneState();
}());
