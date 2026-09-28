export type PickedDriveItem = {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
};

const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";
const MOBILE_MULTISELECT_LIMIT = 8;

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY || "";
  const explicitProject = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER || "";
  const firebaseAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";
  const derivedProject = firebaseAppId.split(":")[1] || "";
  return { apiKey, appId: explicitProject || derivedProject };
}

function isMobilePicker() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator?.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    window.matchMedia?.("(pointer: coarse)")?.matches === true
  );
}

function createPicker(
  accessToken: string,
  options: {
    folderOnly?: boolean;
    parentId?: string;
    multiple?: boolean;
    title?: string;
  } = {}
): Promise<PickedDriveItem[]> {
  return new Promise<PickedDriveItem[]>((resolve, reject) => {
    try {
      const google = window.google;
      if (!google?.picker) throw new Error("PICKER_UNAVAILABLE");
      const { apiKey, appId } = pickerConfig();
      if (!apiKey) throw new Error("PICKER_NOT_CONFIGURED");

      let view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMode(google.picker.DocsViewMode.LIST);

      if (options.folderOnly) {
        view = view
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
          .setMimeTypes(GOOGLE_FOLDER_MIME);
      } else {
        view = view
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);
        if (options.parentId) view = view.setParent(options.parentId);
      }

      let builder = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setLocale("ar")
        .setOrigin(window.location.origin)
        .setTitle(
          options.title ||
            (options.folderOnly
              ? "اختيار مجلد من Google Drive"
              : "اختيار ملفات من Google Drive")
        )
        .setCallback((data: any) => {
          const action = data?.action;
          if (action === google.picker.Action.CANCEL) {
            resolve([]);
            return;
          }
          if (action !== google.picker.Action.PICKED) return;
          const docs = Array.isArray(data?.docs) ? data.docs : [];
          resolve(
            docs
              .map((doc: any) => ({
                id: String(doc?.id || ""),
                name: String(doc?.name || ""),
                mimeType: String(doc?.mimeType || ""),
                ...(typeof doc?.url === "string" ? { url: doc.url } : {}),
              }))
              .filter((doc: PickedDriveItem) => doc.id)
          );
        });

      if (options.multiple && google.picker.Feature?.MULTISELECT_ENABLED) {
        builder = builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      }
      if (appId) builder = builder.setAppId(appId);
      builder.build().setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("PICKER_UNAVAILABLE"));
    }
  });
}

export async function pickDriveFolder(accessToken: string) {
  const { apiKey } = pickerConfig();
  if (!apiKey) throw new Error("PICKER_NOT_CONFIGURED");
  await loadPickerApi();
  const items = await createPicker(accessToken, { folderOnly: true });
  const picked = items[0] ?? null;
  if (picked && picked.mimeType !== GOOGLE_FOLDER_MIME) {
    throw new Error("PICKER_FOLDER_REQUIRED");
  }
  return picked;
}

export async function pickDriveFiles(
  accessToken: string,
  options: { parentId?: string; multiple?: boolean; title?: string } = {}
) {
  const { apiKey } = pickerConfig();
  if (!apiKey) throw new Error("PICKER_NOT_CONFIGURED");
  await loadPickerApi();

  // Google Picker exposes MULTISELECT_ENABLED, but its mobile web UI may still
  // complete the picker after one tapped file. On touch/mobile devices Athari
  // therefore keeps reopening the same folder and accumulates the selections.
  // The user finishes by closing/cancelling the picker; all chosen files are
  // then returned together and are processed as one evidence bundle.
  if (options.multiple && isMobilePicker()) {
    const selected = new Map<string, PickedDriveItem>();

    while (selected.size < MOBILE_MULTISELECT_LIMIT) {
      const count = selected.size;
      const title = count
        ? `تم اختيار ${count} · اختاري ملفًا آخر أو أغلقي النافذة للانتهاء`
        : "اختاري ملفًا · سيعود المجلد لإضافة ملفات أخرى";

      const batch = await createPicker(accessToken, {
        ...options,
        multiple: false,
        title,
      });

      if (!batch.length) break;
      for (const item of batch) selected.set(item.id, item);
    }

    return [...selected.values()];
  }

  return createPicker(accessToken, options);
}

/** Backward-compatible single-item picker for older callers. */
export async function pickDriveItem(accessToken: string): Promise<PickedDriveItem | null> {
  const items = await pickDriveFiles(accessToken, { multiple: false });
  return items[0] ?? null;
}
