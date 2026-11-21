import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const $ = (id) => document.getElementById(id);
const viewer = $("viewer"), loading = $("loading");
const state = { paint:"Arctic White", color:"#e8e9e7", finish:"gloss", wheel:"sport", brake:"#c7192d", carbon:true, wing:true, tint:true, lights:true, height:"Sport", track:false };
const wheelNames = {sport:"RS Sport", silver:"GT Silver", gold:"Neodyme"};
const finishNames = {gloss:"High gloss", matte:"Matte", metallic:"Metallic"};
let scene, camera, renderer, controls, car, paintMat, glassMat, carbonMat, brakeMat, wingGroup;
let lamps = [], wheels = [], ready = false, autoRotate = true, resizeObserver;

function loadingMessage(title, detail) {
  loading.style.display = "flex";
  loading.replaceChildren();
  const spinner = document.createElement("span"); spinner.className = "loader";
  const heading = document.createElement("b"); heading.textContent = title;
  const sub = document.createElement("small"); sub.textContent = detail;
  loading.append(spinner, heading, sub);
}
function loadingError(error) {
  loading.style.display = "flex"; loading.replaceChildren();
  const wrap = document.createElement("div"); wrap.style.cssText = "max-width:340px;padding:22px;text-align:center;line-height:1.6";
  const title = document.createElement("b"); title.textContent = "3D preview unavailable"; title.style.display = "block";
  const msg = document.createElement("p"); msg.textContent = (error?.message || "WebGL could not start.") + " Check your connection and browser WebGL support. Customization controls remain available."; msg.style.color = "#aab2bb";
  const retry = document.createElement("button"); retry.className = "choice selected"; retry.textContent = "Retry 3D preview";
  retry.addEventListener("click", start3D);
  wrap.append(title, msg, retry); loading.append(wrap);
}
function setSelected(selector, key, value) {
  document.querySelectorAll(selector).forEach(el => el.classList.toggle("selected", el.dataset[key] === value));
}
function summary() {
  $("paintName").textContent = state.paint;
  $("sumPaint").textContent = `${state.paint} · ${finishNames[state.finish]}`;
  $("sumWheel").textContent = wheelNames[state.wheel];
  const d = [];
  if (state.carbon) d.push("Carbon");
  if (state.wing) d.push("GT Wing");
  if (state.tint) d.push("Tint");
  if (state.lights) d.push("LED");
  $("sumDetails").textContent = d.join(" · ") || "Standard";
  $("sumStance").textContent = state.height + (state.track ? " · Track" : "");
  $("heightValue").textContent = state.height;
}
function apply3D() {
  if (!ready) return;
  paintMat.color.set(state.color);
  paintMat.roughness = state.finish === "matte" ? .72 : state.finish === "metallic" ? .16 : .23;
  paintMat.metalness = state.finish === "matte" ? .08 : state.finish === "metallic" ? .78 : .42;
  paintMat.clearcoat = state.finish === "matte" ? .12 : 1;
  carbonMat.color.set(state.carbon ? 0x15191e : 0x454a50);
  glassMat.color.set(state.tint ? 0x101c29 : 0x64717d);
  glassMat.opacity = state.tint ? .94 : .48;
  brakeMat.color.set(state.brake);
  wingGroup.visible = state.wing;
  lamps.forEach(l => { l.visible = state.lights; l.material.emissiveIntensity = state.lights ? .75 : 0; });
  wheels.forEach(w => {
    const color = state.wheel === "silver" ? 0xb9bdc2 : state.wheel === "gold" ? 0x9d7849 : 0x24282d;
    w.face.material.color.set(color);
    w.spokes.forEach((spoke, i) => {
      spoke.material.color.set(color);
      spoke.visible = i < (state.wheel === "silver" ? 5 : state.wheel === "gold" ? 7 : 10);
      spoke.scale.x = state.wheel === "gold" ? 1.12 : 1;
    });
    w.group.position.x = w.baseX + (state.track ? Math.sign(w.baseX) * .075 : 0);
  });
  car.position.y = state.height === "Low" ? -.11 : state.height === "High" ? .10 : 0;
}
function update() { summary(); apply3D(); }
function configurationText() {
  return [
    "REVORA — 911 GT3 RS CONFIGURATION", "",
    "Model: 911 GT3 RS-inspired concept",
    `Exterior: ${state.paint} (${state.color})`,
    `Finish: ${finishNames[state.finish]}`,
    `Wheels: ${wheelNames[state.wheel]}`,
    `Brake calipers: ${state.brake}`,
    `Carbon accents: ${state.carbon ? "Yes" : "No"}`,
    `Rear GT wing: ${state.wing ? "Yes" : "No"}`,
    `Window tint: ${state.tint ? "Yes" : "No"}`,
    `Front LED signature: ${state.lights ? "Yes" : "No"}`,
    `Ride height: ${state.height}`,
    `Track setup: ${state.track ? "Yes" : "No"}`, "",
    "Independent concept configurator. Not affiliated with Porsche AG."
  ].join("\n");
}
function downloadBuild() {
  const url = URL.createObjectURL(new Blob([configurationText()], {type:"text/plain;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = "REVORA-911-build.txt";
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyBuild() {
  const button = $("share");
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(configurationText());
    else {
      const field = document.createElement("textarea"); field.value = configurationText();
      field.style.cssText = "position:fixed;opacity:0"; document.body.append(field); field.select();
      const ok = document.execCommand("copy"); field.remove(); if (!ok) throw Error("Clipboard blocked");
    }
    button.textContent = "Copied ✓";
  } catch { button.textContent = "Copy blocked"; }
  setTimeout(() => button.textContent = "Copy configuration", 1800);
}
function setView(pos, label, buttonId) {
  if (!camera || !controls) return;
  camera.position.set(...pos); controls.target.set(0,.85,0); controls.update();
  document.querySelectorAll(".view-tools .tool").forEach(b => b.classList.remove("active"));
  if (buttonId) $(buttonId).classList.add("active");
  $("rotateBtn").classList.toggle("active", autoRotate);
  const labelEl = document.querySelector(".view-label");
  labelEl.firstChild.textContent = label + " ";
}
function resetBuild() {
  Object.assign(state, {paint:"Arctic White",color:"#e8e9e7",finish:"gloss",wheel:"sport",brake:"#c7192d",carbon:true,wing:true,tint:true,lights:true,height:"Sport",track:false});
  setSelected(".swatch","name","Arctic White"); setSelected("[data-finish]","finish","gloss");
  setSelected(".wheel-card","wheel","sport"); setSelected("[data-brake]","brake","#c7192d");
  ["carbon","wing","tint","lights"].forEach(id => $(id).checked = true);
  $("track").checked = false; $("height").value = 0; update();
  setView([7,4.1,8],"EXTERIOR VIEW");
}
function bindUI() {
  document.querySelectorAll(".swatch").forEach(b => b.addEventListener("click", () => {
    state.paint=b.dataset.name; state.color=b.dataset.color; setSelected(".swatch","name",state.paint); update();
  }));
  document.querySelectorAll("[data-finish]").forEach(b => b.addEventListener("click", () => {
    state.finish=b.dataset.finish; setSelected("[data-finish]","finish",state.finish); update();
  }));
  document.querySelectorAll(".wheel-card").forEach(b => b.addEventListener("click", () => {
    state.wheel=b.dataset.wheel; setSelected(".wheel-card","wheel",state.wheel); update();
  }));
  document.querySelectorAll("[data-brake]").forEach(b => b.addEventListener("click", () => {
    state.brake=b.dataset.brake; setSelected("[data-brake]","brake",state.brake); update();
  }));
  ["carbon","wing","tint","lights","track"].forEach(id => $(id).addEventListener("change", e => {state[id]=e.target.checked;update();}));
  $("height").addEventListener("input", e => {state.height=["Low","Sport","High"][Number(e.target.value)+1];update();});
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active",t===b));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active",p.id===b.dataset.tab));
  }));
  $("resetTop").addEventListener("click",resetBuild);
  $("download").addEventListener("click",downloadBuild);
  $("share").addEventListener("click",copyBuild);
  $("rotateBtn").addEventListener("click",() => {autoRotate=!autoRotate;$("rotateBtn").classList.toggle("active",autoRotate);$("rotateBtn").setAttribute("aria-pressed",String(autoRotate));});
  $("frontBtn").addEventListener("click",() => setView([0,3.2,9],"FRONT","frontBtn"));
  $("sideBtn").addEventListener("click",() => setView([9,2.6,0],"SIDE","sideBtn"));
  $("rearBtn").addEventListener("click",() => setView([0,3.1,-9],"REAR","rearBtn"));
}
function createCar() {
  car = new THREE.Group(); scene.add(car);
  paintMat = new THREE.MeshPhysicalMaterial({color:state.color,metalness:.42,roughness:.23,clearcoat:1,clearcoatRoughness:.08});
  const dark = new THREE.MeshStandardMaterial({color:0x11151a,metalness:.6,roughness:.3});
  glassMat = new THREE.MeshPhysicalMaterial({color:0x101c29,metalness:.25,roughness:.12,transparent:true,opacity:.94});
  carbonMat = new THREE.MeshStandardMaterial({color:0x15191e,metalness:.72,roughness:.3});
  const rubber = new THREE.MeshStandardMaterial({color:0x090a0c,roughness:.92});
  const rim = new THREE.MeshStandardMaterial({color:0x24282d,metalness:.8,roughness:.25});
  brakeMat = new THREE.MeshStandardMaterial({color:state.brake,metalness:.4,roughness:.35});
  const add = (parent,geo,mat,pos,rot) => {
    const m = new THREE.Mesh(geo,mat); m.position.set(...pos); if(rot)m.rotation.set(...rot);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  // Body rings are [half-width, half-height, longitudinal position].
  const rings = [[.70,.68,-2.35],[.90,.91,-2.05],[1.02,1.02,-1.35],[1.04,1.02,0],[.99,.96,1.35],[.87,.86,2.05],[.70,.68,2.35]];
  const vertices=[], indices=[], slices=40;
  rings.forEach(([w,h,z]) => {for(let j=0;j<=slices;j++){const a=2*Math.PI*j/slices;vertices.push(Math.cos(a)*w,.62+Math.sin(a)*h*.47,z);}});
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<slices;j++){const a=i*(slices+1)+j,b=a+slices+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  add(car,geo,paintMat,[0,0,0]);
  add(car,new THREE.BoxGeometry(1.62,.12,.92),paintMat,[0,.88,1.68]);
  add(car,new THREE.BoxGeometry(1.8,.24,.16),carbonMat,[0,.48,2.23]);
  add(car,new THREE.BoxGeometry(1.62,.12,.22),dark,[0,.57,2.27]);
  lamps=[];
  [-.62,.62].forEach(x=>{const mat=new THREE.MeshStandardMaterial({color:0xe7efff,emissive:0x9bbcff,emissiveIntensity:.75});const l=add(car,new THREE.BoxGeometry(.42,.08,.18),mat,[x,.92,2.02]);l.rotation.z=x<0?-.08:.08;lamps.push(l);add(car,new THREE.BoxGeometry(.13,.09,.48),carbonMat,[x*1.22,.53,2.03]);});
  const cabin=new THREE.Group();car.add(cabin);
  add(cabin,new THREE.BoxGeometry(1.28,.64,1.42),paintMat,[0,1.39,-.18],[.18,0,0]);
  add(cabin,new THREE.BoxGeometry(1.31,.5,1.12),glassMat,[0,1.42,.12],[.18,0,0]);
  add(cabin,new THREE.BoxGeometry(1.3,.42,.62),glassMat,[0,1.4,-.78],[-.36,0,0]);
  add(car,new THREE.BoxGeometry(1.55,.12,.22),carbonMat,[0,.73,-1.02]);
  [-1,1].forEach(s=>{
    add(car,new THREE.BoxGeometry(.055,.45,1),glassMat,[s*.79,1.34,-.12],[0,0,s*.05]);
    add(car,new THREE.BoxGeometry(.2,.12,.23),carbonMat,[s*.96,1.1,.55],[0,0,s*.15]);
    add(car,new THREE.BoxGeometry(.14,.2,.52),dark,[s*.94,.64,-.3]);
    add(car,new THREE.BoxGeometry(.12,.14,1.8),carbonMat,[s*.91,.37,-.05]);
    add(car,new THREE.BoxGeometry(.18,.18,.5),dark,[s*.93,.58,-1.05]);
    add(car,new THREE.BoxGeometry(.18,.28,.72),carbonMat,[s*.98,.62,-1.55],[.1,0,s*.08]);
  });
  add(car,new THREE.BoxGeometry(1.72,.25,.32),carbonMat,[0,.42,-2.13]);
  [-.55,.55].forEach(x=>add(car,new THREE.CylinderGeometry(.11,.11,.22,24),rim,[x,.53,-2.24],[Math.PI/2,0,0]));
  wheels=[];
  function wheel(x,z){
    const group=new THREE.Group();group.position.set(x,.57,z);group.baseX=x;car.add(group);
    add(group,new THREE.CylinderGeometry(.49,.49,.28,40),rubber,[0,0,0],[0,0,Math.PI/2]);
    const face=add(group,new THREE.CylinderGeometry(.37,.37,.295,40),rim,[0,0,0],[0,0,Math.PI/2]);
    add(group,new THREE.CylinderGeometry(.105,.105,.31,24),dark,[0,0,0],[0,0,Math.PI/2]);
    add(group,new THREE.CylinderGeometry(.29,.29,.04,32),new THREE.MeshStandardMaterial({color:0x777b80,metalness:.8,roughness:.35}),[.09,0,0],[0,0,Math.PI/2]);
    add(group,new THREE.BoxGeometry(.1,.25,.12),brakeMat,[.14,.16,.22]);
    const spokes=[];
    for(let i=0;i<10;i++){const a=i*Math.PI/5;const sp=add(group,new THREE.BoxGeometry(.045,.34,.045),rim,[0,Math.sin(a)*.18,Math.cos(a)*.18]);sp.rotation.x=-a;spokes.push(sp);}
    wheels.push({group,face,spokes,baseX:x});
  }
  wheel(-.99,1.38);wheel(.99,1.38);wheel(-.99,-1.42);wheel(.99,-1.42);
  wingGroup=new THREE.Group();car.add(wingGroup);
  add(wingGroup,new THREE.BoxGeometry(1.65,.11,.36),carbonMat,[0,1.65,-1.94],[.08,0,0]);
  [-.56,.56].forEach(x=>add(wingGroup,new THREE.BoxGeometry(.08,.72,.12),carbonMat,[x,1.31,-1.85],[.13,0,0]));
  apply3D();
}
function resize() {
  if(!renderer||!camera)return;
  const w=viewer.clientWidth,h=viewer.clientHeight;if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
function animate() {
  requestAnimationFrame(animate);
  if(autoRotate&&car)car.rotation.y+=.0014;
  controls?.update();if(renderer&&scene&&camera)renderer.render(scene,camera);
}
async function start3D() {
  if(ready)return;
  loadingMessage("BUILDING YOUR 3D EXPERIENCE","Connecting to the 3D engine…");
  try {
    if(!window.WebGLRenderingContext)throw Error("This browser does not support WebGL.");
    scene=new THREE.Scene();scene.background=new THREE.Color(0x171d24);scene.fog=new THREE.Fog(0x171d24,15,32);
    camera=new THREE.PerspectiveCamera(34,viewer.clientWidth/viewer.clientHeight,.1,100);camera.position.set(7,4.1,8);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.75));renderer.setSize(viewer.clientWidth,viewer.clientHeight);
    renderer.shadowMap.enabled=innerWidth>700;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.domElement.setAttribute("aria-label","Interactive 3D car preview. Drag to rotate and pinch or scroll to zoom.");
    viewer.insertBefore(renderer.domElement,viewer.querySelector(".view-tools"));
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.target.set(0,.85,0);controls.minDistance=5;controls.maxDistance=14;controls.maxPolarAngle=Math.PI/2.03;controls.enablePan=false;
    scene.add(new THREE.HemisphereLight(0xdce8ff,0x34302a,2.1));
    const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(5,9,6);key.castShadow=innerWidth>700;key.shadow.mapSize.set(1024,1024);scene.add(key);
    const rim=new THREE.DirectionalLight(0x8eb8ff,2.3);rim.position.set(-7,5,-5);scene.add(rim);
    const fill=new THREE.PointLight(0xffd5a1,35,18);fill.position.set(0,4,5);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x171c22,roughness:.82}));floor.rotation.x=-Math.PI/2;floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(4.8,64),new THREE.MeshBasicMaterial({color:0x252c34,transparent:true,opacity:.38}));ground.rotation.x=-Math.PI/2;ground.position.y=-.035;scene.add(ground);
    createCar();ready=true;loading.style.display="none";
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewer);
    renderer.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();loadingError(Error("Graphics context was reset. Close other graphics-heavy tabs and retry."));});
    animate();
  } catch(error) {console.error("REVORA 3D initialization:",error);loadingError(error);}
}
bindUI();update();
loadingMessage("BUILDING YOUR 3D EXPERIENCE","Loading real-time configurator…");
const notice=setTimeout(()=>{if(!ready&&loading.style.display!=="none"){const s=loading.querySelector("small");if(s)s.textContent="Still connecting. Controls are ready; retry if this continues."; }},8000);
start3D().finally(()=>clearTimeout(notice));
