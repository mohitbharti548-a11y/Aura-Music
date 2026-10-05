// lib/audio-engine.ts
// Professional Web Audio API engine providing multi-band graphic EQ, bass boost, and presets.

export interface EQBand {
  frequency: number;
  type: BiquadFilterType;
  label: string;
}

export const EQ_BANDS: EQBand[] = [
  { frequency: 60, type: 'lowshelf', label: '60 Hz' },
  { frequency: 230, type: 'peaking', label: '230 Hz' },
  { frequency: 910, type: 'peaking', label: '910 Hz' },
  { frequency: 3600, type: 'peaking', label: '3.6 kHz' },
  { frequency: 14000, type: 'highshelf', label: '14 kHz' },
];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [8, 5, 0, 0, -1],
  'Treble Boost': [-2, 0, 2, 5, 8],
  Acoustic: [3, 2, 1, 3, 4],
  Rock: [5, 3, -1, 3, 6],
  Electronic: [7, 4, -1, 3, 6],
  'Hip-Hop': [8, 4, 1, 2, 4],
  'Vocal Boost': [-3, 0, 6, 4, 1],
  Classical: [4, 3, 0, 3, 4],
  'Deep Sub': [10, 6, -2, -2, -3],
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private connectedElement: HTMLAudioElement | null = null;
  private isInitialized = false;

  public init(audioElement: HTMLAudioElement) {
    // Bypassing Web Audio API to fix Lockscreen Media Session & Volume Suppression (Issue #1, #4)
    if (true) return;

    if (this.isInitialized && this.connectedElement === audioElement) {
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.connectedElement = audioElement;

      // Note: createMediaElementSource can only be called once per audio element
      this.sourceNode = this.ctx!.createMediaElementSource(audioElement);

      // 1. Create Preamp Gain Node
      this.gainNode = this.ctx!.createGain();
      this.gainNode!.gain.value = 1.0;

      // 2. Create Dedicated Sub-Bass Booster Filter
      this.bassFilter = this.ctx!.createBiquadFilter();
      this.bassFilter!.type = 'lowshelf';
      this.bassFilter!.frequency.value = 80;
      this.bassFilter!.gain.value = 0;

      // 3. Create 5-Band Parametric/Graphic EQ Filters
      this.filters = EQ_BANDS.map((band) => {
        const filter = this.ctx!.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        return filter;
      });

      // 4. Chain: Source -> Preamp -> Bass Filter -> EQ Band 0..4 -> Destination
      let currentNode: AudioNode = this.sourceNode!;
      currentNode.connect(this.gainNode!);
      currentNode = this.gainNode!;

      currentNode.connect(this.bassFilter!);
      currentNode = this.bassFilter!;

      for (const filter of this.filters) {
        if (!filter) continue;
        currentNode.connect(filter);
        currentNode = filter;
      }

      currentNode.connect(this.ctx!.destination);
      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio API EQ initialization note:', err);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setBandGain(bandIndex: number, gainDb: number) {
    if (!this.filters[bandIndex] || !this.ctx) return;
    const clamped = Math.max(-15, Math.min(15, gainDb));
    this.filters[bandIndex].gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setPreset(presetName: string): number[] {
    const values = EQ_PRESETS[presetName] || EQ_PRESETS.Flat;
    values.forEach((gain, idx) => {
      this.setBandGain(idx, gain);
    });
    return values;
  }

  public setBassBoost(level: number) {
    // level: 0 to 100
    if (!this.bassFilter || !this.ctx) return;
    const gainDb = (level / 100) * 12; // up to +12dB sub-bass boost
    this.bassFilter.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
  }

  public setPreamp(gainValue: number) {
    if (!this.gainNode || !this.ctx) return;
    const clamped = Math.max(0.2, Math.min(2.0, gainValue));
    this.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }
}

export const audioEngine = new AudioEngine();
