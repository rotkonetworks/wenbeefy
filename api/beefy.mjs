import { ApiPromise, WsProvider } from '@polkadot/api';
import fetch from 'node-fetch';

const networkConfigs = {
  kusama: {
    providerUrl: 'wss://kusama-rpc.polkadot.io',
    beefyDataUrl: 'https://kusama-staging.w3f.community/validators/beefy',
    dummyValidatorsUrl: 'https://kusama-staging.w3f.community/validators/beefy/dummy',
    validatorsUrl: 'https://raw.githubusercontent.com/w3f/1k-validators-be/master/candidates/kusama.json'
  },
  polkadot: {
    providerUrl: 'wss://rpc.polkadot.io',
    beefyDataUrl: 'https://polkadot-staging.w3f.community/validators/beefy',
    dummyValidatorsUrl: 'https://polkadot-staging.w3f.community/validators/beefy/dummy',
    validatorsUrl: 'https://raw.githubusercontent.com/w3f/1k-validators-be/master/candidates/polkadot.json'
  }
};

class Cache {
  constructor(ttl = 600000) { // 10 min
    this.ttl = ttl;
    this.data = {};
  }

  getCachedData(key) {
    const cachedData = this.data[key];
    if (cachedData) {
      return cachedData.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.data[key] = { data, timestamp: new Date().getTime() };
  }

  isStale(key) {
    const now = new Date().getTime();
    const cachedData = this.data[key];
    if (cachedData) {
      return now - cachedData.timestamp >= this.ttl;
    }
    return true;
  }
}

let globalCache = new Cache();

function hexToString(hex) {
  return Buffer.from(hex.substring(2), 'hex').toString();
}

async function fetchDataWithRetry(url, retries = 3, backoff = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok for ${url}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1}: Failed to fetch data from ${url}`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
}

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok for ${url}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch data from ${url}:`, error);
    throw error; // Rethrow to handle the error outside
  }
}

