export function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepCopy(item)) as unknown as T;
    }

    const copiedObj: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            copiedObj[key] = deepCopy((obj as any)[key]);
        }
    }

    return copiedObj;
}