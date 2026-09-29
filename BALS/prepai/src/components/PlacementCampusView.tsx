import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, Trophy, Users, BriefcaseBusiness, DoorOpen } from 'lucide-react';

type Room = 'campus' | 'aptitude' | 'gd' | 'interview';
type Character = { id:string; name:string; skin:string; hair:string; shirt:string };

const CHARACTERS: Character[] = [
  {id:'arjun',name:'Arjun',skin:'#c98f68',hair:'#251b18',shirt:'#315b7d'},
  {id:'meera',name:'Meera',skin:'#d39a76',hair:'#1f1715',shirt:'#7f2f2a'},
  {id:'rahul',name:'Rahul',skin:'#b97955',hair:'#181412',shirt:'#536b55'},
  {id:'nisha',name:'Nisha',skin:'#c88967',hair:'#34201a',shirt:'#704a6b'}
];

const CharacterAvatar:React.FC<{character:Character;small?:boolean;seated?:boolean;label?:string}>=({character,small,seated,label})=>(
  <div className={'campus-character '+(small?'small ':'')+(seated?'seated':'')}>
    <div className="avatar-hair" style={{background:character.hair}}/>
    <div className="avatar-head" style={{background:character.skin}}/>
    <div className="avatar-body" style={{background:character.shirt}}><span className="avatar-collar"/></div>
    <div className="avatar-legs"><i/><i/></div>
    {label&&<span className="avatar-label">{label}</span>}
  </div>
);

