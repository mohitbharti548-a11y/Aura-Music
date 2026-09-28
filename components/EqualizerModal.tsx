'use client';
// components/EqualizerModal.tsx
// 5-band graphic equalizer with presets and sub-bass booster via Web Audio API.
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setEqualizerOpen,
  setEQPreset,
  setEQGain,
  setEQBassBoost,
  setEQPreamp,
} from '../features/player/playerSlice';
import { audioEngine, EQ_BANDS, EQ_PRESETS } from '../lib/audio-engine';

export default function EqualizerModal() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.player.isEqualizerOpen);
  const eqPreset = useAppSelector((s) => s.player.eqPreset);
  const eqGains = useAppSelector((s) => s.player.eqGains);
  const eqBassBoost = useAppSelector((s) => s.player.eqBassBoost);
  const eqPreamp = useAppSelector((s) => s.player.eqPreamp);

  if (!isOpen) return null;

  function handleSelectPreset(presetName: string) {
    const values = audioEngine.setPreset(presetName);
    dispatch(setEQPreset({ preset: presetName, gains: values }));
  }

  function handleGainChange(bandIndex: number, gain: number) {
    audioEngine.setBandGain(bandIndex, gain);
    dispatch(setEQGain({ bandIndex, gain }));
  }

  function handleBassBoostChange(val: number) {
    audioEngine.setBassBoost(val);
    dispatch(setEQBassBoost(val));
  }

  function handlePreampChange(val: number) {
    audioEngine.setPreamp(val);
    dispatch(setEQPreamp(val));
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
      onClick={() => dispatch(setEqualizerOpen(false))}
    >
      <div
        className="w-full max-w-lg bg-[#0f0f14]/95 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-base text-violet-400">🎚</span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Audio Equalizer</h3>
              <p className="text-[11px] text-zinc-400">Web Audio 32-bit DSP Engine</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(setEqualizerOpen(false))}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Presets Row */}
        <div className="py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Sound Presets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(EQ_PRESETS).map((preset) => {
              const isSelected = eqPreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all depth-button border ${
                    isSelected
                      ? 'bg-violet-600 border-violet-400 text-white font-semibold shadow-md shadow-violet-600/30'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Slider Bars */}
        <div className="py-4 border-y border-white/[0.06]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              5-Band Parametric Curves
            </span>
            <span className="text-xs font-mono text-violet-300">
              {eqPreset} Mode
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-4 h-48 px-2 items-end">
            {EQ_BANDS.map((band, idx) => {
              const gain = eqGains[idx] ?? 0;
              return (
                <div key={band.label} className="flex flex-col items-center h-full justify-between">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {gain > 0 ? `+${gain}` : gain}dB
                  </span>

                  {/* Vertical Slider Track Container */}
                  <div className="relative w-6 h-32 flex items-center justify-center">
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={gain}
                      onChange={(e) => handleGainChange(idx, Number(e.target.value))}
                      className="w-32 h-2 accent-violet-500 cursor-pointer origin-center -rotate-90"
                    />
                  </div>

                  <span className="text-[10px] font-medium text-zinc-300 mt-2 text-center">
                    {band.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bass Booster & Preamp Gain Sliders */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-white">Sub-Bass Booster</span>
              <span className="font-mono text-violet-400">{eqBassBoost}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={eqBassBoost}
              onChange={(e) => handleBassBoostChange(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-white">Preamp Gain</span>
              <span className="font-mono text-violet-400">{eqPreamp.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={eqPreamp}
              onChange={(e) => handlePreampChange(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
