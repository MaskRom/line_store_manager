/**
 * Rich Menu Manager
 * LINE リッチメニューの作成・割り当て・管理
 *
 * 画像生成: QuickChart.io の /chart/create (カスタムJS) を使用
 * デザイン: 白背景、絵文字アイコン＋日本語テキスト（色付き）、1?2行のグリッド
 */

const RichMenuManager = {
    // メニュー設定
    get CONFIGS() {
        const baseUrlRaw = Settings.FRONTEND_BASE_URL || "";
        const baseUrl = baseUrlRaw.replace(/\/$/, '');

        // 共通アクションの定義
        const actionRegister = { type: "uri", uri: `${baseUrl}/register.html`, label: "ユーザー登録" };
        const actionEditInfo = { type: "uri", uri: `${baseUrl}/register.html`, label: "情報編集" };
        const actionShiftHope = { type: "uri", uri: `${baseUrl}/shiftHope.html`, label: "休み希望" };
        const actionShiftView = { type: "uri", uri: `${baseUrl}/shiftView.html`, label: "シフト確認" };
        const actionStore = { type: "uri", uri: `${baseUrl}/store.html`, label: "店舗" };
        const actionShiftEdit = { type: "uri", uri: `${baseUrl}/shiftEdit.html`, label: "シフト" };
        const actionStoreManage = { type: "uri", uri: `${baseUrl}/storeManage.html`, label: "店舗追加・削除" };
        const actionDev = { type: "uri", uri: `${baseUrl}/dev.html`, label: "開発者ページ" };

        return {
            "1": {
                size: { width: 1200, height: 405 }, selected: true, name: "Menu_1", chatBarText: "メニュー",
                areas: [
                    { bounds: { x: 0, y: 0, width: 1200, height: 405 }, action: actionRegister }
                ]
            },
            "2": {
                size: { width: 1200, height: 405 }, selected: true, name: "Menu_2", chatBarText: "メニュー",
                areas: [
                    { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: actionEditInfo },
                    { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: actionShiftHope },
                    { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: actionShiftView }
                ]
            },
            "3": {
                // 上下2列
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_3", chatBarText: "管理者メニュー",
                areas: [
                    // Top row
                    { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: actionEditInfo },
                    { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: actionShiftHope },
                    { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: actionShiftView },
                    // Bottom row
                    { bounds: { x: 0, y: 405, width: 600, height: 405 }, action: actionStore },
                    { bounds: { x: 600, y: 405, width: 600, height: 405 }, action: actionShiftEdit }
                ]
            },
            "4": {
                // 上下2列
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_4", chatBarText: "管理者メニュー",
                areas: [
                    // Top row
                    { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: actionEditInfo },
                    { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: actionShiftHope },
                    { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: actionShiftView },
                    // Bottom row
                    { bounds: { x: 0, y: 405, width: 400, height: 405 }, action: actionStore },
                    { bounds: { x: 400, y: 405, width: 400, height: 405 }, action: actionShiftEdit },
                    { bounds: { x: 800, y: 405, width: 400, height: 405 }, action: actionStoreManage }
                ]
            },
            "5": {
                size: { width: 1200, height: 405 }, selected: true, name: "Menu_5_Dev", chatBarText: "開発者メニュー",
                areas: [
                    { bounds: { x: 0, y: 0, width: 1200, height: 405 }, action: actionDev }
                ]
            }
        };
    },

    /**
     * 既存のリッチメニューをすべて削除し、プロパティもクリア。
     */
    resetAll: function () {
        var props = PropertiesService.getScriptProperties();
        Object.keys(RichMenuManager.CONFIGS).forEach(function (key) {
            var menuId = props.getProperty('RICH_MENU_' + key);
            if (menuId) {
                Logger.log('DELETE: Rich Menu ' + key + ': ' + menuId);
                RichMenuManager.deleteMenu(menuId);
                props.deleteProperty('RICH_MENU_' + key);
            }
        });

        // 以前のタブ名を使用していたプロパティもクリーンアップ
        ['1_staff', '2_staff', '3_staff', '3_admin', '4_staff', '4_admin', '5_dev'].forEach(function (key) {
            var menuId = props.getProperty('RICH_MENU_' + key);
            if (menuId) {
                Logger.log('DELETE (legacy): Rich Menu ' + key + ': ' + menuId);
                RichMenuManager.deleteMenu(menuId);
                props.deleteProperty('RICH_MENU_' + key);
            }
        });

        Logger.log("INFO: All Rich Menus deleted.");
    },

    /**
     * 初期化 (作成 + 画像生成アップロード)
     */
    init: function () {
        var props = PropertiesService.getScriptProperties();

        for (var key in RichMenuManager.CONFIGS) {
            var existingId = props.getProperty('RICH_MENU_' + key);
            if (existingId) {
                Logger.log('SKIP: ' + key + ' already exists: ' + existingId);
                continue;
            }

            var config = RichMenuManager.CONFIGS[key];
            Logger.log('CREATE: Rich Menu for ' + key + '...');

            var menuId = RichMenuManager.createMenu(config);
            if (!menuId) {
                Logger.log('ERROR: Failed to create menu for ' + key);
                continue;
            }

            // 画像生成
            Logger.log('GENERATING IMAGE: ' + key);
            var imageBlob = RichMenuManager.generateImage(config);
            if (!imageBlob) {
                Logger.log('ERROR: Failed to generate image for ' + key);
                RichMenuManager.deleteMenu(menuId);
                continue;
            }

            // 画像アップロード
            Logger.log('UPLOADING IMAGE: ' + key);
            if (RichMenuManager.uploadImage(menuId, imageBlob)) {
                props.setProperty('RICH_MENU_' + key, menuId);
                Logger.log('SUCCESS: ' + key + ' → ' + menuId);
            } else {
                Logger.log('ERROR: Failed to upload image for ' + key);
                RichMenuManager.deleteMenu(menuId);
            }
        }
    },

    /**
     * QuickChart.io の /chart (scatter + 絵文字datalabels) で画像生成
     */
    generateImage: function (config) {
        var width = config.size.width;
        var height = config.size.height;
        var areas = config.areas;

        var points = areas.map(function (area) {
            var cx = (area.bounds.x + area.bounds.width / 2) / width * 100;
            var cy = (height - (area.bounds.y + area.bounds.height / 2)) / height * 100;
            return { x: cx, y: cy, label: area.action.label || area.action.text || "" };
        });

        var annotations = [];

        // Grid lines for buttons
        RichMenuManager._generateGridLines(areas, width, height).forEach(function (l) {
            if (l.mode === 'vertical') {
                annotations.push({
                    type: 'line', mode: 'vertical', scaleID: 'x-axis-1',
                    value: (l.value / width) * 100,
                    borderColor: '#DDDDDD', borderWidth: 2,
                    yMin: 0, yMax: 100
                });
            } else {
                annotations.push({
                    type: 'line', mode: 'horizontal', scaleID: 'y-axis-1',
                    value: ((height - l.value) / height) * 100,
                    borderColor: '#DDDDDD', borderWidth: 2,
                    xMin: 0, xMax: 100
                });
            }
        });

        var qcConfig = {
            "width": width,
            "height": height,
            "backgroundColor": "white",
            "format": "png",
            "chart": {
                "type": "scatter",
                "data": {
                    "datasets": [
                        {
                            // ボタン 絵文字アイコン層 (上寄り)
                            "data": points.map(function (p) {
                                // 1列か2列かでアイコンの位置を微調整
                                var yOffset = height === 405 ? 12 : 7;
                                return { x: p.x, y: p.y + yOffset, label: p.label };
                            }),
                            "pointRadius": 0,
                            "datalabels": {
                                "color": "#000000",
                                "font": { "size": height === 405 ? 65 : 60 },
                                "formatter": function (v) {
                                    var icons = {
                                        "ユーザー登録": "📝", "情報編集": "⚙️", "休み希望": "📅", "シフト確認": "🔍",
                                        "シフト": "🕐", "店舗": "🏪", "店舗追加・削除": "🏠", "開発者ページ": "💻"
                                    };
                                    return icons[v.label] || "❓";
                                },
                                "align": "center",
                                "anchor": "center"
                            }
                        },
                        {
                            // ボタン 日本語テキスト層 (下寄り)
                            "data": points.map(function (p) {
                                var yOffset = height === 405 ? 15 : 9;
                                return { x: p.x, y: p.y - yOffset, label: p.label };
                            }),
                            "pointRadius": 0,
                            "datalabels": {
                                "color": function (ctx) {
                                    var colors = {
                                        "ユーザー登録": "#4A86E8", "情報編集": "#4A86E8", "休み希望": "#57BB8A", "シフト確認": "#4A86E8",
                                        "シフト": "#F6B26B", "店舗": "#E67C73", "店舗追加・削除": "#A64D79", "開発者ページ": "#333333"
                                    };
                                    return colors[ctx.chart.data.datasets[1].data[ctx.dataIndex].label] || "#333333";
                                },
                                "font": { "size": height === 405 ? 36 : 30, "weight": "bold" },
                                "formatter": function (v) { return v.label; },
                                "align": "center",
                                "anchor": "center"
                            }
                        }
                    ]
                },
                "options": {
                    "layout": { "padding": 0 },
                    "legend": { "display": false },
                    "scales": {
                        "xAxes": [{ "display": false, "ticks": { "min": 0, "max": 100 } }],
                        "yAxes": [{ "display": false, "ticks": { "min": 0, "max": 100 } }]
                    },
                    "plugins": {
                        "datalabels": { "display": true },
                        "annotation": { "annotations": annotations }
                    }
                }
            }
        };

        var url = 'https://quickchart.io/chart';
        var fetchOptions = {
            'method': 'post',
            'contentType': 'application/json',
            'payload': JSON.stringify(qcConfig),
            'muteHttpExceptions': true
        };

        try {
            var res = UrlFetchApp.fetch(url, fetchOptions);
            Logger.log("QuickChart /chart status: " + res.getResponseCode());
            if (res.getResponseCode() === 200) {
                return res.getBlob().setName("menu.png");
            }
            Logger.log("QuickChart /chart Error: " + res.getContentText());
        } catch (e) {
            Logger.log("QuickChart Exception: " + e);
        }
        return null;
    },

    /**
     * 区切り線データ生成
     */
    _generateGridLines: function (areas, width, height) {
        var lines = [];

        var xCoords = [];
        areas.forEach(function (a) {
            var right = Math.round(a.bounds.x + a.bounds.width);
            if (right < width - 10) xCoords.push(right);
        });

        var yCoords = [];
        areas.forEach(function (a) {
            var bottom = Math.round(a.bounds.y + a.bounds.height);
            if (bottom < height - 10 && bottom > 10) yCoords.push(bottom);
        });

        function onlyUnique(value, index, self) { return self.indexOf(value) === index; }
        xCoords = xCoords.filter(onlyUnique);
        yCoords = yCoords.filter(onlyUnique);

        xCoords.forEach(function (x) {
            lines.push({ mode: 'vertical', value: x });
        });
        yCoords.forEach(function (y) {
            lines.push({ mode: 'horizontal', value: y });
        });

        return lines;
    },

    createMenu: function (config) {
        // area.action.label はLINE APIには不要なので削除して送る
        var cleanAreas = config.areas.map(function (area) {
            var newAction = Object.assign({}, area.action);
            delete newAction.label;
            return { bounds: area.bounds, action: newAction };
        });

        var url = 'https://api.line.me/v2/bot/richmenu';
        var res = UrlFetchApp.fetch(url, {
            method: 'post',
            headers: {
                'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN,
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify({
                size: config.size,
                selected: config.selected,
                name: config.name,
                chatBarText: config.chatBarText,
                areas: cleanAreas
            }),
            muteHttpExceptions: true
        });

        if (res.getResponseCode() === 200) {
            return JSON.parse(res.getContentText()).richMenuId;
        }
        Logger.log('ERROR: createMenu: ' + res.getContentText());
        return null;
    },

    uploadImage: function (richMenuId, imageBlob) {
        var url = 'https://api-data.line.me/v2/bot/richmenu/' + richMenuId + '/content';
        var res = UrlFetchApp.fetch(url, {
            method: 'post',
            headers: {
                'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN,
                'Content-Type': 'image/png'
            },
            payload: imageBlob.getBytes(),
            muteHttpExceptions: true
        });

        if (res.getResponseCode() === 200) return true;
        Logger.log('ERROR: uploadImage: ' + res.getContentText());
        return false;
    },

    deleteMenu: function (richMenuId) {
        UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu/' + richMenuId, {
            method: 'delete',
            headers: { 'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN },
            muteHttpExceptions: true
        });
    },

    assignToUser: function (userId, role) {
        if (!userId) {
            Logger.log("ERROR: assignToUser called without userId");
            return;
        }

        var props = PropertiesService.getScriptProperties();

        let menuKey = String(role);

        // 5は存在し、4はないなどのフェイルセーフ
        if (!RichMenuManager.CONFIGS[menuKey]) {
            if (role == 0) {
                menuKey = null; // 権限がない場合は外す
            } else {
                // デフォルトとしてロール2を割り当てるか、一番低い権限を割り当てる
                menuKey = "2";
            }
        }

        if (menuKey) {
            var menuId = props.getProperty('RICH_MENU_' + menuKey);
            Logger.log("ASSIGN: Attempting to assign Menu " + menuKey + " (MenuID: " + menuId + ") to " + userId);

            if (menuId) {
                var res = UrlFetchApp.fetch(
                    'https://api.line.me/v2/bot/user/' + userId + '/richmenu/' + menuId,
                    {
                        method: 'post',
                        headers: { 'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN },
                        muteHttpExceptions: true
                    }
                );
                if (res.getResponseCode() === 200) {
                    Logger.log('SUCCESS: Assigned menu ' + menuId + ' to ' + userId);
                } else {
                    Logger.log('ERROR: Failed to assign menu: ' + res.getContentText());
                }
            } else {
                Logger.log("WARN: No menu found for role " + menuKey + ". Unlinking user.");
                RichMenuManager.unlinkUser(userId);
            }
        } else {
            RichMenuManager.unlinkUser(userId);
        }
    },

    unlinkUser: function (userId) {
        var res = UrlFetchApp.fetch(
            'https://api.line.me/v2/bot/user/' + userId + '/richmenu',
            {
                method: 'delete',
                headers: { 'Authorization': 'Bearer ' + Settings.ACCESS_TOKEN },
                muteHttpExceptions: true
            }
        );
        if (res.getResponseCode() === 200 || res.getResponseCode() === 404) {
            Logger.log('INFO: Unlinked menu from ' + userId);
        } else {
            Logger.log('ERROR: Failed to unlink menu: ' + res.getContentText());
        }
    }
};
