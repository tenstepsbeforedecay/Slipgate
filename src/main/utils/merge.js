// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
function trimWrap(str) {
    if (str.startsWith('<') && str.endsWith('>')) {
        return str.slice(1, -1);
    }
    return str;
}
export function deepMerge(target, other) {
    for (const key in other) {
        if (isObject(other[key])) {
            if (key.endsWith('!')) {
                const k = trimWrap(key.slice(0, -1));
                target[k] = other[key];
            }
            else {
                const k = trimWrap(key);
                if (!target[k])
                    Object.assign(target, { [k]: {} });
                deepMerge(target[k], other[k]);
            }
        }
        else if (Array.isArray(other[key])) {
            const k = trimWrap(key);
            Object.assign(target, { [k]: other[key] });
        }
        else {
            Object.assign(target, { [key]: other[key] });
        }
    }
    return target;
}
