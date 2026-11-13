import * as THREE from './three.module.js';
import { GLTFLoader } from './model_assets/vendor/loaders/GLTFLoader.js';
import { createObstacle } from './obstacles.js';
import { createTrainModel } from './trains.js';
import { TRAIN_LENGTH, WAGON_ROOF, RAMP_END, GROUND_JUMP_SPEED, GRAVITY, trainSurface, canStandOnTrain, hitsTrain } from './train-physics.js';
import { createCorridor, corridorAt, speedAt } from './level-generation.js';

const $ = id => document.getElementById(id);
const world = $('world'), overlay = $('overlay'), start = $('start'), scoreEl = $('score'), coinsEl = $('coins');
start.disabled=true;start.textContent='ЗАГРУЗКА МОДЕЛЕЙ…';
const loader=new GLTFLoader();
let freightModel, locomotiveModel, characterAsset, slideAsset;
try{const [freight,locomotive,character,slideModel]=await Promise.all([loader.loadAsync('./model_assets/freight_ramp.glb'),loader.loadAsync('./model_assets/locomotive.glb'),loader.loadAsync('./character_assets/incoming/character_colored_v2.glb'),loader.loadAsync('./character_assets/incoming/character_running_slide.glb')]);freightModel=freight.scene;locomotiveModel=locomotive.scene;characterAsset=character;slideAsset=slideModel;if(!character.animations.length||!slideModel.animations.length)throw new Error('Не найдена анимация персонажа');start.disabled=false;start.innerHTML='ИГРАТЬ <span>↗</span>'}catch(error){$('description').textContent='Не удалось загрузить игровые модели. Обнови страницу и проверь запуск через локальный сервер.';start.textContent='ОШИБКА ЗАГРУЗКИ';console.error(error);throw error}
function trainModel(type){if(type==='train-still'){const wagon=createTrainModel(false,false);wagon.scale.y=WAGON_ROOF/1.64;return wagon}const wrapper=new THREE.Group(),model=(type==='train-ramp'?freightModel:locomotiveModel).clone(true);if(type==='train-ramp'){model.position.z=TRAIN_LENGTH/2;model.scale.y=WAGON_ROOF/1.91}wrapper.add(model);if(type==='train-moving')for(let i=1;i<=2;i++){const wagon=createTrainModel(false,false);wagon.scale.y=WAGON_ROOF/1.64;wagon.position.z=-TRAIN_LENGTH*i;wrapper.add(wagon)}return wrapper}
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x292249); scene.fog = new THREE.Fog(0x292249, 28, 105);
const camera = new THREE.PerspectiveCamera(48, 1, .1, 180);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; world.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc3afff, 0x392347, 2)); const light = new THREE.DirectionalLight(0xffd9c1, 2.3); light.position.set(-4,12,8); scene.add(light);
const mat = color => new THREE.MeshStandardMaterial({color, roughness:.78});
const road=mat(0x262947), edge=mat(0x7864a6), orange=mat(0xf26936), cream=mat(0xffe0ac), gold=mat(0xffbd38), dark=mat(0x302440), violet=mat(0x71518e), pink=mat(0xee8bd0), white=mat(0xece5f4);
function box(w,h,d,m,x=0,y=0,z=0,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
box(10,.25,180,road,0,-.16,-60); box(.16,.04,180,edge,-1.65,.01,-60); box(.16,.04,180,edge,1.65,.01,-60);
for(const x of [-5.2,5.2]){box(.25,.4,180,violet,x,.1,-60);box(.07,.08,180,pink,x,.34,-60)}
const player=new THREE.Group();scene.add(player);const character=characterAsset.scene;character.scale.setScalar(1.4);character.rotation.y=Math.PI;player.add(character);
const characterMixer=new THREE.AnimationMixer(character);
const runAction=characterMixer.clipAction(characterAsset.animations[0]);
const slideAction=characterMixer.clipAction(slideAsset.animations[0]);
slideAction.setLoop(THREE.LoopOnce,1);slideAction.clampWhenFinished=true;
// The imported clip keeps running for several frames after the character has
// stood up. Return control at that point, not at the end of the FBX clip.
const slideDuration=slideAsset.animations[0].duration, slideFade=.16, slideStandTail=.34;
let slideReturning=false;
runAction.play();characterMixer.update(0);
let state='ready', lane=1, x=0, jump=0, velocity=0, grounded=true, slide=0, distance=0, coins=0, speed=14, objects=[], nextRow=24, corridor=createCorridor(), last=0, scenery=[];
let rampContact=null;
const lanes=[-3.3,0,3.3];
function obstacle(type,l,z){const group=createObstacle(type);group.position.set(lanes[l],0,z);scene.add(group);objects.push({group,type,l,checked:false});}
const coinGeo=new THREE.CylinderGeometry(.28,.28,.1,12);coinGeo.rotateX(Math.PI/2);
function addCoin(l,z,y=.85,parent=null){const mesh=new THREE.Mesh(coinGeo,gold);mesh.position.set(parent?0:lanes[l],y,z);(parent?parent.group:scene).add(mesh);objects.push({group:mesh,type:'coin',l,parent,checked:false})}
function addTrain(type,l,z){const group=trainModel(type);group.position.set(lanes[l],0,z);scene.add(group);const item={group,type,l};objects.push(item);return item}
function addTrainCoins(train){const {type,l}=train;const offsets=type==='train-ramp'?[8,7,6,5,4,2,0,-2]:type==='train-moving'?[2,0,-2,-5,-7,-9,-11,-13,-15]:[2,0,-2];for(const offset of offsets){const height=trainSurface(type,offset);if(height>0)addCoin(l,offset,height+.85,train)}}
function makeRow(z){const protectedLanes=corridorAt(corridor,distance);const available=[0,1,2].filter(l=>!protectedLanes.includes(l));const trainRow=Math.random()<.4;
  if(trainRow){const l=available[Math.floor(Math.random()*available.length)],kind=['train-moving','train-still','train-ramp'][Math.floor(Math.random()*3)];const train=addTrain(kind,l,kind==='train-moving'?z*(speed+6)/speed:z);if(kind==='train-ramp'&&Math.random()<.8)addTrainCoins(train);
    if(kind==='train-ramp'&&available.length>1&&Math.random()<.7){const other=available.find(n=>n!==l),type=Math.random()<.5?'train-moving':'train-still',companion=addTrain(type,other,type==='train-moving'?z*(speed+6)/speed:z);if(Math.random()<.75)addTrainCoins(companion)}
  }else{for(const l of available){if(Math.random()>=.85)continue;const type=['low','high','block'][Math.floor(Math.random()*3)];obstacle(type,l,z);if(type==='high'&&Math.random()<.7){for(let i=-2;i<=2;i++)addCoin(l,z+i*1.3,.65)}else if(type==='low'&&Math.random()<.7){const step=speed*(2*GROUND_JUMP_SPEED/GRAVITY)/6;for(let i=-3;i<=3;i++)addCoin(l,z+i*step,.85+1.35*Math.sin(Math.PI*(i+3)/6))}}}
  for(const l of protectedLanes)if(Math.random()<.65)for(let i=0;i<4;i++)addCoin(l,z-i*1.8,.85);
  return trainRow;
}
function decor(z){const group=new THREE.Group(); for(const side of [-1,1]){const sx=side*(8+Math.random()*3);box(1,.9,1,violet,sx,.45,0,group);const tree=new THREE.Mesh(new THREE.SphereGeometry(1.1,8,6),violet);tree.position.set(sx,2.4,0);group.add(tree);box(.25,2,.25,dark,sx,1,0,group);box(.25,3,.25,dark,side*6.2,1.5,0,group);box(.9,.9,.9,pink,side*6.2,3.2,0,group)}group.position.z=z;scene.add(group);scenery.push(group)}
for(let i=0;i<14;i++)decor(-i*10);
function clear(){for(const o of objects)scene.remove(o.group);objects=[]}
function reset(){clear(); lane=1;x=0;jump=0;velocity=0;grounded=true;rampContact=null;slide=0;slideReturning=false;distance=0;coins=0;speed=14;nextRow=24;corridor=createCorridor();scoreEl.textContent='0';coinsEl.textContent='0'; player.position.set(0,0,0); player.scale.set(1,1,1);characterMixer.stopAllAction();runAction.reset().setEffectiveWeight(1).play();characterMixer.update(0);state='playing';overlay.classList.add('hidden');last=performance.now()}
function end(){state='over';const score=Math.floor(distance);let best=0;try{best=Number(localStorage.getItem('festivalRunnerBest')||0); if(score>best){best=score;localStorage.setItem('festivalRunnerBest',String(best))}}catch{}; $('description').textContent='Забег окончен. Попробуй ещё раз!';$('result').hidden=false;$('result').textContent=`${score} очков · ${coins} монет · рекорд ${best}`;start.innerHTML='ЕЩЁ РАЗ <span>↗</span>';overlay.classList.remove('hidden');window.dispatchEvent(new CustomEvent('festival-runner:gameover',{detail:{gameId:'subway',score,coins}}));if(window.parent!==window)window.parent.postMessage({type:'festival-runner:gameover',score},window.location.origin);}
function action(a){if(state!=='playing')return;if(a==='left')lane=Math.max(0,lane-1);if(a==='right')lane=Math.min(2,lane+1);if(a==='up'&&grounded&&slide<=0){velocity=GROUND_JUMP_SPEED;grounded=false;rampContact=null}if(a==='down'&&grounded&&slide<=0){slide=slideDuration;slideReturning=false;runAction.stopFading().setEffectiveWeight(1).play();slideAction.stopFading().reset().setEffectiveWeight(1).play().crossFadeFrom(runAction,slideFade,false)}}
function pause(){if(state==='playing'){state='paused';$('description').textContent='Игра на паузе';$('result').hidden=true;start.innerHTML='ПРОДОЛЖИТЬ <span>↗</span>';overlay.classList.remove('hidden')}else if(state==='paused'){state='playing';overlay.classList.add('hidden');last=performance.now()}}
start.addEventListener('click',()=>state==='paused'?pause():reset());$('pause').addEventListener('click',pause);
window.addEventListener('keydown',e=>{const actions={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',' ':'up',ArrowDown:'down',s:'down'};if(actions[e.key]){e.preventDefault();action(actions[e.key])}if(e.key==='Escape')pause()});
let touch=null;world.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY}});world.addEventListener('pointerup',e=>{if(!touch)return;let dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;action(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))});world.addEventListener('pointercancel',()=>touch=null);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function resize(){const w=world.clientWidth,h=world.clientHeight;camera.aspect=w/h;camera.position.set(0,w/h<1?7.2:6.2,w/h<1?13.5:11.5);camera.lookAt(0,1,-9);camera.updateProjectionMatrix();renderer.setSize(w,h,false)}window.addEventListener('resize',resize);resize();
const coinWorld=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.05);last=now;if(state==='playing'){speed=speedAt(distance);distance+=speed*dt;scoreEl.textContent=Math.floor(distance); x+=(lanes[lane]-x)*Math.min(1,dt*12);player.position.x=x;
if(distance>=nextRow){const train=makeRow(-75);nextRow=distance+(train?32:20)+Math.random()*4}
for(const o of objects){if(!o.parent)o.group.position.z+=(speed+(o.type==='train-moving'?6:0))*dt;if(o.type==='coin')o.group.rotation.y+=dt*3}
const previousHeight=jump, wasGrounded=grounded;velocity-=GRAVITY*dt;jump+=velocity*dt;grounded=false;
let surface=0,supportingRamp=null;for(const o of objects){if(o.type.startsWith('train-')&&Math.abs(o.group.position.x-x)<1.08){const z=-o.group.position.z;const height=trainSurface(o.type,z);const rampStep=speed*dt*WAGON_ROOF/(RAMP_END-TRAIN_LENGTH/2)+.05;if(canStandOnTrain(previousHeight,jump,velocity<=0,wasGrounded,height,o.type,rampStep,o===rampContact)){if(height>=surface){surface=height;supportingRamp=o.type==='train-ramp'?o:null}}}}
if(jump<=surface){jump=surface;velocity=0;grounded=true;rampContact=supportingRamp}else rampContact=null;
slide=Math.max(0,slide-dt);player.position.y=jump;if(slide>0&&slide<=slideStandTail&&!slideReturning){slide=0;slideReturning=true;slideAction.stopFading();runAction.stopFading().reset().setEffectiveWeight(1).play().crossFadeFrom(slideAction,slideFade,false)}characterMixer.update(dt);
for(const o of objects){if(o.parent?.remove){o.remove=true;continue}if(o.type.startsWith('train-')){if(Math.abs(o.group.position.x-x)<1.08&&hitsTrain(o.type,-o.group.position.z,jump)){end();break}}else if(o.type==='coin'){o.group.getWorldPosition(coinWorld);const playerCenter=jump+(slide>0?.5:.85);if(Math.abs(coinWorld.z)<.85&&Math.abs(coinWorld.x-x)<1.2&&Math.abs(coinWorld.y-playerCenter)<.9){coins++;coinsEl.textContent=coins;o.group.removeFromParent();o.remove=true}else if(!o.parent&&coinWorld.z>12){o.group.removeFromParent();o.remove=true}}else if(!o.checked&&Math.abs(o.group.position.z)<.7&&Math.abs(o.group.position.x-x)<1.2){o.checked=true;if(!rampContact&&((o.type==='block'&&jump<2.4)||(o.type==='low'&&jump<.85)||(o.type==='high'&&slide<=0&&jump<2.4))){end();break}}if(o.type!=='coin'&&o.group.position.z>(o.type==='train-moving'?24:12)){o.group.removeFromParent();o.remove=true}}objects=objects.filter(o=>!o.remove);for(const d of scenery){d.position.z+=speed*dt;if(d.position.z>15)d.position.z-=140}}
renderer.render(scene,camera)}requestAnimationFrame(frame);
