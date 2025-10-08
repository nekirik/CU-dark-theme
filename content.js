// CU Dark Theme content script for centraluniversity.ru

(() => {
    const STORAGE_KEYS = {
        themeMode: 'cuDarkTheme.mode',
        darkLogoPath: 'cuDarkTheme.darkLogoPath',
        lightLogoPath: 'cuDarkTheme.lightLogoPath'
    };

    const THEME_CLASS = 'cu-dark-mode';
    const FORCE_DARK_CLASS = 'cu-force-dark';
    const DARK_BG_COLOR = '#0e0f12';

    let cachedMode = 'auto';
    let mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    function queryStorage(keys) {
        return new Promise(resolve => {
            try {
                chrome.storage.sync.get(keys, resolve);
            } catch (_) {
                chrome.storage.local.get(keys, resolve);
            }
        });
    }


    function computeIsDark(mode) {
        if (mode === 'dark') return true;
        if (mode === 'light') return false;
        return mediaQueryList.matches;
    }

    function setThemeClass(isDark) {
        const root = document.documentElement;
        root.classList.remove(THEME_CLASS);
        root.classList.toggle(FORCE_DARK_CLASS, isDark);
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light');
        if (isDark) {
            root.style.setProperty('--cu-bg', DARK_BG_COLOR);
        } else {
            root.style.removeProperty('--cu-bg');
        }
    }

    function findCandidateLogoElements() {
        const candidates = [];
        candidates.push(...document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i]'));
        candidates.push(...document.querySelectorAll('[class*="logo" i] img'));
        candidates.push(...document.querySelectorAll('a[href="/" i] img'));
        return Array.from(new Set(candidates)).filter(Boolean);
    }

    function swapLogoAssets(isDark, {darkUrl, lightUrl}) {
        const imgElements = findCandidateLogoElements();
        imgElements.forEach(el => {
            if (!(el instanceof HTMLImageElement)) return;

            const img = el;
            if (isDark) {
                if (!img.dataset.cuOriginalSrc) {
                    img.dataset.cuOriginalSrc = img.src;
                }
                if (darkUrl) img.src = darkUrl;
                if (!darkUrl) {
                    img.style.filter = 'invert(1) hue-rotate(180deg)';
                }
            } else {
                if (lightUrl) {
                    img.src = lightUrl;
                } else if (img.dataset.cuOriginalSrc) {
                    img.src = img.dataset.cuOriginalSrc;
                }
                img.style.filter = '';
            }
        });

        const cssVarLogoSelectors = [
            'header .header__logo-link a[style*="--t-icon-start"]',
            '.logo-link[style*="--t-icon-start"]',
            '.logo-link a[style*="--t-icon-start"]'
        ];
        const cssVarLogoElements = document.querySelectorAll(cssVarLogoSelectors.join(','));
        cssVarLogoElements.forEach((el) => {
            const elem = el;
            if (!(elem instanceof HTMLElement)) return;
            if (isDark) {
                if (!elem.dataset.cuOriginalIconVar) {
                    const current = elem.style.getPropertyValue('--t-icon-start');
                    if (current) elem.dataset.cuOriginalIconVar = current;
                }
                if (darkUrl) {
                    elem.style.setProperty('--t-icon-start', `url(${darkUrl})`);
                }
                elem.style.color = '#ffffff';
                elem.style.filter = 'none';
            } else {
                if (lightUrl) {
                    elem.style.setProperty('--t-icon-start', `url(${lightUrl})`);
                } else {
                    const original = elem.dataset.cuOriginalIconVar;
                    if (original) {
                        elem.style.setProperty('--t-icon-start', original);
                    } else {
                        elem.style.removeProperty('--t-icon-start');
                    }
                }
                elem.style.color = '#000000';
                elem.style.filter = '';
            }
        });
    }

    function observeDynamicChanges(logoUrls) {
        const observer = new MutationObserver(() => {
            const isDark = computeIsDark(cachedMode);
            setThemeClass(isDark);
            swapLogoAssets(isDark, logoUrls);
        });
        if (document.body) {
            observer.observe(document.body, {childList: true, subtree: true});
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    observer.observe(document.body, {childList: true, subtree: true});
                }
            });
        }
    }

    async function getDarkLogoUrl() {
        const {[STORAGE_KEYS.darkLogoPath]: storedPath} = await queryStorage([STORAGE_KEYS.darkLogoPath]);
        if (!storedPath) return null;
        try {
            return chrome.runtime.getURL(storedPath);
        } catch (_) {
            return null;
        }
    }

    async function getLightLogoUrl() {
        const {[STORAGE_KEYS.lightLogoPath]: storedPath} = await queryStorage([STORAGE_KEYS.lightLogoPath]);
        if (!storedPath) return null;
        try {
            return chrome.runtime.getURL(storedPath);
        } catch (_) {
            return null;
        }
    }

    async function applyThemeFromStorage() {
        const data = await queryStorage([STORAGE_KEYS.themeMode]);
        cachedMode = data[STORAGE_KEYS.themeMode] || 'auto';
        const isDark = computeIsDark(cachedMode);
        setThemeClass(isDark);
        const [darkUrl, lightUrl] = await Promise.all([getDarkLogoUrl(), getLightLogoUrl()]);
        swapLogoAssets(isDark, {darkUrl, lightUrl});
    }

    function subscribeToChanges() {
        try {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area !== 'sync' && area !== 'local') return;
                if (changes[STORAGE_KEYS.themeMode]) {
                    cachedMode = changes[STORAGE_KEYS.themeMode].newValue || 'auto';
                    const isDark = computeIsDark(cachedMode);
                    setThemeClass(isDark);
                    Promise.all([getDarkLogoUrl(), getLightLogoUrl()])
                        .then(([darkUrl, lightUrl]) => swapLogoAssets(isDark, {darkUrl, lightUrl}));
                }
                if (changes[STORAGE_KEYS.darkLogoPath] || changes[STORAGE_KEYS.lightLogoPath]) {
                    const isDark = computeIsDark(cachedMode);
                    Promise.all([getDarkLogoUrl(), getLightLogoUrl()])
                        .then(([darkUrl, lightUrl]) => swapLogoAssets(isDark, {darkUrl, lightUrl}));
                }
            });
        } catch (_) {
        }

        mediaQueryList.addEventListener('change', () => {
            if (cachedMode === 'auto') {
                const isDark = computeIsDark('auto');
                setThemeClass(isDark);
                Promise.all([getDarkLogoUrl(), getLightLogoUrl()])
                    .then(([darkUrl, lightUrl]) => swapLogoAssets(isDark, {darkUrl, lightUrl}));
            }
        });

        try {
            chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
                if (message?.type === 'CU_DARK_THEME_APPLY_NOW') {
                    applyThemeFromStorage().then(() => sendResponse({ok: true}));
                    return true;
                }
                return undefined;
            });
        } catch (_) {
        }
    }

    (async function init() {
        await applyThemeFromStorage();
        const darkUrl = await getDarkLogoUrl();
        const lightUrl = await getLightLogoUrl();
        observeDynamicChanges({darkUrl, lightUrl});
        subscribeToChanges();
    })();
})();


