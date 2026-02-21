import { reactive, ref } from "vue";

export const BTNS = [
  { name: 'top' as const, key: ['2', 's'], arrow: '▲', row: 1, col: 2, on: 'border-yellow-400 bg-yellow-400/20 text-yellow-300 shadow-[0_0_16px_rgba(250,204,21,0.5)]' },
  { name: 'left' as const, key: ['1', 'd'], arrow: '◄', row: 2, col: 1, on: 'border-red-400 bg-red-400/20 text-red-300 shadow-[0_0_16px_rgba(248,113,113,0.5)]' },
  { name: 'right' as const, key: ['3', 'a'], arrow: '►', row: 2, col: 3, on: 'border-blue-400 bg-blue-400/20 text-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.5)]' },
  { name: 'bottom' as const, key: ['4', 'w'], arrow: '▼', row: 3, col: 2, on: 'border-green-400 bg-green-400/20 text-green-300 shadow-[0_0_16px_rgba(132,225,255,0.5)]' },
];

export function useGameState() {
  const score = ref(0);
  const speed = ref(0);
  const fps = ref(0);
  const started = ref(false);
  const tunnelWarning = ref(0);
  const dead = ref(false);
  const engines = reactive({ left: false, top: false, right: false, bottom: false });

  function kill() {
    engines.left = engines.top = engines.right = engines.bottom = false;
  }

  function toggle(name: keyof typeof engines) {
    if (!started.value) return;
    engines[name] = !engines[name];
  }

  function restart() {
    dead.value = false;
    score.value = 0;
    speed.value = 0;
    started.value = false;
    tunnelWarning.value = 0;
    kill();
  }

  return { score, speed, fps, started, tunnelWarning, dead, engines, kill, toggle, restart };
}
