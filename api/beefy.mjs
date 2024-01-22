import { ApiPromise, WsProvider } from '@polkadot/api';
import fetch from 'node-fetch';

class Cache {
    constructor(ttl = 36000000) { // 1 hour
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

    const identities = await Promise.all(addresses.map(async (address) => {
        const identity = await api.query.identity.identityOf(address);
        if (identity.isSome) {
            const { display, email, riot } = identity.unwrap().info;
            return {
                address,
                displayName: display.isRaw ? hexToString(display.asRaw.toHex()) : '',
                email: email.isRaw ? hexToString(email.asRaw.toHex()) : '',
                matrix: riot.isRaw ? hexToString(riot.asRaw.toHex()) : ''
            };
        }
        return { address, displayName: '', email: '', matrix: '' };
    }));

    await api.disconnect();
    return identities;
}

async function fetchDataAndUpdateCache(cache) {
    const validators1kvMap = await fetch1KVValidators();
    const dummyValidators = await fetchData('https://kusama-staging.w3f.community/validators/beefy/dummy')
        .then(data => data.map(item => item.address));

    const identities = await fetchIdentities(dummyValidators, 'wss://rpc.ibp.network/kusama');

    const candidates1kv = [];
    const candidatesnon1kv = [];

    identities.forEach(identity => {
        const { address, displayName, email, matrix } = identity;
        const is1kv = validators1kvMap.hasOwnProperty(address);

        const validatorData = {
            address,
            name: displayName || (is1kv ? validators1kvMap[address].name : ''),
            email: email || (is1kv ? validators1kvMap[address].email : ''),
            matrix: matrix || (is1kv ? validators1kvMap[address].matrix : '')
        };

        if (is1kv) {
            candidates1kv.push(validatorData);
        } else {
            candidatesnon1kv.push(validatorData);
        }
    });

    const output = { candidates1kv, candidatesnon1kv };
    cache.setCachedData('main', output);
    return output;
}

async function fetchBeefyDataAndUpdateCache(cache) {
    const beefyDataUrl = 'https://kusama.w3f.community/validators/beefy';
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
