import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowRight, BookOpen, BriefcaseBusiness, Camera, ChevronRight, Clock3, Keyboard, Map, Mic, MousePointer2, Users, X } from 'lucide-react';

type RoomKey='aptitude'|'gd'|'interview';
type Character={id:string;name:string;skin:string;hair:string;shirt:string;trouser:string;accent:string};
const CHARACTERS:Character[]=[
 {id:'arjun',name:'Arjun',skin:'#9b6548',hair:'#17110f',shirt:'#263b52',trouser:'#26303a',accent:'#c7a05a'},
 {id:'meera',name:'Meera',skin:'#b87558',hair:'#241512',shirt:'#7f2f2a',trouser:'#302a35',accent:'#d7ad54'},
 {id:'rahul',name:'Rahul',skin:'#8a573f',hair:'#16100e',shirt:'#536b55',trouser:'#252a2d',accent:'#c7a05a'},
 {id:'nisha',name:'Nisha',skin:'#a96d50',hair:'#2b1815',shirt:'#704a6b',trouser:'#252a35',accent:'#d7ad54'}
];
const ROOM_INFO:Record<RoomKey,{title:string;subtitle:string;icon:React.ElementType;color:string;position:[number,number,number]}>={
 aptitude:{title:'Aptitude Assessment',subtitle:'Placement aptitude classroom',icon:BookOpen,color:'#7f2f2a',position:[-12,0,-6]},
 gd:{title:'Group Discussion',subtitle:'Live discussion conference room',icon:Users,color:'#315b7d',position:[0,0,-13]},
 interview:{title:'Interview Suite',subtitle:'One-to-one interview cabin',icon:BriefcaseBusiness,color:'#8a641f',position:[12,0,-6]}
};

