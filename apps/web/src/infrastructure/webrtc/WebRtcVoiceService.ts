"use client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

function optimizeAudioSdp(sdp?: string): string | undefined {
  if (!sdp) return sdp;
  if (sdp.includes("a=fmtp:111")) {
    return sdp.replace(/a=fmtp:111 ([^\r\n]*)/g, (_match, p1) => {
      let params = p1.trim();
      if (!params.includes("stereo=")) params += ";stereo=0;sprop-stereo=0";
      if (!params.includes("usedtx=")) params += ";usedtx=1";
      if (!params.includes("useinbandfec=")) params += ";useinbandfec=1";
      if (!params.includes("maxaveragebitrate=")) params += ";maxaveragebitrate=64000";
      return `a=fmtp:111 ${params}`;
    });
  }
  return sdp;
}

export class WebRtcVoiceService {
  private gameId: string | null = null;
  private myUid: string | null = null;
  private localStream: MediaStream | null = null;
  private getIdToken: (() => Promise<string | null>) | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private analysers: Map<string, AnalyserNode> = new Map();
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;
  private eventSource: EventSource | null = null;
  private pendingCandidates: Map<string, any[]> = new Map();
  private speakingCallbacks: Set<(peerUid: string, isSpeaking: boolean) => void> = new Set();
  private isMasterMuted: boolean = false;
  private masterVolume: number = 1.0;

  onRemoteSpeaking(callback: (peerUid: string, isSpeaking: boolean) => void): () => void {
    this.speakingCallbacks.add(callback);
    return () => this.speakingCallbacks.delete(callback);
  }

  private notifySpeaking(peerUid: string, isSpeaking: boolean) {
    this.speakingCallbacks.forEach((cb) => cb(peerUid, isSpeaking));
  }

  setMasterMuted(muted: boolean) {
    this.isMasterMuted = muted;
    for (const audio of this.audioElements.values()) {
      audio.muted = muted;
      audio.volume = muted ? 0 : this.masterVolume;
    }
  }

  getMasterMuted(): boolean {
    return this.isMasterMuted;
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (!this.isMasterMuted) {
      for (const audio of this.audioElements.values()) {
        audio.volume = this.masterVolume;
      }
    }
  }

  joinVoice(
    gameId: string,
    myUid: string,
    peerUids: string[],
    localStream?: MediaStream | null,
    getIdToken?: () => Promise<string | null>,
  ) {
    if (getIdToken) {
      this.getIdToken = getIdToken;
    }

    if (this.gameId === gameId && this.myUid === myUid) {
      if (localStream !== undefined) {
        this.updateLocalStream(localStream);
      }
      this.syncPeers(peerUids);
      return;
    }

    const currentStream = localStream !== undefined ? localStream : this.localStream;
    this.leaveVoice(false);

    this.gameId = gameId;
    this.myUid = myUid;
    this.localStream = currentStream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      try {
        this.audioContext = new AudioCtx();
      } catch {}
    }