export const PlacementCampusView:React.FC<{
  setActiveTab:(tab:'dashboard'|'aptitude'|'gd'|'interview'|'evaluation')=>void;
  userProfile:any;
  onOpenLoginModal:()=>void;
}> = ({setActiveTab,userProfile,onOpenLoginModal}) => {
  const [room,setRoom]=useState<Room>('campus');
  const [characterId,setCharacterId]=useState('arjun');

  useEffect(()=>{try{const s=localStorage.getItem('prepai_character');if(s&&CHARACTERS.some(c=>c.id===s))setCharacterId(s)}catch{}},[]);
  const character=CHARACTERS.find(c=>c.id===characterId)||CHARACTERS[0];
  const chooseCharacter=(id:string)=>{setCharacterId(id);localStorage.setItem('prepai_character',id)};

  if(room==='campus') return (
    <div className="campus-game">
      <div className="campus-topbar">
        <div><span className="campus-eyebrow">MBA PLACEMENT CAMPUS</span><h1>Good morning, {userProfile?.name||'Candidate'}.</h1><p>Your preparation day starts here. Choose a room and take your seat.</p></div>
        <div className="campus-status"><div><strong>{Math.round(userProfile?.readinessScore||0)}%</strong><span>Readiness</span></div><div><strong>{userProfile?.xp||0}</strong><span>XP</span></div><div><strong>{userProfile?.level||1}</strong><span>Level</span></div></div>
      </div>

      <section className="campus-scene">
        <div className="campus-skyline"><span/><span/><span/><span/><span/></div>
        <div className="campus-ground">
          <div className="campus-path path-left"/><div className="campus-path path-center"/>
          <div className="campus-character campus-walker"><CharacterAvatar character={character} small label="You"/></div>
          {[
            {key:'aptitude',cls:'aptitude-building',icon:BookOpen,label:'APTITUDE HALL'},
            {key:'gd',cls:'gd-building',icon:Users,label:'GD ROOM'},
            {key:'interview',cls:'interview-building',icon:BriefcaseBusiness,label:'INTERVIEW SUITE'}
          ].map(({key,cls,icon:Icon,label})=>(
            <button key={key} className={'campus-building '+cls} onClick={()=>setRoom(key as Room)}>
              <div className="building-roof"/><div className="building-sign"><Icon/>{label}</div>
              <div className="building-door"/><div className="building-window w1"/><div className="building-window w2"/>
              <span className="building-prompt">ENTER →</span>
            </button>
          ))}
        </div>
        <div className="campus-map-label">PLACEMENT CENTRE · FLOOR 1</div>
      </section>

      <section className="campus-character-panel">
        <div><span className="campus-eyebrow">YOUR CANDIDATE</span><h2>Choose your character</h2><p>Your character appears throughout the preparation rooms.</p></div>
        <div className="character-picker">{CHARACTERS.map(c=><button key={c.id} onClick={()=>chooseCharacter(c.id)} className={'character-option '+(c.id===characterId?'selected':'')}><CharacterAvatar character={c} small/><span>{c.name}</span></button>)}</div>
      </section>

      <section className="campus-quick-actions">
        <button onClick={()=>setActiveTab('evaluation')}><Trophy/> View latest report <ArrowRight/></button>
        <button onClick={onOpenLoginModal}><Users/> Candidate profile <ArrowRight/></button>
      </section>
    </div>
  );

  const roomInfo:any={
    aptitude:{title:'Aptitude Room',subtitle:'Take your seat. Pick a topic. Beat the clock.',icon:BookOpen},
    gd:{title:'Group Discussion Room',subtitle:'The HR panel is waiting. Make your point and listen to the room.',icon:Users},
    interview:{title:'Interview Room',subtitle:'One interviewer. One candidate. One focused conversation.',icon:BriefcaseBusiness}
  }[room];
  const Icon=roomInfo.icon;

  return (
    <div className={'campus-game room-page room-'+room}>
      <div className="room-topbar"><button onClick={()=>setRoom('campus')} className="room-back"><DoorOpen/> Back to campus</button><div className="room-title"><span>{roomInfo.title}</span><small>{roomInfo.subtitle}</small></div><div className="room-chip"><Clock3/> Assessment mode</div></div>

      {room==='aptitude'&&<section className="simulation-scene aptitude-scene">
        <div className="scene-wall"><div className="scene-board"><span>APTITUDE PRACTICE</span><strong>FOCUS · SPEED · ACCURACY</strong></div><div className="wall-clock">09:45</div></div>
        {[character,CHARACTERS[2],CHARACTERS[3]].map((c,i)=><div key={c.id+i} className={'bench bench-'+(i+1)}><div className="bench-seat"/><div className="bench-leg l"/><div className="bench-leg r"/><CharacterAvatar character={c} seated label={i===0?'You':undefined}/></div>)}
        <div className="teacher-desk"><BookOpen/><span>Practice desk</span></div>
        <div className="scene-action-card"><Icon/><h2>Ready for the aptitude test?</h2><p>Choose your section and start the timed assessment.</p><div className="room-actions"><button onClick={()=>setActiveTab('aptitude')}>Enter Aptitude Practice <ArrowRight/></button><button className="secondary" onClick={()=>setRoom('campus')}>Return to campus</button></div></div>
      </section>}

      {room==='gd'&&<section className="simulation-scene gd-sim-scene">
        <div className="scene-wall"><div className="hr-board"><span>HR PANEL</span><strong>GROUP DISCUSSION</strong><small>Listen · Build · Lead</small></div></div>
        <div className="hr-person"><div className="hr-head"/><div className="hr-body"/><span>HR</span></div>
        <div className="discussion-table"><div className="table-top"/>{CHARACTERS.map((c,i)=><div key={c.id} className={'gd-seat seat-'+i}><div className="seat-chair"/><CharacterAvatar character={c.id===characterId?character:c} seated label={c.id===characterId?'You':undefined}/></div>)}</div>
        <div className="scene-action-card"><Icon/><h2>Take your place in the circle</h2><p>The HR moderator will introduce the topic. Speak, respond and build on the group.</p><div className="room-actions"><button onClick={()=>setActiveTab('gd')}>Join Group Discussion <ArrowRight/></button><button className="secondary" onClick={()=>setRoom('campus')}>Return to campus</button></div></div>
      </section>}

      {room==='interview'&&<section className="simulation-scene interview-scene">
        <div className="scene-wall"><div className="interview-logo">PLACEMENT INTERVIEW<small>ONE-TO-ONE</small></div></div>
        <div className="interview-desk"><div className="desk-top"/><div className="desk-front"/></div>
        <div className="interviewer"><div className="hr-head"/><div className="interviewer-body"/><span>INTERVIEWER</span></div>
        <div className="candidate-chair"><div className="chair-seat"/><CharacterAvatar character={character} label="You"/></div>
        <div className="scene-action-card"><Icon/><h2>Your interview starts here</h2><p>One interviewer, your resume, your answers. The room stays focused on you.</p><div className="room-actions"><button onClick={()=>setActiveTab('interview')}>Start AI Interview <ArrowRight/></button><button className="secondary" onClick={()=>setRoom('campus')}>Return to campus</button></div></div>
      </section>}
    </div>
  );
};