function textSprite(text:string,color='#1b1714',scale=2.5){
 const c=document.createElement('canvas'); c.width=640;c.height=150; const x=c.getContext('2d')!;
 x.fillStyle='rgba(249,246,239,.96)';x.roundRect(10,18,620,114,18);x.fill();
 x.strokeStyle='rgba(127,47,42,.28)';x.lineWidth=3;x.stroke();
 x.fillStyle=color;x.font='bold 42px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,320,75,580);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(scale,scale*.235,1);return s;
}
function mat(color:string|number,roughness=.65,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(w:number,h:number,d:number,m:THREE.Material){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.castShadow=true;q.receiveShadow=true;return q;}

function makeHuman(c:Character,selected=false){
 const g=new THREE.Group();
 const skin=mat(c.skin,.75),hair=mat(c.hair,.9),shirt=mat(c.shirt,.72),trouser=mat(c.trouser,.8),shoe=mat('#171717',.55);
 const neck=box(.18,.18,.18,skin);neck.position.y=1.52;
 const head=new THREE.Mesh(new THREE.SphereGeometry(.39,24,18),skin);head.scale.set(.9,1.12,.92);head.position.y=1.83;head.castShadow=true;
 const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.405,24,12,0,Math.PI*2,0,Math.PI*.52),hair);hairCap.position.set(0,2.02,0);
 const torso=box(.72,.82,.42,shirt);torso.position.y=1.1;
 const collar=box(.25,.08,.44,mat('#f4efe7',.7));collar.position.set(0,1.49,.01);
 const armL=box(.17,.7,.2,shirt),armR=armL.clone();armL.position.set(-.5,1.1,0);armR.position.set(.5,1.1,0);
 const handL=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),skin),handR=handL.clone();handL.position.set(-.5,.72,0);handR.position.set(.5,.72,0);
 const legL=box(.24,.78,.25,trouser),legR=legL.clone();legL.position.set(-.19,.38,0);legR.position.set(.19,.38,0);
 const shoeL=box(.3,.13,.48,shoe),shoeR=shoeL.clone();shoeL.position.set(-.19,.06,.07);shoeR.position.set(.19,.06,.07);
 const eye=mat('#161616',.3),e1=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),eye),e2=e1.clone();e1.position.set(-.13,1.86,.355);e2.position.set(.13,1.86,.355);
 const mouth=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,.02),mat('#6f3028',.8));mouth.position.set(0,1.7,.355);
 g.add(neck,head,hairCap,torso,collar,armL,armR,handL,handR,legL,legR,shoeL,shoeR,e1,e2,mouth);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,24),new THREE.MeshBasicMaterial({color:0x101010,transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;g.add(shadow);
 if(selected){const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.66,32),new THREE.MeshBasicMaterial({color:0xd7ad54,side:THREE.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);}
 const tag=textSprite(selected?'YOU':c.name,selected?'#7f2f2a':'#1b1714',1.9);tag.position.y=2.55;g.add(tag);
 g.userData.parts={armL,armR,legL,legR}; return g;
}
function addWindow(g:THREE.Group,x:number,y:number,z:number,w:number,h:number){
 const glass=box(w,h,.06,new THREE.MeshPhysicalMaterial({color:'#9fb9c2',transparent:true,opacity:.48,roughness:.12,metalness:.05}));glass.position.set(x,y,z);g.add(glass);
 const frame=mat('#343b3e',.45,.4); const v=box(.055,h+.12,.09,frame),hbar=box(w+.12,.055,.09,frame);
 v.position.set(x-w/2,y,z+.02);g.add(v);const v2=v.clone();v2.position.x=x+w/2;g.add(v2);hbar.position.set(x,y-h/2,z+.02);g.add(hbar);const h2=hbar.clone();h2.position.y=y+h/2;g.add(h2);
}
function makeRoom(info:typeof ROOM_INFO[RoomKey],room:RoomKey){
 const g=new THREE.Group();g.position.set(...info.position);g.userData.room=room;
 const floor=box(10,.18,7,mat('#b8aa98',.9));floor.position.y=.09;
 const back=box(10,4.2,.16,mat('#eee9df',.86));back.position.set(0,2.1,-3.45);
 const left=box(.16,4.2,7,mat('#ded5c7',.88));left.position.set(-4.92,2.1,0);
 const right=box(.16,4.2,7,mat('#ded5c7',.88));right.position.set(4.92,2.1,0);
 const roof=box(10,.12,7,mat('#f8f5ee',.9));roof.position.y=4.25;g.add(floor,back,left,right,roof);
 addWindow(g,-2.4,2.35,-3.54,3.6,2);addWindow(g,2.4,2.35,-3.54,3.6,2);
 const door=box(1.25,2.4,.18,mat('#493c34',.7));door.position.set(0,1.2,3.48);g.add(door);
 const sign=textSprite(info.title.toUpperCase(),info.color,3.0);sign.position.set(0,4.85,0);g.add(sign);
 if(room==='aptitude'){
   const board=box(4.3,1.7,.08,mat('#263f3d',.55));board.position.set(0,2.65,-3.63);g.add(board);
   const deskMat=mat('#684f3e',.7);[-2.7,0,2.7].forEach((x,i)=>{const d=box(2.1,.14,.9,deskMat);d.position.set(x,.95,.1);g.add(d);const leg=box(.1,.95,.1,deskMat);[-.85,.85].forEach(dx=>{const a=leg.clone();a.position.set(x+dx,.48,-.22);g.add(a);const b=leg.clone();b.position.set(x+dx,.48,.42);g.add(b);});});
 } else if(room==='gd'){
   const table=new THREE.Mesh(new THREE.CylinderGeometry(2.55,2.35,.22,48),mat('#735946',.65));table.position.y=1.05;g.add(table);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,.9,32),mat('#514238',.7));base.position.y=.52;g.add(base);
   const screen=box(4.4,1.3,.08,mat('#263b48',.4));screen.position.set(0,2.7,-3.63);g.add(screen);
 } else {
   const desk=box(4.8,.18,1.55,mat('#5a4638',.65));desk.position.set(0,1.02,-.65);g.add(desk);
   const panel=box(4.8,1.0,.12,mat('#46372e',.72));panel.position.set(0,.5,-1.3);g.add(panel);
   const monitor=box(1.2,.72,.12,mat('#20272b',.35,.35));monitor.position.set(0,1.5,-1.05);g.add(monitor);
   const screen=box(1.0,.52,.02,mat('#8da8b0',.2,.1));screen.position.set(0,1.5,-1.12);g.add(screen);
 }
 g.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function makeLobby(){
 const g=new THREE.Group();
 const floor=box(38,.16,30,mat('#d6cec1',.8));floor.position.y=.08;g.add(floor);
 const back=box(38,5.4,.2,mat('#e9e3d9',.9));back.position.set(0,2.7,-15);g.add(back);
 const side1=box(.2,5.4,30,mat('#e0d8ca',.9));side1.position.set(-19,2.7,0);g.add(side1);const side2=side1.clone();side2.position.x=19;g.add(side2);
 for(let x=-15;x<=15;x+=5)addWindow(g,x,2.6,-15.12,4.2,3.0);
 const reception=box(6,.9,1.6,mat('#624c3e',.62));reception.position.set(0,.75,-10);g.add(reception);
 const logo=textSprite('MBA CAREER CENTRE','#7f2f2a',4.2);logo.position.set(0,4.8,-14.9);g.add(logo);
 const sofaMat=mat('#667477',.75);
 [-8,8].forEach(x=>{const s=box(4,.65,1.5,sofaMat);s.position.set(x,.42,-7);g.add(s);});
 const plantMat=mat('#536b55',1);[-15,15].forEach(x=>{const pot=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,.65,18),mat('#80654e',.9));pot.position.set(x,.33,-8);g.add(pot);const crown=new THREE.Mesh(new THREE.SphereGeometry(1.1,14,10),plantMat);crown.position.set(x,1.65,-8);g.add(crown);});
 const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(38,30),new THREE.MeshStandardMaterial({color:0xf8f5ee,roughness:.95}));ceiling.rotation.x=Math.PI/2;ceiling.position.y=5.35;g.add(ceiling);
 return g;
}

