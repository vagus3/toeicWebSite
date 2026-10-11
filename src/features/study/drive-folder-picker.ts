/**
 * Google Picker로 저장할 Drive 폴더를 고른다.
 * 앱은 drive.file 권한만 쓰므로, 사용자가 이 창에서 고른 폴더에만 접근 권한이 생긴다.
 * 버튼을 눌렀을 때만 Google 스크립트를 불러온다.
 */

type PickerDoc = { id: string; name: string };
type PickerResult = { action: string; docs?: PickerDoc[] };
type PickerView = {
  setIncludeFolders(v: boolean): PickerView;
  setSelectFolderEnabled(v: boolean): PickerView;
  setMimeTypes(v: string): PickerView;
};
type PickerBuilder = {
  addView(v: PickerView): PickerBuilder;
  setOAuthToken(v: string): PickerBuilder;
  setDeveloperKey(v: string): PickerBuilder;
  setAppId(v: string): PickerBuilder;
  setOrigin(v: string): PickerBuilder;
  setLocale(v: string): PickerBuilder;
  setTitle(v: string): PickerBuilder;
  setCallback(cb: (r: PickerResult) => void): PickerBuilder;
  build(): { setVisible(v: boolean): void };
};
type PickerNamespace = {
  DocsView: new (viewId: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
  ViewId: { FOLDERS: string };
  Action: { PICKED: string; CANCEL: string };
};
declare global {
  interface Window {
    gapi?: { load(name: string, cb: { callback: () => void; onerror: () => void }): void };
    google?: { picker?: PickerNamespace };
  }
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
let loading: Promise<PickerNamespace> | null = null;

function loadPicker(): Promise<PickerNamespace> {
  loading ??= new Promise<PickerNamespace>((resolve, reject) => {
    const ready = () =>
      window.gapi!.load("picker", {
        callback: () => resolve(window.google!.picker!),
        onerror: () => reject(new Error("picker_load_failed")),
      });
    if (window.gapi) return ready();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("picker_load_failed"));
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null; // 네트워크 오류 뒤 다시 시도할 수 있게 한다
    throw error;
  });
  return loading;
}

export async function pickDriveFolder(config: {
  accessToken: string;
  apiKey: string;
  appId: string;
}): Promise<PickerDoc | null> {
  const picker = await loadPicker();
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes(FOLDER_MIME);
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(config.accessToken)
      .setDeveloperKey(config.apiKey)
      // App ID가 있어야 고른 폴더에 이 앱의 drive.file 접근 권한이 부여된다
      .setAppId(config.appId)
      .setOrigin(window.location.origin)
      .setLocale("ko")
      .setTitle("인증 사진을 저장할 폴더 선택")
      .setCallback((result) => {
        if (result.action === picker.Action.PICKED)
          resolve(result.docs?.[0] ?? null);
        else if (result.action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
