import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GDParticipant, GDMessage, GDRoom } from '../types';
import { Video, VideoOff, Mic, MicOff, Users, Send, Sparkles, PlusCircle, LogIn, Copy, Check, Volume2, ShieldAlert, AlertTriangle } from 'lucide-react';

// Fallback used only until /api/ice-servers responds (or if it fails).
const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Remote peer video tile. Starts muted so it ALWAYS autoplays (every mobile
// browser allows muted autoplay, but many silently block unmuted autoplay
// even after an explicit .play() call) — a small tap-to-unmute overlay then
// unlocks audio on the first genuine user tap, which mobile browsers do allow.
const RemoteVideoTile: React.FC<{
  stream: MediaStream;
  socketId: string;
  remoteVideoRefs: React.MutableRefObject<Record<string, HTMLVideoElement | null>>;
}> = ({ stream, socketId, remoteVideoRefs }) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const attachRef = (el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    remoteVideoRefs.current[socketId] = el;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(err => console.warn('Remote video play blocked:', err));
    }
  };

  const handleUnmute = () => {
    setIsMuted(false);
    if (videoElRef.current) {
      videoElRef.current.muted = false;
      videoElRef.current.play().catch(err => console.warn('Unmute play blocked:', err));
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        autoPlay
        playsInline
        muted={isMuted}
        ref={attachRef}
        className="w-full h-full object-cover"
      />
      {isMuted && (
        <button
          onClick={handleUnmute}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold gap-2 hover:bg-black/50 transition-colors"
        >
          <Volume2 className="w-5 h-5" /> Tap to unmute
        </button>
      )}
    </div>
  );
};

interface GroupDiscussionViewProps {
  onCompleteGD?: (evaluation: any) => void;
}

