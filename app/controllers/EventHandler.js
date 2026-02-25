/**
 * Event Handler for LINE Bot.
 */
const EventHandler = {
    /**
     * Dispatch event to appropriate handler.
     * @param {Object} event - LINE Messaging API event object
     */
    dispatch: (event) => {
        const userId = event.source.userId;
        if (userId) {
            const user = Models.User.find(userId);
            // If user exists and role is 0 (NONE)
            if (user && user.data.role == Settings.AUTH.NONE) {
                // Ignore 'unfollow' to allow leaving
                if (event.type === 'unfollow') {
                    return;
                }

                Utils.log(`INFO: Access denied for user ${userId} (Role 0)`);

                // Reply with Flex Message if possible (replyToken needed)
                if (event.replyToken) {
                    const flexMessage = {
                        type: 'flex',
                        altText: '権限がありません',
                        contents: {
                            type: 'bubble',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🚫 権限がありません',
                                        weight: 'bold',
                                        color: '#ffffff'
                                    }
                                ],
                                backgroundColor: '#999999', // Gray for disabled
                                paddingAll: '15px'
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '現在、このボットを操作する権限がありません。',
                                        wrap: true,
                                        size: 'md'
                                    },
                                    {
                                        type: 'text',
                                        text: '店舗管理者にお問い合わせください。',
                                        wrap: true,
                                        size: 'sm',
                                        color: '#666666',
                                        margin: 'md'
                                    }
                                ]
                            }
                        }
                    };
                    try {
                        Settings.lc.replyMessage(event.replyToken, flexMessage);
                    } catch (e) {
                        Utils.log(`WARN: Failed to send denied message - ${e}`);
                    }
                }
                return; // STOP PROCESSING
            }
        }

        const type = event.type;
        switch (type) {
            case "follow":
                EventHandler.handleFollow(event);
                break;
            case "message":
                EventHandler.handleMessage(event);
                break;
            case "postback":
                // ポストバックは処理しない
                break;
            default:
                Logger.log(`INFO: Unhandled event type: ${type}`);
                break;
        }
    },

    /**
     * Handle message event.
     */
    handleMessage: (event) => {
        if (event.message.type !== 'text') return;
        const text = event.message.text.trim();

        switch (text) {
            case '[スタッフタブ]':
            case '[管理者タブ]':
                EventHandler.handleTabSwitch(event);
                break;
            case 'ユーザー登録':
            case '情報編集':
            case 'スタッフ設定':
                EventHandler.handleStaffSettings(event);
                break;
            case '休み希望':
                EventHandler.handleShiftRequest(event);
                break;
            case 'シフト確認':
                EventHandler.handleShiftView(event);
                break;
            case '店舗':
                EventHandler.handleStoreManagement(event);
                break;
            case 'シフト':
                EventHandler.handleShiftEdit(event);
                break;
            case '店舗追加・削除':
                EventHandler.handleStoreManagePage(event);
                break;
            case '開発者ページ':
                EventHandler.handleDevPage(event);
                break;
            default:
                break;
        }
    },

    /**
     * 「[管理者タブ]」「[スタッフタブ]」メッセージを受信してリッチメニューを切り替える
     */
    handleTabSwitch: (event) => {
        const userId = event.source.userId;
        const text = event.message.text.trim();
        const tab = text === '[スタッフタブ]' ? 'staff' : 'admin';

        try {
            const user = Models.User.find(userId);
            if (user) {
                RichMenuManager.assignToUser(userId, user.data.role, tab);
            }
        } catch (e) {
            Utils.log(`ERROR: handleTabSwitch - ${e}`);
        }
    },

    /**
     * 「店舗」メッセージ受信 → 店舗管理ページURLを返信（role=3以上のみ）
     */
    handleStoreManagement: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;

        // 責任者かどうか確認
        const links = Models.ByStore.filterByLineId(userId);
        const managerLinks = links.filter(
            l => l.data.isManager === true || l.data.isManager === 'TRUE' || l.data.isManager === 1
        );

        if (managerLinks.length === 0) {
            try {
                Settings.lc.replyMessage(replyToken, {
                    type: 'text',
                    text: '店舗管理ページは店舗責任者のみ利用できます。'
                });
            } catch (e) { /* ignore */ }
            return;
        }

        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const storeUrl = `${baseUrl}/store.html`;

        const flexMessage = {
            type: 'flex',
            altText: '店舗管理',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text', text: '🏪 店舗管理',
                        weight: 'bold', size: 'lg', color: '#ffffff'
                    }],
                    backgroundColor: '#E67C73',
                    paddingAll: '15px'
                },
                body: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: '担当店舗のスタッフ情報を確認・追加・編集・削除できます。',
                        wrap: true, size: 'sm', color: '#555555'
                    }]
                },
                footer: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: { type: 'uri', label: '🏪 店舗管理を開く', uri: storeUrl },
                        style: 'primary', color: '#E67C73'
                    }]
                }
            }
        };

        try {
            Settings.lc.replyMessage(replyToken, flexMessage);
            Utils.log(`INFO: Store management link sent to ${userId}`);
        } catch (e) {
            Utils.log(`ERROR: handleStoreManagement - ${e}`);
        }
    },

    /**
     * 「ユーザー登録」「情報編集」メッセージ受信 → 登録フォームURLを返信
     */
    handleStaffSettings: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const registrationUrl = `${baseUrl}/register.html`;

        const flexMessage = {
            type: 'flex',
            altText: 'スタッフ登録・情報編集フォーム',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text', text: '⚙️ 情報編集',
                        weight: 'bold', size: 'lg', color: '#ffffff'
                    }],
                    backgroundColor: '#4A86E8', paddingAll: '15px'
                },
                body: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: '下のボタンからフォームを開いて、氏名やSST・店舗情報を登録・更新してください。',
                        wrap: true, size: 'sm', color: '#555555'
                    }]
                },
                footer: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: { type: 'uri', label: '📝 登録フォームを開く', uri: registrationUrl },
                        style: 'primary', color: '#4A86E8'
                    }]
                }
            }
        };

        try {
            Settings.lc.replyMessage(replyToken, flexMessage);
        } catch (e) {
            Utils.log(`ERROR: handleStaffSettings - ${e}`);
        }
    },

    /**
     * 「休み希望」メッセージ受信 → フォームURLを返信
     */
    handleShiftRequest: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const shiftUrl = `${baseUrl}/shiftHope.html`;

        const flexMessage = {
            type: 'flex',
            altText: 'シフト希望フォーム',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text', text: '📅 休み希望',
                        weight: 'bold', size: 'lg', color: '#ffffff'
                    }],
                    backgroundColor: '#57BB8A', paddingAll: '15px'
                },
                body: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: 'シフト希望・休み希望を登録・編集できます。',
                        wrap: true, size: 'sm', color: '#555555'
                    }]
                },
                footer: {
                    type: 'box', layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: { type: 'uri', label: '📝 シフト希望を入力する', uri: shiftUrl },
                        style: 'primary', color: '#57BB8A'
                    }]
                }
            }
        };

        try { Settings.lc.replyMessage(replyToken, flexMessage); } catch (e) { Utils.log(`ERROR: - ${e}`); }
    },

    /**
     * 「シフト確認」メッセージ受信 → 確認ページURLを返信
     */
    handleShiftView: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const url = `${baseUrl}/shiftView.html`;

        const flexMessage = {
            type: 'flex',
            altText: 'シフト確認',
            contents: {
                type: 'bubble',
                header: { type: 'box', layout: 'vertical', backgroundColor: '#4A86E8', paddingAll: '15px', contents: [{ type: 'text', text: '🔍 シフト確認', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '最新のシフトを確認できます。', wrap: true, size: 'sm', color: '#555555' }] },
                footer: { type: 'box', layout: 'vertical', contents: [{ type: 'button', action: { type: 'uri', label: '🔍 シフト確認を開く', uri: url }, style: 'primary', color: '#4A86E8' }] }
            }
        };
        try { Settings.lc.replyMessage(replyToken, flexMessage); } catch (e) { }
    },

    /**
     * 「シフト」メッセージ受信 → シフト編集ページURLを返信
     */
    handleShiftEdit: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const shiftEditUrl = `${baseUrl}/shiftEdit.html`;

        const flexMessage = {
            type: 'flex',
            altText: 'シフト編集',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box', layout: 'vertical',
                    contents: [{ type: 'text', text: '🕐 シフト編集', weight: 'bold', size: 'lg', color: '#ffffff' }],
                    backgroundColor: '#F6B26B', paddingAll: '15px'
                },
                body: {
                    type: 'box', layout: 'vertical',
                    contents: [{ type: 'text', text: 'シフト表の確認・編集ができます。', wrap: true, size: 'sm', color: '#555555' }]
                },
                footer: {
                    type: 'box', layout: 'vertical',
                    contents: [{ type: 'button', action: { type: 'uri', label: '🕐 シフト編集を開く', uri: shiftEditUrl }, style: 'primary', color: '#F6B26B' }]
                }
            }
        };

        try { Settings.lc.replyMessage(replyToken, flexMessage); } catch (e) { }
    },

    /**
     * 「店舗追加・削除」
     */
    handleStoreManagePage: (event) => {
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const url = `${baseUrl}/storeManage.html`;

        const flexMessage = {
            type: 'flex',
            altText: '店舗追加・削除',
            contents: {
                type: 'bubble',
                header: { type: 'box', layout: 'vertical', backgroundColor: '#A64D79', paddingAll: '15px', contents: [{ type: 'text', text: '🏠 店舗追加・削除', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '店舗の追加や削除などの管理を行います。', wrap: true, size: 'sm', color: '#555555' }] },
                footer: { type: 'box', layout: 'vertical', contents: [{ type: 'button', action: { type: 'uri', label: '🏠 管理画面を開く', uri: url }, style: 'primary', color: '#A64D79' }] }
            }
        };
        try { Settings.lc.replyMessage(replyToken, flexMessage); } catch (e) { }
    },

    /**
     * 「開発者ページ」
     */
    handleDevPage: (event) => {
        const replyToken = event.replyToken;
        const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
        const url = `${baseUrl}/dev.html`;

        const flexMessage = {
            type: 'flex',
            altText: '開発者ページ',
            contents: {
                type: 'bubble',
                header: { type: 'box', layout: 'vertical', backgroundColor: '#333333', paddingAll: '15px', contents: [{ type: 'text', text: '💻 開発者用', weight: 'bold', size: 'lg', color: '#ffffff' }] },
                body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '開発者専用の管理ツールです。', wrap: true, size: 'sm', color: '#555555' }] },
                footer: { type: 'box', layout: 'vertical', contents: [{ type: 'button', action: { type: 'uri', label: '💻 ページを開く', uri: url }, style: 'primary', color: '#333333' }] }
            }
        };
        try { Settings.lc.replyMessage(replyToken, flexMessage); } catch (e) { }
    },

    /**
     * Handle follow event (Friend added/unblocked).
     */
    handleFollow: (event) => {
        const replyToken = event.replyToken;
        const userId = event.source.userId;

        try {
            // ユーザー登録(未登録の場合のみ)
            let user = Models.User.find(userId);
            if (!user) {
                user = Models.User.create(userId);
            } else {
                Utils.log(`INFO: User already exists: ${userId}`);
            }

            // 友だち追加のウェルカムメッセージ(Flex Message)
            const baseUrl = Settings.FRONTEND_BASE_URL.replace(/\/$/, '');
            const registrationUrl = `${baseUrl}/register.html`;

            const flexMessage = {
                type: 'flex',
                altText: 'ユーザー登録のお願い',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box', layout: 'vertical',
                        contents: [{ type: 'text', text: 'ようこそ！🎉', weight: 'bold', size: 'xl', color: '#ffffff' }],
                        backgroundColor: '#00b900', paddingAll: '20px'
                    },
                    body: {
                        type: 'box', layout: 'vertical',
                        contents: [
                            { type: 'text', text: '友だち追加ありがとうございます！', weight: 'bold', size: 'md', wrap: true },
                            { type: 'text', text: 'シフト管理Botへようこそ。ユーザー登録を行うと、シフト希望の提出や確認ができるようになります。', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
                            { type: 'text', text: '下のボタンをタップして登録フォームを開いてください！', size: 'sm', color: '#666666', wrap: true, margin: 'md' }
                        ]
                    },
                    footer: {
                        type: 'box', layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: { type: 'uri', label: '✨ 登録フォームを開く', uri: registrationUrl },
                            style: 'primary', color: '#00b900'
                        }]
                    }
                }
            };

            Settings.lc.replyMessage(replyToken, flexMessage);
        } catch (e) {
            Utils.log(`ERROR: Failed to handle follow event - ${e.toString()}`);
            try {
                Settings.lc.replyMessage(replyToken, { type: "text", text: `エラーが発生しました。\n管理者に連絡してください。\n詳細: ${e.toString()}` });
            } catch (replyError) { }
        }
    }
};
