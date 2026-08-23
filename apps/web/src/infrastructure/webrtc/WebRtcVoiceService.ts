"use client";

import { getFirebaseFirestore } from "@/infrastructure/firebase/client";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export class WebRtcVoiceService {
  private gameId: string | null = null;
  private myUid: string | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private analysers: Map<string, AnalyserNode> = new Map();
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;
  private unsubscribeSignals: Unsubscribe | null = null;
  private speakingCallbacks: Set<(peerUid: string, isSpeaking: boolean) => void> = new Set();

  onRemoteSpeaking(callback: (peerUid: string, isSpeaking: boolean) => void): () => void {
    this.speakingCallbacks.add(callback);
    return () => this.speakingCallbacks.delete(callback);
  }

  private notifySpeaking(peerUid: string, isSpeaking: boolean) {
    this.speakingCallbacks.forEach((cb) => cb(peerUid, isSpeaking));
  }

  joinVoice(
    gameId: string,
    myUid: string,
    peerUids: string[],
    localStream?: MediaStream | null,
  ) {
    if (this.gameId === gameId && this.myUid === myUid) {
      if (localStream !== undefined && localStream !== null) {
        this.updateLocalStream(localStream);
      }
      this.syncPeers(peerUids);
      return;
    }

    this.leaveVoice();

    this.gameId = gameId;
    this.myUid = myUid;
    if (localStream !== undefined) {
      this.localStream = localStream;
    }

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

    // 2. Connect to new peers
    for (const peerUid of validPeerSet) {
      if (!this.peerConnections.has(peerUid)) {
        // Deterministic initiator: the alphabetically smaller UID initiates the offer
        if (this.myUid < peerUid) {
          this.initiateConnection(peerUid);
        }
      }
    }
  }

  updateLocalStream(stream: MediaStream | null) {
    this.localStream = stream;

    for (const [, pc] of this.peerConnections.entries()) {
      const senders = pc.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === "audio");

      if (stream) {
        const newTrack = stream.getAudioTracks()[0];
        if (newTrack) {
          if (audioSender) {
            audioSender.replaceTrack(newTrack).catch(() => {});
          } else {
            pc.addTrack(newTrack, stream);
          }
        }
      } else {
        if (audioSender) {
          audioSender.replaceTrack(null).catch(() => {});
        }
      }
    }
  }

  private getOrCreatePeerConnection(peerUid: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerUid);
    if (pc) return pc;

    pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerUid, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc!.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.gameId && this.myUid) {
        this.sendSignal(peerUid, {
          type: "candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;

      let audio = this.audioElements.get(peerUid);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        this.audioElements.set(peerUid, audio);
      }
      audio.srcObject = remoteStream;
      audio.play().catch((err) => {
        console.warn("[WebRTC audio autoplay]", err);
      });

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
        } catch {}
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc!.connectionState === "disconnected" || pc!.connectionState === "failed") {
        this.closePeer(peerUid);
      }
    };

    return pc;
  }

  private async initiateConnection(peerUid: string) {
    try {
      const pc = this.getOrCreatePeerConnection(peerUid);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await this.sendSignal(peerUid, {
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (err) {
      console.warn("[WebRTC initiate error]", err);
    }
  }

  private async sendSignal(peerUid: string, signalData: any) {
    if (!this.gameId || !this.myUid) return;
    try {
      const db = getFirebaseFirestore();
      const signalId = `${this.myUid}_${peerUid}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const signalRef = doc(db, "games", this.gameId, "signals", signalId);
      await setDoc(signalRef, {
        from: this.myUid,
        to: peerUid,
        data: signalData,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.warn("[WebRTC sendSignal error]", err);
    }
  }

  private listenToSignals() {
    if (!this.gameId || !this.myUid) return;
    const db = getFirebaseFirestore();
    const signalsQuery = query(
      collection(db, "games", this.gameId, "signals"),
      where("to", "==", this.myUid),
    );

    this.unsubscribeSignals = onSnapshot(
      signalsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const fromUid = data.from as string;
            const signal = data.data;

            // Clean up processed signal doc
            deleteDoc(change.doc.ref).catch(() => {});

            if (!fromUid || !signal) return;

            const pc = this.getOrCreatePeerConnection(fromUid);

            if (signal.type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: signal.sdp }));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await this.sendSignal(fromUid, {
                type: "answer",
                sdp: answer.sdp,
              });
            } else if (signal.type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: signal.sdp }));
            } else if (signal.type === "candidate") {
              if (signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
              }
            }
          }
        });
      },
      (error) => {
        console.warn("[WebRTC signal listener warning]", error.message);
      },
    );
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
        this.notifySpeaking(peerUid, avg > 15);
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
    this.notifySpeaking(peerUid, false);
  }

  leaveVoice() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.unsubscribeSignals) {
      this.unsubscribeSignals();
      this.unsubscribeSignals = null;
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
    this.localStream = null;
  }
}

export const webRtcVoiceService = new WebRtcVoiceService();
