/**
 * Event Handler for LINE Bot.
 */
const EventHandler = {
    /**
     * Dispatch event to appropriate handler.
     * @param {Object} event - LINE Messaging API event object
     */
    dispatch: (event) => {
        // Role Check for EVERY event (except follow/unfollow maybe? No, let's check all interactions)
        // Follow event is special: new users don't have roles yet.
        // But existing users with Role 0 should be blocked.

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
            case 'スタッフ設定':
                EventHandler.handleStaffSettings(event);
                break;
            case 'シフト希望':
                EventHandler.handleShiftRequest(event);
                break;
            case '店舗':
                EventHandler.handleStoreManagement(event);
                break;
            case 'シフト':
                EventHandler.handleShiftEdit(event);
                break;
            default:
                break;
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

        const storeUrl = `${Settings.FRONTEND_BASE_URL}?page=admin`;

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
     * 「スタッフ設定」メッセージ受信 → 登録フォームURLを返信
     */
    handleStaffSettings: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const registrationUrl = `${Settings.FRONTEND_BASE_URL}?page=register`;

        const flexMessage = {
            type: 'flex',
            altText: 'スタッフ登録フォーム',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '⚙️ スタッフ設定',
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff'
                        }
                    ],
                    backgroundColor: '#4A86E8',
                    paddingAll: '15px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '下のボタンから登録フォームを開いて、氏名やSST・店舗情報を登録・更新してください。',
                            wrap: true,
                            size: 'sm',
                            color: '#555555'
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '📝 登録フォームを開く',
                                uri: registrationUrl
                            },
                            style: 'primary',
                            color: '#4A86E8'
                        }
                    ]
                }
            }
        };

        try {
            Settings.lc.replyMessage(replyToken, flexMessage);
            Utils.log(`INFO: Staff settings link sent to ${userId}`);
        } catch (e) {
            Utils.log(`ERROR: handleStaffSettings - ${e}`);
        }
    },

    /**
     * 「シフト希望」メッセージ受信 → シフト希望編集フォームURLを返信
     */
    handleShiftRequest: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const shiftUrl = `${Settings.FRONTEND_BASE_URL}?page=shift`;

        const flexMessage = {
            type: 'flex',
            altText: 'シフト希望フォーム',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: '📅 シフト希望',
                        weight: 'bold',
                        size: 'lg',
                        color: '#ffffff'
                    }],
                    backgroundColor: '#57BB8A',
                    paddingAll: '15px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: 'シフト希望・休み希望を登録・編集できます。',
                        wrap: true,
                        size: 'sm',
                        color: '#555555'
                    }]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '📝 シフト希望を入力する',
                            uri: shiftUrl
                        },
                        style: 'primary',
                        color: '#57BB8A'
                    }]
                }
            }
        };

        try {
            Settings.lc.replyMessage(replyToken, flexMessage);
            Utils.log(`INFO: Shift request link sent to ${userId}`);
        } catch (e) {
            Utils.log(`ERROR: handleShiftRequest - ${e}`);
        }
    },

    /**
     * 「シフト」メッセージ受信 → シフト編集ページURLを返信
     */
    handleShiftEdit: (event) => {
        const userId = event.source.userId;
        const replyToken = event.replyToken;
        const shiftEditUrl = `${Settings.FRONTEND_BASE_URL}?page=shiftEdit`;

        const flexMessage = {
            type: 'flex',
            altText: 'シフト編集',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: '🕐 シフト編集',
                        weight: 'bold',
                        size: 'lg',
                        color: '#ffffff'
                    }],
                    backgroundColor: '#F6B26B',
                    paddingAll: '15px'
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'text',
                        text: 'シフト表の確認・編集ができます。',
                        wrap: true,
                        size: 'sm',
                        color: '#555555'
                    }]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'button',
                        action: {
                            type: 'uri',
                            label: '🕐 シフト編集を開く',
                            uri: shiftEditUrl
                        },
                        style: 'primary',
                        color: '#F6B26B'
                    }]
                }
            }
        };

        try {
            Settings.lc.replyMessage(replyToken, flexMessage);
            Utils.log(`INFO: Shift edit link sent to ${userId}`);
        } catch (e) {
            Utils.log(`ERROR: handleShiftEdit - ${e}`);
        }
    },

    /**
     * Handle follow event (Friend added/unblocked).
     * @param {Object} event - LINE Messaging API event object
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
            const registrationUrl = `${Settings.FRONTEND_BASE_URL}?page=register`;
            Utils.log(`INFO: Registration URL generated: ${registrationUrl}`);

            const flexMessage = {
                type: 'flex',
                altText: 'ユーザー登録のお願い',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: 'ようこそ！🎉',
                                weight: 'bold',
                                size: 'xl',
                                color: '#ffffff'
                            }
                        ],
                        backgroundColor: '#00b900',
                        paddingAll: '20px'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '友だち追加ありがとうございます！',
                                weight: 'bold',
                                size: 'md',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: 'シフト管理Botへようこそ。ユーザー登録を行うと、シフト希望の提出や確認ができるようになります。',
                                size: 'sm',
                                color: '#666666',
                                wrap: true,
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: '下のボタンをタップして登録フォームを開いてください！',
                                size: 'sm',
                                color: '#666666',
                                wrap: true,
                                margin: 'md'
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                action: {
                                    type: 'uri',
                                    label: '✨ 登録フォームを開く',
                                    uri: registrationUrl
                                },
                                style: 'primary',
                                color: '#00b900'
                            }
                        ]
                    }
                }
            };

            Settings.lc.replyMessage(replyToken, flexMessage);
            Utils.log(`INFO: Follow event handled. Reply sent to ${userId}`);
        } catch (e) {
            Utils.log(`ERROR: Failed to handle follow event - ${e.toString()}`);
            try {
                Settings.lc.replyMessage(replyToken, {
                    type: "text",
                    text: `エラーが発生しました。\n管理者に連絡してください。\n詳細: ${e.toString()}`
                });
            } catch (replyError) {
                Utils.log(`FATAL: Failed to send error reply - ${replyError}`);
            }
        }
    }
};
