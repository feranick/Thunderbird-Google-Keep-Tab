// --- 1. User-Agent Spoofing (Required for Keep to load correctly) ---
browser.spacesToolbar.addButton('GoogleKeep', {
    title: "Google Keep",
    defaultIcons: "skin/google_keep_icon.svg",
    url: "https://keep.google.com/"
});

browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === "user-agent") {
        header.value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0";
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["https://keep.google.com/*", "https://*.google.com/*"] },
  ["blocking", "requestHeaders"]
);

// --- 2. Context Menu Implementation ---
browser.menus.create({
  id: "keep-create-note",
  title: browser.i18n.getMessage("contextMenuTitle") || "Create note in Google Keep",
  contexts: ["selection"]
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "keep-create-note" && info.selectionText) {
    const selectedText = info.selectionText;

    // Open Keep in a new tab
    browser.tabs.create({ url: "https://keep.google.com/" }).then((newTab) => {
      
      browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === "complete") {
          browser.tabs.onUpdated.removeListener(listener);

          // Inject context script with dynamic structural layout matchers
          browser.tabs.executeScript(tabId, {
            code: `
              (function() {
                const textToSave = ${JSON.stringify(selectedText)};
                console.log("Keep Ext: Script injected, scanning DOM for Keep UI element...");

                // Finds the unexpanded "Take a note..." element across all languages
                function findTakeNoteElement() {
                  // 1. Try language-independent structural attribute 
                  let combo = document.querySelector('div[role="combobox"]');
                  if (combo) return combo;

                  // 2. Multilingual fuzzy match on common variations
                  const targets = ["take a note", "scrivi una nota", "notiz schreiben", "añade una nota", "crear una nota", "prendre note"];
                  const divs = document.querySelectorAll('div[aria-label]');
                  for (let div of divs) {
                    const label = div.getAttribute('aria-label').toLowerCase();
                    if (targets.some(t => label.includes(t))) return div;
                  }

                  // 3. Fallback check for raw visible inner text
                  for (let div of document.querySelectorAll('div')) {
                    if (div.children.length <= 2) {
                      const text = div.innerText.toLowerCase().trim();
                      if (targets.some(t => text.startsWith(t.replace('…','').replace('...','')))) return div;
                    }
                  }
                  return null;
                }

                // Finds the expanded contenteditable text box
                function findTextAreaElement() {
                  const editables = document.querySelectorAll('div[contenteditable="true"]');
                  if (editables.length === 0) return null;
                  
                  // If multiple input components exist, choose the note text body over the title line
                  if (editables.length >= 2) {
                    for (let el of editables) {
                      const label = (el.getAttribute('aria-label') || "").toLowerCase();
                      if ((label.includes("text") || label.includes("nota") || label.includes("notiz")) && 
                          !(label.includes("title") || label.includes("titolo") || label.includes("titel") || label.includes("título"))) {
                        return el;
                      }
                    }
                    return editables[1]; // Usually index 0 is title, index 1 is body
                  }
                  return editables[0];
                }

                let attempts = 0;
                const checkInterval = setInterval(() => {
                  attempts++;
                  let newNoteDiv = findTakeNoteElement();
                  
                  if (newNoteDiv) {
                    console.log("Keep Ext: Successfully found input wrapper target. Clicking element...");
                    clearInterval(checkInterval);
                    newNoteDiv.click(); 
                    
                    let textAttempts = 0;
                    const textInterval = setInterval(() => {
                      textAttempts++;
                      let textArea = findTextAreaElement();
                                     
                      if (textArea) {
                        console.log("Keep Ext: Text wrapper exposed. Injecting clipboard data...");
                        clearInterval(textInterval);
                        textArea.innerText = textToSave;
                        textArea.dispatchEvent(new Event('input', { bubbles: true }));
                      } else if (textAttempts > 20) {
                        console.log("Keep Ext: Error - Timed out waiting for the editable area to unfold.");
                        clearInterval(textInterval);
                      }
                    }, 250);
                    
                  } else if (attempts > 40) {
                    console.log("Keep Ext: Critical Error - Timed out waiting for Keep UI main component.");
                    // Print diagnostics to see exactly what attributes Google rendered in this session
                    console.log("Keep Ext: Discovered labels on page: ", Array.from(document.querySelectorAll('div[aria-label]')).map(el => el.getAttribute('aria-label')));
                    clearInterval(checkInterval);
                  }
                }, 250);
              })();
            `
          });
        }
      });
    });
  }
});
