import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Shuffle } from "lucide-react";

type Algo = "bubble" | "selection" | "insertion" | "quick" | "merge";

interface Frame { arr: number[]; highlight: number[]; sorted: number[]; note: string; }

function bubbleFrames(a: number[]): Frame[] {
  const arr = a.slice(); const frames: Frame[] = [{ arr: arr.slice(), highlight: [], sorted: [], note: "Start" }];
  const sorted: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      frames.push({ arr: arr.slice(), highlight: [j, j+1], sorted: sorted.slice(), note: `Compare ${arr[j]} & ${arr[j+1]}` });
      if (arr[j] > arr[j+1]) { [arr[j], arr[j+1]] = [arr[j+1], arr[j]]; frames.push({ arr: arr.slice(), highlight: [j, j+1], sorted: sorted.slice(), note: `Swap` }); }
    }
    sorted.unshift(arr.length - i - 1);
  }
  frames.push({ arr: arr.slice(), highlight: [], sorted: arr.map((_, i) => i), note: "Done" });
  return frames;
}
function selectionFrames(a: number[]): Frame[] {
  const arr = a.slice(); const frames: Frame[] = [{ arr: arr.slice(), highlight: [], sorted: [], note: "Start" }];
  const sorted: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    let min = i;
    for (let j = i+1; j < arr.length; j++) {
      frames.push({ arr: arr.slice(), highlight: [min, j], sorted: sorted.slice(), note: `Find min from ${i}` });
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) [arr[i], arr[min]] = [arr[min], arr[i]];
    sorted.push(i);
    frames.push({ arr: arr.slice(), highlight: [i], sorted: sorted.slice(), note: `Placed ${arr[i]}` });
  }
  return frames;
}
function insertionFrames(a: number[]): Frame[] {
  const arr = a.slice(); const frames: Frame[] = [{ arr: arr.slice(), highlight: [], sorted: [0], note: "Start" }];
  for (let i = 1; i < arr.length; i++) {
    let j = i;
    while (j > 0 && arr[j-1] > arr[j]) {
      frames.push({ arr: arr.slice(), highlight: [j-1, j], sorted: Array.from({length:i+1}, (_,k)=>k), note: `Shift ${arr[j]}` });
      [arr[j-1], arr[j]] = [arr[j], arr[j-1]]; j--;
    }
    frames.push({ arr: arr.slice(), highlight: [j], sorted: Array.from({length:i+1}, (_,k)=>k), note: `Insert` });
  }
  return frames;
}
function quickFrames(a: number[]): Frame[] {
  const arr = a.slice(); const frames: Frame[] = [];
  const sorted = new Set<number>();
  function qs(lo: number, hi: number) {
    if (lo >= hi) { if (lo === hi) sorted.add(lo); return; }
    const pivot = arr[hi]; let i = lo;
    for (let j = lo; j < hi; j++) {
      frames.push({ arr: arr.slice(), highlight: [j, hi], sorted: Array.from(sorted), note: `Pivot ${pivot}` });
      if (arr[j] < pivot) { [arr[i], arr[j]] = [arr[j], arr[i]]; i++; }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]]; sorted.add(i);
    frames.push({ arr: arr.slice(), highlight: [i], sorted: Array.from(sorted), note: `Place pivot` });
    qs(lo, i-1); qs(i+1, hi);
  }
  frames.push({ arr: arr.slice(), highlight: [], sorted: [], note: "Start" });
  qs(0, arr.length - 1);
  frames.push({ arr: arr.slice(), highlight: [], sorted: arr.map((_,i)=>i), note: "Done" });
  return frames;
}
function mergeFrames(a: number[]): Frame[] {
  const arr = a.slice(); const frames: Frame[] = [{ arr: arr.slice(), highlight: [], sorted: [], note: "Start" }];
  function ms(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = (lo+hi) >> 1; ms(lo, mid); ms(mid+1, hi);
    const tmp: number[] = []; let i = lo, j = mid+1;
    while (i <= mid && j <= hi) { frames.push({ arr: arr.slice(), highlight: [i,j], sorted: [], note: `Merge [${lo},${hi}]` }); if (arr[i] <= arr[j]) tmp.push(arr[i++]); else tmp.push(arr[j++]); }
    while (i <= mid) tmp.push(arr[i++]);
    while (j <= hi) tmp.push(arr[j++]);
    for (let k = 0; k < tmp.length; k++) arr[lo+k] = tmp[k];
    frames.push({ arr: arr.slice(), highlight: Array.from({length: hi-lo+1}, (_,k)=>lo+k), sorted: [], note: `Merged` });
  }
  ms(0, arr.length-1);
  frames.push({ arr: arr.slice(), highlight: [], sorted: arr.map((_,i)=>i), note: "Done" });
  return frames;
}

const BUILDERS: Record<Algo, (a: number[]) => Frame[]> = { bubble: bubbleFrames, selection: selectionFrames, insertion: insertionFrames, quick: quickFrames, merge: mergeFrames };

export function DsaVisualizer({ initial }: { initial?: number[] }) {
  const [arr, setArr] = useState<number[]>(initial ?? [5,3,8,4,2,7,1,6]);
  const [algo, setAlgo] = useState<Algo>("bubble");
  const [frames, setFrames] = useState<Frame[]>(() => BUILDERS.bubble([5,3,8,4,2,7,1,6]));
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(200);
  const timerRef = useRef<any>(null);

  useEffect(() => { setFrames(BUILDERS[algo](arr)); setIdx(0); setPlaying(false); }, [algo, arr]);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => { if (i >= frames.length - 1) { setPlaying(false); return i; } return i + 1; });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [playing, frames, speed]);

  const f = frames[idx] ?? frames[0];
  const max = Math.max(...f.arr, 1);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={algo} onChange={(e) => setAlgo(e.target.value as Algo)} className="bg-slate-800 text-slate-100 text-xs rounded px-2 py-1 border border-slate-700">
          <option value="bubble">Bubble Sort</option>
          <option value="selection">Selection Sort</option>
          <option value="insertion">Insertion Sort</option>
          <option value="quick">Quick Sort</option>
          <option value="merge">Merge Sort</option>
        </select>
        <button onClick={() => setPlaying((p) => !p)} className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1 inline-flex items-center gap-1">
          {playing ? <Pause size={12}/> : <Play size={12}/>}
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={() => { setIdx(0); setPlaying(false); }} className="rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2 py-1 inline-flex items-center gap-1"><RotateCcw size={12}/>Reset</button>
        <button onClick={() => setArr(Array.from({length: 10}, () => Math.floor(Math.random()*50)+1))} className="rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2 py-1 inline-flex items-center gap-1"><Shuffle size={12}/>Shuffle</button>
        <input type="range" min={50} max={800} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-24" />
        <span className="text-xs text-slate-400">Step {idx+1}/{frames.length}</span>
      </div>
      <div className="flex items-end gap-1 h-40 bg-slate-950 rounded p-2">
        {f.arr.map((v, i) => {
          const isHl = f.highlight.includes(i);
          const isSorted = f.sorted.includes(i);
          const bg = isHl ? "bg-pink-500" : isSorted ? "bg-emerald-500" : "bg-indigo-500";
          return (
            <div key={i} className={`flex-1 ${bg} rounded-t transition-all duration-150 flex items-end justify-center text-[10px] text-white font-bold pb-0.5`} style={{ height: `${(v/max)*100}%` }}>
              {v}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">{f.note}</div>
    </div>
  );
}
