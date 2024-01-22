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
    return data.candidates.map(({ stash, name, riotHandle }) => ({
        stash,
        name,
        matrix: riotHandle
    }));
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
    const validators1kv = await fetch1KVValidators();
    const nonRotatedValidators = await fetchData('https://kusama-staging.w3f.community/validators/beefy/dummy')
        .then(data => data.map(item => item.address));

    const non1kvValidators = nonRotatedValidators.filter(validator =>
        !validators1kv.some(v1kv => v1kv.stash === validator));

    const non1kvIdentities = await fetchIdentities(non1kvValidators, 'wss://rpc.ibp.network/kusama');

    const candidatesnon1kv = non1kvIdentities.map(identity => ({
        address: identity.address,
        name: identity.displayName,
        email: identity.email,
        matrix: identity.matrix
    }));

    const output = { candidates1kv: validators1kv, candidatesnon1kv };
    cache.setCachedData('main', output);
    return output;
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

export { main, globalCache };