    this.listenToSignals();
    this.syncPeers(peerUids);
    this.startVolumeMonitoring();
  }

  syncPeers(peerUids: string[]) {
    if (!this.gameId || !this.myUid) return;
    const validPeerSet = new Set(peerUids.filter((uid) => uid !== this.myUid));

    // 1. Remove peers that are no longer active
    for (const peerUid of Array.from(this.peerConnections.keys())) {
      if (!validPeerSet.has(peerUid)) {
        this.closePeer(peerUid);
      }
    }

    // 2. Connect to new peers (alphabetically smaller UID creates the offer)
    for (const peerUid of validPeerSet) {
      if (!this.peerConnections.has(peerUid)) {
        if (this.myUid < peerUid) {
          this.initiateConnection(peerUid);
        }
      }
    }
  }

  updateLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    const newTrack = stream ? stream.getAudioTracks()[0] ?? null : null;

    for (const [, pc] of this.peerConnections.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find(
        (s) => s.track?.kind === "audio" || (s as any).kind === "audio",
      );

      if (audioSender) {
        audioSender.replaceTrack(newTrack).catch(() => {});
      } else if (newTrack && stream) {
        pc.addTrack(newTrack, stream);
      }
    }
  }

  private createPeerConnection(peerUid: string, isInitiator: boolean): RTCPeerConnection {
    let pc = this.peerConnections.get(peerUid);
    if (pc) return pc;

    pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerUid, pc);

    // If initiator: add track or add single sendrecv transceiver
    if (isInitiator) {
      if (this.localStream && this.localStream.getAudioTracks()[0]) {
        pc.addTrack(this.localStream.getAudioTracks()[0]!, this.localStream);
      } else {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch {}
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.gameId && this.myUid) {
        this.sendSignal(peerUid, {
          type: "candidate",
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`🔊 [WebRTC ONTRACK] Audio track received for peer ${peerUid}:`, event.track.id);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (!remoteStream) return;

      // 1. HTML5 Audio Element playback (Clean hardware output)
      if (typeof document !== "undefined") {
        let container = document.getElementById("oddmind-webrtc-audio");
        if (!container) {
          container = document.createElement("div");
          container.id = "oddmind-webrtc-audio";
          container.style.position = "fixed";
          container.style.bottom = "0";
          container.style.left = "0";
          container.style.width = "0";
          container.style.height = "0";
          container.style.opacity = "0";
          container.style.pointerEvents = "none";
          document.body.appendChild(container);
        }

        let audio = this.audioElements.get(peerUid);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audio.setAttribute("playsinline", "true");
          audio.setAttribute("webkit-playsinline", "true");
          audio.setAttribute("id", `webrtc-audio-${peerUid}`);
          container.appendChild(audio);
          this.audioElements.set(peerUid, audio);
        }
        audio.srcObject = remoteStream;
        audio.volume = this.isMasterMuted ? 0 : this.masterVolume;
        audio.muted = this.isMasterMuted;

        const playAudio = () => {
          audio?.play().then(() => {
            console.log(`🔊 [WebRTC Audio playing cleanly for ${peerUid}]`);
          }).catch((err) => {
            console.warn(`[WebRTC audio play waiting for gesture for ${peerUid}]`, err);
          });
        };
        playAudio();

        const unlock = () => {
          playAudio();
          if (this.audioContext && this.audioContext.state === "suspended") {
            this.audioContext.resume().catch(() => {});
          }
        };
        document.addEventListener("click", unlock, { once: true });
        document.addEventListener("touchstart", unlock, { once: true });
        document.addEventListener("keydown", unlock, { once: true });
      }

      // 2. Web Audio API for volume monitoring and visualizer ONLY (No destination duplication)
      if (this.audioContext && this.audioContext.state !== "closed") {
        try {
          if (this.audioContext.state === "suspended") {
            this.audioContext.resume().catch(() => {});
          }
          const source = this.audioContext.createMediaStreamSource(remoteStream);
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          this.analysers.set(peerUid, analyser);
        } catch (err) {
          console.warn("[WebRTC analyser setup warning]", err);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC connectionState for ${peerUid}]: ${pc!.connectionState}`);
      if (pc!.connectionState === "disconnected" || pc!.connectionState === "failed") {
        this.closePeer(peerUid);
      }
    };

    return pc;
  }

  private async initiateConnection(peerUid: string) {
    try {
      console.log(`[WebRTC] Initiating offer to ${peerUid}`);
      const pc = this.createPeerConnection(peerUid, true);
      const offer = await pc.createOffer();
      const optimizedSdp = optimizeAudioSdp(offer.sdp) || offer.sdp;
      await pc.setLocalDescription(new RTCSessionDescription({ type: "offer", sdp: optimizedSdp }));

      await this.sendSignal(peerUid, {
        type: "offer",
        sdp: optimizedSdp,
      });
    } catch (err) {
      console.warn("[WebRTC initiate error]", err);
    }
  }

  private async sendSignal(peerUid: string, signalData: any) {
    if (!this.gameId || !this.myUid) return;
    try {
      const token = this.getIdToken ? await this.getIdToken() : null;
      if (!token) {
        console.warn("[WebRTC] No auth token available to send signal");
        return;
      }

      const res = await fetch(`/api/games/${this.gameId}/signal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: peerUid,
          data: signalData,
        }),
      });

      if (!res.ok) {
        console.warn("[WebRTC sendSignal HTTP status]", res.status);
      }
    } catch (err) {
      console.warn("[WebRTC sendSignal error]", err);
    }
  }

  private async listenToSignals() {
    if (!this.gameId || !this.myUid) return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const token = this.getIdToken ? await this.getIdToken() : null;
      if (!token) return;

      const url = `/api/games/${this.gameId}/signal?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      this.eventSource = es;

      es.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          const fromUid = payload.from as string;
          const signal = payload.data;

          if (!fromUid || !signal) return;
          await this.handleIncomingSignal(fromUid, signal);
        } catch (err) {
          console.warn("[WebRTC SSE message error]", err);
        }
      };

      es.onerror = (err) => {
        console.warn("[WebRTC SSE reconnecting]", err);
      };
    } catch (err) {
      console.warn("[WebRTC listenToSignals error]", err);
    }
  }

  private async handleIncomingSignal(fromUid: string, signal: any) {
    if (signal.type === "offer") {
      console.log(`[WebRTC] Received offer from ${fromUid}`);
      const pc = this.createPeerConnection(fromUid, false);

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: signal.sdp }),
      );

      // Set answerer transceiver direction to sendrecv so bidirectional slots are ready
      pc.getTransceivers().forEach((t) => {
        try {
          t.direction = "sendrecv";
        } catch {}
      });

      // Attach local track to the received transceiver if available
      if (this.localStream && this.localStream.getAudioTracks()[0]) {
        const audioTrack = this.localStream.getAudioTracks()[0]!;
        const senders = pc.getSenders();
        const audioSender = senders.find(
          (s) => s.track?.kind === "audio" || (s as any).kind === "audio",
        );
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack);
        } else {
          pc.addTrack(audioTrack, this.localStream);
        }
      }

      // Drain queued early ICE candidates
      const queued = this.pendingCandidates.get(fromUid) || [];
      this.pendingCandidates.delete(fromUid);
      for (const cand of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }

      const answer = await pc.createAnswer();
      const optimizedSdp = optimizeAudioSdp(answer.sdp) || answer.sdp;
      await pc.setLocalDescription(new RTCSessionDescription({ type: "answer", sdp: optimizedSdp }));
      console.log(`[WebRTC] Sending answer to ${fromUid}`);
      await this.sendSignal(fromUid, {
        type: "answer",
        sdp: optimizedSdp,
      });
    } else if (signal.type === "answer") {
      console.log(`[WebRTC] Received answer from ${fromUid}`);
      const pc = this.peerConnections.get(fromUid);
      if (pc) {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: signal.sdp }),
        );

        // Drain queued early ICE candidates
        const queued = this.pendingCandidates.get(fromUid) || [];
        this.pendingCandidates.delete(fromUid);
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
      }
    } else if (signal.type === "candidate") {
      const pc = this.peerConnections.get(fromUid);
      if (signal.candidate) {
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
          const queued = this.pendingCandidates.get(fromUid) || [];
          queued.push(signal.candidate);
          this.pendingCandidates.set(fromUid, queued);
        }
      }
    }
  }

  private startVolumeMonitoring() {
    const dataArray = new Uint8Array(32);

    const loop = () => {
      for (const [peerUid, analyser] of this.analysers.entries()) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
        }
        const avg = sum / dataArray.length;
        this.notifySpeaking(peerUid, avg > 8);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private closePeer(peerUid: string) {
    const pc = this.peerConnections.get(peerUid);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerUid);
    }
    const audio = this.audioElements.get(peerUid);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerUid);
    }
    this.analysers.delete(peerUid);
    this.pendingCandidates.delete(peerUid);
    this.notifySpeaking(peerUid, false);
  }

  leaveVoice(wipeStream = true) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    for (const peerUid of Array.from(this.peerConnections.keys())) {
      this.closePeer(peerUid);
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.gameId = null;
    this.myUid = null;
    if (wipeStream) {
      this.localStream = null;
    }
  }
}

export const webRtcVoiceService = new WebRtcVoiceService();
