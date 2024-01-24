// @refresh reload
import "virtual:uno.css";
import { Suspense, createSignal, createEffect, createResource, For } from "solid-js";
import "./app.css";
import MatrixRain from './Matrix';

interface Validator {
  address: string;
  is1kv: boolean;
  identity?: string;
  nodeName?: string;
  email?: string;
  matrix?: string;
  twitter?: string;
  web?: string;
}

// Define the states
const DisplayStates = {
  SHOW_ALL: "SHOW_ALL",
  SHOW_1KV: "SHOW_1KV",
  SHOW_NON_1KV: "SHOW_NON_1KV"
};

async function fetchData() {
  const apiUrl = process.env.API_URL || "http://localhost:4000/api"; // Fallback to localhost if not set
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data;
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
          activeBeefy: {percentage.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};


export default function App() {
  const [data, { refetch: refetchData }] = createResource(fetchData);
  const [status, { refetch: refetchStatus }] = createResource(fetchStatus);
  const [displayState, setDisplayState] = createSignal(DisplayStates.SHOW_ALL);
  const [searchQuery, setSearchQuery] = createSignal("");

  // Update counting logic to consider the is1kv boolean field
  const count1kv = () => data()?.validator?.filter(validator => validator.is1kv).length || 0;
  const countNon1kv = () => data()?.validator?.filter(validator => !validator.is1kv).length || 0;

  const handleToggleClick = () => {
    setDisplayState(prevState => {
      switch (prevState) {
        case DisplayStates.SHOW_ALL:
          return DisplayStates.SHOW_1KV;
        case DisplayStates.SHOW_1KV:
          return DisplayStates.SHOW_NON_1KV;
        default:
          return DisplayStates.SHOW_ALL;
      }
    });
  };


  // Define the refresh interval for fetching data
  const refreshInterval = 60000; // 60 seconds

  // Automatically refetch data and status at the specified interval
  createEffect(() => {
    // Initial fetch
    refetchData();
    refetchStatus();

    // Set up intervals for continuous updating
    const dataInterval = setInterval(() => {
      refetchData();
    }, refreshInterval);

    const statusInterval = setInterval(() => {
      refetchStatus();
    }, refreshInterval);

    // Clean up the intervals when the component is unmounted
    return () => {
      clearInterval(dataInterval);
      clearInterval(statusInterval);
    };
  });


  const getButtonLabel = () => {
    switch (displayState()) {
      case DisplayStates.SHOW_1KV:
        return `1KV (${count1kv()})`;
      case DisplayStates.SHOW_NON_1KV:
        return `Non-1KV (${countNon1kv()})`;
      default:
        return "Show All";
    }
  };

  const filteredValidators = () => {
    const validators = data()?.validator || [];
    const query = searchQuery().toLowerCase();

    return validators.filter(validator => {
      // First, filter based on the display state
      const displayFilter = (
        displayState() === DisplayStates.SHOW_ALL ||
          (displayState() === DisplayStates.SHOW_1KV && validator.is1kv) ||
          (displayState() === DisplayStates.SHOW_NON_1KV && !validator.is1kv)
      );

      // Then, filter based on the search query
      return displayFilter && (
        validator.identity?.toLowerCase().includes(query) ||
          validator.nodeName?.toLowerCase().includes(query) ||
          validator.email?.toLowerCase().includes(query) ||
          validator.matrix?.toLowerCase().includes(query) ||
          validator.twitter?.toLowerCase().includes(query) ||
          validator.web?.toLowerCase().includes(query)
      );
    });
  };


  return (
    <Suspense fallback={<div>Loading...</div>}>
      <main class="margin-0 overflow-hidden">
        <MatrixRain/>
        <div class="container text-pink-100 text-lg mx-auto">
        <h1 class="text-pink-500 text-4xl md:text-6xl lg:text-8xl shadow-xl">wen beefy?</h1>
          <div class="w-4/5 md:w-3/5 xl:w-1/2 flex flex-col mx-auto">
            <BeefyStatusSlider percentage={status()?.activeBeefyPercentage || 0} />
            <p class="p-4 xl:p-6 text-xs md:text-sm lg:text-md bg-#552BBF backdrop-blur bg-opacity-30">
              <span class="font-semibold">Ahoy validator, chaos awaits!</span> We've compiled a 'List of Shame' — not as harsh as it sounds, promise.
              It's just a nudge for those who haven't rotated their validator keys for the upcoming upgrade.
              Simple check: search your validator ID below. If you find yourself on the list, no sweat.
              Just rotate your keys pronto and set them onchain. It's a small step for you,
              but a giant leap for the network. Let's keep the gears turning smoothly!
            </p>
          </div>
          <div class="flex justify-center mb-4">
            <input
              class="search-field w-7/10 px-4 mr-8 py-2 bg-gray-100 rounded-lg border-1 border-gray-300"
              type="text"
              placeholder="Search..."
              onInput={(e) => setSearchQuery(e.target.value)}
            />
            <button
              class="w-2/10 px-4 py-2 bg-#D3FF33 bg-opacity-40 hover:bg-opacity-50 backdrop-blur hover:backdrop-blur text-white font-semibold rounded-lg shadow-md hover:bg-#56F39A focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 toggle" 
              onClick={handleToggleClick}>
              {getButtonLabel()}
            </button>
          </div>
          <div class="flex flex-col">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={filteredValidators()}>
                {validator => (
                  <div class="flex flex-col bg-blue-500 bg-opacity-30 backdrop-blur shadow-lg rounded-lg p-4 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl relative">
                    {validator.identity && (
                      <div class="flex items-center text-gray-100 mb-2">
                        <i class="i-bi-person-fill mr-2"></i>
                        <span>{validator.identity}</span>
                        {validator.is1kv && <span class="text-xs px-2 py-1 bg-pink-800 shadow rounded text-white absolute top-4 right-4 bg-opacity-50">1kv</span>}
                      </div>
                    )}
                    {validator.nodeName && (
                      <div class="flex items-center text-gray-100 mb-2">
                        <i class="i-bi-hdd-stack mr-2"></i>
                        <span>{validator.nodeName}</span>
                      </div>
                    )}
                    {validator.address && (
                      <div class="flex items-center text-gray-100 mb-2">
                        <i class="i-bi-wallet2 mr-2"></i>
                        <span class="overflow-hidden">{validator.address}</span>
                      </div>
                    )}
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
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
