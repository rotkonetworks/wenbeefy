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

async function fetchDummyValidatorsAndIdentities() {
    const dummyUrl = 'https://kusama-staging.w3f.community/validators/beefy/dummy';
    const dummyValidators = await fetchData(dummyUrl)
        .then(data => data.map(item => item.address));

    const identities = await fetchIdentities(dummyValidators, 'wss://rpc.ibp.network/kusama');

    return identities.map(identity => ({
        address: identity.address,
        name: identity.displayName,
        email: identity.email,
        matrix: identity.matrix
    }));
}

async function fetchDataAndUpdateCache(cache) {
    const dummyValidatorIdentities = await fetchDummyValidatorsAndIdentities();

    cache.setCachedData('main', dummyValidatorIdentities);
    return dummyValidatorIdentities;
}

async function main(cache) {
    if (cache.isStale('main')) {
        console.log("Cache is stale. Fetching new data...");
        if (!cache.getCachedData('main')) {
            await fetchDataAndUpdateCache(cache);
        } else {
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
