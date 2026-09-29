import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronRight, Clock3, Keyboard, Map, Mic, MousePointer2, Users } from 'lucide-react';

type RoomKey = 'aptitude' | 'gd' | 'interview';
type Character = { id:string; name:string; skin:string; hair:string; shirt:string };

const CHARACTERS:Character[] = [
  {id:'arjun',name:'Arjun',skin:'#c98f68',hair:'#251b18',shirt:'#315b7d'},
  {id:'meera',name:'Meera',skin:'#d39a76',hair:'#1f1715',shirt:'#7f2f2a'},
  {id:'rahul',name:'Rahul',skin:'#b97955',hair:'#181412',shirt:'#536b55'},
  {id:'nisha',name:'Nisha',skin:'#c88967',hair:'#34201a',shirt:'#704a6b'}
];

const ROOM_INFO:Record<RoomKey,{title:string;subtitle:string;icon:React.ElementType;color:string;position:[number,number,number]}> = {
  aptitude:{title:'Aptitude Hall',subtitle:'Timed aptitude assessment',icon:BookOpen,color:'#7f2f2a',position:[-13,0,-8]},
  gd:{title:'GD Arena',subtitle:'Live group discussion',icon:Users,color:'#315b7d',position:[0,0,-15]},
  interview:{title:'Interview Suite',subtitle:'One-to-one AI interview',icon:BriefcaseBusiness,color:'#8a641f',position:[14,0,-7]}
};

function labelSprite(text:string, color='#1b1714', scale=2.8) {
  const canvas=document.createElement('canvas');
  canvas.width=512; canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,512,128);
  ctx.fillStyle='rgba(250,247,239,.94)';
  ctx.roundRect(8,18,496,92,18);
  ctx.fill();
  ctx.strokeStyle='rgba(127,47,42,.28)';
  ctx.lineWidth=3;
  ctx.stroke();
  ctx.fillStyle=color;
  ctx.font='bold 38px Georgia, serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(text,256,65,470);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(scale,scale*.25,1);
  return sprite;
}

function makeAvatar(c:Character, selected=false) {
  const g=new THREE.Group();
  const skin=new THREE.MeshStandardMaterial({color:c.skin,roughness:.8});
  const hair=new THREE.MeshStandardMaterial({color:c.hair,roughness:.9});
  const shirt=new THREE.MeshStandardMaterial({color:c.shirt,roughness:.85});
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12),skin);
  head.position.y=1.72;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.43,.72,5,10),shirt);
  body.position.y=1.02;
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.45,16,8,0,Math.PI*2,0,Math.PI*.48),hair);
  hairCap.position.y=1.9;
  const legMat=new THREE.MeshStandardMaterial({color:'#302a27'});
  const l=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.7,10),legMat);
  const r=l.clone();
  l.position.set(-.2,.43,0); r.position.set(.2,.43,0);
  g.add(head,hairCap,body,l,r);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x1b1714,transparent:true,opacity:.13,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2; shadow.position.y=.05; g.add(shadow);
  if(selected) {
    const ring=new THREE.Mesh(new THREE.RingGeometry(.62,.7,32),new THREE.MeshBasicMaterial({color:0xd7ad54,side:THREE.DoubleSide,transparent:true,opacity:.9}));
    ring.rotation.x=-Math.PI/2; ring.position.y=.08; g.add(ring);
  }
  const tag=labelSprite(selected?'YOU':c.name, selected?'#7f2f2a':'#1b1714',2.15);
  tag.position.y=2.55; g.add(tag);
  return g;
}

function makeTree(x:number,z:number,scale=1) {
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.22,1.6,8),new THREE.MeshStandardMaterial({color:0x74503b}));
  trunk.position.y=.8;
  const crown=new THREE.Mesh(new THREE.SphereGeometry(1.15,12,10),new THREE.MeshStandardMaterial({color:0x536b55,roughness:1}));
  crown.position.y=2.1;
  g.add(trunk,crown); g.position.set(x,0,z); g.scale.setScalar(scale);
  return g;
}

