const STORAGE_KEYS = {
    themeMode: 'cuDarkTheme.mode'
};

function qs(selector) {
    return document.querySelector(selector);
}

function setChecked(mode) {
    const input = qs(`input[name="mode"][value="${mode}"]`);
    if (input) input.checked = true;
}

async function getMode() {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get([STORAGE_KEYS.themeMode], (data) => {
                resolve(data[STORAGE_KEYS.themeMode] || 'auto');
            });
        } catch (_) {
            chrome.storage.local.get([STORAGE_KEYS.themeMode], (data) => {
                resolve(data[STORAGE_KEYS.themeMode] || 'auto');
            });
        }
    });
}

async function setMode(mode) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.set({[STORAGE_KEYS.themeMode]: mode}, resolve);
        } catch (_) {
            chrome.storage.local.set({[STORAGE_KEYS.themeMode]: mode}, resolve);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mode = await getMode();
    setChecked(mode);

    document.body.addEventListener('change', async (e) => {
        const target = e.target;
        if (target && target.name === 'mode') {
            await setMode(target.value);
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (!tabs || !tabs[0]) return;
                chrome.tabs.sendMessage(tabs[0].id, {type: 'CU_DARK_THEME_APPLY_NOW'}, () => {
                    void chrome.runtime?.lastError;
                });
            });
        }
    });
});