export const PlacementCampusView:React.FC<{setActiveTab:(tab:'dashboard'|'aptitude'|'gd'|'interview'|'evaluation')=>void;userProfile:any;onOpenLoginModal:()=>void;}>=({setActiveTab,userProfile})=>{
 const mountRef=useRef<HTMLDivElement|null>(null);
 const [characterId,setCharacterId]=useState('arjun');const [characterNames,setCharacterNames]=useState<Record<string,string>>({});
 const [nearRoom,setNearRoom]=useState<RoomKey|null>(null);const [selectedRoom,setSelectedRoom]=useState<RoomKey|null>(null);const [showHelp,setShowHelp]=useState(false);const [gdCameraReady,setGdCameraReady]=useState(false);const gdVideoRef=useRef<HTMLVideoElement|null>(null);
 useEffect(()=>{try{const s=localStorage.getItem('prepai_character');if(s&&CHARACTERS.some(c=>c.id===s))setCharacterId(s);const n=localStorage.getItem('prepai_character_names');if(n)setCharacterNames(JSON.parse(n));}catch{}},[]);
 useEffect(()=>{let stream:MediaStream|null=null;setGdCameraReady(false);if(selectedRoom!=='gd')return;let cancelled=false;(async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}if(gdVideoRef.current){gdVideoRef.current.srcObject=stream;await gdVideoRef.current.play().catch(()=>{});setGdCameraReady(true);}}catch{setGdCameraReady(false);}})();return()=>{cancelled=true;if(stream)stream.getTracks().forEach(t=>t.stop());if(gdVideoRef.current)gdVideoRef.current.srcObject=null;};},[selectedRoom]);
 const character=CHARACTERS.find(c=>c.id===characterId)||CHARACTERS[0];const named=(c:Character)=>({...c,name:characterNames[c.id]||c.name});
 useEffect(()=>{
  if(!mountRef.current)return;const mount=mountRef.current;const scene=new THREE.Scene();scene.background=new THREE.Color('#bfc9cb');scene.fog=new THREE.Fog('#bfc9cb',24,58);
  const camera=new THREE.PerspectiveCamera(46,1,.1,100);camera.position.set(8,8,12);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));renderer.setSize(10,10);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;mount.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#fffaf1','#4d5656',2.4));const key=new THREE.DirectionalLight('#fff2d6',3.2);key.position.set(-12,16,10);key.castShadow=true;key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-25;key.shadow.camera.right=25;key.shadow.camera.top=25;key.shadow.camera.bottom=-25;scene.add(key);
  const fill=new THREE.PointLight('#c9dbe2',1.2,28);fill.position.set(0,4,-4);scene.add(fill);
  scene.add(makeLobby());
  const roomGroups:THREE.Group[]=[];(Object.keys(ROOM_INFO) as RoomKey[]).forEach(r=>{const q=makeRoom(ROOM_INFO[r],r);scene.add(q);roomGroups.push(q);});
  const roomPoints=(Object.keys(ROOM_INFO) as RoomKey[]).map(r=>({room:r,point:new THREE.Vector3(...ROOM_INFO[r].position)}));
  const npcs:[Character,[number,number,number]][]=[[CHARACTERS[1],[-8,0,-2]],[CHARACTERS[2],[7,0,-1]],[CHARACTERS[3],[0,0,-5.5]]];
  const npcGroups=npcs.map(([c,p],i)=>{const a=makeHuman(named(c));a.position.set(...p);a.rotation.y=i%2?-.5:.5;scene.add(a);return a;});
  const player=makeHuman(named(character),true);player.position.set(0,0,6);scene.add(player);
  const target=new THREE.Vector3(0,0,6),keys=new Set<string>();let currentNear:RoomKey|null=null,raf=0;const clock=new THREE.Clock();
  const onKeyDown=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);e.preventDefault();}if(k==='e'&&currentNear)setSelectedRoom(currentNear);if(k==='escape')setSelectedRoom(null);};
  const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
  const onClick=(e:MouseEvent)=>{const rect=renderer.domElement.getBoundingClientRect();const m=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(m,camera);const hit=ray.intersectObjects(roomGroups,true)[0];if(!hit)return;let o:any=hit.object;while(o&&!o.userData.room)o=o.parent;if(o?.userData.room){const p=ROOM_INFO[o.userData.room as RoomKey].position;target.set(p[0],0,p[2]+3.1);}};
  window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);renderer.domElement.addEventListener('click',onClick);
  const resize=()=>{const w=mount.clientWidth||window.innerWidth,h=mount.clientHeight||window.innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};resize();window.addEventListener('resize',resize);
  const animate=()=>{raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);const speed=4.8*dt;let moving=false;if(keys.size){moving=true;target.copy(player.position);if(keys.has('w')||keys.has('arrowup'))target.z-=speed;if(keys.has('s')||keys.has('arrowdown'))target.z+=speed;if(keys.has('a')||keys.has('arrowleft'))target.x-=speed;if(keys.has('d')||keys.has('arrowright'))target.x+=speed;}
   const dx=target.x-player.position.x,dz=target.z-player.position.z,dist=Math.hypot(dx,dz);if(dist>.03){const step=Math.min(dist,speed*1.5);player.position.x+=dx/dist*step;player.position.z+=dz/dist*step;player.rotation.y=Math.atan2(dx,dz);}
   player.position.x=THREE.MathUtils.clamp(player.position.x,-17,17);player.position.z=THREE.MathUtils.clamp(player.position.z,-13,12);
   const parts=player.userData.parts;if(parts){const swing=moving?Math.sin(clock.elapsedTime*9)*.32:0;parts.armL.rotation.x=swing;parts.armR.rotation.x=-swing;parts.legL.rotation.x=-swing;parts.legR.rotation.x=swing;}
   npcGroups.forEach((n,i)=>{n.position.y=Math.sin(clock.elapsedTime*1.5+i)*.015;n.rotation.y+=Math.sin(clock.elapsedTime*.4+i)*.0007;});
   let closest:RoomKey|null=null,best=3.2;roomPoints.forEach(({room,point})=>{const d=Math.hypot(player.position.x-point.x,player.position.z-point.z);if(d<best){best=d;closest=room;}});if(closest!==currentNear){currentNear=closest;setNearRoom(closest);}
   const desired=new THREE.Vector3(player.position.x+7.5,7.2,player.position.z+10);camera.position.lerp(desired,.075);camera.lookAt(player.position.x,1.1,player.position.z);renderer.render(scene,camera);
  };animate();
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('click',onClick);renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);};
 },[characterId,characterNames]);
 const openRoom=()=>{if(selectedRoom)setActiveTab(selectedRoom);else if(nearRoom)setSelectedRoom(nearRoom);};
 return <div className="metaverse-campus metaverse-office">
  <div ref={mountRef} className="metaverse-canvas"/>
  <div className="metaverse-topbar"><div className="metaverse-brand"><span className="metaverse-mark">M</span><div><strong>MBA CAREER CENTRE</strong><small>Virtual Placement Office</small></div></div><div className="metaverse-stats"><div><b>{Math.round(userProfile?.readinessScore||0)}%</b><span>Readiness</span></div><div><b>{userProfile?.xp||0}</b><span>XP</span></div><div><b>LV {userProfile?.level||1}</b><span>{userProfile?.levelTitle||'Foundation'}</span></div></div></div>
  <div className="metaverse-minimap"><div className="minimap-title"><Map/> OFFICE MAP</div><div className="minimap-grid"><span className="map-road vertical"/><span className="map-road horizontal"/><i className="map-dot aptitude"/><i className="map-dot gd"/><i className="map-dot interview"/><i className="map-you"/></div><small>Walk through the office and enter a room</small></div>
  <div className="metaverse-controls"><div><Keyboard/><b>W A S D</b><span>Move</span></div><div><MousePointer2/><b>Click</b><span>Walk</span></div><div><span className="key-e">E</span><b>Enter</b></div></div>
  {nearRoom&&!selectedRoom&&<div className="metaverse-interact"><span className="interact-key">E</span><div><strong>{ROOM_INFO[nearRoom].title}</strong><small>{ROOM_INFO[nearRoom].subtitle}</small></div><button onClick={()=>setSelectedRoom(nearRoom)}>Enter <ChevronRight/></button></div>}
  {selectedRoom&&<div className="metaverse-modal-backdrop" onClick={()=>setSelectedRoom(null)}><div className={selectedRoom==='gd'?"metaverse-room-modal gd-hall-modal":"metaverse-room-modal"} onClick={e=>e.stopPropagation()}>{selectedRoom==='gd'?<><div className="gd-hall-header"><div><span className="modal-kicker">LIVE GROUP DISCUSSION ROOM</span><h2>Conference Hall</h2><p>Take your seat. Other candidates are listening while your live camera appears on the presentation screen.</p></div><button className="gd-hall-close" onClick={()=>setSelectedRoom(null)} aria-label="Close"><X/></button></div><div className="gd-hall-stage"><iframe title="Conference Hall 3D environment" src="https://sketchfab.com/models/2a530dfce151413693bb3aa9f842ddde/embed" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share/><div className="gd-live-screen"><div className="gd-live-screen-label"><span className="gd-live-dot"><span/></span> YOUR LIVE VIDEO</div><video ref={gdVideoRef} autoPlay muted playsInline/><div className="gd-live-screen-status">{gdCameraReady?"Camera active":"Camera permission required"}</div></div><div className="gd-listeners"><div className="gd-listener"><span className="gd-listener-avatar meera">M</span><strong>Meera</strong><small>Listening</small></div><div className="gd-listener"><span className="gd-listener-avatar rahul">R</span><strong>Rahul</strong><small>Listening</small></div><div className="gd-listener"><span className="gd-listener-avatar nisha">N</span><strong>Nisha</strong><small>Listening</small></div></div></div><div className="gd-hall-footer"><div className="gd-hall-state"><Users/><span>3 candidates are seated and listening</span></div><div className="modal-actions"><button onClick={openRoom}><Mic/> Start GD assessment <ArrowRight/></button><button className="modal-secondary" onClick={()=>setSelectedRoom(null)}>Keep walking</button></div></div></>:<>{React.createElement(ROOM_INFO[selectedRoom].icon,{className:"room-modal-icon"})}<span className="modal-kicker">OFFICE ROOM</span><h2>{ROOM_INFO[selectedRoom].title}</h2><p>{ROOM_INFO[selectedRoom].subtitle}. Enter the existing assessment module when you are ready.</p><div className="modal-actions"><button onClick={openRoom}>Enter assessment <ArrowRight/></button><button className="modal-secondary" onClick={()=>setSelectedRoom(null)}>Keep walking</button></div></>}</div></div>}
  <div className="metaverse-bottom"><div className="metaverse-player"><div className="player-avatar-dot" style={{background:character.shirt}}/><div><small>YOU ARE</small><strong>{character.name}</strong></div></div><button className="metaverse-help" onClick={()=>setShowHelp(v=>!v)}><Clock3/> Office guide</button></div>
  {showHelp&&<div className="metaverse-guide"><strong>Welcome to the virtual placement office</strong><p>Walk through the lobby, approach each room and interact with the assessment areas. Your existing Aptitude, GD and AI Interview systems remain connected.</p><div><Mic/><span>Voice-enabled GD and AI Interview open after you enter their rooms.</span></div><button onClick={()=>setShowHelp(false)}>Got it</button></div>}
 </div>;
};