function makeBuilding(info:typeof ROOM_INFO[RoomKey], room:RoomKey) {
  const g=new THREE.Group();
  g.position.set(...info.position);
  g.userData.room=room;
  const base=new THREE.Mesh(new THREE.BoxGeometry(7,3.8,5.5),new THREE.MeshStandardMaterial({color:0xf0e8da,roughness:.82}));
  base.position.y=1.9;
  const upper=new THREE.Mesh(new THREE.BoxGeometry(6.5,1.1,5.1),new THREE.MeshStandardMaterial({color:0x7f2f2a,roughness:.8}));
  upper.position.y=4.35;
  const roof=new THREE.Mesh(new THREE.ConeGeometry(4.6,.95,4),new THREE.MeshStandardMaterial({color:0x5e241f,roughness:.9}));
  roof.rotation.y=Math.PI/4; roof.position.y=5.35;
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.1,.18),new THREE.MeshStandardMaterial({color:0x3c302b}));
  door.position.set(0,1.1,2.78);
  const steps=new THREE.Mesh(new THREE.BoxGeometry(2, .18, .9),new THREE.MeshStandardMaterial({color:0xc8b9a2}));
  steps.position.set(0,.1,3.05);
  g.add(base,upper,roof,door,steps);
  const windows=new THREE.MeshStandardMaterial({color:0x9bb6bd,metalness:.1,roughness:.3});
  [-2.1,2.1].forEach(x=>{const w=new THREE.Mesh(new THREE.BoxGeometry(1.35,1.15,.12),windows); w.position.set(x,2.45,2.78); g.add(w);});
  const tag=labelSprite(info.title.toUpperCase(),'#7f2f2a',4.1); tag.position.set(0,6.55,0); g.add(tag);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.35,32),new THREE.MeshBasicMaterial({color:info.color,transparent:true,opacity:.09,side:THREE.DoubleSide}));
  glow.rotation.x=-Math.PI/2; glow.position.y=.08; g.add(glow);
  return g;
}

