// @refresh reload
import "virtual:uno.css";
import { Component, Suspense, createSignal, createEffect, createResource, For } from "solid-js";
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

const fetchStatus = async () => {
  const apiUrl = process.env.BEEFY_STATUS_URL || "http://localhost:4000/api/status"; // Fallback to localhost if not set
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
};

const BeefyStatusSlider = (props) => {
  const percentage = props.percentage;
  const name = props.name;

  // Determine the color of the slider based on the percentage
  let sliderColor;

  if (percentage <= 5) {
      sliderColor = 'bg-red-800'; // Dark Red
  } else if (percentage <= 10) {
      sliderColor = 'bg-red-700'; // Less Dark Red
  } else if (percentage <= 15) {
      sliderColor = 'bg-red-600'; // Medium Red
  } else if (percentage <= 20) {
      sliderColor = 'bg-red-500'; // Light Red
  } else if (percentage <= 25) {
      sliderColor = 'bg-red-400'; // Lightest Red
  } else if (percentage <= 30) {
      sliderColor = 'bg-orange-700'; // Dark Orange
  } else if (percentage <= 35) {
      sliderColor = 'bg-orange-600'; // Less Dark Orange
  } else if (percentage <= 40) {
      sliderColor = 'bg-orange-500'; // Medium Orange
  } else if (percentage <= 45) {
      sliderColor = 'bg-orange-400'; // Light Orange
  } else if (percentage <= 50) {
      sliderColor = 'bg-orange-300'; // Lightest Orange
  } else if (percentage <= 55) {
      sliderColor = 'bg-yellow-600'; // Dark Yellow
  } else if (percentage <= 60) {
      sliderColor = 'bg-yellow-500'; // Less Dark Yellow
  } else if (percentage <= 65) {
      sliderColor = 'bg-yellow-400'; // Medium Yellow
  } else if (percentage <= 70) {
      sliderColor = 'bg-yellow-300'; // Light Yellow
  } else if (percentage <= 75) {
      sliderColor = 'bg-lime-300'; // Lightest Yellow
  } else if (percentage <= 80) {
      sliderColor = 'bg-lime-400'; // Dark Lime
  } else if (percentage <= 85) {
      sliderColor = 'bg-lime-500'; // Less Dark Lime
  } else if (percentage <= 90) {
      sliderColor = 'bg-green-300'; // Medium Lime
  } else if (percentage <= 95) {
      sliderColor = 'bg-green-500'; // Dark Green
  } else {
      sliderColor = 'bg-green-600'; // Darkest Green
  }

  return (
    <div class="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700 overflow-hidden relative">
      <div 
        class={`h-full rounded-full ${sliderColor} transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      >
        <span class="absolute text-sm text-bold text-blue-900 left-1/2 transform -translate-x-1/2">
          activeBeefyPercentage: {percentage.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [data, set_data ] = createResource(fetchData);
  const [status, { refetch }] = createResource(fetchStatus);
  const [show1kv, setShow1kv] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");

  const count1kv = () => data()?.candidates1kv?.length || 0;
  const countNon1kv = () => data()?.candidatesnon1kv?.length || 0;

  // Load beefy status from API
  createEffect(() => {
    fetchStatus().then(data => {
      if (data && data.activeBeefyPercentage !== undefined) {
        setBeefyStatus(data.activeBeefyPercentage);
      } else {
        console.error("Invalid data format received from API");
        // Optionally set a default or error state here
      }
    }).catch(error => {
        console.error("Error fetching beefy status:", error);
        // Optionally set a default or error state here
      });
  });

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
      <main class="margin-0 overflow-hidden">
        <MatrixRain/>
        <div class="container text-pink-100 text-lg mx-auto">
          <h1 class="text-pink-500 text-8xl shadow-xl">wen beefy?</h1>
          <div class="w-4/5 md:w-3/5 xl:w-1/2 flex flex-col mx-auto">
            <BeefyStatusSlider percentage={status()?.activeBeefyPercentage || 0} />
            <p class="p-8 bg-#552BBF bg-blur bg-opacity-85">
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
