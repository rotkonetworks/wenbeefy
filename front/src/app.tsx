// @refresh reload
import "virtual:uno.css";
import { Suspense, createSignal, createResource, For } from "solid-js";
import "./app.css";

interface Candidate {
  name?: string;
  stash?: string;
  matrix?: string;
}

async function fetchData() {
  const apiUrl = process.env.API_URL || "http://localhost:4000"; // Fallback to localhost if not set
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
      <main>
        <div class="container mx-auto">
          <h1 class="text-pink-500">wen beefy?</h1>
          <div>
            <p>
              Hey! Are you the reason we can't have nice things?
              Search your validator below to see, if you are included in the list of shame.
              If you are, rotate your validator keys as soon as possible and set them onchain.
            </p>
          </div>
          <div class="flex justify-center">
            <input
              class="search-field w-7/10 px-4 mr-8 py-2 bg-gray-100 rounded-lg border-1 border-gray-300"
              type="text"
              placeholder="Search..."
              onInput={(e) => setSearchQuery(e.target.value)}
            />
            <button class="w-2/10" class="toggle" onClick={() => setShow1kv(!show1kv())}>
              {show1kv() ? "1KV" : "Non-1KV"}
            </button>
          </div>
          <div class="table-container flex flex-col">
            <For each={filteredCandidates()}>
              {candidate => (
                <div class="table-row flex flex-row p-4 m-4 bg-pink-300 bg-opacity-30 overflow-auto">
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
