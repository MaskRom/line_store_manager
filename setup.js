/**
 * セットアップ関数（ひな形作成・シート構築）
 * 
 * 1. スクリプトプロパティのひな形（枠）を作成
 * 2. スプレッドシートの構築（再構築）
 */

function setup() {
    console.log("🚀 === セットアップ開始 ===");
    Logger.log("🚀 === セットアップ開始 ===");

    try {
        // 1. プロパティのひな形作成
        setupPropertySkeleton();

        // 2. シート作成
        setupSheets();

        // 3. リッチメニュー初期化
        setupRichMenus();

        Logger.log("✅ セットアップが完了しました。");
        Logger.log("⚠️ 注意: スクリプトプロパティに値（ACCESS_TOKEN等）を設定してください。");

    } catch (e) {
        Logger.log("❌ エラー: " + e.toString());
    }
}

/**
 * プロパティのひな形作成
 * 未設定のプロパティがあれば、空文字（またはデフォルト値）で枠を作成する
 */
function setupPropertySkeleton() {
    Logger.log("--- プロパティ設定（ひな形作成） ---");
    const props = PropertiesService.getScriptProperties();
    const configList = Settings.CONFIG.PROPERTIES;
    const currentProps = props.getProperties();

    for (const config of configList) {
        const key = config.key;
        const defaultVal = config.defaultValue || ""; // デフォルト値があれば使用

        // 未設定の場合のみセット
        if (!currentProps.hasOwnProperty(key)) {
            props.setProperty(key, defaultVal);
            Logger.log(`CREATED: ${key} (値: "${defaultVal}")`);
        } else {
            Logger.log(`SKIP: ${key} (既存の設定あり)`);
        }
    }
}

/**
 * シート作成・更新（非破壊的）
 * 既存データがある場合は保持し、カラム定義が変更された場合のみ移行を行う
 */
function setupSheets() {
    Logger.log("--- シート作成・更新開始 ---");

    // スプレッドシート取得
    let ss = getSpreadsheet();
    if (!ss) return;

    const sheetConfigs = Models.SHEET;

    for (const key in sheetConfigs) {
        const config = sheetConfigs[key];
        const sheetName = config.NAME;
        const newHeaders = config.HEADER || Object.keys(config.COL).sort((a, b) => config.COL[a] - config.COL[b]);

        // シート取得
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            // 新規作成
            sheet = ss.insertSheet(sheetName);
            Logger.log(`CREATE: ${sheetName}`);
            applyHeaderAndDesign(sheet, newHeaders, config.DESIGN);
        } else {
            // 既存シートあり：ヘッダー比較
            const lastCol = sheet.getLastColumn();
            let currentHeaders = [];
            if (lastCol > 0) {
                currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
            }

            // ヘッダーが一致するか確認 (数と内容)
            const isMatch = checkHeaderMatch(currentHeaders, newHeaders);

            if (isMatch) {
                Logger.log(`UPDATE: ${sheetName} (Structure OK, applying design only)`);
                applyDesignOnly(sheet, newHeaders.length, config.DESIGN);
            } else {
                Logger.log(`MIGRATE: ${sheetName} (Structure Changed)`);
                migrateSheetData(sheet, currentHeaders, newHeaders, config.DESIGN);
            }
        }
    }
}


/**
 * スプレッドシート取得ヘルパー
 */
function getSpreadsheet() {
    let ss;
    try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
        Logger.log("ℹ️ アクティブなスプレッドシートがありません（スタンドアロン実行）");
    }

    const props = PropertiesService.getScriptProperties();
    if (!ss) {
        const ssId = props.getProperty('SPREADSHEET_ID');
        if (ssId) {
            try {
                ss = SpreadsheetApp.openById(ssId);
                Logger.log(`OPEN: 既存のスプレッドシートを開きました (${ss.getName()})`);
            } catch (e) {
                Logger.log(`⚠️ 保存されたIDのシートが開けません: ${ssId}`);
            }
        } else {
            ss = SpreadsheetApp.create("店舗運営システム");
            props.setProperty('SPREADSHEET_ID', ss.getId());
            Logger.log(`NEW: 新しいスプレッドシートを作成しました (${ss.getUrl()})`);
        }
    } else {
        if (!props.getProperty('SPREADSHEET_ID')) {
            props.setProperty('SPREADSHEET_ID', ss.getId());
        }
    }
    return ss;
}

/**
 * ヘッダー一致確認
 */
function checkHeaderMatch(current, expected) {
    if (current.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
        if (current[i] !== expected[i]) return false;
    }
    return true;
}

/**
 * 新規ヘッダーとデザイン適用
 */
function applyHeaderAndDesign(sheet, headers, design) {
    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        applyDesignOnly(sheet, headers.length, design);
    }
}

/**
 * デザインのみ適用
 */
