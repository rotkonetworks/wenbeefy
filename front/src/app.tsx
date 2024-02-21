// @refresh reload
import { Suspense, createSignal, createEffect, createResource, For } from "solid-js";
import "virtual:uno.css";
import "./app.css";
import MatrixRain from './Matrix';


const API_PORT = import.meta.env.VITE_API_PORT || 4000;
const API_URL = import.meta.env.VITE_API_URL || `http://0.0.0.0:${API_PORT}/api`;

const apiUrlBase: Record<string, string> = {
  kusama: `${API_URL}/kusama`,
  polkadot: `${API_URL}/polkadot`
};

interface Validator {
  address: string;
  is1kv: boolean;
  isActiveValidator: boolean;
  identity?: string;
  nodeName?: string;
  email?: string;
  matrix?: string;
  twitter?: string;
  web?: string;
  judgements: Array<[string, string]>;
}

interface StatusResponse {
  activeBeefyPercentage: number;
}

async function fetchData(network: string): Promise<Validator[] | null> {
  const apiUrl = apiUrlBase[network];
  console.log(`Fetching data from: ${apiUrl}`); // Debug URL
  try {
    const response = await fetch(apiUrl, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return data.validator as Validator[];
  } catch (error) {
    console.error(`Failed to fetch data for ${network}:`, error);
    return null;
  }
}

async function fetchStatus(network: string): Promise<StatusResponse> {
  try {
    const response = await fetch(`${apiUrlBase[network]}/status`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch status for ${network}:`, error);
    return { activeBeefyPercentage: 0 };
  }
}

export default function App() {
  const [currentNetwork, setCurrentNetwork] = createSignal("polkadot");
  const [showOnly1KV, setShowOnly1KV] = createSignal(false);
  const [showOnlyActive, setShowOnlyActive] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [data, { refetch: refetchData }] = createResource(currentNetwork, fetchData);
  const [status, setStatus] = createSignal({ activeBeefyPercentage: 0 });

  const toggleNetwork = () => {
    setCurrentNetwork(currentNetwork() === "polkadot" ? "kusama" : "polkadot");
  };

  const toggleShowOnly1KV = () => setShowOnly1KV(!showOnly1KV());
  const toggleShowOnlyActive = () => setShowOnlyActive(!showOnlyActive());

  const filteredValidators = () => {
    return data()?.filter((validator) => {
      return (!showOnly1KV() || validator.is1kv) &&
        (!showOnlyActive() || validator.isActiveValidator) &&
        (validator.identity?.toLowerCase().includes(searchQuery().toLowerCase()) ||
          validator.nodeName?.toLowerCase().includes(searchQuery().toLowerCase()) ||
          validator.address.toLowerCase().includes(searchQuery().toLowerCase()));
    });
  };

  // Counting logic for 1KV and Active validators
  const count1kv = () => data()?.filter(validator => validator.is1kv).length || 0;
  const countActive = () => data()?.filter(validator => validator.isActiveValidator).length || 0;

  createEffect(async () => {
    const refetch = refetchData();
    const statusData = await fetchStatus(currentNetwork());
    setStatus(statusData);
  });

  // Slider logic
  const sliderColor = () => {
    const percentage = status().activeBeefyPercentage;
    if (percentage <= 5) return 'bg-red-600';
    if (percentage <= 20) return 'bg-red-500';
    if (percentage <= 40) return 'bg-orange-400';
    if (percentage <= 60) return 'bg-yellow-500';
    if (percentage <= 80) return 'bg-lime-500';
    return 'bg-green-500';
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <main class="margin-0 overflow-hidden">
        <MatrixRain />
        <div class="container text-pink-100 text-lg mx-auto">
          <h1 class="text-pink-500 text-4xl md:text-7xl lg:text-8xl shadow-xl">wen beefy?</h1>
          <div class="w-4/5 md:w-3/5 xl:w-1/2 flex flex-col mx-auto">
            <div class="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700 overflow-hidden relative">
              <div
                class={`h-full rounded-full ${sliderColor()} transition-all duration-300 ease-in-out`}
                style={{ width: `${status().activeBeefyPercentage}%` }}
              >
                <span class="absolute text-sm text-bold text-blue-900 left-1/2 transform -translate-x-1/2">
                  Active Beefy: {status().activeBeefyPercentage.toFixed(2)}%
                </span>
              </div>
            </div>
            <p class="p-4 xl:p-6 text-xs md:text-sm lg:text-md bg-#552BBF backdrop-blur bg-opacity-30">
              <span class="font-semibold">Ahoy validator, chaos awaits!</span>
              We've compiled a 'List of Shame' — not as harsh as it sounds, promise.
              It's just a nudge for those who haven't rotated their validator keys for the upcoming upgrade.
              Simple check: search your validator ID below. If you find yourself on the list, no sweat.
              Just rotate your keys pronto and set them onchain. It's a small step for you,
              but a giant leap for the network. Let's keep the gears turning smoothly!
            </p>
          </div>
          <div class="flex justify-center items-center mb-4 space-x-4">
            <input
              class="search-field flex-1 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300"
              type="text"
              placeholder="Search..."
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <button class="toggle-button py-1 px-2" onClick={toggleShowOnly1KV}>
              {showOnly1KV() ? "1KV (" + count1kv() + ")" : "ALL"}
            </button>
            <button class="toggle-button py-1 px-2" onClick={toggleShowOnlyActive}>
              {showOnlyActive() ? "Active(" + countActive() + ")" : "ALL"}
            </button>
            <button class="toggle-button py-1 px-2 " onClick={toggleNetwork}>
              {currentNetwork().toUpperCase()}
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={filteredValidators()}>
              {(validator: Validator) => (
                <div class="flex flex-col bg-blue-500 bg-opacity-30 backdrop-blur shadow-lg rounded-lg p-4 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl relative">
                  {
                    <div class="flex items-center text-gray-100 mb-2">
                      <i class="i-bi-person-fill mr-2"></i>
                      <span>{validator.identity}</span>
                    </div>
                  }
                  {validator.nodeName && (
                    <div class="flex items-center text-gray-100 mb-2">
                      <i class="i-bi-hdd-stack mr-2"></i>
                      <span>{validator.nodeName}</span>
                    </div>
                  )}
                  <div class="flex items-center text-gray-100 mb-2">
                    <i class="i-bi-wallet2 mr-2"></i>
                    <span class="overflow-hidden">{validator.address}</span>
                  </div>
                  {validator.matrix && (
                    <div class="flex items-center text-gray-100 mb-2">
                      <i class="i-bi-chat-left-text-fill mr-2"></i>
                      <span>{validator.matrix}</span>
                    </div>
                  )}
                  {validator.email && (
                    <div class="flex items-center text-gray-100">
                      <i class="i-bi-envelope-fill mr-2"></i>
                      <span>{validator.email}</span>
                    </div>
                  )}
                  {validator.twitter && (
                    <div class="flex items-center text-gray-100 mt-2">
                      <i class="i-bi-twitter mr-2"></i>
                      <span>{validator.twitter}</span>
                    </div>
                  )}
                  {validator.web && (
                    <div class="flex items-center text-gray-100 mt-2">
                      <i class="i-bi-globe mr-2"></i>
                      <span>{validator.web}</span>
                    </div>
                  )}
                  <div class="absolute top-4 right-4 flex items-center">
                    {validator.isActiveValidator && (
                      <span
                        title="Active Validator"
                        class="text-xs px-2 py-1 bg-green-500 shadow rounded text-white bg-opacity-50 mr-2">
                        Active
                      </span>
                    )}
                    {validator.is1kv && (
                      <span
                        title="Thousand Validator Program Member"
                        class="text-xs px-2 py-1 bg-pink-800 shadow rounded text-white bg-opacity-50 mr-2">
                        1KV
                      </span>
                    )}
                    {validator.judgements && validator.judgements.some(j => j[1] === "Reasonable" || j[1] === "KnownGood") && (
                      <span
                        title="Verified Identity"
                        class="text-xs px-2 py-1 bg-blue-500 shadow rounded text-white bg-opacity-50">
                        <i class="i-bi-person-check-fill"></i>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