export const GroupDiscussionView: React.FC<GroupDiscussionViewProps> = ({ onCompleteGD }) => {
  const [activeRoom, setActiveRoom] = useState<GDRoom | null>(null);
  const [selfSocketId, setSelfSocketId] = useState<string | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [displayName, setDisplayName] = useState('');
  const GD_TOPICS = [
    'Generative AI Disruption in Financial Services, Asset Management & Private Equity',
    'Central Bank Digital Currencies (CBDCs) vs Commercial Banking & Fintech Ecosystems',
    'Shareholder Value vs Stakeholder Governance: M&A Impact on Corporate Debt',
    'Gig Economy Regulation: Balancing Worker Welfare with Platform Business Scalability',
    'Hybrid Workforce Productivity, Employee Mental Health & Executive Burnout',
    'AI Automation in Performance Appraisals & Diversity Bias Mitigation',
    'Data Privacy Regulations vs Hyper-Personalized Performance Marketing',
    'Influencer Marketing ROI vs Traditional Media Brand Equity in Gen-Z FMCG',
    'Subscription Pricing Fatigue & Customer Churn Prevention in Digital Platforms',
    'Ethical Boundaries in Algorithmic Pricing, Dynamic Yield & Consumer Exploitation',
    'Predictive Churn Modeling vs Customer Lifetime Value (LTV) Optimization',
    'Data Governance in Sovereign Cloud Infrastructure for Global Enterprise',
    'Supply Chain Decoupling & Nearshoring: Geopolitical Risk Management for FMCG',
    'ESG Metrics vs Profit Maximization: Strategic Boardroom Tradeoffs in Global Multinationals',
    'Market Entry Strategy: Electric Vehicle Expansion in Emerging Asian Economies',
  ];
  const [selectedTopic, setSelectedTopic] = useState(() => GD_TOPICS[Math.floor(Math.random() * GD_TOPICS.length)]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Camera & Mic state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Real-time infra
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const rtcConfigRef = useRef<RTCConfiguration>(DEFAULT_RTC_CONFIG);
  const [turnConfigured, setTurnConfigured] = useState<boolean | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [messageText, setMessageText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Start camera/mic once on mount, and fetch ICE server config (STUN + TURN
  // if the host has configured a TURN server) so calls across different
  // networks have a chance to connect, not just same-network calls.
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = stream;
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera or microphone permission not granted:", err);
      }
    }
    async function fetchIceConfig() {
      try {
        const res = await fetch('/api/ice-servers');
        const data = await res.json();
        if (data.iceServers) {
          rtcConfigRef.current = { iceServers: data.iceServers };
        }
        setTurnConfigured(Boolean(data.turnConfigured));
      } catch (e) {
        console.warn('Could not fetch ICE server config, falling back to STUN-only:', e);
        setTurnConfigured(false);
      }
    }
    setupCamera();
    fetchIceConfig();
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      teardownSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
    }
  };

  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
    }
  };

  const teardownSocket = () => {
    Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // --- WebRTC peer management -------------------------------------------------

  const createPeerConnection = useCallback((remoteSocketId: string, roomCode: string) => {
    if (peersRef.current[remoteSocketId]) return peersRef.current[remoteSocketId];

    const pc = new RTCPeerConnection(rtcConfigRef.current);
    peersRef.current[remoteSocketId] = pc;
    let restartAttempted = false;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, mediaStreamRef.current as MediaStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('gd:webrtc-signal', {
          code: roomCode,
          to: remoteSocketId,
          signal: { type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [remoteSocketId]: event.streams[0] }));
    };

    // Renegotiate (e.g. after an ICE restart below) by sending a fresh offer.
    // Needed for real cross-network calls, where a route through TURN can
    // briefly drop and needs to be re-established rather than just abandoned.
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('gd:webrtc-signal', {
          code: roomCode,
          to: remoteSocketId,
          signal: { type: 'offer', sdp: offer },
        });
      } catch (e) {
        console.warn('Renegotiation failed', e);
      }
    };

    pc.onconnectionstatechange = () => {
      // 'disconnected' is often transient (a brief blip switching WiFi/
      // mobile data, or a momentary TURN relay hiccup) and frequently
      // recovers on its own — real video-call apps ride these out instead
      // of ending the call, so don't tear the connection down for it.
      if (pc.connectionState === 'failed' && !restartAttempted) {
        restartAttempted = true;
        try { pc.restartIce(); } catch (e) { console.warn('ICE restart unsupported', e); }
        return;
      }
      if (['closed', 'failed'].includes(pc.connectionState)) {
        delete peersRef.current[remoteSocketId];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[remoteSocketId];
          return next;
        });
      }
    };

    return pc;
  }, []);

  const initiateOfferTo = useCallback(async (remoteSocketId: string, roomCode: string) => {
    const pc = createPeerConnection(remoteSocketId, roomCode);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('gd:webrtc-signal', {
      code: roomCode,
      to: remoteSocketId,
      signal: { type: 'offer', sdp: offer },
    });
  }, [createPeerConnection]);

  // --- Socket wiring shared by create + join ---------------------------------

  const wireSocket = useCallback((roomCode: string, mode: 'peer' | 'ai_assisted') => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('gd:participant-joined', ({ participant, message }: any) => {
      setActiveRoom(prev => {
        if (!prev) return prev;
        const exists = prev.participants.some(p => p.socketId === participant.socketId);
        const participants = exists ? prev.participants : [...prev.participants, {
          id: participant.id, socketId: participant.socketId, name: participant.name,
          avatar: participant.avatar, role: participant.role, isSpeaking: false, micEnabled: true, videoEnabled: true,
        }];
        return { ...prev, participants, messages: [...prev.messages, message] };
      });
      // As an existing member, initiate the WebRTC offer to the new peer so
      // real camera/mic actually connects between real friends.
      if (participant.role === 'peer') {
        initiateOfferTo(participant.socketId, roomCode);
      }
    });

    socket.on('gd:participant-left', ({ socketId }: any) => {
      const pc = peersRef.current[socketId];
      if (pc) {
        pc.close();
        delete peersRef.current[socketId];
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setActiveRoom(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.socketId !== socketId) } : prev);
    });

    socket.on('gd:message', (message: GDMessage) => {
      setActiveRoom(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev);
      if (message.text && 'speechSynthesis' in window && message.senderId !== 'system') {
        const isAiVoice = ['p_alex', 'p_sophia', 'p_david'].includes(message.senderId);
        if (isAiVoice) {
          const utterance = new SpeechSynthesisUtterance(message.text);
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    });

    socket.on('gd:ai-typing', (typing: boolean) => setIsAiProcessing(typing));

    socket.on('gd:webrtc-signal', async ({ from, signal }: any) => {
      if (signal.type === 'offer') {
        const pc = createPeerConnection(from, roomCode);
        // If we're also mid-offer to this same peer (e.g. both sides tried
        // to recover a dropped cross-network route at once), resolve the
        // collision with the standard "polite peer" rule instead of letting
        // the connection get stuck: the peer with the larger socket id
        // yields and accepts the incoming offer, the other's offer wins.
        const collision = pc.signalingState !== 'stable';
        const polite = (socket.id ?? '') > from;
        if (collision) {
          if (!polite) return;
          await pc.setLocalDescription({ type: 'rollback' } as any);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('gd:webrtc-signal', { code: roomCode, to: from, signal: { type: 'answer', sdp: answer } });
      } else if (signal.type === 'answer') {
        const pc = peersRef.current[from];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice-candidate') {
        const pc = peersRef.current[from];
        if (pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); }
          catch (e) { console.warn('ICE candidate error', e); }
        }
      }
    });
  }, [createPeerConnection, initiateOfferTo]);

  // --- Create / Join ------------------------------------------------------

  const handleCreateRoom = (mode: 'peer' | 'ai_assisted') => {
    setJoinError('');
    setIsConnecting(true);
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const user = { id: `user_${Date.now()}`, name: displayName.trim() || 'You (Candidate)', avatar: '' };

    socket.on('connect', () => {
      socket.emit('gd:create', { topic: selectedTopic, category: 'General Technical & Business Strategy', mode, user }, (res: any) => {
        setIsConnecting(false);
        if (!res.success) {
          setJoinError('Could not create the room. Please try again.');
          return;
        }
        setSelfSocketId(res.selfSocketId);
        setActiveRoom({
          code: res.room.code,
          topic: res.room.topic,
          category: res.room.category,
          mode: res.room.mode,
          participants: res.room.participants.map((p: any) => ({ ...p, isSpeaking: false, micEnabled: true, videoEnabled: true })),
          messages: res.room.messages,
          status: 'active',
          timeRemaining: 900,
        });
        wireSocket(res.room.code, mode);

        // In AI-assisted mode, seed three AI participants server-side by
        // reflecting them straight into local state (they don't need sockets).
        if (mode === 'ai_assisted') {
          setActiveRoom(prev => prev ? {
            ...prev,
            participants: [
              ...prev.participants,
              { id: 'p_alex', name: 'Alex (AI Engineer)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', role: 'ai', isSpeaking: false, micEnabled: true, videoEnabled: true },
              { id: 'p_sophia', name: 'Sophia (AI Policy Analyst)', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200', role: 'ai', isSpeaking: false, micEnabled: true, videoEnabled: true },
              { id: 'p_david', name: 'David (AI Product Mgr)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', role: 'ai', isSpeaking: false, micEnabled: true, videoEnabled: true },
            ],
          } : prev);
        }
      });
    });

    socket.on('connect_error', () => {
      setIsConnecting(false);
      setJoinError('Could not reach the discussion server. Check your connection and try again.');
    });
  };

  const handleJoinRoom = () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    setJoinError('');
    setIsConnecting(true);
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const user = { id: `user_${Date.now()}`, name: displayName.trim() || 'Guest', avatar: '' };

    socket.on('connect', () => {
      socket.emit('gd:join', { code, user }, (res: any) => {
        setIsConnecting(false);
        if (!res.success) {
          setJoinError(res.error || 'Could not join that room.');
          socket.disconnect();
          socketRef.current = null;
          return;
        }
        setSelfSocketId(res.selfSocketId);
        setActiveRoom({
          code: res.room.code,
          topic: res.room.topic,
          category: res.room.category,
          mode: res.room.mode,
          participants: res.room.participants.map((p: any) => ({ ...p, isSpeaking: false, micEnabled: true, videoEnabled: true })),
          messages: res.room.messages,
          status: 'active',
          timeRemaining: 900,
        });
        wireSocket(code, res.room.mode);

        // Offer WebRTC connections to any peers already in the room.
        (res.room.participants as any[])
          .filter(p => p.role === 'peer' || p.role === 'user')
          .filter(p => p.socketId !== res.selfSocketId)
          .forEach(p => initiateOfferTo(p.socketId, code));
      });
    });

    socket.on('connect_error', () => {
      setIsConnecting(false);
      setJoinError('Could not reach the discussion server. Check your connection and try again.');
    });
  };

