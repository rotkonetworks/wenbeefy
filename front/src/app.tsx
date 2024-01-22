// @refresh reload
import "virtual:uno.css";
import { Component, Suspense, createSignal, createResource, For } from "solid-js";
import "./app.css";
import MatrixRain from './Matrix';

interface Candidate {
  name?: string;
  stash?: string;
  matrix?: string;
}

async function fetchData() {
  const apiUrl = process.env.API_URL || "http://localhost:4000/api"; // Fallback to localhost if not set
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return null; // Return null in case of error
  }
}

export default function App() {
  const [data, set_data ] = createResource(fetchData);
  const [show1kv, setShow1kv] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");

  const count1kv = () => data()?.candidates1kv?.length || 0;
  const countNon1kv = () => data()?.candidatesnon1kv?.length || 0;

  const filteredCandidates = () => {
    const candidates = show1kv() ? data()?.candidates1kv : data()?.candidatesnon1kv;
    if (!candidates) return [];

    const query = searchQuery().toLowerCase();
    return candidates.filter((candidate: Candidate) => 
      candidate.name?.toLowerCase().includes(query) ||
        candidate.stash?.toLowerCase().includes(query) ||
        (typeof candidate.matrix === 'string' && candidate.matrix.toLowerCase().includes(query))
    );
  };



  return (
    <Suspense fallback={<div>Loading...</div>}>
        <main class="margin-0 w-full h-full overflow-hidden">
        <MatrixRain/>
          <div class="container text-pink-100 text-lg mx-auto">
            <h1 class="text-pink-500 text-8xl shadow-xl">wen beefy?</h1>
            <div>
              <p class="p-8 w-4/5 md:w-3/5 xl:w-1/2 bg-#552BBF bg-blur bg-opacity-85">
                <span class="text-bold">Ahoy validator, chaos awaits!</span> We've compiled a 'List of Shame' — not as harsh as it sounds, promise.
                It's just a nudge for those who haven't rotated their validator keys for the upcoming upgrade.
                Simple check: search your validator ID below. If you find yourself on the list, no sweat.
                Just rotate your keys pronto and set them onchain. It's a small step for you,
                but a giant leap for the network. Let's keep the gears turning smoothly!
              </p>
            </div>
            <div class="flex justify-center">
              <input
                class="search-field w-7/10 px-4 mr-8 py-2 bg-gray-100 rounded-lg border-1 border-gray-300"
                type="text"
                placeholder="Search..."
                onInput={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                class="w-2/10 toggle" 
                onClick={() => setShow1kv(!show1kv())}>
                {show1kv() ? `1KV (${count1kv()})` : `Non-1KV (${countNon1kv()})`}
              </button>
            </div>
            <div class="table-container flex flex-col">
              <For each={filteredCandidates()}>
                {candidate => (
                  <div class="table-row flex flex-row p-4 m-4 bg-#00B2FF bg-opacity-50 bg-blur overflow-auto">
                    <div>{candidate.name}</div>
                    <div>{candidate.stash || candidate.address}</div>
                    <div>{candidate.matrix}</div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </main>
    </Suspense>
  );
}
