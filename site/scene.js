const THREE = window.THREE;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
const material = (color, metalness = 0.1, roughness = 0.5, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const cyan = 0x55e8ff, violet = 0x9e6bff, silver = 0xc9d6e8, gold = 0xe5b95c;
function captureMaterials(root){const seen=new Set(),entries=[];root.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!seen.has(m)){seen.add(m);entries.push({material:m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});}});return entries;}
function fadeMaterials(entries,amount){const a=clamp(amount);for(const e of entries){e.material.opacity=e.opacity*a;e.material.transparent=e.transparent||a<.999;e.material.depthWrite=a<.999?false:e.depthWrite;}}

function rendererFor(canvas, alpha) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  return renderer;
}

function addLights(scene, power = 1) {
  scene.add(new THREE.HemisphereLight(0x94caff, 0x13112f, 1.4 * power));
  const key = new THREE.DirectionalLight(0xd6eeff, 3.1 * power); key.position.set(-4, 7, 6); scene.add(key);
  const rim = new THREE.PointLight(0x9561ff, 28 * power, 18); rim.position.set(4, 1, -3); scene.add(rim);
  const cyanRim = new THREE.PointLight(0x38dfff, 17 * power, 16); cyanRim.position.set(-4, -1, 1); scene.add(cyanRim);
}

function makeStars(scene, count, radius, seed = 42) {
  let n = seed;
  const rand = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1, theta = rand() * Math.PI * 2, r = radius * (.45 + rand() * .55);
    positions[i * 3] = r * Math.sqrt(1 - u * u) * Math.cos(theta);
    positions[i * 3 + 1] = r * u;
    positions[i * 3 + 2] = r * Math.sqrt(1 - u * u) * Math.sin(theta);
    const c = new THREE.Color().setHSL(.55 + rand() * .22, .45, .65 + rand() * .33);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: .018, vertexColors: true, transparent: true, opacity: .92, sizeAttenuation: true }));
  scene.add(points); return points;
}

function sphere(radius, color, roughness = .82, metalness = 0) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 36), material(color, metalness, roughness));
}

function makeOrbit(radius, color, opacity = .27, xScale = 1) {
  const points = [];
  for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(a) * radius * xScale, 0, Math.sin(a) * radius)); }
  const curve = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineLoop(curve, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  return line;
}

function drawWorldTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = kind === 'earth' ? '#0d2867' : kind === 'mars' ? '#7d3523' : '#585c70';
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
  if (kind === 'earth') {
    ctx.fillStyle = '#318d79';
    for (const [x, y, w, h] of [[36,45,87,70],[156,100,63,93],[250,28,117,65],[364,115,110,82],[39,190,50,28]]) {
      ctx.beginPath(); ctx.moveTo(x, y + h * .1); ctx.bezierCurveTo(x + w * .4, y - h * .1, x + w * .8, y + h * .25, x + w, y + h * .45); ctx.bezierCurveTo(x + w * .75, y + h, x + w * .34, y + h * .82, x, y + h); ctx.closePath(); ctx.fill();
    }
  } else {
    let s = kind === 'mars' ? 802 : 507;
    const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < 160; i++) {
      const x = rand() * 512, y = rand() * 256, r = (kind === 'mars' ? 1.5 : 3) + rand() * (kind === 'mars' ? 12 : 20);
      ctx.fillStyle = kind === 'mars' ? `rgba(32,14,20,${.06 + rand() * .25})` : `rgba(8,12,24,${.10 + rand() * .25})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * .72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = kind === 'mars' ? 'rgba(255,187,132,.12)' : 'rgba(214,226,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; return tex;
}

function texturedPlanet(kind, radius) {
  const colors = { earth: 0xffffff, moon: 0xd1d2de, mars: 0xffffff };
  const mat = new THREE.MeshStandardMaterial({ map: drawWorldTexture(kind), color: colors[kind], roughness: kind === 'earth' ? .72 : .94, metalness: .02 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), mat);
  if (kind === 'earth') {
    const air = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 48, 36), new THREE.MeshBasicMaterial({ color: 0x32c9ff, transparent: true, opacity: .11, side: THREE.BackSide })); ball.add(air);
  }
  return ball;
}

function cylinderBetween(a, b, radius, mat, segments = 8) {
  const direction = new THREE.Vector3().subVectors(b, a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), mat);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return mesh;
}

function mesh(geo, mat, pos = [0, 0, 0], parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (parent) parent.add(m); return m;
}

function groupAt(parent, pos = [0, 0, 0]) { const g = new THREE.Group(); g.position.set(...pos); if (parent) parent.add(g); return g; }

function boxPart(root, name, size, pos, color, explode, opts = {}) {
  const g = groupAt(root, pos); g.name = name; g.userData.explode = new THREE.Vector3(...explode);
  mesh(new THREE.BoxGeometry(...size), material(color, opts.metalness ?? .45, opts.roughness ?? .35, opts.emissive ? { emissive: opts.emissive, emissiveIntensity: .25 } : {}), [0,0,0], g);
  return g;
}

function makeTriangularFrame(parent, radius, y, color) {
  const frameMat = material(color, .66, .31);
  const points = [0,1,2].map(i => new THREE.Vector3(Math.cos(i / 3 * Math.PI * 2) * radius, y, Math.sin(i / 3 * Math.PI * 2) * radius));
  for (let i = 0; i < 3; i++) parent.add(cylinderBetween(points[i], points[(i+1)%3], .022, frameMat, 6));
}

function addPanel(parent, x, y, z, sizeX, sizeZ, explode = [0,0,0]) {
  const panel = groupAt(parent, [x,y,z]); panel.name = 'solar panel'; panel.userData.explode = new THREE.Vector3(...explode);
  mesh(new THREE.BoxGeometry(sizeX, .035, sizeZ), material(0x173a82, .5, .36, { emissive: 0x092663, emissiveIntensity: .18 }), [0,0,0], panel);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x53ddff, transparent: true, opacity: .76 });
  for (let i = 1; i < 6; i++) {
    const xLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-sizeX/2 + i * sizeX/6, .022, -sizeZ/2), new THREE.Vector3(-sizeX/2 + i * sizeX/6, .022, sizeZ/2)]);
    const zLine = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-sizeX/2, .022, -sizeZ/2 + i * sizeZ/6), new THREE.Vector3(sizeX/2, .022, -sizeZ/2 + i * sizeZ/6)]);
    panel.add(new THREE.Line(xLine, lineMat), new THREE.Line(zLine, lineMat));
  }
  return panel;
}

function createSurveyor() {
  const root = groupAt(null, [0, -.25, 0]);
  const frameMat = material(0xc6d5e8, .72, .31), dark = material(0x1b2745, .55, .3), white = material(0xdfe5eb, .45, .4), silverMat = material(0x8995a9, .73, .27), copper = material(0xb78056, .72, .31);
  const body = boxPart(root, 'triangular body', [1.18,.42,.98], [0,.2,0], 0xb7c5d7, [0,.7,0]);
  mesh(new THREE.BoxGeometry(.83,.08,.72), material(0x1b2947,.72,.27), [0,.25,0], body);
  boxPart(root, 'equipment compartment', [.54,.31,.48], [0,.52,0], 0xe0e4e9, [0,1.05,0], {metalness:.45});
  boxPart(root, 'battery compartment', [.36,.27,.33], [-.23,.47,.38], 0x77879b, [-.55,.72,.7]);
  // Layered thermal blankets, seams and fasteners add depth to the Surveyor deck.
  for(let i=0;i<5;i++){const p=mesh(new THREE.BoxGeometry(.19,.012,.64),material(i%2?0xc6d4e4:0x8fa4bd,.68,.28),[-.43+i*.215,.47,.02],body);p.rotation.z=i%2?-.018:.018;}
  for(const x of [-.38,.38])for(const z of [-.28,.28]){const bolt=mesh(new THREE.CylinderGeometry(.027,.027,.018,10),material(0x576980,.72,.25),[x,.3,z],body);bolt.rotation.x=Math.PI/2;}
  makeTriangularFrame(root, .88, .28, 0xaebed1);

  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 2 + i * Math.PI * 2/3, dir = [Math.cos(angle),0,Math.sin(angle)];
    const leg = groupAt(root); leg.name = `landing leg ${i+1}`; leg.userData.explode = new THREE.Vector3(dir[0]*.78,.28,dir[2]*.78);
    const top = new THREE.Vector3(dir[0]*.32,.15,dir[2]*.32), knee = new THREE.Vector3(dir[0]*.75,-.32,dir[2]*.75), foot = new THREE.Vector3(dir[0]*1.06,-.76,dir[2]*1.06);
    leg.add(cylinderBetween(top,knee,.035,frameMat)); leg.add(cylinderBetween(knee,foot,.032,frameMat));
    const pad = mesh(new THREE.CylinderGeometry(.14,.18,.055,18),white,[foot.x,-.8,foot.z],leg); pad.rotation.z=-.04;
    leg.add(cylinderBetween(knee,new THREE.Vector3(dir[0]*.35,-.02,dir[2]*.35),.016,silverMat));
    root.add(leg);
  }

  const mast = groupAt(root, [0,.58,0]); mast.name='solar mast'; mast.userData.explode = new THREE.Vector3(0,1.15,0);
  mast.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,.65,0),.025,frameMat));
  for(let i=0;i<4;i++){const a=i*Math.PI/2;mast.add(cylinderBetween(new THREE.Vector3(0,.32,0),new THREE.Vector3(Math.cos(a)*.3,.65,Math.sin(a)*.3),.012,silverMat));}
  const panel = addPanel(mast,0,.75,0,1.34,.7,[0,.15,-.1]); panel.rotation.x=-.16;
  const antennas = groupAt(mast,[0,.79,0]); antennas.name='antennas'; antennas.userData.explode = new THREE.Vector3(.42,1.25,.2);
  for (const d of [-1,1]) { antennas.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(d*.38,.22,d*.08),.012,copper)); mesh(new THREE.SphereGeometry(.035,8,6),copper,[d*.38,.22,d*.08],antennas); }
  const dish=groupAt(mast,[-.42,.14,.12]);dish.name='high gain antenna dish';dish.userData.explode=new THREE.Vector3(-.65,.85,.2);
  const dishShape=new THREE.Shape();dishShape.moveTo(-.24,-.2);dishShape.quadraticCurveTo(0,.29,.24,-.2);dishShape.lineTo(-.24,-.2);
  const dishMesh=new THREE.Mesh(new THREE.ShapeGeometry(dishShape,20),material(0xe0e7ee,.78,.24,{side:THREE.DoubleSide}));dishMesh.position.z=.11;dish.add(dishMesh);
  dish.add(cylinderBetween(new THREE.Vector3(0,-.03,.02),new THREE.Vector3(0,-.03,.2),.012,copper));mesh(new THREE.SphereGeometry(.035,10,8),gold,[0,-.03,.2],dish);mast.add(dish);
  root.add(mast);

  const camera = groupAt(root,[0,.18,.51]); camera.name='tv camera'; camera.userData.explode = new THREE.Vector3(.1,.58,1.1);
  mesh(new THREE.BoxGeometry(.34,.34,.3),white,[0,.48,0],camera);
  mesh(new THREE.CylinderGeometry(.115,.12,.08,24),dark,[0,.48,.17],camera).rotation.x=Math.PI/2;
  mesh(new THREE.CircleGeometry(.075,24),material(0x32b9ef,.32,.16,{emissive:0x127cbd,emissiveIntensity:.6}),[0,.48,.217],camera).rotation.x=0;
  mesh(new THREE.BoxGeometry(.42,.05,.36),silverMat,[0,.71,-.02],camera);
  root.add(camera);

  const sampler = groupAt(root,[.56,-.03,.15]); sampler.name='surface sampler'; sampler.userData.explode = new THREE.Vector3(1.28,-.2,.42);
  sampler.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(.35,-.1,.04),.025,frameMat));
  sampler.add(cylinderBetween(new THREE.Vector3(.35,-.1,.04),new THREE.Vector3(.8,-.18,.1),.018,copper));
  const arm = mesh(new THREE.BoxGeometry(.22,.06,.15),silverMat,[.9,-.2,.1],sampler); arm.rotation.z=.25;
  const scoop = mesh(new THREE.BoxGeometry(.2,.04,.25),copper,[1.02,-.31,.1],sampler); scoop.rotation.z=.32;
  root.add(sampler);

  const thrusters = groupAt(root,[0,-.1,-.53]); thrusters.name='vernier engine'; thrusters.userData.explode = new THREE.Vector3(0,-.83,-.7);
  mesh(new THREE.CylinderGeometry(.19,.12,.32,18),silverMat,[0,-.25,0],thrusters);
  for (let i=0;i<4;i++){const a=i*Math.PI/2;thrusters.add(cylinderBetween(new THREE.Vector3(0,-.12,0),new THREE.Vector3(Math.cos(a)*.36,.02,Math.sin(a)*.36),.022,white));}
  root.add(thrusters);

  root.userData.parts = root.children.filter(child => child.userData.explode);
  root.userData.rotors=[];
  root.rotation.y=.35; root.scale.setScalar(.82);
  return root;
}

function createIngenuity() {
  const root=groupAt(null,[.05,.2,.1]); root.rotation.y=-.3;
  const frame=material(0xc3d3e9,.72,.32), black=material(0x171b2a,.52,.33), goldMat=material(0xb88839,.78,.28), solarMat=material(0x153985,.55,.26,{emissive:0x102c73,emissiveIntensity:.28});
  const body=boxPart(root,'fuselage',[.72,.48,.72],[0,0,0],0xb6bcc4,[0,0,.1],{metalness:.82,roughness:.25});
  const foil=material(0xd4d5d1,.82,.23),foilShade=material(0x858d9c,.8,.27),darkFoil=material(0x454d5d,.75,.3);
  for(let side of [-1,1])for(let i=0;i<4;i++){const p=mesh(new THREE.BoxGeometry(.018,.09,.62),i%2?foil:foilShade,[side*.371,-.15+i*.095,0],body);p.rotation.z=side*.05;}
  for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.66,.012,.012),foil,[0,-.2+i*.095,.367],body);
  mesh(new THREE.BoxGeometry(.56,.14,.55),goldMat,[0,.15,0],body);
  for(let x of [-.23,.23])for(let z of [-.23,.23])mesh(new THREE.CylinderGeometry(.025,.025,.02,10),darkFoil,[x,.23,z],body);
  boxPart(root,'avionics deck',[.52,.13,.52],[0,-.27,0],0x4a5263,[0,-.2,0]);
  const battery=boxPart(root,'battery pack',[.35,.17,.32],[.05,-.39,.02],0x9e7a42,[.25,-.42,.25]);
  for(let i=0;i<6;i++){const cell=mesh(new THREE.CylinderGeometry(.035,.035,.12,12),material(0x778397,.68,.3),[-.2+i*.08,-.39,-.12],battery);cell.rotation.z=Math.PI/2;}
  const legs=groupAt(root); legs.name='four landing legs'; legs.userData.explode=new THREE.Vector3(0,-.7,.1);
  for(let i=0;i<4;i++){
    const x=i%2===0?-1:1, z=i<2?-.48:.48;
    legs.add(cylinderBetween(new THREE.Vector3(x*.15,-.22,z*.17),new THREE.Vector3(x*.47,-.83,z*.55),.028,frame));
    legs.add(cylinderBetween(new THREE.Vector3(x*.47,-.83,z*.55),new THREE.Vector3(x*.53,-.92,z*.56),.02,black));
    mesh(new THREE.SphereGeometry(.038,10,8),goldMat,[x*.15,-.22,z*.17],legs);
  }
  root.add(legs);
  const mast=groupAt(root,[0,.36,0]); mast.name='rotor mast'; mast.userData.explode=new THREE.Vector3(0,.9,0);
  mast.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,.84,0),.028,frame));
  for(let side of [-1,1])mast.add(cylinderBetween(new THREE.Vector3(0,.28,0),new THREE.Vector3(side*.12,.56,0),.012,goldMat));
  const solar=addPanel(mast,0,1.02,0,1.02,.55,[0,.17,-.12]); solar.rotation.x=-.08;
  const grid=material(0x60a4c8,.44,.3,{emissive:0x103f6a,emissiveIntensity:.25});
  for(let i=0;i<9;i++)solar.add(mesh(new THREE.BoxGeometry(.009,.012,.49),grid,[-.46+i*.115,.026,0],solar));
  for(let i=0;i<5;i++)solar.add(mesh(new THREE.BoxGeometry(.94,.012,.009),grid,[0,.027,-.22+i*.11],solar));
  mesh(new THREE.CylinderGeometry(.16,.16,.07,20),goldMat,[0,.8,0],mast).rotation.x=Math.PI/2;
  root.add(mast);
  const rotors=[];
  for(let level=0;level<2;level++){
    const hub=groupAt(root,[0,.72+level*.16,0]); hub.name=level?'lower rotor':'upper rotor'; hub.userData.explode=new THREE.Vector3(0,.95+level*.15,0);
    mesh(new THREE.CylinderGeometry(.085,.085,.11,12),goldMat,[0,0,0],hub);
    for(let k=0;k<3;k++){const a=k*Math.PI*2/3;hub.add(cylinderBetween(new THREE.Vector3(Math.cos(a)*.04,0,Math.sin(a)*.04),new THREE.Vector3(Math.cos(a)*.17,.08,Math.sin(a)*.17),.012,frame));}
    const blades=groupAt(hub,[0,.045,0]);
    for(let i=0;i<2;i++){
      const shape=new THREE.Shape();shape.moveTo(-.60,-.035);shape.lineTo(-.48,-.052);shape.lineTo(.47,-.046);shape.lineTo(.60,-.024);shape.lineTo(.57,.035);shape.lineTo(-.47,.052);shape.lineTo(-.60,.035);shape.closePath();
      const blade=new THREE.Mesh(new THREE.ShapeGeometry(shape,8),material(0x171c29,.48,.34,{side:THREE.DoubleSide}));blade.rotation.x=-Math.PI/2;blade.rotation.y=i*Math.PI/2;blades.add(blade);
      for(let j=0;j<4;j++){const mark=mesh(new THREE.BoxGeometry(.052,.025,.105),material(j%2?0xd5dbe4:0x222733,.35,.42),[.43+j*.039,.016,0],blades);mark.rotation.y=i*Math.PI/2;}
      const pitch=mesh(new THREE.BoxGeometry(.11,.018,.08),goldMat,[i===0?.52:0,.016,i===0?0:.52],blades);pitch.rotation.y=i*Math.PI/2;
    }
    root.add(hub); rotors.push(blades);
  }
  const cameras=groupAt(root,[.24,-.28,.24]); cameras.name='navigation cameras'; cameras.userData.explode=new THREE.Vector3(.55,-.62,.62);
  mesh(new THREE.BoxGeometry(.18,.18,.18),black,[0,0,0],cameras);
  mesh(new THREE.CylinderGeometry(.065,.07,.08,16),material(0x244f84,.3,.2,{emissive:0x104f8f,emissiveIntensity:.6}),[0,0,.12],cameras).rotation.x=Math.PI/2;
  mesh(new THREE.SphereGeometry(.045,14,10),material(0x60eaff,.18,.13,{emissive:0x1ebde2,emissiveIntensity:.75}),[-.13,.03,.1],cameras);
  root.add(cameras);
  const antenna=groupAt(root,[-.32,-.03,.29]); antenna.name='radio antenna'; antenna.userData.explode=new THREE.Vector3(-.55,.1,.75);
  antenna.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(-.26,.34,0),.009,frame)); mesh(new THREE.SphereGeometry(.035,10,8),goldMat,[-.26,.34,0],antenna); root.add(antenna);

  // A small, simplified Perseverance rover sits behind the helicopter while the aircraft is stowed.
  const rover=groupAt(root,[0,1.56,-1.5]); rover.name='perseverance rover'; rover.userData.explode=new THREE.Vector3(0,.35,-.2);
  mesh(new THREE.BoxGeometry(1.75,.42,.95),material(0xc4ccd9,.69,.37),[0,0,0],rover);
  mesh(new THREE.BoxGeometry(.95,.1,.75),material(0x252d40,.62,.38),[0,-.26,0],rover);
  mesh(new THREE.BoxGeometry(1.06,.43,.65),material(0x777f91,.65,.4),[0,.36,0],rover);
  const roverBody=material(0xc4ccd9,.69,.37),roverDark=material(0x737d91,.65,.4),wheelMat=material(0x354154,.74,.35), wheelPositions=[];
  for(let side of [-1,1]) for(let i=0;i<3;i++) wheelPositions.push([-.62+i*.62,-.35,side*.53]);
  wheelPositions.forEach(p=>{const w=mesh(new THREE.CylinderGeometry(.23,.23,.13,20),wheelMat,p,rover);w.rotation.z=Math.PI/2;});
  const mastR=groupAt(rover,[0,.45,-.28]); mastR.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,.72,0),.04,frame));
  mesh(new THREE.BoxGeometry(.43,.26,.27),silver,[0,.73,0],mastR);mesh(new THREE.CylinderGeometry(.075,.08,.08,14),material(0x243d61,.35,.2),[0,.73,.17],mastR).rotation.x=Math.PI/2;rover.add(mastR);
  const arm=groupAt(rover,[.58,-.1,.35]);arm.add(cylinderBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(.25,-.3,.08),.035,roverDark));arm.add(cylinderBetween(new THREE.Vector3(.25,-.3,.08),new THREE.Vector3(.38,-.46,.18),.027,roverBody));rover.add(arm);
  root.add(rover); root.userData.rover=rover; root.userData.rotors=rotors;
  root.userData.parts=root.children.filter(child=>child.userData.explode);
  root.scale.setScalar(.8);
  return root;
}

function addTerrain(scene, kind) {
  const color=kind==='moon'?0x70778b:0x88442f, groundMat=material(color,.18,.98);
  const ground=mesh(new THREE.CircleGeometry(4.7,72),groundMat,[0,-1.24,-.5],scene); ground.rotation.x=-Math.PI/2;
  for(let i=0;i<19;i++){
    const x=((i*37)%19-9)*.36,z=-.5+((i*23)%17-8)*.29,r=.045+((i*17)%6)*.018;
    const rock=mesh(new THREE.DodecahedronGeometry(r,0),material(kind==='moon'?0x9097a6:0xb25738,.15,.9),[x,-1.17,z],scene); rock.rotation.set(i*.7,i*.42,i*.19);
  }
  for(let i=0;i<5;i++){
    const crater=mesh(new THREE.TorusGeometry(.32+i*.07,.025,5,48),material(kind==='moon'?0x9299a7:0xbe6847,.2,.9),[-2.3+i*1.1,-1.2,-1.25],scene);crater.rotation.x=Math.PI/2;
  }
}

function createAtlas() {
  const g=new THREE.Group(), white=material(0xd8e5f6,.45,.35), blue=material(0x2451af,.48,.32), dark=material(0x242a42,.32,.38), orange=material(0xf0914e,.47,.4);
  mesh(new THREE.CylinderGeometry(.19,.3,1.5,20),white,[0,0,0],g);
  mesh(new THREE.CylinderGeometry(.22,.22,.45,18),blue,[0,-.64,0],g);
  mesh(new THREE.CylinderGeometry(.17,.12,.85,16),white,[0,1.08,0],g);
  mesh(new THREE.ConeGeometry(.17,.53,20),white,[0,1.77,0],g);
  mesh(new THREE.CylinderGeometry(.12,.12,.15,16),orange,[0,.55,0],g);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2, fin=mesh(new THREE.BoxGeometry(.035,.52,.27),dark,[Math.sin(a)*.27,-.54,Math.cos(a)*.27],g);fin.rotation.y=a;fin.rotation.z=.18;
  }
  return g;
}

function createAtlasV(){
  const g=new THREE.Group(),white=material(0xe0e8f2,.4,.34),ivory=material(0xc5d0df,.42,.38),orange=material(0xe38349,.48,.37),blue=material(0x244b9c,.5,.32),dark=material(0x30384b,.38,.42);
  // Simplified Atlas V 541 stack: Common Core Booster, four strap-on SRBs, Centaur and fairing.
  mesh(new THREE.CylinderGeometry(.24,.29,1.9,24),white,[0,-.2,0],g);
  mesh(new THREE.CylinderGeometry(.245,.245,.22,24),orange,[0,.78,0],g);
  mesh(new THREE.CylinderGeometry(.22,.22,.7,24),ivory,[0,1.23,0],g);
  mesh(new THREE.CylinderGeometry(.19,.22,.82,24),white,[0,1.98,0],g);
  mesh(new THREE.ConeGeometry(.19,.72,24),ivory,[0,2.75,0],g);
  mesh(new THREE.CylinderGeometry(.245,.255,.14,24),blue,[0,-1.16,0],g);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a)*.37,z=Math.sin(a)*.37;
    mesh(new THREE.CylinderGeometry(.075,.085,1.72,12),ivory,[x,-.22,z],g);
    mesh(new THREE.ConeGeometry(.075,.2,12),white,[x,.74,z],g);
    mesh(new THREE.CylinderGeometry(.087,.087,.12,12),dark,[x,-1.12,z],g);
    mesh(new THREE.CylinderGeometry(.04,.07,.22,12),dark,[x,-1.27,z],g);
  }
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const seam=mesh(new THREE.BoxGeometry(.012,1.45,.012),material(0x9caabd,.5,.4),[Math.cos(a)*.29,-.14,Math.sin(a)*.29],g);}
  return g;
}

function curveLine(scene,start,control,end,color,opacity=.82){
  const curve=new THREE.QuadraticBezierCurve3(start,control,end),geo=new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
  const line=new THREE.Line(geo,new THREE.LineDashedMaterial({color,dashSize:.12,gapSize:.07,transparent:true,opacity,depthTest:false}));line.computeLineDistances();line.renderOrder=4;scene.add(line);return line;
}

function buildHero() {
  const canvas=document.getElementById('orbit-canvas'); if(!canvas)return;
  const renderer=rendererFor(canvas,true),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(0,0,12);camera.lookAt(0,0,0);
  addLights(scene,.9);const stars=makeStars(scene,1300,30,317),sys=groupAt(scene,[2.15,.05,-1.4]);
  const sun=sphere(.48,0xffd786,.3,0);sun.position.set(-.85,.08,0);sun.material.emissive.set(0xffa746);sun.material.emissiveIntensity=1.1;sys.add(sun);
  const glow=mesh(new THREE.SphereGeometry(.62,32,24),new THREE.MeshBasicMaterial({color:0xffc061,transparent:true,opacity:.08,side:THREE.BackSide}),[-.85,.08,0],sys);
  const earth=texturedPlanet('earth',.58);earth.position.set(1.15,.15,0);sys.add(earth);
  const moon=texturedPlanet('moon',.27);moon.position.set(2.55,.37,.12);sys.add(moon);
  const mars=texturedPlanet('mars',.44);mars.position.set(-3.75,.72,-.1);sys.add(mars);
  const marsAir=mesh(new THREE.SphereGeometry(.48,32,24),new THREE.MeshBasicMaterial({color:0xff835a,transparent:true,opacity:.11,side:THREE.BackSide}),mars.position.toArray(),sys);
  const orbitEarth=makeOrbit(2.15,0x63eaff,.32,1);orbitEarth.position.copy(sun.position);sys.add(orbitEarth);
  const orbitMars=makeOrbit(3.05,0x9c71ff,.22,1.04);orbitMars.position.copy(sun.position);sys.add(orbitMars);
  const earthMoonStart=new THREE.Vector3(1.15+.52,.15,.02),moonArrive=new THREE.Vector3(2.55-.25,.37,.12);
  const earthMarsStart=new THREE.Vector3(1.15-.54,.15,-.03),marsArrive=new THREE.Vector3(-3.75+.4,.72,-.1);
  curveLine(sys,earthMoonStart,new THREE.Vector3(2.15,1.72,.8),moonArrive,0x55e8ff,1);
  curveLine(sys,earthMarsStart,new THREE.Vector3(-1.2,2.15,.9),marsArrive,0xb38aff,.96);
  const satellite=groupAt(sys,[1.12,-1.04,.28]);
  mesh(new THREE.BoxGeometry(.24,.24,.35),material(0xd8e6f7,.7,.3),[0,0,0],satellite);
  for(const dir of [-1,1]){const panel=mesh(new THREE.BoxGeometry(.72,.025,.32),material(0x2256a2,.48,.35,{emissive:0x0a347f,emissiveIntensity:.4}),[dir*.5,0,0],satellite);
    const gridMat=new THREE.LineBasicMaterial({color:0x55e8ff,transparent:true,opacity:.7});for(let i=0;i<4;i++){const x=dir*.5-.28+i*.18;panel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.018,-.14),new THREE.Vector3(x,.018,.14)]),gridMat));}}
  const rocket=createAtlasV();rocket.scale.setScalar(.34);rocket.position.set(.15,-1.42,.65);rocket.rotation.z=-.04;sys.add(rocket);
  curveLine(sys,new THREE.Vector3(.15,-.49,.68),new THREE.Vector3(.52,-.48,.9),new THREE.Vector3(.75,-.12,.18),0x55e8ff,.92);
  // Each label is projected from the same 3D object it names, so it stays attached at every size.
  const labelAnchors=[[document.querySelector('.orbit-earth'),earth],[document.querySelector('.orbit-moon'),moon],[document.querySelector('.orbit-mars'),mars]].filter(pair=>pair[0]);
  const projected=new THREE.Vector3();
  const resize=()=>{const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=12+Math.max(0,.82-camera.aspect)*9;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const animate=()=>{requestAnimationFrame(animate);if(!reduced){sys.rotation.y+=.0007;earth.rotation.y+=.001;moon.rotation.y+=.0007;mars.rotation.y+=.0008;rocket.rotation.y+=.0003;stars.rotation.y+=.00002;}
    renderer.render(scene,camera);const rect=canvas.getBoundingClientRect();for(const [label,object] of labelAnchors){object.getWorldPosition(projected);projected.project(camera);label.style.left=((projected.x*.5+.5)*rect.width)+'px';label.style.top=((-projected.y*.5+.5)*rect.height)+'px';label.style.visibility=projected.z<1?'visible':'hidden';}}
  ;animate();
}

function buildMissionScene() {
  const canvas=document.getElementById('mission-canvas');if(!canvas)return;
  const renderer=rendererFor(canvas,false),scene=new THREE.Scene();scene.background=new THREE.Color(0x070a1d);
  scene.fog=new THREE.FogExp2(0x070a1d,.025);
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,2.55,7);camera.lookAt(0,.1,0);
  addLights(scene,1.08);const stars=makeStars(scene,700,24,781);
  const world=groupAt(scene,[0,.15,-5.6]);
  const earthWorld=texturedPlanet('earth',1.45);earthWorld.position.set(-2.35,1.38,-.2);earthWorld.visible=false;world.add(earthWorld);
  const orbitEarth=makeOrbit(1.92,0x55e8ff,.25,1.05);orbitEarth.position.copy(earthWorld.position);orbitEarth.rotation.x=.32;orbitEarth.visible=false;world.add(orbitEarth);
  const moon=texturedPlanet('moon',1.45);moon.position.set(-2.35,1.38,-.2);world.add(moon);
  const mars=texturedPlanet('mars',1.55);mars.position.set(2.6,1.15,-.35);world.add(mars);
  const orbitMoon=makeOrbit(1.95,0x83eaff,.33,1.05);orbitMoon.position.copy(moon.position);orbitMoon.rotation.x=.35;world.add(orbitMoon);
  const orbitMars=makeOrbit(2.06,0xba81ff,.25,1.08);orbitMars.position.copy(mars.position);orbitMars.rotation.x=.55;world.add(orbitMars);mars.visible=false;orbitMars.visible=false;
  const terrain=new THREE.Group();scene.add(terrain);addTerrain(terrain,'moon');
  const terrainMaterials=captureMaterials(terrain),earthMaterials=captureMaterials(earthWorld),moonMaterials=captureMaterials(moon),marsMaterials=captureMaterials(mars);
  const apollo=groupAt(scene,[1.5,-.88,-.35]);
  const ascent=mesh(new THREE.CylinderGeometry(.24,.35,.72,6),material(0xd8c69b,.55,.45),[0,.3,0],apollo);ascent.rotation.z=.02;
  mesh(new THREE.CylinderGeometry(.3,.42,.3,8),material(0xc2aa7c,.55,.4),[0,-.18,0],apollo);
  const apolloTop=mesh(new THREE.ConeGeometry(.24,.4,6),material(0xe8d6aa,.44,.4),[0,.86,0],apollo);apolloTop.rotation.y=.3;
  const apolloLegMat=material(0xb3a27f,.6,.4);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;apollo.add(cylinderBetween(new THREE.Vector3(0,-.12,0),new THREE.Vector3(Math.cos(a)*.56,-.58,Math.sin(a)*.56),.025,apolloLegMat));mesh(new THREE.BoxGeometry(.23,.045,.18),apolloLegMat,[Math.cos(a)*.58,-.6,Math.sin(a)*.58],apollo);}
  const figure=groupAt(apollo,[.64,-.3,.1]);
  mesh(new THREE.SphereGeometry(.11,14,10),material(0xf2f2ea,.18,.4),[0,.32,0],figure);
  mesh(new THREE.CylinderGeometry(.12,.16,.4,12),material(0xf2f2ea,.3,.5),[0,.05,0],figure);
  apollo.visible=false;
  const surveyorRocket=createAtlas();surveyorRocket.scale.setScalar(.48);surveyorRocket.position.set(0,-.18,-1.1);surveyorRocket.rotation.z=-.04;surveyorRocket.visible=false;scene.add(surveyorRocket);
  const ingenuityRocket=createAtlasV();ingenuityRocket.scale.setScalar(.4);ingenuityRocket.position.set(-1.18,-.28,-1.05);ingenuityRocket.rotation.z=-.02;ingenuityRocket.visible=false;scene.add(ingenuityRocket);

  let currentMission='surveyor',targetExplode=0,currentExplode=0,currentProgress=0,rotating=true,dragging=false,lastX=0;
  let model=createSurveyor();scene.add(model);
  let modelMaterials=captureMaterials(model);
  const surveyorRocketMaterials=captureMaterials(surveyorRocket),ingenuityRocketMaterials=captureMaterials(ingenuityRocket),apolloMaterials=captureMaterials(apollo);
  let rotorAngle=0,modelYaw=0,modelPitch=0;
  let focusY=0,currentFocusY=0;
  function setMission(name){if(name===currentMission)return;currentMission=name;scene.remove(model);model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(typeof m?.dispose==='function')m.dispose();}});model=name==='ingenuity'?createIngenuity():createSurveyor();scene.add(model);modelMaterials=captureMaterials(model);targetExplode=0;currentExplode=0;currentProgress=0;terrain.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(typeof m?.dispose==='function')m.dispose();}});terrain.clear();addTerrain(terrain,name==='ingenuity'?'mars':'moon');terrainMaterials.splice(0,terrainMaterials.length,...captureMaterials(terrain));apollo.visible=false;surveyorRocket.visible=false;ingenuityRocket.visible=false;earthWorld.visible=false;orbitEarth.visible=false;moon.visible=name==='surveyor';orbitMoon.visible=name==='surveyor';mars.visible=name==='ingenuity';orbitMars.visible=name==='ingenuity';focusY=0;}
  function updateMission(mission,step){setMission(mission);const phase=Number(step)||0;currentProgress=(phase+.5)/3;targetExplode=currentProgress;
    if(mission==='surveyor'){focusY=phase===1?.12:0;}
    else{focusY=phase===1?.35:0;}
    const idx=mission==='surveyor'?phase:phase+4;document.querySelector('.scene-shell').dataset.phase=String(idx);
  }
  document.addEventListener('mission-scene',e=>updateMission(e.detail.mission,e.detail.step));
  document.addEventListener('mission-progress',e=>{if(e.detail.mission!==currentMission)updateMission(e.detail.mission,e.detail.step);currentProgress=clamp(e.detail.progress);targetExplode=currentProgress;});
  document.addEventListener('scene-rotation',e=>{rotating=!e.detail.paused;});
  function onPointerDown(e){dragging=true;lastX=e.clientX;canvas.setPointerCapture?.(e.pointerId);}
  function onPointerMove(e){if(!dragging)return;const dx=e.clientX-lastX;lastX=e.clientX;modelYaw+=dx*.008;}
  function onPointerUp(){dragging=false;}
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);
  const resize=()=>{const w=canvas.clientWidth||320,h=canvas.clientHeight||700;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=Math.max(7,2.9/camera.aspect);camera.position.y=focusY+Math.min(3.1,Math.max(2.05,camera.position.z*.42));camera.lookAt(0,focusY,0);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function updateParts(){
    const parts=model.userData.parts||[];
    parts.forEach((part,i)=>{const v=part.userData.explode;if(!v)return;const amount=currentExplode*smooth((i%3===0?.68:i%3===1?.88:1));part.position.x=part.userData.baseX??(part.userData.baseX=part.position.x);part.position.y=part.userData.baseY??(part.userData.baseY=part.position.y);part.position.z=part.userData.baseZ??(part.userData.baseZ=part.position.z);part.position.set(part.userData.baseX+v.x*amount,part.userData.baseY+v.y*amount,part.userData.baseZ+v.z*amount);});
    const rotors=model.userData.rotors||[];rotors.forEach((rotor,i)=>{rotor.rotation.y=rotorAngle*(i===0?1:-1);});
    const rover=model.userData.rover;if(rover){const lift=clamp((currentExplode-.1)*1.55);rover.position.y=1.35+lift*.22;rover.position.z=-1.5-lift*.12;rover.visible=currentMission==='ingenuity'&&targetExplode<.69;}
    model.rotation.y=modelYaw+(rotating&&!reduced?Math.sin(performance.now()*.00018)*.25:0);
    model.rotation.x=modelPitch+Math.sin(performance.now()*.00025)*.025;
    model.position.y=-.05+Math.sin(performance.now()*.00065)*.025;
  }
  const animate=()=>{requestAnimationFrame(animate);if(!reduced){rotorAngle+=currentMission==='ingenuity'?.012:.002;stars.rotation.y+=.000045;}currentExplode+=(targetExplode-currentExplode)*.045;updateParts();
    const launch=smooth(clamp((currentProgress-.24)/.12))*(1-smooth(clamp((currentProgress-.64)/.12))),flightModelOpacity=currentMission==='surveyor'?1-launch:1;
    terrain.visible=1-launch>.015;fadeMaterials(terrainMaterials,1-launch);
    earthWorld.visible=launch>.015;fadeMaterials(earthMaterials,launch);orbitEarth.visible=launch>.08;
    moon.visible=currentMission==='surveyor'&&1-launch>.015;orbitMoon.visible=currentMission==='surveyor'&&1-launch>.08;fadeMaterials(moonMaterials,1-launch);
    mars.visible=currentMission==='ingenuity';orbitMars.visible=currentMission==='ingenuity';fadeMaterials(marsMaterials,currentMission==='ingenuity'?1:0);
    model.visible=currentMission==='ingenuity'||flightModelOpacity>.015;fadeMaterials(modelMaterials,flightModelOpacity);
    surveyorRocket.visible=currentMission==='surveyor'&&launch>.015;fadeMaterials(surveyorRocketMaterials,launch);
    ingenuityRocket.visible=currentMission==='ingenuity'&&launch>.015;fadeMaterials(ingenuityRocketMaterials,launch);
    apollo.visible=currentMission==='surveyor'&&currentProgress>.68;fadeMaterials(apolloMaterials,currentMission==='surveyor'?smooth(clamp((currentProgress-.68)/.12)):0);
    currentFocusY+=(focusY-currentFocusY)*.07;camera.position.y=currentFocusY+Math.min(3.1,Math.max(2.05,camera.position.z*.42));camera.lookAt(0,currentFocusY,0);world.rotation.y=reduced?0:Math.sin(performance.now()*.00008)*.05;renderer.render(scene,camera);};
  animate();
}

buildHero();
buildMissionScene();
