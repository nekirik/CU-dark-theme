// MV3 service worker for CU Dark Theme
const STORAGE_KEYS = {
    themeMode: 'cuDarkTheme.mode',
    darkLogoPath: 'cuDarkTheme.darkLogoPath',
    lightLogoPath: 'cuDarkTheme.lightLogoPath'
};

const DEFAULTS = {
    [STORAGE_KEYS.themeMode]: 'auto',
    [STORAGE_KEYS.darkLogoPath]: undefined,
    [STORAGE_KEYS.lightLogoPath]: undefined
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(Object.keys(DEFAULTS), (items) => {
        const toSet = {};
        for (const [key, val] of Object.entries(DEFAULTS)) {
            if (items[key] === undefined) toSet[key] = val;
        }
        if (Object.keys(toSet).length) {
            chrome.storage.sync.set(toSet);
        }
    });
});

chrome.action.onClicked.addListener((_tab) => {
    chrome.storage.sync.get([STORAGE_KEYS.themeMode], ({[STORAGE_KEYS.themeMode]: mode}) => {
        const order = ['auto', 'dark', 'light'];
        const idx = Math.max(0, order.indexOf(mode || 'auto'));
        const next = order[(idx + 1) % order.length];
        chrome.storage.sync.set({[STORAGE_KEYS.themeMode]: next}, () => {
            chrome.tabs.query({url: 'https://my.centraluniversity.ru/*'}, (tabs) => {
                for (const t of tabs) {
                    chrome.tabs.sendMessage(t.id, {type: 'CU_DARK_THEME_APPLY_NOW'});
                }
            });
        });
    });
});