async function fetch1KVValidators(url) {
  try {
    const data = await fetchData(url);
    return data.candidates.reduce((acc, { stash, name, riotHandle }) => {
      acc[stash] = { name, matrix: riotHandle };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching 1KV validators:", error);
    throw error; // Ensures that the error is propagated up for further handling
  }
}

async function fetchIdentities(addresses, providerUrl) {
  const provider = new WsProvider(providerUrl);
  let api;
  try {
    api = await ApiPromise.create({ provider });
    let allIdentities = [];
    for (const address of addresses) {
      try {
        const identity = await fetchIdentity(api, address, await api.query.session.validators());
        allIdentities.push(identity);
      } catch (error) {
        console.error(`Error fetching identity for address ${address}:`, error);
        allIdentities.push({ address, error: true }); // Example: add with error flag or similar
      }
    }
    return allIdentities;
  } catch (error) {
    console.error("Error initializing Polkadot API:", error);
    throw error; // Rethrow or handle initialization errors
  } finally {
    if (api) await api.disconnect(); // Ensure disconnection in case of success or failure
  }
}

async function fetchIdentity(api, address, currentValidators) {
  const identity = await api.query.identity.identityOf(address);
  const isActiveValidator = currentValidators.some(validator => validator.toString() === address);

  // Initialize an object to hold the identity data
  let identityData = {
    address,
    isActiveValidator,
    judgements: [],
    deposit: '',
    displayName: '',
    legal: '',
    web: '',
    matrix: '',
    email: '',
    pgpFingerprint: '',
    image: '',
    twitter: ''
  };

  if (identity.isSome) {
    const { judgements, deposit, info, superOf } = identity.unwrap();
    const { display, legal, web, riot, email, pgpFingerprint, image, twitter } = info;

    identityData = {
      ...identityData,
      judgements: judgements.map(j => [j[0].toString(), j[1].toString()]),
      deposit: deposit.toString(),
      displayName: display.isRaw ? hexToString(display.asRaw.toHex()) : '',
      legal: legal.isRaw ? hexToString(legal.asRaw.toHex()) : '',
      web: web.isRaw ? hexToString(web.asRaw.toHex()) : '',
      matrix: riot.isRaw ? hexToString(riot.asRaw.toHex()) : '',
      email: email.isRaw ? hexToString(email.asRaw.toHex()) : '',
      pgpFingerprint: pgpFingerprint ? hexToString(pgpFingerprint.toHex()) : '',
      image: image.isRaw ? hexToString(image.asRaw.toHex()) : '',
      twitter: twitter.isRaw ? hexToString(twitter.asRaw.toHex()) : ''
    };

    // If superOf is not none, it means this identity is a sub-identity.
    if (superOf && superOf.isSome) {
      const [parentAddress, subIdentityData] = superOf.unwrap();
      // Fetch the parent identity and merge the parent display name with the sub-identity name
      const parentIdentity = await fetchIdentity(api, parentAddress.toString(), currentValidators);
      identityData.displayName = `${parentIdentity.displayName}/${hexToString(subIdentityData.asRaw.toHex())}`;
    }
  }

  return identityData;
}

async function fetchDataAndUpdateCache(cache, network) {
  if (cache.isStale(network)) {
    console.log(`${network} cache is updating...`);
    try {
      const config = networkConfigs[network];
      const validators1kvMap = await fetch1KVValidators(config.validatorsUrl);
      const dummyValidatorsData = await fetchData(config.dummyValidatorsUrl);
      const dummyValidators = dummyValidatorsData.map(item => item.address);
      const identities = await fetchIdentities(dummyValidators, config.providerUrl);

      const candidates1kv = [];
      const candidatesnon1kv = [];

      identities.forEach(identity => {
        const {
          address,
          isActiveValidator,
          displayName,
          email,
          matrix,
          judgements,
          deposit,
          legal,
          web,
          pgfingerprint,
          image,
          twitter
        } = identity;

        const is1kv = validators1kvMap.hasOwnProperty(address);

        let validatorData = {
          address,
          is1kv,
          isActiveValidator,
          identity: displayName || '',
          nodeName: is1kv && validators1kvMap[address].name ? validators1kvMap[address].name : '',
          email,
          matrix,
          judgements,
          deposit,
          legal,
          web,
          pgfingerprint,
          image,
          twitter
        };

        if (is1kv) {
          candidates1kv.push(validatorData);
        } else {
          candidatesnon1kv.push(validatorData);
        }
      });

      const output = { validator: candidates1kv.concat(candidatesnon1kv) };
      cache.setCachedData(network, output);
      return output;
    } catch (error) {
      console.error(`Error while updating cache for ${network}:`, error);
      throw error;
    }
  } else {
    return cache.getCachedData(network);
  }
}


async function fetchBeefyDataAndUpdateCache(cache, network) {
  const config = networkConfigs[network];
  const beefyDataUrl = config.beefyDataUrl; // Get the URL based on the network
  const beefyData = await fetchData(beefyDataUrl);

  cache.setCachedData(`${network}-beefyStatus`, beefyData); // Use a network-specific key for caching
  return beefyData;
}

async function status(cache, network) {
  const cacheKey = `${network}-beefyStatus`;

  // Immediately return cached data if available, even if stale.
  if (cache.isStale(cacheKey)) {
    console.log(`${network} Beefy cache is stale. Updating data in the background...`);
    fetchBeefyDataAndUpdateCache(cache, network).catch(error => console.error(`Error updating Beefy status for ${network}:`, error));
  } else {
    console.log(`Returning cached Beefy data for ${network}`);
  }

  return cache.getCachedData(cacheKey) || { error: "Data is currently being refreshed. Please try again shortly." };
}

async function main(network) {
  // Check if cached data exists, regardless of its staleness
  let cachedData = globalCache.getCachedData(network);

  if (!cachedData) {
    // If no cached data is available at all, initiate a fetch and wait for it (blocking call)
    console.log(`${network} initial data fetch in progress...`);
    try {
      cachedData = await fetchDataAndUpdateCache(globalCache, network);
      console.log(`Initial data for ${network} fetched successfully.`);
    } catch (error) {
      console.error(`Failed to fetch initial data for ${network}:`, error);
      cachedData = { error: "Failed to fetch data. Please try again later." };
    }
  } else {
    // If cached data exists, return it immediately
    console.log(`Returning cached data for ${network}.`);

    // Then check if the data is stale and update it in the background if necessary
    if (globalCache.isStale(network)) {
      console.log(`${network} cache is stale. Updating data in the background...`);
      fetchDataAndUpdateCache(globalCache, network).catch(error => {
        console.error(`Failed to update data for ${network} in the background:`, error);
      });
    }
  }

  return cachedData;
}

export { main, status, globalCache };
