const Settings = {

  // デバッグモード
  get DEBUG() {
    return PropertiesService.getScriptProperties().getProperty('DEBUG') == "true";
  },

  CONFIG: {
    PROPERTIES: [
      {
        key: 'ACCESS_TOKEN',
        name: 'LINE Channel Access Token',
        description: 'Messaging API設定のチャネルアクセストークン（長期）',
        required: true,
        defaultValue: '',
        validator: 'validateAccessToken'
      },
      {
        key: 'GEMINI_API_KEY',
        name: 'Gemini API Key',
        description: 'Google AI Studioで取得したAPIキー',
        required: false,
        defaultValue: '',
        validator: 'validateGeminiApiKey'
      },
      {
        key: 'LIFF_ID',
        name: 'LIFF ID',
        description: 'LIFFアプリのID（例: 12345678-abcdefgh）',
        required: false,
        defaultValue: ''
      },
      {
        key: 'DEBUG',
        name: 'デバッグモード',
        description: 'true または false',
        required: false,
        defaultValue: 'false',
        options: ['true', 'false']
      },
      {
        key: 'GITHUB_TOKEN',
        name: 'GitHub Personal Access Token',
        description: 'フロントエンドデプロイ用 (repo権限必須)',
        required: false,
        defaultValue: ''
      },
      {
        key: 'GITHUB_REPO',
        name: 'GitHub Repository',
        description: 'デプロイ先のリポジトリ名 (例: MaskRom/line_store_manager)',
        required: false,
        defaultValue: ''
      }
    ]
  },

  // ============================== APIキー・エンドポイント ==============================

  get GEMINI_API_KEY() {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  },

  get GEMINI_API_URL() {
    return "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + this.GEMINI_API_KEY;
  },

  // ============================== LINE関連 ==============================

  // LINEアクセストークン
  get ACCESS_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
  },

  // LINEククライアント (使用時に生成)
  get lc() {
    return new LineBotSDK.Client({ channelAccessToken: this.ACCESS_TOKEN });
  },

  // LIFF ID
  get LIFF_ID() {
    return PropertiesService.getScriptProperties().getProperty('LIFF_ID');
  },


  // Web App URL (デプロイURL)
  get WEB_APP_URL() {
    // 動的にWeb App URLを取得（デプロイ後は自動的に正しいURLを返す）
    try {
      return ScriptApp.getService().getUrl();
    } catch (e) {
      // フォールバック: 手動設定されたURL
      const manualUrl = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
      if (manualUrl) {
        return manualUrl;
      }
      // 最後のフォールバック（既存のハードコードURL）
      return 'https://script.google.com/macros/s/AKfycbz_a0u7STmWNuOwu4j9eVsqMFrlpfqviefGHyXvCaNwVP_uVH9TavC9jNoJo1OY73F9/exec';
    }
  },


  // ============================== GitHub連携 ==============================

  get GITHUB_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  },

  get GITHUB_REPO() {
    return PropertiesService.getScriptProperties().getProperty('GITHUB_REPO');
  },

  // ============================== スプレッドシート ==============================

  // スプレッドシートID（環境依存設定）
  get SS() {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!ssId) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
    return SpreadsheetApp.openById(ssId);
  },

  // ============================== 権限・定数 (Immutable) ==============================

  // アプリケーション権限
  AUTH: Object.freeze({
    NONE: 0,     // 操作不可
    TEMP: 1,     // 在籍未確認
    STAFF: 2,    // 通常スタッフ
    MANAGER: 3,  // 店舗責任者
    ADMIN: 4,    // 店舗追加削除
    DEV: 5       // デバッグ・開発用
  }),

  // SST
  SST: Object.freeze({
    TRAINING: "トレーニング中",
    STAFF: "スタッフ",
    STAR: "スター",
    SUB_TRAINER: "サブトレーナ―",
    TRAINER: "トレーナー",
    MASTER: "マスター",
    NONE: "なし"
  }),
  // SHEET configuration moved to app/models/Models.js

};