function applyDesignOnly(sheet, headerCols, design) {
    if (!design) return;
    try {
        // ボディ
        if (design.bodyBgColor || design.bodyTextColor || design.fontFamily) {
            const maxRows = sheet.getMaxRows();
            const maxCols = sheet.getMaxColumns();
            // データがなくても適用
            const range = sheet.getRange(1, 1, maxRows, maxCols);
            if (design.bodyBgColor) range.setBackground(design.bodyBgColor);
            if (design.bodyTextColor) range.setFontColor(design.bodyTextColor);
            if (design.fontFamily) range.setFontFamily(design.fontFamily);
        }

        // ヘッダー
        if (headerCols > 0) {
            const headerRange = sheet.getRange(1, 1, 1, headerCols);
            if (design.headerBgColor) headerRange.setBackground(design.headerBgColor);
            if (design.headerTextColor) headerRange.setFontColor(design.headerTextColor);
            if (design.headerBold) headerRange.setFontWeight("bold");

            if (design.columnWidths) {
                design.columnWidths.forEach((width, i) => {
                    if (i < headerCols) sheet.setColumnWidth(i + 1, width);
                });
            }
        }
    } catch (e) {
        Logger.log(`WARN: デザイン適用失敗 - ${e}`);
    }
}

/**
 * データ移行ロジック
 * ヘッダー名に基づいてデータをマッピングする
 */
function migrateSheetData(sheet, oldHeaders, newHeaders, design) {
    const lastRow = sheet.getLastRow();
    let oldData = [];

    // データがあれば取得 (2行目以降)
    if (lastRow > 1) {
        const lastCol = sheet.getLastColumn();
        oldData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    }

    // シート初期化（全クリア）
    sheet.clear();

    // 新ヘッダー設定 & デザイン
    applyHeaderAndDesign(sheet, newHeaders, design);

    if (oldData.length === 0) return;

    // マッピング作成: { "お名前": 旧Index }
    const oldMap = {};
    oldHeaders.forEach((h, i) => {
        oldMap[h] = i;
    });

    // 新データ作成
    const newData = oldData.map(row => {
        return newHeaders.map(newHeader => {
            // 新ヘッダーと同じ名前の旧カラムがあればその値を使う
            const oldIndex = oldMap[newHeader];
            if (oldIndex !== undefined && row[oldIndex] !== undefined) {
                return row[oldIndex];
            }
            return ""; // なければ空
        });
    });

    // 書き込み
    if (newData.length > 0) {
        sheet.getRange(2, 1, newData.length, newHeaders.length).setValues(newData);
    }
    Logger.log(`MIGRATED: ${newData.length} rows migrated.`);
}

/**
 * トリガー設定（手動編集検知用）
 * ユーザーが1回実行する必要があります。
 */
function setupTriggers() {
    const functionName = "handleSpreadsheetEdit";

    // 既存の同名トリガーがあれば削除（重複防止）
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === functionName) {
            ScriptApp.deleteTrigger(trigger);
        }
    }

    // 新しいトリガーを作成
    ScriptApp.newTrigger(functionName)
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();

    Logger.log(`SUCCESS: Installable trigger for ${functionName} created.`);
}

/**
 * リッチメニューの初期化 (RichMenuManager使用)
 */
function setupRichMenus() {
    Logger.log("--- リッチメニュー構築 ---");
    try {
        RichMenuManager.init();
    } catch (e) {
        Logger.log(`ERROR: Failed to initialize Rich Menus - ${e}`);
    }
}

/**
 * リッチメニューをリセットして再作成
 * ⚠️ 既存のリッチメニューを削除して作り直します
 */
function resetRichMenus() {
    Logger.log("--- リッチメニュー リセット ---");
    try {
        RichMenuManager.resetAll();
        RichMenuManager.init();
        Logger.log("✅ リッチメニューのリセットが完了しました。");
    } catch (e) {
        Logger.log(`ERROR: Failed to reset Rich Menus - ${e}`);
    }
}

/**
 * 診断用：現在の設定状況とAPI疎通を確認
 */
function diagnoseRichMenus() {
    Logger.log("=== 診断開始 ===");
    const props = PropertiesService.getScriptProperties();
    const roles = [2, 3, 4];

    roles.forEach(role => {
        const id = props.getProperty(`RICH_MENU_${role}`);
        Logger.log(`Role ${role}: ${id ? id : "❌ 未設定"}`);

        if (id) {
            // LINE API 疎通確認
            try {
                const url = `https://api.line.me/v2/bot/richmenu/${id}`;
                const res = UrlFetchApp.fetch(url, {
                    headers: { 'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN },
                    muteHttpExceptions: true
                });
                Logger.log(`  -> API Status: ${res.getResponseCode()}`);
                if (res.getResponseCode() !== 200) {
                    Logger.log(`  -> Error: ${res.getContentText()}`);
                } else {
                    Logger.log(`  -> Menu exists.`);
                }
            } catch (e) {
                Logger.log(`  -> Exception: ${e}`);
            }
        }
    });

    // トリガー確認
    const triggers = ScriptApp.getProjectTriggers();
    Logger.log(`Trigger Count: ${triggers.length}`);
    triggers.forEach(t => Logger.log(`- ${t.getHandlerFunction()} (${t.getEventType()})`));

    Logger.log("=== 診断終了 ===");
}