const handleLeaveRoom = async () => {
  if (activeRoom && onCompleteGD) {
    try {
      const res = await fetch('/api/gemini/gd-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: activeRoom.messages })
      });
      const data = await res.json();
      if (data.success) {
        onCompleteGD(data.evaluation);
      }
    } catch (err) {
      console.warn('GD evaluation failed:', err);
    }
  }

  if (activeRoom && socketRef.current) {
    socketRef.current.emit('gd:leave', { code: activeRoom.code });
  }
  teardownSocket();
  setActiveRoom(null);
  setSelfSocketId(null);
};

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeRoom || !socketRef.current) return;
    socketRef.current.emit('gd:message', { code: activeRoom.code, text: messageText });
    setMessageText('');
  };

  const copyRoomCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const remoteParticipants = activeRoom ? activeRoom.participants.filter(p => p.socketId !== selfSocketId) : [];
  const isRealPersonRole = (role: string) => role === 'peer' || role === 'user';

  return (
    <div id="gd-pipeline-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {!activeRoom ? (
        /* Room Creation / Join Setup Screen */
        <div className="max-w-2xl mx-auto bg-white border border-ink-200/90 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-accent-600 bg-accent-50 px-3.5 py-1 rounded-full uppercase font-bold tracking-wider">
              Real-time Camera & Mic Interconnect
            </span>
            <h1 className="text-3xl font-black text-ink-900 tracking-tight">
              Group Discussion Simulations
            </h1>
            <p className="text-sm text-ink-600">
              Create a custom GD room code to practice with peers or interact with AI members in real-time.
            </p>
            {turnConfigured === false && (
              <p className="text-[11px] text-highlight-700 bg-highlight-50 border border-highlight-200 rounded-xl px-3 py-2 mt-2 inline-block">
                Camera/mic is set up for same-network calls. For friends on a different WiFi or mobile data, ask whoever runs this app to add TURN server credentials in <code>.env</code> — chat will still work either way.
              </p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Your Display Name</label>
            <input
              type="text"
              placeholder="e.g. Priya"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs"
            />
            <p className="text-[11px] text-ink-500">This is what your friends will see when you join or create a room.</p>
          </div>

          {/* Topic Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">MBA Group Discussion Case Topic (By Domain)</label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs"
            >
              <optgroup label="💼 Finance & Financial Markets">
                <option value="Generative AI Disruption in Financial Services, Asset Management & Private Equity">
                  Finance: Generative AI Disruption in Financial Services, Asset Management & Private Equity
                </option>
                <option value="Central Bank Digital Currencies (CBDCs) vs Commercial Banking & Fintech Ecosystems">
                  Finance: CBDCs vs Commercial Banking & Fintech Ecosystems
                </option>
                <option value="Shareholder Value vs Stakeholder Governance: M&A Impact on Corporate Debt">
                  Finance: Shareholder Value vs Stakeholder Governance in M&A
                </option>
              </optgroup>

              <optgroup label="👥 HR & Organizational Leadership">
                <option value="Gig Economy Regulation: Balancing Worker Welfare with Platform Business Scalability">
                  HR: Gig Economy Regulation & Platform Business Scalability
                </option>
                <option value="Hybrid Workforce Productivity, Employee Mental Health & Executive Burnout">
                  HR: Hybrid Workforce Productivity, Mental Health & Executive Turnover
                </option>
                <option value="AI Automation in Performance Appraisals & Diversity Bias Mitigation">
                  HR: AI Automation in Performance Appraisals & Diversity Bias Mitigation
                </option>
              </optgroup>

              <optgroup label="📈 Marketing & Consumer Behavior">
                <option value="Data Privacy Regulations vs Hyper-Personalized Performance Marketing">
                  Marketing: Data Privacy Regulations vs Hyper-Personalized Targeting
                </option>
                <option value="Influencer Marketing ROI vs Traditional Media Brand Equity in Gen-Z FMCG">
                  Marketing: Influencer Marketing ROI vs Traditional Brand Equity
                </option>
                <option value="Subscription Pricing Fatigue & Customer Churn Prevention in Digital Platforms">
                  Marketing: Subscription Pricing Fatigue & Customer Churn Prevention
                </option>
              </optgroup>

              <optgroup label="📊 Business Analytics & Growth Science">
                <option value="Ethical Boundaries in Algorithmic Pricing, Dynamic Yield & Consumer Exploitation">
                  Analytics: Ethical Boundaries in Algorithmic Dynamic Pricing
                </option>
                <option value="Predictive Churn Modeling vs Customer Lifetime Value (LTV) Optimization">
                  Analytics: Predictive Churn Modeling vs LTV Optimization
                </option>
                <option value="Data Governance in Sovereign Cloud Infrastructure for Global Enterprise">
                  Analytics: Sovereign Cloud Data Governance for Global Enterprises
                </option>
              </optgroup>

              <optgroup label="🏭 Operations & Strategy">
                <option value="Supply Chain Decoupling & Nearshoring: Geopolitical Risk Management for FMCG">
                  Operations: Supply Chain Decoupling & Nearshoring Risk Management
                </option>
                <option value="ESG Metrics vs Profit Maximization: Strategic Boardroom Tradeoffs in Global Multinationals">
                  Strategy: ESG Metrics vs Profit Maximization Boardroom Tradeoffs
                </option>
                <option value="Market Entry Strategy: Electric Vehicle Expansion in Emerging Asian Economies">
                  Strategy: Market Entry for EV Expansion in Emerging Markets
                </option>
              </optgroup>
            </select>
          </div>

          {/* Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => handleCreateRoom('ai_assisted')}
              disabled={isConnecting}
              className="p-6 bg-ink-900 hover:bg-ink-800 text-white rounded-3xl text-left transition-all space-y-3 group shadow-lg border border-ink-800 disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent-500/20 text-accent-300 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Practice with AI Candidates</h3>
                <p className="text-xs text-ink-300 mt-1 leading-relaxed">
                  AI candidates (Alex, Sophia, David) automatically join and interact using voice & text. Friends can still join this same room live with the code below.
                </p>
              </div>
              <span className="text-xs font-mono text-accent-300 font-bold inline-flex items-center gap-1 pt-1">
                {isConnecting ? 'Connecting…' : 'Start AI Room Session →'}
              </span>
            </button>

            <button
              onClick={() => handleCreateRoom('peer')}
              disabled={isConnecting}
              className="p-6 bg-accent-50/60 border border-accent-200/80 hover:border-accent-300 rounded-3xl text-left transition-all space-y-3 group shadow-xs disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent-600 text-white flex items-center justify-center shadow-md shadow-accent-200">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink-900">Create Peer Room Code</h3>
                <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                  Generates a live room code — share it with a friend and they'll land in the same room, with real camera/mic and chat.
                </p>
              </div>
              <span className="text-xs font-mono text-accent-600 font-bold inline-flex items-center gap-1 pt-1">
                {isConnecting ? 'Connecting…' : 'Generate Room Code →'}
              </span>
            </button>
          </div>

          {/* Join with Room Code */}
          <div className="pt-4 border-t border-ink-200 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Enter Room Code (e.g. GD-8492)"
                value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                className="flex-1 p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-sm font-mono focus:outline-none focus:border-accent-600 shadow-xs"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isConnecting || !roomCodeInput.trim()}
                className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-accent-200"
              >
                <LogIn className="w-4 h-4" /> {isConnecting ? 'Joining…' : 'Join Room'}
              </button>
            </div>
            {joinError && (
              <div className="flex items-start gap-2 text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}
            <p className="text-[11px] text-ink-500">
              Ask whoever created the room to read you their exact code (it's case-insensitive, but they must still be in the room — codes expire once the host leaves).
            </p>
          </div>
        </div>
      ) : (
        /* Active Group Discussion Room Stage */
        <div className="space-y-6">
          {/* Room Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-900 text-white p-5 px-7 rounded-3xl shadow-xl border border-ink-800">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-0.5 bg-accent-500/20 text-accent-300 font-mono text-xs font-bold rounded-full border border-accent-500/30">
                  LIVE GD ROOM
                </span>
                <span className="font-mono text-xs text-ink-400">Room Code: <strong className="text-white font-mono">{activeRoom.code}</strong></span>
                <button onClick={copyRoomCode} className="p-1 hover:text-accent-400 transition-colors">
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-accent-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <h2 className="text-lg font-bold mt-1 line-clamp-1">
                {activeRoom.topic}
              </h2>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="bg-danger-500/20 hover:bg-danger-500/30 text-danger-300 border border-danger-500/30 font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
            >
              Leave Room
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Video Feeds Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* User Camera Tile */}
                <div className="relative aspect-video bg-ink-950 rounded-2xl overflow-hidden border border-ink-800 shadow-sm group">
                  <video
                    ref={el => {
                      localVideoRef.current = el;
                      if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                        el.srcObject = mediaStreamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
                  />
                  {!videoEnabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-500 space-y-2">
                      <VideoOff className="w-8 h-8" />
                      <span className="text-xs font-mono">Camera Muted</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-ink-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-2 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></span>
                    You (Candidate)
                  </div>
                </div>

                {/* Real peer + AI participant tiles */}
                {remoteParticipants.map(p => {
                  const stream = p.socketId ? remoteStreams[p.socketId] : undefined;
                  return (
                    <div key={p.socketId || p.id} className="relative aspect-video bg-ink-900 rounded-2xl overflow-hidden border border-ink-800 shadow-sm flex items-center justify-center">
                      {isRealPersonRole(p.role) && stream ? (
                        <RemoteVideoTile stream={stream} socketId={p.socketId as string} remoteVideoRefs={remoteVideoRefs} />
                      ) : isRealPersonRole(p.role) ? (
                        <div className="flex flex-col items-center gap-2 text-ink-500">
                          <div className="w-3 h-3 border-2 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] font-mono">Connecting camera…</span>
                        </div>
                      ) : (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover opacity-80" />
                      )}
                      <div className="absolute bottom-3 left-3 bg-ink-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-2 border border-white/10">
                        <span className={`w-2 h-2 rounded-full ${p.isSpeaking ? 'bg-accent-400 animate-ping' : 'bg-ink-500'}`}></span>
                        {p.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hardware Controls */}
              <div className="flex justify-center items-center gap-4 p-4 bg-white border border-ink-200/90 rounded-2xl shadow-xs">
                <button
                  onClick={toggleVideo}
                  className={`p-3 px-5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${
                    videoEnabled ? 'bg-ink-900 text-white' : 'bg-danger-50 text-danger-600 border border-danger-200'
                  }`}
                >
                  {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  {videoEnabled ? 'Camera On' : 'Camera Off'}
                </button>

                <button
                  onClick={toggleMic}
                  className={`p-3 px-5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold ${
                    micEnabled ? 'bg-accent-600 text-white shadow-md shadow-accent-200' : 'bg-danger-50 text-danger-600 border border-danger-200'
                  }`}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  {micEnabled ? 'Mic Active' : 'Mic Muted'}
                </button>
              </div>
            </div>

            {/* Right Column: Discussion Transcript & AI Moderator Insights */}
            <div className="bg-white border border-ink-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[520px]">
              <div className="border-b border-ink-100 pb-3 flex justify-between items-center">
                <h3 className="font-bold text-ink-900 text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-accent-600" /> Discussion Transcript
                </h3>
                <span className="text-[10px] font-mono text-ink-500">Live Audio STT</span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {activeRoom.messages.map(m => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-ink-900">{m.senderName}</span>
                      <span className="text-[10px] font-mono text-ink-400">{m.timestamp}</span>
                    </div>
                    <p className="text-xs text-ink-700 bg-ink-50 p-3 rounded-2xl border border-ink-100 leading-relaxed">
                      {m.text}
                    </p>
                    {m.aiInsight && (
                      <div className="p-3 bg-accent-50 border border-accent-200/80 rounded-xl text-[11px] text-accent-950 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-accent-600 shrink-0 mt-0.5" />
                        <span><strong>Moderator Insight:</strong> {m.aiInsight}</span>
                      </div>
                    )}
                  </div>
                ))}
                {isAiProcessing && (
                  <div className="text-xs text-ink-400 italic flex items-center gap-2 p-2">
                    <div className="w-3 h-3 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
                    AI Candidate is formulating response...
                  </div>
                )}
              </div>

              {/* Speech Input / Chat Box */}
              <div className="pt-3 border-t border-ink-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Speak or type your GD argument..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 p-3 bg-ink-50 border border-ink-200/80 rounded-2xl text-xs focus:outline-none focus:border-accent-600 shadow-xs"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white font-bold px-4 py-3 rounded-2xl text-xs transition-all flex items-center gap-1 shadow-md shadow-accent-200"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