export const PlacementCampusView:React.FC<{
  setActiveTab:(tab:'dashboard'|'aptitude'|'gd'|'interview'|'evaluation')=>void;
  userProfile:any;
  onOpenLoginModal:()=>void;
}> = ({setActiveTab,userProfile,onOpenLoginModal}) => {
  const mountRef=useRef<HTMLDivElement|null>(null);
  const [characterId,setCharacterId]=useState('arjun');
  const [characterNames,setCharacterNames]=useState<Record<string,string>>({});
  const [nearRoom,setNearRoom]=useState<RoomKey|null>(null);
  const [selectedRoom,setSelectedRoom]=useState<RoomKey|null>(null);
  const [showHelp,setShowHelp]=useState(false);

  useEffect(()=>{
    try {
      const saved=localStorage.getItem('prepai_character');
      if(saved&&CHARACTERS.some(c=>c.id===saved)) setCharacterId(saved);
      const names=localStorage.getItem('prepai_character_names');
      if(names) setCharacterNames(JSON.parse(names));
    } catch {}
  },[]);

  const character=CHARACTERS.find(c=>c.id===characterId)||CHARACTERS[0];
  const named=(c:Character)=>({...c,name:characterNames[c.id]||c.name});

  useEffect(()=>{
    if(!mountRef.current) return;
    const mount=mountRef.current;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0xd9e3e4);
    scene.fog=new THREE.Fog(0xd9e3e4,28,62);

    const camera=new THREE.PerspectiveCamera(48,1,.1,100);
    camera.position.set(10,13,17);
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const hemi=new THREE.HemisphereLight(0xf8f2e7,0x536b55,2.2);
    scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xfff3d6,3.2);
    sun.position.set(-15,28,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-35; sun.shadow.camera.right=35; sun.shadow.camera.top=35; sun.shadow.camera.bottom=-35;
    scene.add(sun);

    const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0xb8c5a6,roughness:1}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

    const roadMat=new THREE.MeshStandardMaterial({color:0x9d968c,roughness:1});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(12,48),roadMat); road.rotation.x=-Math.PI/2; road.position.set(0,.015,1); scene.add(road);
    const cross=new THREE.Mesh(new THREE.PlaneGeometry(48,10),roadMat); cross.rotation.x=-Math.PI/2; cross.position.set(0,.016,-2); scene.add(cross);
    const plaza=new THREE.Mesh(new THREE.CircleGeometry(7,48),new THREE.MeshStandardMaterial({color:0xe8dfd0,roughness:1}));
    plaza.rotation.x=-Math.PI/2; plaza.position.y=.025; scene.add(plaza);

    const fountainBase=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.5,.45,32),new THREE.MeshStandardMaterial({color:0xd0c3ae}));
    fountainBase.position.y=.25; scene.add(fountainBase);
    const water=new THREE.Mesh(new THREE.CylinderGeometry(1.95,1.95,.12,32),new THREE.MeshStandardMaterial({color:0x8fb8c1,metalness:.15,roughness:.25}));
    water.position.y=.52; scene.add(water);

    [-24,-18,18,24].forEach(x=>[-25,-18,10,19].forEach(z=>scene.add(makeTree(x,z,.85+Math.random()*.3))));
    [-12,12].forEach(x=>[-23,-17,-10,8,17,24].forEach(z=>scene.add(makeTree(x,z,.65+Math.random()*.25))));

    const buildingGroups:THREE.Group[]=[];
    (Object.keys(ROOM_INFO) as RoomKey[]).forEach(room=>{const b=makeBuilding(ROOM_INFO[room],room); b.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}}); scene.add(b); buildingGroups.push(b);});

    const npcGroups:THREE.Group[]=[];
    const npcPositions:[[number,number],[number,number],[number,number]]=[[-5,4],[5,4],[7,-1]];
    [CHARACTERS[1],CHARACTERS[2],CHARACTERS[3]].forEach((c,i)=>{const a=makeAvatar(named(c)); a.position.set(npcPositions[i][0],0,npcPositions[i][1]); scene.add(a); npcGroups.push(a);});

    const player=makeAvatar(named(character),true);
    player.position.set(0,0,7);
    scene.add(player);

    const target=new THREE.Vector3(0,0,7);
    const keys=new Set<string>();
    let currentNear:RoomKey|null=null;
    let raf=0;
    const clock=new THREE.Clock();
    const roomPoints=(Object.keys(ROOM_INFO) as RoomKey[]).map(room=>({room,point:new THREE.Vector3(...ROOM_INFO[room].position)}));

    const onKeyDown=(e:KeyboardEvent)=>{
      if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {keys.add(e.key.toLowerCase()); e.preventDefault();}
      if(e.key.toLowerCase()==='e' && currentNear) setSelectedRoom(currentNear);
      if(e.key==='Escape') setSelectedRoom(null);
    };
    const onKeyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    const onClick=(e:MouseEvent)=>{
      const rect=renderer.domElement.getBoundingClientRect();
      const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      const ray=new THREE.Raycaster(); ray.setFromCamera(mouse,camera);
      const hits=ray.intersectObjects(buildingGroups,true);
      if(!hits.length) return;
      let obj:any=hits[0].object;
      while(obj && !obj.userData.room) obj=obj.parent;
      if(obj?.userData.room) {
        const info=ROOM_INFO[obj.userData.room as RoomKey];
        target.set(info.position[0],0,info.position[2]+3.8);
      }
    };

    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    renderer.domElement.addEventListener('click',onClick);

    const resize=()=>{
      const w=mount.clientWidth||window.innerWidth; const h=mount.clientHeight||window.innerHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
    };
    resize(); window.addEventListener('resize',resize);

    const animate=()=>{
      raf=requestAnimationFrame(animate);
      const dt=Math.min(clock.getDelta(),.05);
      const speed=6*dt;
      const moving=keys.size>0;
      if(moving){
        target.copy(player.position);
        if(keys.has('w')) target.z-=speed;
        if(keys.has('s')) target.z+=speed;
        if(keys.has('a')) target.x-=speed;
        if(keys.has('d')) target.x+=speed;
      }
      const dx=target.x-player.position.x, dz=target.z-player.position.z;
      const dist=Math.hypot(dx,dz);
      if(dist>.03){
        const step=Math.min(dist,speed*1.7);
        player.position.x+=dx/dist*step;
        player.position.z+=dz/dist*step;
        player.rotation.y=Math.atan2(dx,dz);
      }
      player.position.x=THREE.MathUtils.clamp(player.position.x,-22,22);
      player.position.z=THREE.MathUtils.clamp(player.position.z,-25,24);

      let closest:RoomKey|null=null; let best=3.7;
      roomPoints.forEach(({room,point})=>{const d=Math.hypot(player.position.x-point.x,player.position.z-point.z); if(d<best){best=d;closest=room;}});
      if(closest!==currentNear){currentNear=closest;setNearRoom(closest);}

      const desired=new THREE.Vector3(player.position.x+9,12.5,player.position.z+13);
      camera.position.lerp(desired,.075);
      camera.lookAt(player.position.x,0,player.position.z);

      npcGroups.forEach((n,i)=>{n.rotation.y=Math.sin(clock.elapsedTime*.55+i)*.12;});
      player.position.y=.02+Math.sin(clock.elapsedTime*5)*.015;
      renderer.render(scene,camera);
    };
    animate();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp); window.removeEventListener('resize',resize);
      renderer.domElement.removeEventListener('click',onClick);
      renderer.dispose();
      scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose(); const m=o.material; if(Array.isArray(m))m.forEach(x=>x.dispose()); else m.dispose();}});
      mount.removeChild(renderer.domElement);
    };
  },[characterId,characterNames]);

  const openRoom=()=>{if(selectedRoom) setActiveTab(selectedRoom); else if(nearRoom) setSelectedRoom(nearRoom);};

  return (
    <div className="metaverse-campus">
      <div ref={mountRef} className="metaverse-canvas"/>
      <div className="metaverse-topbar">
        <div className="metaverse-brand">
          <span className="metaverse-mark">M</span>
          <div><strong>MBA PLACEMENT CAMPUS</strong><small>Interactive Career Simulation</small></div>
        </div>
        <div className="metaverse-stats">
          <div><b>{Math.round(userProfile?.readinessScore||0)}%</b><span>Readiness</span></div>
          <div><b>{userProfile?.xp||0}</b><span>XP</span></div>
          <div><b>LV {userProfile?.level||1}</b><span>{userProfile?.levelTitle||'Foundation'}</span></div>
        </div>
      </div>

      <div className="metaverse-minimap">
        <div className="minimap-title"><Map/> CAMPUS MAP</div>
        <div className="minimap-grid">
          <span className="map-road vertical"/><span className="map-road horizontal"/>
          <i className="map-dot aptitude"/><i className="map-dot gd"/><i className="map-dot interview"/><i className="map-you"/>
        </div>
        <small>Click a building to walk there</small>
      </div>

      <div className="metaverse-controls">
        <div><Keyboard/><b>W A S D</b><span>Move</span></div>
        <div><MousePointer2/><b>Click</b><span>Walk to building</span></div>
        <div><span className="key-e">E</span><b>Interact</b></div>
      </div>

      {nearRoom && !selectedRoom && (
        <div className="metaverse-interact">
          <span className="interact-key">E</span>
          <div><strong>{ROOM_INFO[nearRoom].title}</strong><small>{ROOM_INFO[nearRoom].subtitle}</small></div>
          <button onClick={()=>setSelectedRoom(nearRoom)}>Enter <ChevronRight/></button>
        </div>
      )}

      {selectedRoom && (
        <div className="metaverse-modal-backdrop" onClick={()=>setSelectedRoom(null)}>
          <div className="metaverse-room-modal" onClick={e=>e.stopPropagation()}>
            {React.createElement(ROOM_INFO[selectedRoom].icon,{className:"room-modal-icon"})}
            <span className="modal-kicker">YOU ARE HERE</span>
            <h2>{ROOM_INFO[selectedRoom].title}</h2>
            <p>{ROOM_INFO[selectedRoom].subtitle}. Enter the assessment room and continue your preparation.</p>
            <div className="modal-actions">
              <button onClick={openRoom}>Enter assessment <ArrowRight/></button>
              <button className="modal-secondary" onClick={()=>setSelectedRoom(null)}>Keep exploring</button>
            </div>
          </div>
        </div>
      )}

      <div className="metaverse-bottom">
        <div className="metaverse-player">
          <div className="player-avatar-dot" style={{background:character.shirt}}/>
          <div><small>YOU ARE</small><strong>{character.name}</strong></div>
        </div>
        <button className="metaverse-help" onClick={()=>setShowHelp(v=>!v)}><Clock3/> Campus guide</button>
      </div>

      {showHelp && (
        <div className="metaverse-guide">
          <strong>Welcome to your placement campus</strong>
          <p>Walk around the campus, meet the other candidates and enter each assessment when you're ready.</p>
          <div><Mic/> <span>Use your existing voice-enabled GD and AI Interview rooms after entering.</span></div>
          <button onClick={()=>setShowHelp(false)}>Got it</button>
        </div>
      )}
    </div>
  );
};
