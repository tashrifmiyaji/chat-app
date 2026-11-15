const cache = new Map();

export const getCacheScope = () => {
    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
        return userInfo?.token || 'anonymous';
    } catch (error) {
        console.error('Failed to read cache scope from local storage:', error);
        return 'anonymous';
    }
};

export const cachedRequest = async (key, request, ttl = Infinity) => {
    const now = Date.now();
    const cached = cache.get(key);
    if (cached?.value !== undefined && cached.expiresAt > now) {
        return cached.value;
    }
    if (cached?.promise) {
        return cached.promise;
    }

    const promise = request()
        .then(value => {
            cache.set(key, { value, expiresAt: Date.now() + ttl });
            return value;
        })
        .catch(error => {
            cache.delete(key);
            throw error;
        });

    cache.set(key, { promise, expiresAt: now + ttl });
    return promise;
};

export const updateCachedValue = (key, update) => {
    const cached = cache.get(key);
    if (cached?.value !== undefined) {
        cache.set(key, { value: update(cached.value), expiresAt: cached.expiresAt });
    }
};

export const setCachedValue = (key, value, ttl = Infinity) => {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
};

export const invalidateCachedValue = (key) => cache.delete(key);

export const invalidateCachedPrefix = (prefix) => {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key);
    }
};

export const clearRequestCache = () => cache.clear();
