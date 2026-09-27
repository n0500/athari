export type PickedDriveItem = {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void; onerror?: () => void }) => void;
    };
    google?: any;
  }
}

let pickerReady: Promise<void> | null = null;

function loadPickerApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("PICKER_UNAVAILABLE"));
  if (window.google?.picker) return Promise.resolve();
  if (pickerReady) return pickerReady;

  pickerReady = new Promise<void>((resolve, reject) => {
    const load = () => {
      if (!window.gapi) {
        reject(new Error("PICKER_UNAVAILABLE"));
        return;
      }
      window.gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("PICKER_UNAVAILABLE")),
      });
    };

    if (window.gapi) {
      load();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-athari-picker="1"]');
    if (existing) {
      existing.addEventListener("load", load, { once: true });
      existing.addEventListener("error", () => reject(new Error("PICKER_UNAVAILABLE")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.athariPicker = "1";
    script.onload = load;
    script.onerror = () => reject(new Error("PICKER_UNAVAILABLE"));
    document.head.appendChild(script);
  });

  return pickerReady;
}

function pickerConfig() {
  // Google Picker needs its own Browser API key. Do not fall back to the
  // Firebase Web API key because Firebase keys can be restricted to APIs
  // that Picker does not accept and Google then shows a raw "invalid
  // developer key" dialog to the teacher.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY || "";
  const explicitProject = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER || "";
  const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";
  const derivedProject = firebaseAppId.split(":")[1] || "";
  return { apiKey, appId: explicitProject || derivedProject };
}

export async function pickDriveItem(accessToken: string): Promise<PickedDriveItem | null> {
  const { apiKey, appId } = pickerConfig();
  if (!apiKey) throw new Error("PICKER_NOT_CONFIGURED");

  await loadPickerApi();
  const google = window.google;
  if (!google?.picker) throw new Error("PICKER_UNAVAILABLE");

  return new Promise<PickedDriveItem | null>((resolve, reject) => {
    try {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMode(google.picker.DocsViewMode.LIST);

      let builder = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setLocale("ar")
        .setOrigin(window.location.origin)
        .setTitle("اختيار ملف أو مجلد من Google Drive")
        .setCallback((data: any) => {
          const action = data?.action;
          if (action === google.picker.Action.CANCEL) {
            resolve(null);
            return;
          }
          if (action !== google.picker.Action.PICKED) return;
          const doc = data?.docs?.[0];
          if (!doc) {
            resolve(null);
            return;
          }
          resolve({
            id: String(doc.id || ""),
            name: String(doc.name || ""),
            mimeType: String(doc.mimeType || ""),
            url: typeof doc.url === "string" ? doc.url : undefined,
          });
        });

      if (appId) builder = builder.setAppId(appId);
      const picker = builder.build();
      picker.setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("PICKER_UNAVAILABLE"));
    }
  });
}
