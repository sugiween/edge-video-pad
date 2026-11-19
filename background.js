chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'toggleFullscreen') return;
  const windowId = sender && sender.tab && sender.tab.windowId;
  if (windowId === undefined) return;
  (async () => {
    try {
      const key = 'prevState_' + windowId;
      const win = await chrome.windows.get(windowId);
      if (!win) return;
      if (win.state === 'fullscreen') {
        const saved = await chrome.storage.session.get(key);
        await chrome.windows.update(windowId, { state: saved[key] || 'maximized' });
        await chrome.storage.session.remove(key);
      } else {
        await chrome.storage.session.set({ [key]: win.state });
        await chrome.windows.update(windowId, { state: 'fullscreen' });
      }
    } catch (e) {}
  })();
});
