import { ApiPromise, WsProvider } from '@polkadot/api';
import fetch from 'node-fetch';

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

async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

async function fetch1KVValidators() {
  const url = 'https://raw.githubusercontent.com/w3f/1k-validators-be/master/candidates/kusama.json';
  const data = await fetchData(url);
  return data.candidates.reduce((acc, { stash, name, riotHandle }) => {
    acc[stash] = { name, matrix: riotHandle };
    return acc;
  }, {});
}


async function fetchIdentities(addresses, providerUrl) {
  const provider = new WsProvider(providerUrl);
  const api = await ApiPromise.create({ provider });

  const currentValidators = await api.query.session.validators();

  async function fetchIdentity(address) {
    const identity = await api.query.identity.identityOf(address);
    const isActiveValidator = currentValidators.some(validator => validator.toString() === address);

    if (identity.isSome) {
      const { judgements, deposit, info } = identity.unwrap();
      const { display, legal, web, riot, email, pgpFingerprint, image, twitter } = info;

      return {
        address,
        isActiveValidator,
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
    } else {
      // Check if it's a sub-identity and fetch the parent identity
      const superOf = await api.query.identity.superOf(address);
      if (superOf.isSome) {
        const parentAddress = superOf.unwrap()[0].toString();
        const parentIdentity = await fetchIdentity(parentAddress);
        // Use the original address, but parent's identity details
        parentIdentity.address = address;
        return parentIdentity;
      }
      return {
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
    }
  }

  let allIdentities = [];
  for (const address of addresses) {
    const identity = await fetchIdentity(address);
    allIdentities.push(identity);
  }

  await api.disconnect();
  return allIdentities;
}

async function fetchDataAndUpdateCache(cache) {
  const validators1kvMap = await fetch1KVValidators();
  const dummyValidators = await fetchData('https://kusama-staging.w3f.community/validators/beefy/dummy')
    .then(data => data.map(item => item.address));

  const identities = await fetchIdentities(dummyValidators, 'wss://rpc.ibp.network/kusama');

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
      is1kv: is1kv,
      isActiveValidator: identity.isActiveValidator
    };

    // Add fields only if they have data
    if (displayName) validatorData.identity = displayName;
    if (is1kv && validators1kvMap[address].name) validatorData.nodeName = validators1kvMap[address].name;
    if (email) validatorData.email = email;
    if (matrix) validatorData.matrix = matrix;
    if (judgements && judgements.length > 0) validatorData.judgements = judgements;
    if (deposit) validatorData.deposit = deposit;
    if (legal) validatorData.legal = legal;
    if (web) validatorData.web = web;
    if (pgfingerprint) validatorData.pgfingerprint = pgfingerprint;
    if (image) validatorData.image = image;
    if (twitter) validatorData.twitter = twitter;

    if (is1kv) {
      candidates1kv.push(validatorData);
    } else {
      candidatesnon1kv.push(validatorData);
    }
  });

  // const output = { candidates1kv, candidatesnon1kv };
  const output = { validator: candidates1kv.concat(candidatesnon1kv) };
  cache.setCachedData('main', output);
  return output;
}

async function fetchBeefyDataAndUpdateCache(cache) {
  const beefyDataUrl = 'https://kusama-staging.w3f.community/validators/beefy';
  const beefyData = await fetchData(beefyDataUrl);

  cache.setCachedData('beefyStatus', beefyData);
  return beefyData;
}

async function status(cache) {
  if (cache.isStale('beefyStatus')) {
    console.log("Beefy cache is stale. Fetching new data...");
    return await fetchBeefyDataAndUpdateCache(cache);
  }

  console.log("Returning cached Beefy data");
  return cache.getCachedData('beefyStatus');
}

async function main(cache) {
  if (cache.isStale('main')) {
    console.log("Cache is stale. Fetching new data...");
    // Wait for cache update if no data is available
    if (!cache.getCachedData('main')) {
      await fetchDataAndUpdateCache(cache);
    } else {
      // Update cache in background if stale data is available
      fetchDataAndUpdateCache(cache);
    }
  }

  const cachedData = cache.getCachedData('main');
  if (cachedData) {
    console.log("Returning cached data");
    return cachedData;
  } else {
    console.log("No cached data available. Fetching new data...");
    return await fetchDataAndUpdateCache(cache);
  }
}

export { main, status, globalCache };
