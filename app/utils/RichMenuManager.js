/**
 * Rich Menu Manager
 * LINE リッチメニューの作成・割り当て・管理
 *
 * 画像生成: QuickChart.io の /chart/create (カスタムJS) を使用
 * デザイン: 白背景、絵文字アイコン＋日本語テキスト（色付き）、上部タブ
 */

const RichMenuManager = {
    // メニュー設定
    get CONFIGS() {
        const baseUrlRaw = Settings.FRONTEND_BASE_URL || "";
        const baseUrl = baseUrlRaw.replace(/\/$/, '');

        // Tab area definitions (top 200px)
        const tabStaff = { bounds: { x: 0, y: 0, width: 600, height: 200 }, action: { type: "message", text: "[スタッフタブ]" } };
        const tabAdmin = { bounds: { x: 600, y: 0, width: 600, height: 200 }, action: { type: "message", text: "[管理者タブ]" } };

        // Button area definitions (bottom 610px)
        const btnRegister = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/register.html`, label: "ユーザー登録" } });
        const btnEditInfo = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/register.html`, label: "情報編集" } });
        const btnShiftHope = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/shiftHope.html`, label: "休み希望" } });
        const btnShiftView = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/shiftView.html`, label: "シフト確認" } });

        const btnStore = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/store.html`, label: "店舗" } });
        const btnShiftEdit = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/shiftEdit.html`, label: "シフト" } });
        const btnStoreManage = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/storeManage.html`, label: "店舗追加・削除" } });

        const btnDev = (x, w) => ({ bounds: { x, y: 200, width: w, height: 610 }, action: { type: "uri", uri: `${baseUrl}/dev.html`, label: "開発者ページ" } });

        return {
            "1_staff": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_1_Staff", chatBarText: "メニュー", tab: "staff",
                areas: [tabStaff, tabAdmin, btnRegister(0, 1200)]
            },
            "2_staff": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_2_Staff", chatBarText: "メニュー", tab: "staff",
                areas: [tabStaff, tabAdmin, btnEditInfo(0, 400), btnShiftHope(400, 400), btnShiftView(800, 400)]
            },
            "3_staff": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_3_Staff", chatBarText: "メニュー", tab: "staff",
                areas: [tabStaff, tabAdmin, btnEditInfo(0, 400), btnShiftHope(400, 400), btnShiftView(800, 400)]
            },
            "3_admin": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_3_Admin", chatBarText: "管理者メニュー", tab: "admin",
                areas: [tabStaff, tabAdmin, btnStore(0, 600), btnShiftEdit(600, 600)]
            },
            "4_staff": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_4_Staff", chatBarText: "メニュー", tab: "staff",
                areas: [tabStaff, tabAdmin, btnEditInfo(0, 400), btnShiftHope(400, 400), btnShiftView(800, 400)]
            },
            "4_admin": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_4_Admin", chatBarText: "管理者メニュー", tab: "admin",
                areas: [tabStaff, tabAdmin, btnStore(0, 400), btnShiftEdit(400, 400), btnStoreManage(800, 400)]
            },
            "5_dev": {
                size: { width: 1200, height: 810 }, selected: true, name: "Menu_5_Dev", chatBarText: "開発者メニュー", tab: "admin",
                areas: [tabStaff, tabAdmin, btnDev(0, 1200)]
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
        var activeTab = config.tab;

        // タブ領域(y < 200)を除外したボタン領域
        var buttonAreas = areas.filter(function (a) { return a.bounds.y >= 200; });

        var points = buttonAreas.map(function (area) {
            var cx = (area.bounds.x + area.bounds.width / 2) / width * 100;
            var cy = (height - (area.bounds.y + area.bounds.height / 2)) / height * 100;
            return { x: cx, y: cy, label: area.action.label || area.action.text || "" };
        });

        var annotations = [];

        // Tab background (gray for inactive)
        if (activeTab === "staff") {
            // Admin tab is inactive
            annotations.push({
                type: 'box', xMin: 50, xMax: 100, yMin: (height - 200) / height * 100, yMax: 100,
                backgroundColor: '#EEEEEE', borderWidth: 0
            });
        } else if (activeTab === "admin") {
            // Staff tab is inactive
            annotations.push({
                type: 'box', xMin: 0, xMax: 50, yMin: (height - 200) / height * 100, yMax: 100,
                backgroundColor: '#EEEEEE', borderWidth: 0
            });
        }

        // Tab vertical divider
        annotations.push({
            type: 'line', mode: 'vertical', scaleID: 'x-axis-1', value: 50,
            borderColor: '#DDDDDD', borderWidth: 3, yMin: (height - 200) / height * 100, yMax: 100
        });

        // Tab horizontal line
        annotations.push({
            type: 'line', mode: 'horizontal', scaleID: 'y-axis-1', value: (height - 200) / height * 100,
            borderColor: '#DDDDDD', borderWidth: 3
        });

        // Grid lines for buttons
        RichMenuManager._generateGridLines(buttonAreas, width, height, 200).forEach(function (l) {
            if (l.mode === 'vertical') {
                annotations.push({
                    type: 'line', mode: 'vertical', scaleID: 'x-axis-1',
                    value: (l.value / width) * 100,
                    borderColor: '#DDDDDD', borderWidth: 3,
                    yMin: 0, yMax: (height - 200) / height * 100
                });
            } else {
                annotations.push({
                    type: 'line', mode: 'horizontal', scaleID: 'y-axis-1',
                    value: ((height - l.value) / height) * 100,
                    borderColor: '#DDDDDD', borderWidth: 3
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
                                return { x: p.x, y: p.y + 11, label: p.label };
                            }),
                            "pointRadius": 0,
                            "datalabels": {
                                "color": "#000000",
                                "font": { "size": 60 },
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
                                return { x: p.x, y: p.y - 11, label: p.label };
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
                                "font": { "size": 32, "weight": "bold" },
                                "formatter": function (v) { return v.label; },
                                "align": "center",
                                "anchor": "center"
                            }
                        },
                        {
                            // タブ テキスト層
                            "data": [
                                { x: 25, y: 88, label: "スタッフ" },
                                { x: 75, y: 88, label: "管理者" }
                            ],
                            "pointRadius": 0,
                            "datalabels": {
                                "color": function (ctx) {
                                    var idx = ctx.dataIndex;
                                    var isStaffActive = config.tab === "staff";
                                    if (idx === 0) return isStaffActive ? "#333333" : "#999999";
                                    return !isStaffActive ? "#333333" : "#999999";
                                },
                                "font": { "size": 36, "weight": "bold" },
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
    _generateGridLines: function (areas, width, height, startY = 0) {
        var lines = [];

        var xCoords = [];
        areas.forEach(function (a) {
            var right = Math.round(a.bounds.x + a.bounds.width);
            if (right < width - 10) xCoords.push(right);
        });

        var yCoords = [];
        areas.forEach(function (a) {
            var bottom = Math.round(a.bounds.y + a.bounds.height);
            if (bottom < height - 10 && bottom > startY + 10) yCoords.push(bottom);
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

    assignToUser: function (userId, role, tab = 'staff') {
        if (!userId) {
            Logger.log("ERROR: assignToUser called without userId");
            return;
        }

        var props = PropertiesService.getScriptProperties();

        let menuKey = `${role}_${tab}`;
        if (!RichMenuManager.CONFIGS[menuKey]) {
            if (RichMenuManager.CONFIGS[`${role}_staff`]) {
                menuKey = `${role}_staff`;
            } else if (RichMenuManager.CONFIGS[`${role}_dev`]) {
                menuKey = `${role}_dev`;
            } else {
                Logger.log("WARN: No menu found for Role " + role + ". Unlinking user.");
                RichMenuManager.unlinkUser(userId);
                return;
            }
        }

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
            Logger.log("WARN: No menu found for " + menuKey + ". Unlinking user.");
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
