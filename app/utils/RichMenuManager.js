/**
 * Rich Menu Manager
 * LINE リッチメニューの作成・割り当て・管理
 *
 * 画像生成: QuickChart.io の /chart/create (カスタムJS) を使用
 * デザイン: 白背景、絵文字アイコン＋日本語テキスト（色付き）
 */

const RichMenuManager = {
    // メニュー設定
    CONFIGS: {
        2: {
            size: { width: 1200, height: 405 },
            selected: true,
            name: "Menu_Staff",
            chatBarText: "メニュー",
            areas: [
                { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: { type: "message", text: "スタッフ設定" } },
                { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: "message", text: "シフト希望" } },
                { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: "message", text: "シフト" } }
            ]
        },
        3: {
            size: { width: 1200, height: 405 },
            selected: true,
            name: "Menu_Manager",
            chatBarText: "管理者メニュー",
            areas: [
                { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: { type: "message", text: "スタッフ設定" } },
                { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: "message", text: "店舗" } },
                { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: "message", text: "シフト" } }
            ]
        },
        4: {
            size: { width: 1200, height: 810 },
            selected: true,
            name: "Menu_Admin",
            chatBarText: "管理メニュー",
            areas: [
                { bounds: { x: 0, y: 0, width: 600, height: 405 }, action: { type: "message", text: "スタッフ設定" } },
                { bounds: { x: 600, y: 0, width: 600, height: 405 }, action: { type: "message", text: "店舗追加・削除" } },
                { bounds: { x: 0, y: 405, width: 600, height: 405 }, action: { type: "message", text: "店舗" } },
                { bounds: { x: 600, y: 405, width: 600, height: 405 }, action: { type: "message", text: "シフト" } }
            ]
        }
    },

    /**
     * 既存のリッチメニューをすべて削除し、プロパティもクリア。
     */
    resetAll: function () {
        var props = PropertiesService.getScriptProperties();
        [2, 3, 4].forEach(function (role) {
            var menuId = props.getProperty('RICH_MENU_' + role);
            if (menuId) {
                Logger.log('DELETE: Rich Menu Role ' + role + ': ' + menuId);
                RichMenuManager.deleteMenu(menuId);
                props.deleteProperty('RICH_MENU_' + role);
            }
        });
        Logger.log("INFO: All Rich Menus deleted.");
    },

    /**
     * 初期化 (作成 + 画像生成アップロード)
     */
    init: function () {
        var props = PropertiesService.getScriptProperties();

        for (var role in RichMenuManager.CONFIGS) {
            var existingId = props.getProperty('RICH_MENU_' + role);
            if (existingId) {
                Logger.log('SKIP: Role ' + role + ' already exists: ' + existingId);
                continue;
            }

            var config = RichMenuManager.CONFIGS[role];
            Logger.log('CREATE: Rich Menu for Role ' + role + '...');

            var menuId = RichMenuManager.createMenu(config);
            if (!menuId) {
                Logger.log('ERROR: Failed to create menu for Role ' + role);
                continue;
            }

            // 画像生成
            Logger.log('GENERATING IMAGE: Role ' + role);
            var imageBlob = RichMenuManager.generateImage(config);
            if (!imageBlob) {
                Logger.log('ERROR: Failed to generate image for Role ' + role);
                RichMenuManager.deleteMenu(menuId);
                continue;
            }

            // 画像アップロード
            Logger.log('UPLOADING IMAGE: Role ' + role);
            if (RichMenuManager.uploadImage(menuId, imageBlob)) {
                props.setProperty('RICH_MENU_' + role, menuId);
                Logger.log('SUCCESS: Role ' + role + ' → ' + menuId);
            } else {
                Logger.log('ERROR: Failed to upload image for Role ' + role);
                RichMenuManager.deleteMenu(menuId);
            }
        }
    },

    /**
     * QuickChart.io の /chart (scatter + 絵文字datalabels) で画像生成
     * 白背景 + 絵文字アイコン（上） + 色付き日本語テキスト（下）
     */
    generateImage: function (config) {
        var width = config.size.width;
        var height = config.size.height;
        var areas = config.areas;
        var isFullSize = height > 500;

        // 各ボタン中心座標 (Chart.js 座標系: Y軸は下が0→上が100)
        var points = areas.map(function (area) {
            var cx = (area.bounds.x + area.bounds.width / 2) / width * 100;
            var cy = (height - (area.bounds.y + area.bounds.height / 2)) / height * 100;
            return { x: cx, y: cy };
        });

        // scatter 用 annotation (パーセント座標に変換)
        var annotations = [];
        RichMenuManager._generateGridLines(areas, width, height).forEach(function (l) {
            if (l.mode === 'vertical') {
                annotations.push({
                    type: 'line', mode: 'vertical', scaleID: 'x-axis-1',
                    value: (l.value / width) * 100,
                    borderColor: '#DDDDDD', borderWidth: 3
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
                            // 絵文字アイコン層 (上寄り)
                            "data": points.map(function (p, i) {
                                return { x: p.x, y: p.y + (isFullSize ? 10 : 13), label: areas[i].action.text };
                            }),
                            "pointRadius": 0,
                            "datalabels": {
                                "color": "#000000",
                                "font": { "size": isFullSize ? 80 : 60 },
                                "formatter": function (v) {
                                    var icons = {
                                        "スタッフ設定": "⚙️", "シフト希望": "📅",
                                        "シフト": "🕐", "店舗": "🏪", "店舗追加・削除": "🏠"
                                    };
                                    return icons[v.label] || "❓";
                                },
                                "align": "center",
                                "anchor": "center"
                            }
                        },
                        {
                            // 日本語テキスト層 (下寄り)
                            "data": points.map(function (p, i) {
                                return { x: p.x, y: p.y - (isFullSize ? 10 : 13), label: areas[i].action.text };
                            }),
                            "pointRadius": 0,
                            "datalabels": {
                                "color": function (ctx) {
                                    var colors = {
                                        "スタッフ設定": "#4A86E8", "シフト希望": "#57BB8A",
                                        "シフト": "#F6B26B", "店舗": "#E67C73", "店舗追加・削除": "#A64D79"
                                    };
                                    return colors[ctx.chart.data.datasets[1].data[ctx.dataIndex].label] || "#333333";
                                },
                                "font": { "size": isFullSize ? 38 : 28, "weight": "bold" },
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
     * 区切り線データ生成 (ピクセル座標)
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
            if (bottom < height - 10) yCoords.push(bottom);
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

    /**
     * Create Rich Menu via LINE API
     */
    createMenu: function (config) {
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
                areas: config.areas
            }),
            muteHttpExceptions: true
        });

        if (res.getResponseCode() === 200) {
            return JSON.parse(res.getContentText()).richMenuId;
        }
        Logger.log('ERROR: createMenu: ' + res.getContentText());
        return null;
    },

    /**
     * Upload Image to Rich Menu
     */
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
        var menuId = props.getProperty('RICH_MENU_' + role);

        Logger.log("ASSIGN: Attempting to assign Role " + role + " (MenuID: " + menuId + ") to " + userId);

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
            Logger.log("WARN: No menu found for Role " + role + ". Unlinking user.");
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
