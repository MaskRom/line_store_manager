/**
 * Entry point for the application.
 */
const App = {
    /**
     * Handling GET requests.
     */
    doGet: (e) => {
        const page = e.parameter.page;
        const userId = e.parameter.userId || '';
        const isApi = e.parameter.api === 'true';
        Utils.log(`DEBUG: doGet called. page=${page}, isApi=${isApi}`);

        if (isApi) {
            return App.handleApiGet(page, userId);
        }

        // HTMLリクエストの場合は、フロントエンド (LIFF/GitHub Pages) へリダイレクトする
        // またはクエリパラメータを引き継いでリダイレクト
        let redirectUrl = Settings.FRONTEND_BASE_URL;
        if (page) {
            redirectUrl += `?page=${page}`;
            if (userId) redirectUrl += `&userId=${userId}`;
        }

        // GAS側のURLを直接開いたユーザー向けのフォールバックリダイレクトHTML
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="refresh" content="0; url=${redirectUrl}">
                <title>Redirecting...</title>
            </head>
            <body>
                <p>LINEアプリ（またはブラウザ）にリダイレクトしています...</p>
                <p>自動的に遷移しない場合は、<a href="${redirectUrl}">こちらをクリック</a>してください。</p>
            </body>
            </html>
        `;
        return HtmlService.createHtmlOutput(html)
            .setTitle("リダイレクト")
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    },

    /**
     * Handle API GET requests (returning JSON instead of HTML).
     */
    handleApiGet: (page, userId) => {
        try {
            let data = {};

            if (page === 'shift') {
                const storeLinks = userId ? Models.ByStore.filterByLineId(userId) : [];
                const stores = storeLinks.map(link => {
                    const dayOff = Models.DayOff.findByStoreAndEmployee(
                        link.data.storeId, link.data.employeeId
                    );
                    const s = Models.Store.objects.get({ id: String(link.data.storeId) });
                    return {
                        storeId: link.data.storeId,
                        storeName: s ? s.data.name : `店舗${link.data.storeId}`,
                        employeeId: link.data.employeeId,
                        shiftRequest: link.data.shiftRequest || '',
                        dayOffRaw: dayOff ? (dayOff.data.rawData || '') : ''
                    };
                });
                data = { userId, stores };

            } else if (page === 'admin') {
                const me = Models.User.find(userId);
                const managerName = me ? (me.data.name || '') : '';
                const userRole = me ? (Number(me.data.role) || 0) : 0;

                let managerStoreIds = [];
                if (userRole >= 4) {
                    const allStores = Models.Store.getActive();
                    managerStoreIds = allStores.map(s => String(s.id));
                } else {
                    const myLinks = userId ? Models.ByStore.filterByLineId(userId) : [];
                    const managerLinks = myLinks.filter(
                        l => l.data.isManager === true || l.data.isManager === 'TRUE' || l.data.isManager === 1
                    );
                    managerStoreIds = managerLinks.map(l => String(l.data.storeId));
                }

                const managedStores = managerStoreIds.map(storeId => {
                    const storeObj = Models.Store.objects.get({ id: storeId });
                    const storeName = storeObj ? storeObj.data.name : `店舗${storeId}`;
                    const allLinks = Models.ByStore.objects.all();
                    const staffList = allLinks.filter(l => String(l.data.storeId) === storeId)
                        .sort((a, b) => {
                            const aId = String(a.data.employeeId || '');
                            const bId = String(b.data.employeeId || '');
                            return aId.localeCompare(bId, undefined, { numeric: true });
                        });

                    return {
                        storeId: storeId,
                        storeName: storeName,
                        storeRowIndex: storeObj ? storeObj.data._rowIndex : null,
                        daysBefore: storeObj ? (storeObj.data.daysBefore || '') : '',
                        prompt: storeObj ? (storeObj.data.prompt || '') : '',
                        staff: staffList.map(l => ({
                            rowIndex: l.data._rowIndex,
                            storeId: l.data.storeId,
                            lineId: l.data.lineId || '',
                            name: l.data.name || '',
                            displayName: l.data.displayName || '',
                            employeeId: l.data.employeeId || '',
                            password: l.data.password || '',
                            shiftRequest: l.data.shiftRequest || '',
                            isManager: l.data.isManager || false,
                            isActive: l.data.isActive || false
                        }))
                    };
                });

                const sstOptions = Object.values(Settings.SST);

                data = { userId, managerName, managedStores, sstOptions };

            } else if (page === 'register' || !page) {
                const stores = Models.Store.getActive();
                const sstOptions = Object.values(Settings.SST);

                let userData = null;
                let userStores = [];
                if (userId) {
                    const user = Models.User.find(userId);
                    if (user) {
                        userData = user.data;
                        const links = Models.ByStore.filterByLineId(userId);
                        userStores = links.map(l => l.data);
                    }
                }
                data = { userId, stores, sstOptions, userData, userStores };

            } else {
                return ContentService.createTextOutput(JSON.stringify({ error: true, message: "Page not found" })).setMimeType(ContentService.MimeType.JSON);
            }

            data.roleConfig = Settings.ROLE_CONFIG;

            return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);

        } catch (e) {
            Utils.log("Error in handleApiGet: " + e.toString());
            return ContentService.createTextOutput(JSON.stringify({ error: true, message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
        }
    },

    /**
     * Handling POST requests.
     */
    doPost: (e) => {
        try {
            let data;
            // フォーム送信（application/x-www-form-urlencoded）からのAPIリクエストの場合
            if (e.parameter && e.parameter.payload) {
                data = JSON.parse(e.parameter.payload);
            } else {
                // LINE Webhookまたは純粋なJSONリクエストの場合
                data = JSON.parse(e.postData.contents);
            }

            // Check if it's an API request from the frontend
            if (data.action) {
                return App.handleApiPost(data);
            }

            // Otherwise, treat it as a LINE Webhook
            if (data.events) {
                data.events.forEach(event => {
                    EventHandler.dispatch(event);
                });
            }
            return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
        } catch (error) {
            Utils.log("Error in doPost: " + error.toString());
            return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
        }
    },

    /**
     * Handle API POST requests
     */
    handleApiPost: (payload) => {
        let result = { success: false, message: "Unknown action" };

        try {
            switch (payload.action) {
                case 'processRegistration':
                    result = App.processRegistration(payload.data);
                    break;
                case 'saveShiftRequest':
                    result = App.saveShiftRequest(payload.data);
                    break;
                case 'saveStoreStaff':
                    result = App.saveStoreStaff(payload.data);
                    break;
                case 'deleteStoreStaff':
                    result = App.deleteStoreStaff(payload.data);
                    break;
                case 'unlinkStaffLineId':
                    result = App.unlinkStaffLineId(payload.data);
                    break;
                case 'saveStoreSettings':
                    result = App.saveStoreSettings(payload.data);
                    break;
                default:
                    Utils.log("Unknown API action: " + payload.action);
            }
        } catch (e) {
            Utils.log("Error in handleApiPost: " + e.toString());
            result = { success: false, message: "Server error: " + e.toString() };
        }

        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    },

    /**
     * 店舗を操作する権限があるかチェック
     */
    hasStorePermission: (requesterId, targetStoreId) => {
        if (!requesterId) return false;
        const user = Models.User.find(requesterId);
        if (!user) return false;

        const role = Number(user.data.role) || 0;
        if (role >= 4) return true;

        const links = Models.ByStore.filterByLineId(requesterId);
        const managerLink = links.find(l =>
            String(l.data.storeId) === String(targetStoreId) &&
            (l.data.isManager === true || l.data.isManager === 'TRUE' || l.data.isManager === 1)
        );
        return !!managerLink;
    },

    /**
     * Process registration form data.
     */
    processRegistration: (formData) => {
        try {
            const { userId, name, sst, stores } = formData;

            // 1. プロファイル更新
            try {
                const user = Models.User.find(userId);
                if (!user) {
                    return { success: false, message: "LINE IDが登録されていません。管理者に問い合わせてください。" };
                }
                Models.User.updateProfile(userId, name, sst);
            } catch (e) {
                return { success: false, message: "プロファイル更新エラー: " + e.toString() };
            }

            // 2. 削除された店舗の紐付けを解除（LINE IDをクリア）
            const existingLinks = Models.ByStore.filterByLineId(userId);
            const newStoreIds = (stores || []).map(s => String(s.storeId));
            for (const link of existingLinks) {
                if (!newStoreIds.includes(String(link.data.storeId))) {
                    link.data.lineId = '';
                    link.save();
                    Utils.log(`INFO: Unlinked store ${link.data.storeId} from ${userId}`);
                }
            }

            // 3. 店舗への紐付け（複数対応）
            if (!stores || stores.length === 0) {
                return { success: false, message: "店舗情報が不足しています" };
            }

            const errors = [];
            for (const store of stores) {
                const { storeId, employeeId, password } = store;
                if (!storeId || !employeeId || !password) {
                    errors.push(`店舗情報が不足しています (storeId: ${storeId})`);
                    continue;
                }
                const result = Models.User.linkStore(userId, storeId, employeeId, password);
                if (!result.success) {
                    errors.push(`店舗${storeId}: ${result.message}`);
                }
            }

            if (errors.length > 0) {
                return { success: false, message: errors.join('\n') };
            }

            // 4. 店舗責任者フラグに応じてロールを決定
            //    紐付いた店舗のいずれかに isManager: true があれば role=3、それ以外は role=2
            const updatedLinks = Models.ByStore.filterByLineId(userId);
            const isManager = updatedLinks.some(
                l => l.data.isManager === true || l.data.isManager === 'TRUE' || l.data.isManager === 1
            );
            const newRole = isManager ? 3 : 2;
            Models.User.updateRole(userId, newRole);
            Utils.log(`INFO: Role set to ${newRole} for ${userId} (isManager: ${isManager})`);

            return { success: true, message: "登録完了" };

        } catch (e) {
            return { success: false, message: "システムエラー: " + e.toString() };
        }
    },

    /**
     * シフト希望を保存する（shift.htmlから呼ばれるサーバー関数）
     * @param {Object} formData - { userId, storeId, employeeId, shiftRequest, dayOffRaw }
     */
    saveShiftRequest: (formData) => {
        try {
            const { userId, storeId, employeeId, shiftRequest, dayOffRaw } = formData;

            // ByStore.shiftRequest を更新
            const storeLinks = Models.ByStore.filterByLineId(userId);
            const target = storeLinks.find(
                r => String(r.data.storeId) === String(storeId) &&
                    String(r.data.employeeId) === String(employeeId)
            );
            if (!target) {
                return { success: false, message: "店舗データが見つかりません" };
            }
            target.data.shiftRequest = shiftRequest;
            target.save();

            // DayOff を upsert
            Models.DayOff.upsert(storeId, employeeId, dayOffRaw);

            Utils.log(`INFO: Shift request saved for ${userId} / store ${storeId}`);
            return { success: true, message: "保存しました" };

        } catch (e) {
            Utils.log(`ERROR: saveShiftRequest - ${e}`);
            return { success: false, message: "保存エラー: " + e.toString() };
        }
    },

    /**
     * 店舗スタッフの追加・更新（admin.htmlから呼ばれる）
     * @param {Object} data - { storeId, rowIndex, employeeId, password, name, displayName, isManager, isActive }
     */
    saveStoreStaff: (data) => {
        try {
            const { storeId, rowIndex, employeeId, password, name, displayName, isManager, isActive, shiftRequest, requesterId } = data;

            if (!App.hasStorePermission(requesterId, storeId)) {
                return { success: false, message: 'この店舗のスタッフ情報を編集する権限がありません' };
            }

            const all = Models.ByStore.objects.all();

            // ===== 従業員ID重複チェック（同一店舗内） =====
            // 編集時は自分の行を除く、新規追加時は同一店舗全体でチェック
            const checkStoreId = rowIndex
                ? String(all.find(r => r.data._rowIndex === Number(rowIndex))?.data.storeId || storeId)
                : String(storeId);

            const duplicate = all.find(r => {
                if (String(r.data.storeId) !== checkStoreId) return false;
                if (String(r.data.employeeId) !== String(employeeId)) return false;
                if (rowIndex && r.data._rowIndex === Number(rowIndex)) return false; // 自分自身は除外
                return true;
            });

            if (duplicate) {
                return { success: false, message: `従業員ID「${employeeId}」はこの店舗に既に登録されています` };
            }

            if (rowIndex) {
                // 既存行の更新
                const target = all.find(r => r.data._rowIndex === Number(rowIndex));
                if (!target) return { success: false, message: '対象行が見つかりません' };

                target.data.employeeId = employeeId;
                target.data.password = password;
                target.data.name = name;
                target.data.displayName = displayName;
                target.data.isManager = isManager;
                target.data.isActive = isActive;
                if (shiftRequest !== undefined) target.data.shiftRequest = shiftRequest;
                target.save();
                Utils.log(`INFO: Staff updated at row ${rowIndex}`);
            } else {
                // 新規追加
                Models.ByStore.objects.create({
                    storeId: storeId,
                    lineId: '',
                    name: name,
                    displayName: displayName,
                    employeeId: employeeId,
                    password: password,
                    shiftRequest: shiftRequest || '',
                    isManager: isManager,
                    isActive: isActive
                });
                Utils.log(`INFO: Staff added to store ${storeId}`);
                // 追加した行のrowIndexを取得してフロントに返す
                const newRow = Models.ByStore.objects.all().find(r =>
                    String(r.data.storeId) === String(storeId) &&
                    String(r.data.employeeId) === String(employeeId) &&
                    !r.data.lineId
                );
                const newRowIndex = newRow ? newRow.data._rowIndex : null;
                return { success: true, message: '保存しました', rowIndex: newRowIndex };
            }

            return { success: true, message: '保存しました' };
        } catch (e) {
            Utils.log(`ERROR: saveStoreStaff - ${e}`);
            return { success: false, message: '保存エラー: ' + e.toString() };
        }
    },

    /**
     * 店舗スタッフの削除（LINE IDをクリアして紐付け解除）
     * @param {Object} data - { rowIndex, requesterId }
     */
    deleteStoreStaff: (data) => {
        try {
            const { rowIndex, requesterId } = data;
            const all = Models.ByStore.objects.all();
            const target = all.find(r => r.data._rowIndex === Number(rowIndex));
            if (!target) return { success: false, message: '対象行が見つかりません' };

            if (!App.hasStorePermission(requesterId, target.data.storeId)) {
                return { success: false, message: 'このスタッフ情報を削除する権限がありません' };
            }

            // 自分自身は削除不可
            if (requesterId && target.data.lineId && target.data.lineId === requesterId) {
                return { success: false, message: '自分自身を削除することはできません' };
            }

            target.deleteRow();
            Utils.log(`INFO: Staff deleted (row ${rowIndex} removed)`);
            return { success: true, message: '削除しました' };
        } catch (e) {
            Utils.log(`ERROR: deleteStoreStaff - ${e}`);
            return { success: false, message: '削除エラー: ' + e.toString() };
        }
    },

    /**
     * スタッフのLINE IDを解除（空にする）
     * @param {Object} data - { rowIndex }
     */
    unlinkStaffLineId: (data) => {
        try {
            const { rowIndex, requesterId } = data;
            const all = Models.ByStore.objects.all();
            const target = all.find(r => r.data._rowIndex === Number(rowIndex));
            if (!target) return { success: false, message: '対象行が見つかりません' };

            if (!App.hasStorePermission(requesterId, target.data.storeId)) {
                return { success: false, message: 'このスタッフのLINE連携を解除する権限がありません' };
            }

            target.data.lineId = '';
            target.save();
            Utils.log(`INFO: LINE ID unlinked at row ${rowIndex}`);
            return { success: true, message: 'LINE連携を解除しました' };
        } catch (e) {
            Utils.log(`ERROR: unlinkStaffLineId - ${e}`);
            return { success: false, message: '解除エラー: ' + e.toString() };
        }
    },

    /**
     * 店舗設定（何日前・追加プロンプト）を保存
     * @param {Object} data - { storeRowIndex, daysBefore, prompt }
     */
    saveStoreSettings: (data) => {
        try {
            const { storeRowIndex, daysBefore, prompt, requesterId } = data;
            const all = Models.Store.objects.all();
            const target = all.find(r => r.data._rowIndex === Number(storeRowIndex));
            if (!target) return { success: false, message: '店舗データが見つかりません' };

            if (!App.hasStorePermission(requesterId, target.data.id)) {
                return { success: false, message: 'この店舗の設定を保存する権限がありません' };
            }

            target.data.daysBefore = daysBefore;
            target.data.prompt = prompt;
            target.save();
            Utils.log(`INFO: Store settings saved for rowIndex ${storeRowIndex}`);
            return { success: true, message: '設定を保存しました' };
        } catch (e) {
            Utils.log(`ERROR: saveStoreSettings - ${e}`);
            return { success: false, message: '保存エラー: ' + e.toString() };
        }
    }

};

function doGet(e) { return App.doGet(e); }
function doPost(e) { return App.doPost(e); }
function processRegistration(formData) { return App.processRegistration(formData); }
function saveShiftRequest(formData) { return App.saveShiftRequest(formData); }
function saveStoreStaff(data) { return App.saveStoreStaff(data); }
function deleteStoreStaff(data) { return App.deleteStoreStaff(data); }
function unlinkStaffLineId(data) { return App.unlinkStaffLineId(data); }
function saveStoreSettings(data) { return App.saveStoreSettings(data); }

/**
 * スプレッドシート編集トリガー (Installable onEdit)
 * USERシートの権限カラムが変更されたら、リッチメニューを自動割り当て.
 * setup.js の setupTriggers() で登録される.
 */
function handleSpreadsheetEdit(e) {
    try {
        const range = e.range;
        const sheet = range.getSheet();

        // USERシートの権限カラム（D列 = index 3, column 4）のみ対象
        if (sheet.getName() !== Models.User.sheetName) return;

        const editedCol = range.getColumn(); // 1-based
        const roleColIndex = Models.User.columns.role; // 0-based
        const roleCol = roleColIndex + 1; // → 1-based

        if (editedCol !== roleCol) return;

        // 変更された行の範囲を処理（複数行同時編集にも対応）
        const startRow = range.getRow();
        const numRows = range.getNumRows();

        for (let i = 0; i < numRows; i++) {
            const row = startRow + i;
            if (row <= 1) continue; // ヘッダー行はスキップ

            // LINE IDを取得（A列 = columns.lineId + 1）
            const lineIdCol = Models.User.columns.lineId + 1;
            const lineId = sheet.getRange(row, lineIdCol).getValue();
            const newRole = sheet.getRange(row, roleCol).getValue();

            if (!lineId) continue;

            Utils.log(`INFO: Role changed for ${lineId} to ${newRole} (row ${row})`);

            try {
                RichMenuManager.assignToUser(lineId, Number(newRole));
            } catch (err) {
                Utils.log(`WARN: Failed to assign Rich Menu on edit - ${err}`);
            }
        }
    } catch (error) {
        Utils.log(`ERROR: handleSpreadsheetEdit - ${error}`);
    }
}
