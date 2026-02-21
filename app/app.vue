<template>
  <div class="relative w-full h-full select-none">
    <NuxtRouteAnnouncer />
    <canvas ref="canvasEl" class="block w-full h-full"></canvas>

    <div v-if="!started" class="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-50 cursor-pointer" @click="started = true">
      <h1 class="text-5xl font-bold text-white mb-2 tracking-tight">FLIPCORE</h1>
      <p class="text-lg text-white/50 mb-6">Your ship flies forward — toggle boosters to steer</p>
      <div class="text-white/60 font-mono text-sm space-y-1 text-center mb-8">
        <p>Keys <span class="text-red-400 font-bold">1</span> <span class="text-yellow-300 font-bold">2</span> <span class="text-blue-400 font-bold">3</span> <span class="text-green-400 font-bold">4</span> — tilt ship</p>
        <p>SPACE — kill all</p>
        <p>R — reset pos</p>
      </div>
      <p class="text-white/30 animate-pulse">Click or press any key to launch</p>
    </div>

    <div v-if="started" class="fixed top-4 left-4 font-mono pointer-events-none z-40">
      <p class="text-3xl font-bold text-white drop-shadow-lg">{{ score }}</p>
      <p class="text-[10px] text-white/40 tracking-widest">SCORE</p>
      <p class="text-sm text-white/40 mt-2 tabular-nums">{{ speed.toFixed(1) }} <span class="text-[10px]">m/s</span> · {{ fps }} <span class="text-[10px]">fps</span></p>
    </div>

    <div v-if="started" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div class="grid grid-cols-3 grid-rows-3 gap-1">
        <div v-for="b in btns" :key="b.name"
          class="pointer-events-auto cursor-pointer w-11 h-11 border-2 font-mono text-[11px] font-bold flex flex-col items-center justify-center transition-all duration-75"
          :class="engines[b.name] ? b.on : 'border-white/10 bg-white/5 text-white/20'"
          :style="{ gridRow: b.row, gridColumn: b.col }"
          @click="toggle(b.name)"
        ><span class="text-[8px] leading-none">{{ b.arrow }}</span></div>
        <div class="w-9 h-9 border border-white/10 bg-white/3 flex items-center justify-center text-white/15 text-xs self-center justify-self-center" style="grid-row:2;grid-column:2">◆</div>
      </div>
    </div>

    <div v-if="started" class="fixed bottom-3 right-4 font-mono text-[10px] text-white/20 pointer-events-none z-40 text-right">
      <p>SPACE kill boosters</p>
      <p>R reset</p>
    </div>

    <div v-if="started && tunnelWarning > 0 && !dead" class="fixed inset-0 pointer-events-none z-30 rounded-3xl"
      :style="{ boxShadow: `inset 0 0 ${60 + tunnelWarning * 100}px rgba(255,40,40,${tunnelWarning * 0.45})` }" />

    <div v-if="dead" class="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50">
      <p class="text-red-500 text-6xl font-bold mb-4 tracking-widest">AH F**K!</p>
      <p class="text-white/50 text-lg mb-2">Score: <span class="text-white font-bold text-2xl">{{ score }}</span></p>
      <p class="text-white/30 text-sm mt-6 animate-pulse">Press R or click to restart</p>
    </div>
  </div>
</template>

<script setup>
import { useGameState, BTNS } from "./composables/useGameState";
import { init } from "./game/engine";

const canvasEl = ref(null);
const btns = BTNS;
const { score, speed, fps, started, tunnelWarning, dead, engines, kill, toggle, restart } = useGameState();

useHead({
  title: "Flipcore",
  meta: [
    { name: "description", content: "ship game go brrr" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  ],
});

let cleanup = () => {};

onMounted(async () => {
  if (!canvasEl.value) return;
  cleanup = await init(canvasEl.value, { engines, score, speed, fps, started, tunnelWarning, dead, kill, restart });
});

onBeforeUnmount(() => cleanup());
</script>
