        // データはJSONから読み込むため初期値は空または最小構成
        let APP_DATA = {};

        let shiftData = null;
        let staffData = {};
        // APP_DATA.staffs.forEach(s => staffData[s.id] = s.name); // これはloadAppData後に実行
        let BREAK_RULES = [];

        let CONSTANTS = {}; // 初期化はupdateGlobalDataで行う
        const MODES = {
            'original': { start: 5, end: 33, hours: 28 },
            'night': { start: 0, end: 24, hours: 24 },
            'wide': { start: 0, end: 33, hours: 33 }
        };

        let state = {
            mode: 'original',
            redLine: false,
            highlightId: '',
            showNextDay: false,
            nextDayLimit: 9,
            showPrevDay: false,
            staffHours: {},
            fullShifts: {}
        };

        // ドラッグ状態管理
        let dragState = {
            mode: null, // 'resize' or 'move'
            timerId: null,
            targetShift: null, // {id, day, rawStart, rawEnd, element, groupId}
            startPageX: 0,
            startPageY: 0,

            // For Resize
            resizeSide: null,
            originalTime: 0,
            currentNewStart: undefined,
            currentNewEnd: undefined,

            // For Move
            ghostEl: null,
            previewEl: null,
            dropTargetDay: null,
            dropStartTime: null,
            offsetTime: 0
        };

        // ローカル環境(file://)でも動作するようにJSONデータを直接埋め込み
        const RAW_STAFF_MASTER = {
            "byStore": [
                {
                    "number": "70800",
                    "name": "志免南里１丁目",
                    "staff": [
                        { "id": "999", "name": "店長", "display": "店長" },
                        { "id": "002", "name": "平野", "display": "平野" },
                        { "id": "004", "name": "山﨑", "display": "山﨑" },
                        { "id": "005", "name": "柳川", "display": "柳川" },
                        { "id": "001", "name": "渕上", "display": "渕上" },
                        { "id": "023", "name": "松本", "display": "松本" },
                        { "id": "024", "name": "安川", "display": "安川" },
                        { "id": "025", "name": "西村", "display": "西村け" },
                        { "id": "125", "name": "西村", "display": "西村ま" },
                        { "id": "027", "name": "永松", "display": "永松" },
                        { "id": "028", "name": "田尻", "display": "田尻" },
                        { "id": "029", "name": "市原", "display": "市原" },
                        { "id": "030", "name": "井上", "display": "井上" },
                        { "id": "031", "name": "今泉", "display": "今泉" },
                        { "id": "032", "name": "大塚", "display": "大塚" },
                        { "id": "033", "name": "沼田", "display": "沼田" },
                        { "id": "126", "name": "光安", "display": "光安" },
                        { "id": "127", "name": "貫", "display": "貫" },
                        { "id": "128", "name": "古江", "display": "古江" },
                        { "id": "000", "name": "未定", "display": "未定" }
                    ]
                },
                {
                    "number": "78369",
                    "name": "志免向ヶ丘",
                    "staff": [
                        { "id": "999", "name": "永田隆子", "display": "店長" },
                        { "id": "001", "name": "吉田陽太", "display": "吉田" },
                        { "id": "002", "name": "前田篤", "display": "前田" },
                        { "id": "129", "name": "渡邊のあ", "display": "渡邊" }
                    ]
                },
                {
                    "number": "12345",
                    "name": "篠栗尾仲",
                    "staff": [
                    ]
                }
            ]
        };

        const RAW_SHIFT_DATA = {
            "store": "70800",
            "storeName": "志免南里１丁目",
            "period": {
                "startDate": "2026-01-25"
            },
            "breakRules": [
                { "minHours": 8, "breakMins": 60 },
                { "minHours": 7, "breakMins": 45 },
                { "minHours": 6, "breakMins": 30 },
                { "minHours": 5, "breakMins": 15 }
            ],
            "staffs": [
                { "id": "70800024", "name": "安川", "display": "安川" },
                { "id": "70800028", "name": "田尻", "display": "田尻" },
                { "id": "70800001", "name": "渕上", "display": "渕上" },
                { "id": "70800023", "name": "松本", "display": "松本" },
                { "id": "70800025", "name": "西村", "display": "西村け" },
                { "id": "70800033", "name": "沼田", "display": "沼田" },
                { "id": "70800999", "name": "店長", "display": "店長" },
                { "id": "70800002", "name": "平野", "display": "平野" },
                { "id": "70800004", "name": "山﨑", "display": "山﨑" },
                { "id": "70800027", "name": "永松", "display": "永松" },
                { "id": "70800032", "name": "大塚", "display": "大塚" },
                { "id": "70800029", "name": "市原", "display": "市原" },
                { "id": "70800030", "name": "井上", "display": "井上" },
                { "id": "70800125", "name": "西村ま", "display": "西村ま" }
            ],
            "shifts": {
                "Sun": {
                    "70800024": [15, 22],
                    "70800028": [15, 22],
                    "70800001": [22, 31],
                    "70800023": [7, 15],
                    "70800025": [7, 15]
                },
                "Mon": {
                    "70800033": [12, 22],
                    "70800999": [9, 18],
                    "70800002": [18, 22],
                    "70800004": [7, 12],
                    "70800027": [7, 9],
                    "70800032": [22, 31]
                },
                "Tue": {
                    "70800024": [12, 17],
                    "70800999": [9, 18],
                    "70800002": [18, 22],
                    "70800004": [7, 12],
                    "70800023": [17, 22],
                    "70800025": [17, 22],
                    "70800027": [7, 9],
                    "70800032": [22, 31]
                },
                "Wed": {
                    "70800004": [7, 9],
                    "70800023": [17, 22],
                    "70800024": [16, 22],
                    "70800999": [7, 16],
                    "70800029": [9, 17],
                    "70800032": [22, 31]
                },
                "Thu": {
                    "70800024": [12, 17],
                    "70800028": [17, 22],
                    "70800030": [18, 22],
                    "70800999": [9, 18],
                    "70800001": [22, 31],
                    "70800004": [7, 12],
                    "70800027": [7, 9]
                },
                "Fri": {
                    "70800023": [16, 22],
                    "70800025": [16, 18],
                    "70800033": [9, 16],
                    "70800002": [18, 22],
                    "70800027": [7, 9],
                    "70800032": [22, 31],
                    "70800999": [7, 16]
                },
                "Sat": {
                    "70800028": [15, 22],
                    "70800125": [18, 22],
                    "70800999": [15, 18],
                    "70800023": [7, 15],
                    "70800025": [7, 15],
                    "70800032": [22, 31]
                },
                "dayOrder": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            },
            "dailyMemos": {
                "Sun": "", "Mon": "", "Tue": "", "Wed": "", "Thu": "", "Fri": "", "Sat": ""
            },
            "subTexts": {}
        };

        // 外部JSON読み込みを廃止し、埋め込みデータをロードする形に変更
        async function loadAppData() {
            try {
                // 1. 店舗情報の特定
                const storeId = RAW_SHIFT_DATA.store;
                const storeMaster = RAW_STAFF_MASTER.byStore.find(s => s.number === storeId);

                const legacyPrefix = "01234";
                if (storeId !== legacyPrefix && RAW_SHIFT_DATA.shifts) {
                    Object.keys(RAW_SHIFT_DATA.shifts).forEach(day => {
                        if (day === 'dayOrder') return;
                        const dayShifts = RAW_SHIFT_DATA.shifts[day];
                        if (!dayShifts) return;

                        const newDayShifts = {};
                        Object.keys(dayShifts).forEach(oldId => {
                            let newId = oldId;
                            if (oldId.startsWith(legacyPrefix) && oldId.length === 8) {
                                const shortId = oldId.slice(-3);
                                newId = storeId + shortId;
                            }
                            newDayShifts[newId] = dayShifts[oldId];
                        });
                        RAW_SHIFT_DATA.shifts[day] = newDayShifts;
                    });

                    if (RAW_SHIFT_DATA.subTexts) {
                        const newSubTexts = {};
                        Object.keys(RAW_SHIFT_DATA.subTexts).forEach(key => {
                            const parts = key.split('_');
                            if (parts.length >= 4) {
                                let sId = parts[1];
                                if (sId.startsWith(legacyPrefix) && sId.length === 8) {
                                    const shortId = sId.slice(-3);
                                    sId = storeId + shortId;
                                    parts[1] = sId;
                                    const newKey = parts.join('_');
                                    newSubTexts[newKey] = RAW_SHIFT_DATA.subTexts[key];
                                } else {
                                    newSubTexts[key] = RAW_SHIFT_DATA.subTexts[key];
                                }
                            } else {
                                newSubTexts[key] = RAW_SHIFT_DATA.subTexts[key];
                            }
                        });
                        RAW_SHIFT_DATA.subTexts = newSubTexts;
                    }
                }

                let mergedStaffs = [];
                let sourceStaffList = RAW_SHIFT_DATA.staffs || [];
                if (sourceStaffList.length === 0 && RAW_SHIFT_DATA.shifts) {
                    const tempIds = new Set();
                    Object.keys(RAW_SHIFT_DATA.shifts).forEach(key => {
                        if (key === 'dayOrder') return;
                        const dayObj = RAW_SHIFT_DATA.shifts[key];
                        if (dayObj) Object.keys(dayObj).forEach(id => tempIds.add(id));
                    });
                    tempIds.forEach(id => sourceStaffList.push({ id: id }));
                }

                const findFromMasterGlobal = (targetId) => {
                    const shortId = (targetId.length >= 3) ? targetId.slice(-3) : targetId;
                    if (RAW_STAFF_MASTER && RAW_STAFF_MASTER.byStore) {
                        for (const store of RAW_STAFF_MASTER.byStore) {
                            if (store.staff) {
                                const found = store.staff.find(s => s.id === shortId);
                                if (found) return found;
                            }
                        }
                    }
                    return null;
                };

                mergedStaffs = sourceStaffList.map(shiftStaff => {
                    const fullId = shiftStaff.id;
                    let masterInfo = null;

                    if (storeMaster && storeMaster.staff) {
                        const shortId = (fullId.length >= 3) ? fullId.slice(-3) : fullId;
                        masterInfo = storeMaster.staff.find(m => m.id === shortId);
                    }

                    if (!masterInfo) {
                        masterInfo = findFromMasterGlobal(fullId);
                    }

                    if (!masterInfo) masterInfo = {};

                    return {
                        ...masterInfo,
                        id: fullId,
                        name: masterInfo.name || shiftStaff.display || shiftStaff.name || "不明",
                        display: shiftStaff.display || masterInfo.display || masterInfo.name || "不明"
                    };
                });

                APP_DATA = {
                    store: {
                        id: storeId,
                        name: RAW_SHIFT_DATA.storeName || (storeMaster ? storeMaster.name : "○○店"),
                        manager: "店長",
                        managerId: "999"
                    },
                    period: RAW_SHIFT_DATA.period,
                    breakRules: RAW_SHIFT_DATA.breakRules,
                    staffs: mergedStaffs,
                    shifts: RAW_SHIFT_DATA.shifts,
                    dailyMemos: RAW_SHIFT_DATA.dailyMemos,
                    subTexts: RAW_SHIFT_DATA.subTexts
                };

                updateGlobalData();
                syncActiveStaffs();

            } catch (e) {
                console.error("Data load failed:", e);
                alert("データ読み込みエラー: " + e.message);
            }
        }

        function syncActiveStaffs() {
            try {
                if (!APP_DATA || !APP_DATA.shifts) return;

                const activeIds = new Set();
                Object.keys(APP_DATA.shifts).forEach(day => {
                    if (day === 'dayOrder') return;
                    const daily = APP_DATA.shifts[day];
                    if (daily) {
                        Object.keys(daily).forEach(id => {
                            if (daily[id] && Array.isArray(daily[id]) && daily[id].length > 0) {
                                activeIds.add(id);
                            }
                        });
                    }
                });

                const newStaffs = [];
                const processedIds = new Set();

                if (APP_DATA.staffs) {
                    APP_DATA.staffs.forEach(s => {
                        if (activeIds.has(s.id)) {
                            newStaffs.push(s);
                            processedIds.add(s.id);
                        }
                    });
                }

                const findFromMasterGlobal = (targetId) => {
                    const shortId = (targetId.length >= 3) ? targetId.slice(-3) : targetId;
                    if (RAW_STAFF_MASTER && RAW_STAFF_MASTER.byStore) {
                        for (const store of RAW_STAFF_MASTER.byStore) {
                            if (store.staff) {
                                const found = store.staff.find(s => s.id === shortId);
                                if (found) return found;
                            }
                        }
                    }
                    return null;
                };

                activeIds.forEach(id => {
                    if (!processedIds.has(id)) {
                        let name = staffData[id];
                        let display = staffData[id];

                        if (!name) {
                            const master = findFromMasterGlobal(id);
                            if (master) {
                                name = master.name;
                                display = master.display || master.name;
                            }
                        }

                        newStaffs.push({
                            id: id,
                            name: name || id,
                            display: display || name || id
                        });
                    }
                });

                APP_DATA.staffs = newStaffs;
                updateGlobalData();
            } catch (e) {
                console.error("syncActiveStaffs failed:", e);
            }
        }

        function updateGlobalData() {
            if (!APP_DATA || !APP_DATA.shifts) return;

            shiftData = APP_DATA.shifts;
            if (!APP_DATA.subTexts) APP_DATA.subTexts = {};

            staffData = {};
            if (APP_DATA.staffs) {
                APP_DATA.staffs.forEach(s => staffData[s.id] = s.display || s.name);
            }

            BREAK_RULES = APP_DATA.breakRules;

            CONSTANTS = {
                HOUR_START: 0, HOUR_END: 34, LANES: 6, LANE_HEIGHT: 15,
                DATE_START: new Date(APP_DATA.period.startDate),
                DATE_COL_WIDTH: 0,
                PRINT_DATE_COL_WIDTH: 0,
                A4_WIDTH: 1122
            };
        }

        function createSVGElement(tag) {
            return document.createElementNS('http://www.w3.org/2000/svg', tag);
        }

        function createBracketSVG(direction) {
            const svg = createSVGElement('svg');
            svg.setAttribute('viewBox', '0 0 10 20');
            svg.setAttribute('preserveAspectRatio', 'none');
            const polyline = createSVGElement('polyline');

            if (direction === 'start') {
                polyline.setAttribute('points', '10,0 2,10 10,20');
            } else {
                polyline.setAttribute('points', '0,0 8,10 0,20');
            }

            polyline.setAttribute('fill', 'none');
            polyline.setAttribute('stroke', '#000');
            polyline.setAttribute('stroke-width', '1.5');
            polyline.setAttribute('stroke-linejoin', 'round');
            polyline.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(polyline);
            return svg;
        }

        function calcBreakTime(duration) {
            for (const rule of BREAK_RULES) {
                if (duration >= rule.minHours) return rule.breakMins;
            }
            return 0;
        }

        function initStoreInfo() {
            const storeInfoEl = document.getElementById('header-store-info');
            if (storeInfoEl) {
                storeInfoEl.innerHTML = `<span>[${APP_DATA.store.id}] ${APP_DATA.store.name}</span><br><span>[責${APP_DATA.store.managerId}] ${APP_DATA.store.manager}</span>`;
            }
            const titleLeft = document.getElementById('store-title-area');
            if (titleLeft) {
                titleLeft.innerHTML = `
                    <div class="store-info-row">
                        <span class="store-info-label">店番：</span>
                        <span class="store-info-data-container">
                            <span class="store-info-data" id="store-id-data">${APP_DATA.store.id}</span>
                        </span>
                    </div>
                    <div class="store-info-row">
                        <span class="store-info-label">店名：</span>
                        <span class="store-info-data-container">
                            <span class="store-info-data" id="store-name-data">${APP_DATA.store.name}</span>
                        </span>
                    </div>
                `;
            }
            const titleCenter = document.getElementById('title-center');
            if (titleCenter && APP_DATA.period.startDate) {
                const startD = new Date(APP_DATA.period.startDate);
                const endD = new Date(startD);
                endD.setDate(endD.getDate() + 6);
                const periodLabel = `（${startD.getMonth() + 1}月${startD.getDate()}日～${endD.getMonth() + 1}月${endD.getDate()}日）`;
                titleCenter.innerHTML = `${periodLabel}<span>ローテーション表</span>`;
            }
            renderBreakRules();
        }

        function renderBreakRules() {
            const container = document.querySelector('#title-field .title-part:last-child');
            if (!container) return;

            let html = '<div style="font-size:0.75em; text-align:right; line-height:1.2;">【休憩規定】<br>';
            const sortedRules = [...BREAK_RULES].sort((a, b) => a.minHours - b.minHours);

            let ruleTexts = [];
            sortedRules.forEach(r => {
                ruleTexts.push(`${r.minHours}H〜:${r.breakMins}分`);
            });

            if (ruleTexts.length > 2) {
                const mid = Math.ceil(ruleTexts.length / 2);
                html += ruleTexts.slice(0, mid).join(' ') + '<br>' + ruleTexts.slice(mid).join(' ');
            } else {
                html += ruleTexts.join(' ');
            }
            html += '</div>';
            container.innerHTML = html;
        }

        function updateHeader(title, userName, roleNum) {
            const roleConfig = {
                0: { name: "権限なし", colorClass: "role-badge-gray" },
                1: { name: "仮登録", colorClass: "role-badge-gray" },
                2: { name: "スタッフ", colorClass: "role-badge-green" },
                3: { name: "責任者", colorClass: "role-badge-blue" },
                4: { name: "管理者", colorClass: "role-badge-red" },
                5: { name: "開発者", colorClass: "role-badge-black" }
            };
            const pageTitle = document.getElementById('pageTitle');
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');
            if (pageTitle) pageTitle.textContent = title;
            if (userNameEl) userNameEl.textContent = userName;
            if (userRoleEl) {
                if (roleConfig[roleNum]) {
                    userRoleEl.textContent = roleConfig[roleNum].name;
                    userRoleEl.className = 'role-badge ' + roleConfig[roleNum].colorClass;
                } else {
                    userRoleEl.textContent = '未設定';
                    userRoleEl.className = 'role-badge role-badge-gray';
                }
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            let currentRole = 'スタッフ';
            try {
                // ローカルファイルでの実行（file:///）かテスト環境の場合はLIFFをモック化
                if (window.location.protocol === 'file:' || CONFIG.LIFF_ID === "AUTO_GENERATED_BY_GITHUB_ACTIONS") {
                    console.log('Running in local/mock mode, skipping LIFF init.');
                    window.currentUserId = 'U_dummy_local_user';
                    updateHeader('シフトエディタ', 'ローカルユーザー', 4, null);
                    await loadAppData();
                    if (APP_DATA.shifts) {
                        initStoreInfo();
                        calcStaffHours();
                        initUI();
                        initModal();
                        initJsonModal();
                        initHighlightModal();
                        initDateChangeModal();
                        setupDelegatedEvents();
                        initStatusMenu();
                    }
                    return;
                }

                await liff.init({ liffId: CONFIG.LIFF_ID });
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }
                const profile = await liff.getProfile();
                window.currentUserId = profile.userId;

                let roleNum = 2; // Default to staff
                if (window.currentUserId === 'U_dummy_local_user') {
                    roleNum = 4;
                }
                updateHeader('シフトエディタ', profile.displayName || 'ユーザー', roleNum, null);
            } catch (err) {
                console.error("LIFF SDK Init failed", err);
                updateHeader('シフトエディタ', 'ユーザー', 0, null);
            }

            await loadAppData();
            if (!APP_DATA.shifts) return;

            initStoreInfo();
            calcStaffHours();
            initUI();
            initModal();
            initJsonModal();
            initHighlightModal();
            initDateChangeModal();
            setupDelegatedEvents();
            initStatusMenu();
            setupDragEvents();
            renderApp();
            updateClock();
            setInterval(updateClock, 1000);
            window.addEventListener('resize', () => {
                renderApp();
                updateHeaderDiagonalLine();
            });

            const durationOnBtn = document.getElementById('btn-duration-on');
            const durationOffBtn = document.getElementById('btn-duration-off');
            const tableFrame = document.getElementById('table-frame');

            if (durationOnBtn && durationOffBtn && tableFrame) {
                durationOnBtn.addEventListener('click', () => {
                    durationOnBtn.classList.add('selected');
                    durationOffBtn.classList.remove('selected');
                    tableFrame.classList.remove('hide-duration');
                });

                durationOffBtn.addEventListener('click', () => {
                    durationOffBtn.classList.add('selected');
                    durationOnBtn.classList.remove('selected');
                    tableFrame.classList.add('hide-duration');
                });
            }
        });

        function setupDelegatedEvents() {
            const container = document.getElementById('shift-rows-container');
            container.addEventListener('click', (e) => {
                if (dragState.mode !== null) return;

                const memoArea = e.target.closest('.date-spacer-area');
                if (memoArea) {
                    const colDate = memoArea.closest('.col-date');
                    if (colDate) {
                        const day = shiftData.dayOrder.find(d => colDate.classList.contains(d));
                        if (day) openNoteModal(day);
                    }
                    return;
                }

                const shiftBar = e.target.closest('.shift-bar');
                if (shiftBar) {
                    if (!e.target.closest('.shift-bracket')) {
                        const rawStart = parseFloat(shiftBar.dataset.rawStart);
                        const rawEnd = parseFloat(shiftBar.dataset.rawEnd);
                        const s = { id: shiftBar.dataset.staffId, day: shiftBar.dataset.day, rawStart: rawStart, rawEnd: rawEnd };
                        openEditModal(s);
                        return;
                    }
                }

                const tlBody = e.target.closest('.timeline-body');
                if (tlBody) {
                    if (e.target.closest('.shift-bar')) return;

                    const day = tlBody.dataset.day;
                    const rect = tlBody.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;

                    const tableFrame = document.getElementById('table-frame');
                    const currentMode = MODES[state.mode];
                    const frameWidth = tableFrame.clientWidth;
                    const hourWidth = getHourWidth(frameWidth, currentMode);

                    const clickedHourRaw = clickX / hourWidth;
                    const clickedHour = Math.floor(clickedHourRaw);

                    if (clickedHour >= 0 && clickedHour < CONSTANTS.HOUR_END) {
                        let endH = clickedHour + 3;
                        openAddModal(day, clickedHour, endH);
                    }
                }
            });
        }

        function getHourWidth(frameWidth, mode) {
            const totalHoursForCalc = mode.hours + 4;
            return frameWidth / totalHoursForCalc;
        }

        function setupDragEvents() {
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchend', handleDragEnd);
            document.addEventListener('touchcancel', handleDragEnd);
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('touchmove', handleDragMove, { passive: false });
        }


        function handleDragStart(e, type, param, side) {
            const isMouse = e.type.includes('mouse');
            if (isMouse) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (!isMouse && (!e.touches || e.touches.length === 0)) {
                return;
            }
            const clientX = isMouse ? e.clientX : e.touches[0].clientX;
            const clientY = isMouse ? e.clientY : e.touches[0].clientY;

            let bar;
            if (type === 'resize') {
                bar = param.closest('.shift-bar');
            } else {
                bar = param;
            }
            if (!bar) return;

            const shiftId = bar.dataset.staffId;
            const day = bar.dataset.day;
            const rawStart = parseFloat(bar.dataset.rawStart);
            const rawEnd = parseFloat(bar.dataset.rawEnd);

            dragState.startPageX = clientX;
            dragState.startPageY = clientY;
            dragState.tapTarget = { bar, type, isBracket: (type === 'resize') };

            dragState.timerId = setTimeout(() => {
                dragState.mode = type;
                dragState.targetShift = { id: shiftId, day: day, rawStart, rawEnd, element: bar };

                if (type === 'resize') {
                    dragState.resizeSide = side;
                    dragState.originalTime = (dragState.resizeSide === 'start') ? rawStart : rawEnd;
                    param.classList.add('resizing-handle');
                    bar.classList.add('resizing-bar');
                } else {
                    const tableFrame = document.getElementById('table-frame');
                    const currentMode = MODES[state.mode];
                    const frameWidth = tableFrame.clientWidth;
                    const hourWidth = getHourWidth(frameWidth, currentMode);

                    const rect = bar.getBoundingClientRect();
                    const offsetX = clientX - rect.left;
                    const offsetHours = offsetX / hourWidth;
                    dragState.offsetTime = offsetHours;

                    bar.classList.add('moving-source');
                    createGhost(bar, rect);
                }
            }, 500);
        }

        function createGhost(originalBar, rect) {
            const ghost = originalBar.cloneNode(true);
            ghost.classList.add('dragging-ghost');
            ghost.classList.remove('moving-source');
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
            ghost.style.margin = 0;
            document.body.appendChild(ghost);
            dragState.ghostEl = ghost;
        }

        function handleDragMove(e) {
            if (!dragState.mode) {
                if (dragState.timerId) {
                    const isMouse = e.type.includes('mouse');
                    if (!isMouse && (!e.touches || e.touches.length === 0)) {
                        clearTimeout(dragState.timerId);
                        dragState.timerId = null;
                        return;
                    }
                    const cx = isMouse ? e.clientX : e.touches[0].clientX;
                    const cy = isMouse ? e.clientY : e.touches[0].clientY;
                    const dist = Math.sqrt(Math.pow(cx - dragState.startPageX, 2) + Math.pow(cy - dragState.startPageY, 2));
                    if (dist > 10) {
                        clearTimeout(dragState.timerId);
                        dragState.timerId = null;
                    }
                }
                return;
            }
            e.preventDefault();

            const isMouse = e.type.includes('mouse');
            if (!isMouse && (!e.touches || e.touches.length === 0)) {
                return;
            }
            const clientX = isMouse ? e.clientX : e.touches[0].clientX;
            const clientY = isMouse ? e.clientY : e.touches[0].clientY;

            const tableFrame = document.getElementById('table-frame');
            const currentMode = MODES[state.mode];
            const frameWidth = tableFrame.clientWidth;
            const hourWidth = getHourWidth(frameWidth, currentMode);

            if (dragState.mode === 'resize') {
                const diffX = clientX - dragState.startPageX;
                const diffHours = diffX / hourWidth;
                let newTime = dragState.originalTime + diffHours;
                newTime = Math.round(newTime);

                const s = dragState.targetShift;
                let newStart = s.rawStart;
                let newEnd = s.rawEnd;

                if (dragState.resizeSide === 'start') {
                    newStart = newTime;
                    if (newStart >= newEnd - 1.0) newStart = newEnd - 1.0;
                } else {
                    newEnd = newTime;
                    if (newEnd <= newStart + 1.0) newEnd = newStart + 1.0;
                }
                updateBarDOM(s.element, newStart, newEnd, hourWidth, currentMode);
                dragState.currentNewStart = newStart;
                dragState.currentNewEnd = newEnd;

            } else if (dragState.mode === 'move') {
                if (dragState.ghostEl) {
                    const w = parseFloat(dragState.ghostEl.style.width);
                    const h = parseFloat(dragState.ghostEl.style.height);
                    dragState.ghostEl.style.left = (clientX - (w * 0.5)) + 'px';
                    dragState.ghostEl.style.top = (clientY - (h * 0.5)) + 'px';
                }

                const elemBelow = document.elementFromPoint(clientX, clientY);
                if (!elemBelow) return;

                const tlBody = elemBelow.closest('.timeline-body');
                if (tlBody) {
                    const day = tlBody.dataset.day;
                    const rect = tlBody.getBoundingClientRect();
                    const xInTimeline = clientX - rect.left;

                    let hoverTime = xInTimeline / hourWidth;
                    let newStart = hoverTime - dragState.offsetTime;
                    newStart = Math.round(newStart);

                    showDropPreview(tlBody, newStart, dragState.targetShift.rawEnd - dragState.targetShift.rawStart, hourWidth, currentMode);

                    dragState.dropTargetDay = day;
                    dragState.dropStartTime = newStart;
                } else {
                    hideDropPreview();
                    dragState.dropTargetDay = null;
                }
            }
        }

        function showDropPreview(container, start, duration, hourWidth, mode) {
            if (!dragState.previewEl) {
                const el = document.createElement('div');
                el.className = 'drop-preview';
                dragState.previewEl = el;
            }

            if (dragState.previewEl.parentElement !== container) {
                container.appendChild(dragState.previewEl);
            }

            const left = start * hourWidth;
            const width = duration * hourWidth;

            dragState.previewEl.style.left = left + 'px';
            dragState.previewEl.style.width = width + 'px';
            dragState.previewEl.style.top = '0px';
            dragState.previewEl.style.height = (CONSTANTS.LANE_HEIGHT * 2) + 'px';
        }

        function hideDropPreview() {
            if (dragState.previewEl && dragState.previewEl.parentElement) {
                dragState.previewEl.parentElement.removeChild(dragState.previewEl);
            }
        }

        function updateBarDOM(bar, start, end, hourWidth, mode) {
            if (end <= mode.start || start >= mode.end) return;
            let displayStart = Math.max(start, mode.start);
            let displayEnd = Math.min(end, mode.end);
            const left = displayStart * hourWidth;
            const width = (displayEnd - displayStart) * hourWidth;
            bar.style.left = left + 'px';
            bar.style.width = width + 'px';
        }

        function handleDragEnd(e) {
            if (dragState.timerId) {
                clearTimeout(dragState.timerId);
                dragState.timerId = null;

                if (dragState.tapTarget && !dragState.tapTarget.isBracket && !dragState.mode) {
                    const bar = dragState.tapTarget.bar;
                    const rawStart = parseFloat(bar.dataset.rawStart);
                    const rawEnd = parseFloat(bar.dataset.rawEnd);
                    const s = {
                        id: bar.dataset.staffId,
                        day: bar.dataset.day,
                        rawStart: rawStart,
                        rawEnd: rawEnd
                    };
                    dragState.tapTarget = null;
                    openEditModal(s);
                    return;
                }
                dragState.tapTarget = null;
            }

            if (!dragState.mode) return;

            const s = dragState.targetShift;

            if (dragState.mode === 'resize') {
                const newStart = dragState.currentNewStart !== undefined ? dragState.currentNewStart : s.rawStart;
                const newEnd = dragState.currentNewEnd !== undefined ? dragState.currentNewEnd : s.rawEnd;

                if (shiftData[s.day] && shiftData[s.day][s.id]) {
                    const times = shiftData[s.day][s.id];
                    for (let i = 0; i < times.length; i += 2) {
                        if (Math.abs(times[i] - s.rawStart) < 0.01 && Math.abs(times[i + 1] - s.rawEnd) < 0.01) {
                            times[i] = newStart; times[i + 1] = newEnd;

                            const oldKey = `${s.day}_${s.id}_${s.rawStart}_${s.rawEnd}`;
                            const newKey = `${s.day}_${s.id}_${newStart}_${newEnd}`;
                            if (APP_DATA.subTexts[oldKey]) {
                                APP_DATA.subTexts[newKey] = APP_DATA.subTexts[oldKey];
                                delete APP_DATA.subTexts[oldKey];
                            }
                            break;
                        }
                    }
                }

                if (s.element) {
                    s.element.classList.remove('resizing-bar');
                    const brackets = s.element.querySelectorAll('.shift-bracket');
                    brackets.forEach(b => b.classList.remove('resizing-handle'));
                }

            } else if (dragState.mode === 'move') {
                if (dragState.dropTargetDay && dragState.dropStartTime !== null) {
                    const duration = s.rawEnd - s.rawStart;
                    let newStart = dragState.dropStartTime;
                    let newEnd = newStart + duration;

                    let deleted = false;
                    let subTextVal = null;
                    const oldKey = `${s.day}_${s.id}_${s.rawStart}_${s.rawEnd}`;
                    if (APP_DATA.subTexts[oldKey]) subTextVal = APP_DATA.subTexts[oldKey];

                    if (shiftData[s.day] && shiftData[s.day][s.id]) {
                        const times = shiftData[s.day][s.id];
                        for (let i = 0; i < times.length; i += 2) {
                            if (Math.abs(times[i] - s.rawStart) < 0.01 && Math.abs(times[i + 1] - s.rawEnd) < 0.01) {
                                times.splice(i, 2);
                                if (times.length === 0) delete shiftData[s.day][s.id];
                                deleted = true;
                                if (subTextVal) delete APP_DATA.subTexts[oldKey];
                                break;
                            }
                        }
                    }

                    if (deleted) {
                        let finalData = normalizeTime(dragState.dropTargetDay, newStart, newEnd);
                        if (!shiftData[finalData.day][s.id]) shiftData[finalData.day][s.id] = [];
                        shiftData[finalData.day][s.id].push(finalData.start, finalData.end);

                        if (subTextVal) {
                            const newKey = `${finalData.day}_${s.id}_${finalData.start}_${finalData.end}`;
                            APP_DATA.subTexts[newKey] = subTextVal;
                        }
                    }
                }

                if (s.element) {
                    s.element.classList.remove('moving-source');
                }
            }

            if (dragState.ghostEl) {
                try {
                    if (dragState.ghostEl.parentNode) {
                        document.body.removeChild(dragState.ghostEl);
                    }
                } catch (err) { }
            }

            hideDropPreview();

            dragState.mode = null;
            dragState.targetShift = null;
            dragState.resizeSide = null;
            dragState.originalTime = 0;
            dragState.currentNewStart = undefined;
            dragState.currentNewEnd = undefined;
            dragState.ghostEl = null;
            dragState.previewEl = null;
            dragState.dropTargetDay = null;
            dragState.dropStartTime = null;
            dragState.offsetTime = 0;
            dragState.startPageX = 0;
            dragState.startPageY = 0;
            dragState.tapTarget = null;

            syncActiveStaffs();
            calcStaffHours();
            renderApp();
        }

        function setupToggleButtons(onSelector, offSelector, stateKey, callback) {
            const btnOn = document.getElementById(onSelector);
            const btnOff = document.getElementById(offSelector);
            btnOn.addEventListener('click', () => {
                state[stateKey] = true;
                btnOn.classList.add('selected');
                btnOff.classList.remove('selected');
                if (callback) callback();
                renderApp();
            });
            btnOff.addEventListener('click', () => {
                state[stateKey] = false;
                btnOff.classList.add('selected');
                btnOn.classList.remove('selected');
                if (callback) callback();
                renderApp();
            });
        }

        function initUI() {
            window.addEventListener('scroll', updateStickyHeaderPosition);
            window.addEventListener('resize', updateStickyHeaderPosition);
            const mainScroll = document.querySelector('.main-scroll-container');
            if (mainScroll) {
                mainScroll.addEventListener('scroll', updateStickyHeaderPosition);
            }

            document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', e => {
                document.querySelectorAll('[data-mode]').forEach(x => x.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                state.mode = e.currentTarget.dataset.mode;
                renderApp();
            }));

            document.getElementById('btn-red-on').addEventListener('click', () => toggleRedLine(true));
            document.getElementById('btn-red-off').addEventListener('click', () => toggleRedLine(false));
            setupToggleButtons('btn-next-on', 'btn-next-off', 'showNextDay');
            setupToggleButtons('btn-prev-on', 'btn-prev-off', 'showPrevDay');

            document.getElementById('btn-open-highlight').addEventListener('click', openHighlightModal);

            document.getElementById('btn-reset').addEventListener('click', handleDeleteAll);

            document.getElementById('btn-add-shift').addEventListener('click', () => {
                openAddModal(shiftData.dayOrder[0], 9, 17);
            });

            document.getElementById('btn-download-json-modal').addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(APP_DATA, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "shift_data.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            });

            document.getElementById('btn-edit-json').addEventListener('click', openJsonModal);
            document.getElementById('btn-preview').addEventListener('click', handlePreview);

            document.getElementById('btn-preview-close').addEventListener('click', () => {
                document.getElementById('preview-modal').style.display = 'none';
                document.getElementById('modal-overlay').style.display = 'none';
            });

            document.getElementById('btn-preview-save').addEventListener('click', () => {
                const img = document.querySelector('#preview-image-container img');
                if (img) {
                    const link = document.createElement('a');
                    link.download = `【${APP_DATA.store.id}】${APP_DATA.period.startDate.replace(/-/g, '/')}.png`;
                    link.href = img.src;
                    link.click();
                }
            });

            updateHeaderDiagonalLine();
        }

        function initJsonModal() {
            document.getElementById('btn-json-cancel').addEventListener('click', closeJsonModal);
            document.getElementById('btn-json-save').addEventListener('click', saveJsonData);
        }

        function openJsonModal() {
            document.getElementById('json-input').value = JSON.stringify(APP_DATA, null, 2);
            showModal('json-modal');
        }

        function closeJsonModal() {
            document.getElementById('json-modal').style.display = 'none';
            document.getElementById('modal-overlay').style.display = 'none';
            document.body.style.overflow = '';
        }

        function saveJsonData() {
            try {
                const jsonStr = document.getElementById('json-input').value;
                const newData = JSON.parse(jsonStr);
                APP_DATA = newData;
                updateGlobalData();

                initStoreInfo();
                calcStaffHours();
                renderApp();

                closeJsonModal();
                alert('データを更新しました。');
            } catch (e) {
                alert('JSONの形式が正しくありません。\n' + e.message);
            }
        }

        function initModal() {
            document.getElementById('btn-note-cancel').onclick = closeModal;
            document.getElementById('btn-note-save').onclick = saveNote;
            document.getElementById('btn-note-delete').onclick = deleteNote;

            document.getElementById('btn-modal-cancel').onclick = closeModal;
            document.getElementById('btn-modal-save').onclick = saveShift;
            document.getElementById('btn-modal-delete').onclick = deleteShift;

            const daySel = document.getElementById('modal-day-select');
            shiftData.dayOrder.forEach(day => {
                const opt = document.createElement('option');
                opt.value = day;
                opt.textContent = `${getDayJa(day)}曜日`;
                daySel.appendChild(opt);
            });

            document.getElementById('btn-open-staff-select-modal').onclick = openStaffSelectorModal;
            initStaffSelectorModal();

            const startHSel = document.getElementById('modal-start-h');
            for (let i = 0; i <= 23; i++) { const opt = document.createElement('option'); opt.value = i; opt.textContent = i; startHSel.appendChild(opt); }

            const endHSel = document.getElementById('modal-end-h');
            for (let i = 0; i <= 36; i++) { const opt = document.createElement('option'); opt.value = i; opt.textContent = i; endHSel.appendChild(opt); }

            document.getElementById('modal-overlay').onclick = (e) => {
                if (window.innerWidth <= 600) {
                    e.stopPropagation();
                    return;
                }
                closeModal();
            };
        }

        function openAddModal(day, startH, endH) {
            document.querySelector('#shift-modal .modal-title').textContent = "シフト追加";
            document.getElementById('modal-day-select').value = day;
            document.getElementById('modal-original-key').value = "";
            document.getElementById('modal-original-day').value = "";
            document.getElementById('modal-original-staff-id').value = "";
            document.getElementById('modal-original-start').value = "";
            document.getElementById('modal-original-end').value = "";
            document.getElementById('btn-modal-delete').style.display = 'none';
            document.getElementById('modal-staff-id').value = "";
            document.getElementById('modal-staff-name').value = "";
            document.getElementById('modal-sub-text').value = "";
            setTimeValue('modal-start', startH, 0);
            setTimeValue('modal-end', endH, 0);
            showModal('shift-modal');
        }

        function openEditModal(shift) {
            document.querySelector('#shift-modal .modal-title').textContent = "シフト編集";
            document.getElementById('modal-day-select').value = shift.day;
            document.getElementById('modal-original-key').value = `${shift.id}_${shift.rawStart}_${shift.rawEnd}`;
            document.getElementById('modal-original-day').value = shift.day;
            document.getElementById('modal-original-staff-id').value = shift.id;
            document.getElementById('modal-original-start').value = shift.rawStart;
            document.getElementById('modal-original-end').value = shift.rawEnd;
            document.getElementById('btn-modal-delete').style.display = 'flex';
            document.getElementById('modal-staff-id').value = shift.id;
            document.getElementById('modal-staff-name').value = shift.name || staffData[shift.id] || "";

            const key = `${shift.day}_${shift.id}_${shift.rawStart}_${shift.rawEnd}`;
            document.getElementById('modal-sub-text').value = APP_DATA.subTexts[key] || "";

            setTimeValue('modal-start', Math.floor(shift.rawStart), shift.rawStart % 1);
            setTimeValue('modal-end', Math.floor(shift.rawEnd), shift.rawEnd % 1);
            showModal('shift-modal');
        }

        function openNoteModal(day) {
            document.getElementById('note-modal-day').value = day;
            document.getElementById('note-text').value = APP_DATA.dailyMemos[day] || "";
            showModal('note-modal');
        }

        function showModal(id, sideButtonsId) {
            document.getElementById('modal-overlay').style.display = 'block';
            const modal = document.getElementById(id);
            modal.style.display = 'block';

            if (sideButtonsId) {
                setTimeout(() => {
                    positionModalSideButtons(id, sideButtonsId);
                }, 10);
            }
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            document.getElementById('modal-overlay').style.display = 'none';
            document.getElementById('note-modal').style.display = 'none';
            document.getElementById('shift-modal').style.display = 'none';
            document.getElementById('json-modal').style.display = 'none';
            document.getElementById('preview-modal').style.display = 'none';
            document.getElementById('highlight-modal').style.display = 'none';
            document.getElementById('date-change-modal').style.display = 'none';
            document.getElementById('store-change-modal').style.display = 'none';
            document.getElementById('staff-selector-modal').style.display = 'none';
            hideModalSideButtons();
            document.body.style.overflow = '';
        }

        function positionModalSideButtons(modalId, sideButtonsId) {
            const modal = document.getElementById(modalId);
            const sideButtons = document.getElementById(sideButtonsId);
            if (!modal || !sideButtons) return;
            const rect = modal.getBoundingClientRect();
            sideButtons.style.top = (rect.top + 10) + 'px';
            sideButtons.style.left = (rect.right + 10) + 'px';
            sideButtons.classList.add('active');
        }

        function hideModalSideButtons() {
            const jsonBtns = document.getElementById('json-modal-side-buttons');
            if (jsonBtns) jsonBtns.classList.remove('active');
            const previewBtns = document.getElementById('preview-modal-side-buttons');
            if (previewBtns) previewBtns.classList.remove('active');
        }

        function saveShift() {
            const day = document.getElementById('modal-day-select').value;
            const staffId = document.getElementById('modal-staff-id').value;
            if (!staffId) { alert("スタッフを選択してください"); return; }

            const start = getTimeValue('modal-start');
            const end = getTimeValue('modal-end');
            const subText = document.getElementById('modal-sub-text').value;

            const originalDay = document.getElementById('modal-original-day').value;
            const oldId = document.getElementById('modal-original-staff-id').value;
            const oldStart = parseFloat(document.getElementById('modal-original-start').value);
            const oldEnd = parseFloat(document.getElementById('modal-original-end').value);

            if (start >= end) { alert("終了時間は開始時間より後に設定してください"); return; }

            let updated = false;

            if (originalDay === day && oldId === staffId && !isNaN(oldStart)) {
                if (shiftData[day] && shiftData[day][staffId]) {
                    const times = shiftData[day][staffId];
                    for (let i = 0; i < times.length; i += 2) {
                        if (Math.abs(times[i] - oldStart) < 0.01 && Math.abs(times[i + 1] - oldEnd) < 0.01) {
                            times[i] = start;
                            times[i + 1] = end;
                            updated = true;

                            const oldFullKey = `${originalDay}_${oldId}_${oldStart}_${oldEnd}`;
                            const newFullKey = `${day}_${staffId}_${start}_${end}`;

                            if (APP_DATA.subTexts[oldFullKey]) {
                                if (subText) {
                                    APP_DATA.subTexts[newFullKey] = subText;
                                } else {
                                    APP_DATA.subTexts[newFullKey] = APP_DATA.subTexts[oldFullKey];
                                }
                                delete APP_DATA.subTexts[oldFullKey];
                            } else if (subText) {
                                APP_DATA.subTexts[newFullKey] = subText;
                            }
                            break;
                        }
                    }
                }
            }

            if (!updated) {
                if (originalDay && oldId && !isNaN(oldStart)) {
                    if (shiftData[originalDay] && shiftData[originalDay][oldId]) {
                        const times = shiftData[originalDay][oldId];
                        for (let i = 0; i < times.length; i += 2) {
                            if (Math.abs(times[i] - oldStart) < 0.01 && Math.abs(times[i + 1] - oldEnd) < 0.01) {
                                times.splice(i, 2);
                                if (times.length === 0) delete shiftData[originalDay][oldId];
                                const oldFullKey = `${originalDay}_${oldId}_${oldStart}_${oldEnd}`;
                                if (APP_DATA.subTexts[oldFullKey]) delete APP_DATA.subTexts[oldFullKey];
                                break;
                            }
                        }
                    }
                }

                if (!shiftData[day][staffId]) shiftData[day][staffId] = [];
                shiftData[day][staffId].push(start, end);

                if (subText) {
                    const newFullKey = `${day}_${staffId}_${start}_${end}`;
                    APP_DATA.subTexts[newFullKey] = subText;
                }
            }

            closeModal();

            setTimeout(() => {
                try {
                    syncActiveStaffs();
                    calcStaffHours();
                    renderApp();
                    document.body.offsetHeight;
                } catch (e) {
                    alert("更新エラーが発生しました: " + e.message);
                    try { renderApp(); } catch (ee) { }
                }
            }, 50);
        }

        function deleteShift() {
            const originalDay = document.getElementById('modal-original-day').value;
            const oldId = document.getElementById('modal-original-staff-id').value;
            const oldStart = parseFloat(document.getElementById('modal-original-start').value);
            const oldEnd = parseFloat(document.getElementById('modal-original-end').value);

            if (originalDay && oldId && !isNaN(oldStart)) {
                if (shiftData[originalDay] && shiftData[originalDay][oldId]) {
                    const times = shiftData[originalDay][oldId];
                    for (let i = 0; i < times.length; i += 2) {
                        if (Math.abs(times[i] - oldStart) < 0.01 && Math.abs(times[i + 1] - oldEnd) < 0.01) {
                            times.splice(i, 2);
                            if (times.length === 0) delete shiftData[originalDay][oldId];

                            const oldFullKey = `${originalDay}_${oldId}_${oldStart}_${oldEnd}`;
                            if (APP_DATA.subTexts[oldFullKey]) delete APP_DATA.subTexts[oldFullKey];
                            break;
                        }
                    }
                }
            }
            closeModal();

            setTimeout(() => {
                try {
                    syncActiveStaffs();
                    calcStaffHours();
                    renderApp();
                } catch (e) {
                    try { renderApp(); } catch (ee) { }
                }
            }, 50);
        }

        function saveNote() {
            const day = document.getElementById('note-modal-day').value;
            const text = document.getElementById('note-text').value;
            if (!APP_DATA.dailyMemos) APP_DATA.dailyMemos = {};
            APP_DATA.dailyMemos[day] = text;
            closeModal(); renderApp();
        }
        function deleteNote() {
            const day = document.getElementById('note-modal-day').value;
            if (APP_DATA.dailyMemos && APP_DATA.dailyMemos[day]) delete APP_DATA.dailyMemos[day];
            closeModal(); renderApp();
        }
        function handleDeleteAll() {
            if (confirm('本当に全てのシフトを削除しますか？')) {
                shiftData.dayOrder.forEach(day => { shiftData[day] = {}; });
                APP_DATA.dailyMemos = {};
                APP_DATA.subTexts = {};
                setTimeout(() => {
                    syncActiveStaffs();
                    calcStaffHours(); renderApp();
                }, 50);
            }
        }

        function updateClock() {
            const now = new Date();
            const y = now.getFullYear(); const m = now.getMonth() + 1; const d = now.getDate();
            const w = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
            const h = String(now.getHours()); const min = String(now.getMinutes()).padStart(2, '0');
            const headerDate = document.getElementById('header-date');
            const headerTime = document.getElementById('header-time');
            if (headerDate) headerDate.textContent = `${y}/${m}/${d}(${w})`;
            if (headerTime) headerTime.textContent = `${h}:${min}`;
        }

        function toggleRedLine(isOn) { state.redLine = isOn; document.getElementById('btn-red-on').classList.toggle('selected', isOn); document.getElementById('btn-red-off').classList.toggle('selected', !isOn); renderApp(); }

        function calcStaffHours() {
            let cumulative = {};
            state.fullShifts = {};
            state.staffHours = {};

            if (!BREAK_RULES) BREAK_RULES = [];

            const sortedRules = [...BREAK_RULES].sort((a, b) => b.minHours - a.minHours);

            const getBreak = (d) => {
                for (const rule of sortedRules) {
                    if (d >= rule.minHours) return rule.breakMins;
                }
                return 0;
            };

            shiftData.dayOrder.forEach(day => {
                const dayShifts = shiftData[day] || {};
                for (let id in dayShifts) {
                    const times = dayShifts[id];
                    let dailyTotal = 0; let timeStrs = [];
                    for (let i = 0; i < times.length; i += 2) {
                        const duration = times[i + 1] - times[i];
                        const breakMins = getBreak(duration);
                        const actualWork = duration - (breakMins / 60);
                        dailyTotal += actualWork;
                        timeStrs.push(`${formatTime(times[i])}-${formatTime(times[i + 1])}`);
                    }
                    const name = staffData[id] || id;

                    if (!cumulative[name]) cumulative[name] = 0;
                    cumulative[name] += dailyTotal;

                    if (!state.staffHours[name]) state.staffHours[name] = {};
                    state.staffHours[name][day] = cumulative[name];
                    state.fullShifts[`${day}_${id}`] = timeStrs.join(' & ');
                }
            });
        }

        function calculatePeakStaff(day, start, end) {
            const shifts = processShiftsForDay(day, { start, end });
            const filteredShifts = shifts.filter(s => {
                if (!state.showNextDay && s.isForwardGhost) return false;
                if (!state.showPrevDay && s.isBackwardGhost) return false;
                return true;
            });

            let maxCount = 0;
            for (let t = start; t < end; t += 0.5) {
                let currentCount = 0;
                for (const shift of filteredShifts) if (t >= shift.start && t < shift.end) currentCount++;
                maxCount = Math.max(currentCount, maxCount);
            }
            return maxCount;
        }

        function updateHeaderDiagonalLine() {
            const container = document.getElementById('header-date-content-area');
            if (!container) return;
            const existingSVG = container.querySelector('.diagonal-line-svg');
            if (existingSVG) existingSVG.remove();

            const svg = createSVGElement('svg');
            svg.setAttribute('class', 'diagonal-line-svg');
            svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
            const line = createSVGElement('line');
            line.setAttribute('x1', '0%'); line.setAttribute('y1', '0%');
            line.setAttribute('x2', '100%'); line.setAttribute('y2', '100%');
            line.setAttribute('stroke', '#a0a0a0'); line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
            container.insertBefore(svg, container.firstChild);
        }

        function updateStickyHeaderContent() {
            const axis = document.getElementById('timeline-axis');
            const stickyContainer = document.getElementById('sticky-time-header');
            const stickyContent = document.getElementById('sticky-timeline-content');
            if (!axis || !stickyContainer || !stickyContent) return;

            stickyContent.innerHTML = axis.innerHTML;
            stickyContent.style.width = axis.style.width;
            updateStickyHeaderPosition();
        }

        function updateStickyHeaderPosition() {
            const stickyContainer = document.getElementById('sticky-time-header');
            const stickyContent = document.getElementById('sticky-timeline-content');
            const originalContainer = document.getElementById('header-timeline-container');
            if (!stickyContainer || !originalContainer) return;

            const rect = originalContainer.getBoundingClientRect();

            if (rect.bottom < 0) {
                stickyContainer.classList.add('visible');
            } else {
                stickyContainer.classList.remove('visible');
            }

            stickyContainer.style.left = rect.left + 'px';
            stickyContainer.style.width = rect.width + 'px';

            const scrollLeft = originalContainer.scrollLeft;
            if (stickyContent) {
                stickyContent.style.marginLeft = (-scrollLeft) + 'px';
            }
        }

        function renderApp() {
            const timelineContainer = document.getElementById('shift-rows-container');
            const headerAxis = document.getElementById('timeline-axis');
            const tableFrame = document.getElementById('table-frame');

            const currentMode = MODES[state.mode];
            const frameWidth = tableFrame.clientWidth;

            const hourWidth = getHourWidth(frameWidth, currentMode);
            const totalHoursForCalc = currentMode.hours + 4;

            const newColWidth = Math.floor(hourWidth * 2);
            const timelineW = Math.floor(hourWidth * currentMode.hours);

            document.documentElement.style.setProperty('--date-col-width', `${newColWidth}px`);
            document.documentElement.style.setProperty('--timeline-width', `${timelineW}px`);

            let bracketWidthPx = Math.min(8, hourWidth / 4);
            document.documentElement.style.setProperty('--bracket-width', `${bracketWidthPx}px`);

            renderTimelineAxis(headerAxis, hourWidth, currentMode);
            timelineContainer.innerHTML = '';

            const scrollElements = [document.getElementById('header-timeline-container')];
            shiftData.dayOrder.forEach((day, idx) => {
                const row = renderDayRow(day, idx, hourWidth, currentMode, false);
                timelineContainer.appendChild(row);
                scrollElements.push(row.querySelector('.timeline-body-wrapper'));
            });

            let isSyncing = false;
            scrollElements.forEach(el => {
                el.onscroll = (e) => {
                    if (isSyncing) return;
                    isSyncing = true;
                    const left = e.target.scrollLeft;
                    scrollElements.forEach(target => { if (target !== e.target) target.scrollLeft = left; });
                    isSyncing = false;
                    updateStickyHeaderPosition();
                };
            });
            const initialScroll = currentMode.start * hourWidth;
            scrollElements.forEach(el => el.scrollLeft = initialScroll);
            updateHighlights();
            updateHeaderDiagonalLine();
            updateStickyHeaderContent();
        }

        function renderDayRow(day, idx, hourWidth, mode, isPrint) {
            const date = new Date(CONSTANTS.DATE_START); date.setDate(date.getDate() + idx);
            const isWk = (day === 'Sun' || day === 'Sat');
            const rowHeight = CONSTANTS.LANES * CONSTANTS.LANE_HEIGHT;

            const container = document.createElement('div'); container.className = 'container-row';
            const dateCol = document.createElement('div'); dateCol.className = `col-date ${day}`; dateCol.style.height = rowHeight + 'px';
            const dateCellContent = document.createElement('div'); dateCellContent.className = `date-cell ${day} ${isWk ? 'weekend' : ''}`; dateCellContent.style.height = '100%';

            const m = date.getMonth() + 1;
            const d = date.getDate();
            const dateHtml = `<div class="date-text"><span class="d-num">${m}</span><span class="d-sep">/</span><span class="d-num">${d}</span></div><div class="day-text">(${getDayJa(day)})</div>`;

            dateCellContent.innerHTML = `<div class="date-content-area">${dateHtml}</div>`;
            const spacer = document.createElement('div'); spacer.className = 'date-spacer-area';

            if (APP_DATA.dailyMemos && APP_DATA.dailyMemos[day]) {
                spacer.textContent = APP_DATA.dailyMemos[day];
                spacer.title = APP_DATA.dailyMemos[day];
            }

            dateCellContent.appendChild(spacer);
            dateCol.appendChild(dateCellContent); container.appendChild(dateCol);

            const tlCol = document.createElement('div'); tlCol.className = 'col-timeline timeline-body-wrapper';
            const tlBody = document.createElement('div'); tlBody.className = 'timeline-body'; tlBody.style.height = rowHeight + 'px';
            tlBody.dataset.day = day;

            const totalWidth = (CONSTANTS.HOUR_END - CONSTANTS.HOUR_START) * hourWidth;
            tlBody.style.width = totalWidth + 'px';

            for (let h = CONSTANTS.HOUR_START + 1; h < CONSTANTS.HOUR_END; h++) {
                if (h >= mode.start && h <= mode.end) {
                    if (h === mode.start) continue;
                    const v = document.createElement('div'); v.className = 'grid-v'; v.style.left = (h * hourWidth) + 'px'; tlBody.appendChild(v);
                }
            }
            for (let l = 1; l < CONSTANTS.LANES; l++) {
                const hLine = document.createElement('div'); hLine.className = 'grid-h'; hLine.style.top = (l * CONSTANTS.LANE_HEIGHT) + 'px'; tlBody.appendChild(hLine);
            }
            drawSpecialLine(tlBody, 7, 'line-double', hourWidth, mode);
            drawSpecialLine(tlBody, 31, 'line-double', hourWidth, mode);
            if (state.redLine) {
                drawSpecialLine(tlBody, 24, 'line-red', hourWidth, mode);
            }

            let shifts = processShiftsForDay(day, mode);
            shifts.sort((a, b) => {
                if (Math.abs(a.start - b.start) > 0.01) return a.start - b.start;
                return (b.end - b.start) - (a.end - a.start);
            });
            const peakStaff = calculatePeakStaff(day, mode.start, mode.end);
            const slotSize = (peakStaff <= 3) ? 2 : 1;
            renderShiftBars(tlBody, shifts, hourWidth, mode, slotSize, isPrint);

            tlCol.appendChild(tlBody); container.appendChild(tlCol);

            const sumCol = document.createElement('div'); sumCol.className = 'col-summary summary-cell'; sumCol.style.height = rowHeight + 'px';
            const staffList = generateStaffList(shifts, day);
            staffList.forEach(staff => {
                const row = document.createElement('div'); row.className = 'work-time-row';
                row.dataset.staffId = staff.id;
                row.innerHTML = `<span class="wt-name" title="${staff.name}">${staff.name}</span><span class="wt-time">${formatHours(state.staffHours[staff.name]?.[day] || 0)}</span>`;
                sumCol.appendChild(row);
            });
            container.appendChild(sumCol);
            return container;
        }

        function generateStaffList(shifts, day) {
            const uniqueStaffMap = new Map();
            shifts.filter(s => !s.isGhost).forEach(s => {
                uniqueStaffMap.set(s.id, s.name);
            });
            const staffList = Array.from(uniqueStaffMap.entries()).map(([id, name]) => ({ id, name }));

            staffList.sort((a, b) => {
                const ha = state.staffHours[a.name]?.[day] || 0;
                const hb = state.staffHours[b.name]?.[day] || 0;
                return hb - ha;
            });
            return staffList;
        }

        function renderShiftBars(container, shifts, hourWidth, mode, slot, isPrint) {
            let lanes = new Array(CONSTANTS.LANES).fill(0);

            shifts.forEach(s => {
                if (s.end <= mode.start || s.start >= mode.end) return;

                if (!state.showNextDay && s.isForwardGhost) return;
                if (!state.showPrevDay && s.isBackwardGhost) return;

                let laneIdx = -1;
                for (let i = 0; i <= CONSTANTS.LANES - slot; i++) {
                    if (lanes[i] <= s.start + 0.01) {
                        let ok = true;
                        for (let j = 1; j < slot; j++) if (lanes[i + j] > s.start + 0.01) ok = false;
                        if (ok) { laneIdx = i; break; }
                    }
                }
                if (laneIdx === -1) laneIdx = 0;
                for (let j = 0; j < slot; j++) if (laneIdx + j < CONSTANTS.LANES) lanes[laneIdx + j] = s.end;

                const left = s.start * hourWidth; const width = (s.end - s.start) * hourWidth;
                let displayWidth = width;
                if (isPrint && s.end > mode.end) {
                    const visibleDuration = mode.end - s.start;
                    displayWidth = visibleDuration * hourWidth;
                }

                const bar = document.createElement('div'); bar.className = 'shift-bar';
                bar.style.left = left + 'px'; bar.style.width = displayWidth + 'px';
                bar.style.top = (laneIdx * CONSTANTS.LANE_HEIGHT) + 'px'; bar.style.height = (slot * CONSTANTS.LANE_HEIGHT) + 'px';
                bar.dataset.rawStart = s.rawStart; bar.dataset.rawEnd = s.rawEnd;
                bar.dataset.staffId = s.id; bar.dataset.day = s.day; bar.dataset.groupId = s.groupId;
                bar.title = `${s.name} (${state.fullShifts[`${s.day}_${s.id}`]})`;

                if (s.id === '000') {
                    bar.classList.add('missing-shift');
                    const waveDeco = document.createElement('div');
                    waveDeco.className = 'wave-line-deco';
                    bar.appendChild(waveDeco);
                }

                if (s.id === state.highlightId) bar.classList.add('highlighted');

                const hideEndByMode = (s.end > mode.end); const hideStartByMode = (s.start < mode.start);
                const hideStartBy24h = s.hideStartBracket; const hideEndBy24h = s.hideEndBracket;
                const endClass = (hideEndByMode && !s.isForwardGhost) || hideEndBy24h ? 'bracket-hidden' : '';
                let realHideStart = hideStartByMode;
                if (s.start === 0 && !s.isBackwardGhost && hideStartByMode) realHideStart = false;
                if (s.isBackwardGhost && s.start === 0 && mode.start > 0) realHideStart = true;
                const startClass = (realHideStart || hideStartBy24h) ? 'bracket-hidden' : '';

                let shiftTextContent = s.showName === false ? '' : s.name;
                let textStyle = '';
                if (s.start < mode.start) { const offset = (mode.start - s.start) * hourWidth; textStyle = `padding-left: ${offset}px;`; }

                const spanText = document.createElement('span'); spanText.className = 'shift-text';
                if (textStyle) spanText.style.cssText = textStyle;
                spanText.innerHTML = `<span class="name-area">${shiftTextContent}</span>`;

                const totalDuration = s.rawEnd - s.rawStart;
                const breakTime = calcBreakTime(totalDuration);

                const infoGroup = document.createElement('div');
                infoGroup.className = 'shift-info-group';

                if (s.showName && s.subText) {
                    const subEl = document.createElement('span');
                    subEl.className = 'sub-text';
                    subEl.textContent = s.subText;
                    infoGroup.appendChild(subEl);
                }

                if (breakTime > 0 && s.showName) {
                    const breakSpan = document.createElement('span');
                    breakSpan.className = 'break-mark';
                    breakSpan.textContent = `(${breakTime})`;
                    infoGroup.appendChild(breakSpan);
                }
                if (infoGroup.hasChildNodes()) {
                    spanText.appendChild(infoGroup);
                }

                const durationSpan = document.createElement('div');
                durationSpan.className = 'shift-duration';
                const durationValue = totalDuration % 1 === 0
                    ? Math.floor(totalDuration)
                    : totalDuration.toFixed(1);
                durationSpan.innerHTML = `${durationValue}<span class="time-unit">時間</span>`;

                const startB = document.createElement('div'); startB.className = `shift-bracket ${startClass}`;

                startB.addEventListener('mousedown', (e) => handleDragStart(e, 'resize', startB, 'start'));
                startB.addEventListener('touchstart', (e) => handleDragStart(e, 'resize', startB, 'start'), { passive: false });

                if (!startClass) {
                    startB.appendChild(createBracketSVG('start'));
                }

                const endB = document.createElement('div'); endB.className = `shift-bracket ${endClass}`;

                endB.addEventListener('mousedown', (e) => handleDragStart(e, 'resize', endB, 'end'));
                endB.addEventListener('touchstart', (e) => handleDragStart(e, 'resize', endB, 'end'), { passive: false });

                if (!endClass) {
                    endB.appendChild(createBracketSVG('end'));
                }

                bar.appendChild(startB); bar.appendChild(spanText); bar.appendChild(durationSpan); bar.appendChild(endB);

                bar.addEventListener('mousedown', (e) => {
                    if (!e.target.closest('.shift-bracket')) handleDragStart(e, 'move', bar);
                });
                bar.addEventListener('touchstart', (e) => {
                    if (!e.target.closest('.shift-bracket')) handleDragStart(e, 'move', bar);
                }, { passive: false });

                bar.onmouseenter = () => highlightGroup(s.groupId, true); bar.onmouseleave = () => highlightGroup(s.groupId, false);
                container.appendChild(bar);
            });
        }

        function highlightGroup(gid, active) {
            document.querySelectorAll(`.shift-bar[data-group-id="${gid}"]`).forEach(b => {
                if (active) b.classList.add('hover-linked'); else b.classList.remove('hover-linked');
            });
        }

        function updateHighlights() {
            document.querySelectorAll('.shift-bar').forEach(b => b.classList.remove('highlighted'));
            document.querySelectorAll('.work-time-row').forEach(r => r.classList.remove('highlighted'));
            if (state.highlightId) {
                document.querySelectorAll(`.shift-bar[data-staff-id="${state.highlightId}"]`).forEach(b => b.classList.add('highlighted'));
                document.querySelectorAll(`.work-time-row[data-staff-id="${state.highlightId}"]`).forEach(r => r.classList.add('highlighted'));
            }
        }

        function renderTimelineAxis(container, hourWidth, mode) {
            container.innerHTML = ''; container.style.width = ((CONSTANTS.HOUR_END - CONSTANTS.HOUR_START) * hourWidth) + 'px';
            for (let h = CONSTANTS.HOUR_START; h <= CONSTANTS.HOUR_END; h++) {
                if (h < mode.start || h > mode.end) continue;
                const div = document.createElement('div'); div.className = 'time-label'; div.style.left = (h * hourWidth) + 'px';
                let text = `${h % 24}`; let isLarge = true;
                if (state.mode === 'original') { if (h === 5 || h === 6 || h === 32 || h === 33) { text = `${h % 24}:00`; isLarge = false; } if (h === 24) text = '0'; }
                else { if (h === 0 || h === 24) text = '0'; }
                if (h === 34) continue;
                div.textContent = text; if (isLarge) div.classList.add('large');

                if (h === mode.start) div.classList.add('start-label');
                else if (h === mode.end) div.classList.add('end-label');

                container.appendChild(div);
            }
        }

        function drawSpecialLine(container, hour, cls, hw, mode) {
            if (hour >= mode.start && hour <= mode.end) {
                const d = document.createElement('div'); d.className = `grid-v ${cls}`; d.style.left = (hour * hw) + 'px'; container.appendChild(d);
            }
        }

        function processShiftsForDay(day, mode) {
            const raw = shiftData[day] || {}; let result = []; const dayIdx = shiftData.dayOrder.indexOf(day);
            const processedKeys = new Set();
            const addToResult = (item) => {
                const key = `${item.id}-${item.start}-${item.end}`;
                if (!processedKeys.has(key)) { processedKeys.add(key); result.push(item); }
            };

            Object.keys(raw).forEach(id => {
                const times = raw[id];
                for (let i = 0; i < times.length; i += 2) {
                    const s = times[i]; const e = times[i + 1]; const gid = `${day}_${id}_${i}`;
                    const subKey = `${day}_${id}_${s}_${e}`;
                    const subText = APP_DATA.subTexts ? APP_DATA.subTexts[subKey] : null;

                    const commonProps = { id, name: staffData[id], day, groupId: gid, rawStart: s, rawEnd: e, subText: subText };
                    if (e > 24) {
                        addToResult({ ...commonProps, start: s, end: e, isGhost: false, showName: true });
                    } else {
                        addToResult({ ...commonProps, start: s, end: e, isGhost: false, showName: true });
                    }
                }
            });

            if (dayIdx > 0) {
                const prevDay = shiftData.dayOrder[dayIdx - 1]; const prevShifts = shiftData[prevDay] || {};
                Object.keys(prevShifts).forEach(id => {
                    const times = prevShifts[id];
                    for (let i = 0; i < times.length; i += 2) {
                        const s = times[i]; const e = times[i + 1];
                        if (e > 24) {
                            const gid = `${prevDay}_${id}_${i}`; const durationOnCurrentDay = e - 24;
                            const isDuplicate = result.some(r => r.id === id && r.start <= 0 && r.end >= durationOnCurrentDay);
                            if (!isDuplicate) {
                                addToResult({ id, name: staffData[id], start: 0, end: durationOnCurrentDay, day: prevDay, groupId: gid, isGhost: true, isBackwardGhost: true, hideStartBracket: true, showName: true, rawStart: s, rawEnd: e });
                            }
                        }
                    }
                });
            }

            if (mode.end > 24 && dayIdx < shiftData.dayOrder.length - 1) {
                const nextDay = shiftData.dayOrder[dayIdx + 1]; const nextShifts = shiftData[nextDay] || {};
                Object.keys(nextShifts).forEach(id => {
                    const times = nextShifts[id];
                    for (let i = 0; i < times.length; i += 2) {
                        const s = times[i]; const e = times[i + 1];
                        if (s < 9.0) {
                            const gid = `${nextDay}_${id}_${i}`;
                            const isDuplicate = result.some(r => r.id === id && Math.abs(r.start - (s + 24)) < 0.1);
                            if (!isDuplicate) {
                                let hideEnd = false; if ((e + 24) > mode.end) { hideEnd = true; }
                                addToResult({ id, name: staffData[id], start: s + 24, end: e + 24, day: nextDay, groupId: gid, isGhost: true, isForwardGhost: true, showName: true, hideEndBracket: hideEnd, rawStart: s, rawEnd: e });
                            }
                        }
                    }
                });
            }
            return result;
        }

        function handlePreview() {
            document.getElementById('modal-overlay').style.display = 'block';
            document.getElementById('preview-modal').style.display = 'flex';

            const stage = document.createElement('div');
            stage.id = 'print-staging-area';
            stage.className = 'print-mode';
            stage.style.width = '1122px';
            stage.style.backgroundColor = '#fff';
            stage.style.padding = '30px';
            document.body.appendChild(stage);

            setupPrintStage(stage).then(() => {
                const w = 1122;
                const h = stage.scrollHeight;
                html2canvas(stage, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    width: w,
                    height: h,
                    windowWidth: w,
                    windowHeight: h
                }).then(canvas => {
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL();
                    const container = document.getElementById('preview-image-container');
                    container.innerHTML = '';
                    container.appendChild(img);
                    document.body.removeChild(stage);

                    setTimeout(() => {
                        positionModalSideButtons('preview-modal', 'preview-modal-side-buttons');
                    }, 100);
                });
            });
        }

        async function setupPrintStage(stage) {
            const mode = MODES[state.mode];
            const a4Width = 1122;
            const marginAdjustment = 60;
            const effectiveWidth = a4Width - marginAdjustment;

            const totalHoursForCalc = mode.hours + 4;
            let printHourWidth = effectiveWidth / totalHoursForCalc;

            const newColWidth = Math.floor(printHourWidth * 2);
            stage.style.setProperty('--date-col-width', `${newColWidth}px`);
            const timelineW = Math.floor(printHourWidth * mode.hours);
            stage.style.setProperty('--timeline-width', `${timelineW}px`);

            const titleClone = document.getElementById('title-field').cloneNode(true);
            titleClone.classList.add('print-mode');
            stage.appendChild(titleClone);

            const frame = document.createElement('div');
            frame.id = 'table-frame';
            frame.classList.add('print-mode');

            const mainFrame = document.getElementById('table-frame');
            if (mainFrame && mainFrame.classList.contains('hide-duration')) {
                frame.classList.add('hide-duration');
            }

            frame.style.border = '1px solid #000';
            frame.style.overflow = 'visible';
            stage.appendChild(frame);

            const headerClone = document.querySelector('.sticky-header').cloneNode(true);
            const axisContainer = headerClone.querySelector('#timeline-axis');
            renderTimelineAxis(axisContainer, printHourWidth, mode);

            const offsetPx = mode.start * printHourWidth;
            const tlHeaderContainer = headerClone.querySelector('.col-timeline');
            const tlHeader = tlHeaderContainer.querySelector('.timeline-header');
            tlHeader.style.marginLeft = `-${offsetPx}px`;
            tlHeader.style.width = ((CONSTANTS.HOUR_END - CONSTANTS.HOUR_START) * printHourWidth) + 'px';

            const headerDateContent = headerClone.querySelector('#header-date-content-area');
            if (headerDateContent) {
                const oldSvg = headerDateContent.querySelector('svg');
                if (oldSvg) oldSvg.remove();

                const svg = createSVGElement('svg');
                svg.setAttribute('class', 'diagonal-line-svg');
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                const line = createSVGElement('line');
                line.setAttribute('x1', '0%'); line.setAttribute('y1', '0%');
                line.setAttribute('x2', '100%'); line.setAttribute('y2', '100%');
                line.setAttribute('stroke', '#a0a0a0');
                line.setAttribute('stroke-width', '1');
                svg.appendChild(line);
                headerDateContent.insertBefore(svg, headerDateContent.firstChild);
            }

            const clonedDateCol = headerClone.querySelector('.col-date');
            if (clonedDateCol) {
                clonedDateCol.style.borderRight = "1px solid #aaa";
            }
            const clonedDateContent = headerClone.querySelector('.date-content-area');
            if (clonedDateContent) {
                clonedDateContent.style.borderRight = "none";
            }

            frame.appendChild(headerClone);

            shiftData.dayOrder.forEach((day, idx) => {
                const row = renderDayRow(day, idx, printHourWidth, mode, true);
                row.classList.add('print-mode');
                const body = row.querySelector('.timeline-body');
                body.style.marginLeft = `-${offsetPx}px`;
                body.style.width = ((CONSTANTS.HOUR_END - CONSTANTS.HOUR_START) * printHourWidth) + 'px';
                frame.appendChild(row);
            });

            if (state.highlightId) {
                frame.querySelectorAll(`.shift-bar[data-staff-id="${state.highlightId}"]`).forEach(b => b.classList.add('highlighted'));
                frame.querySelectorAll(`.work-time-row[data-staff-id="${state.highlightId}"]`).forEach(r => r.classList.add('highlighted'));
            }

            const footer = document.getElementById('shift-footer').cloneNode(true);
            stage.appendChild(footer);
        }

        async function handleDownload() {
            const stage = document.createElement('div');
            stage.id = 'print-staging-area';
            stage.className = 'print-mode';
            stage.style.position = 'absolute';
            stage.style.top = '-9999px';
            stage.style.left = '-9999px';
            stage.style.width = '1122px';
            stage.style.backgroundColor = '#fff';
            stage.style.padding = '30px';
            document.body.appendChild(stage);

            await setupPrintStage(stage);

            try {
                const w = 1122;
                const h = stage.scrollHeight;
                const canvas = await html2canvas(stage, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    width: w,
                    height: h,
                    windowWidth: w,
                    windowHeight: h
                });
                const link = document.createElement('a'); link.download = `shift_${state.mode}.png`; link.href = canvas.toDataURL(); link.click();
            } catch (e) { alert('シフト表の画像保存に失敗しました。'); console.error(e); } finally {
                document.body.removeChild(stage);
            }
        }

        function initDateChangeModal() {
            document.getElementById('btn-change-date').addEventListener('click', openDateChangeModal);
            document.getElementById('btn-date-change-close').addEventListener('click', closeDateChangeModal);

            document.getElementById('btn-change-store').addEventListener('click', openStoreChangeModal);
            document.getElementById('btn-store-change-close').addEventListener('click', closeStoreChangeModal);
        }

        let currentSelectedDate = '2026/01/26週';

        function openDateChangeModal() {
            const grid = document.getElementById('date-select-grid');
            grid.innerHTML = '';

            const today = new Date();

            const dates = [
                { id: 'date1', name: '2026/02/08週', startDate: new Date(2026, 1, 8) },
                { id: 'date2', name: '2026/02/01週', startDate: new Date(2026, 1, 1) },
                { id: 'date3', name: '2026/01/26週', startDate: new Date(2026, 0, 26) },
                { id: 'date4', name: '2026/01/19週', startDate: new Date(2026, 0, 19) },
                { id: 'date5', name: '2026/01/12週', startDate: new Date(2026, 0, 12) },
                { id: 'date6', name: '2026/01/05週', startDate: new Date(2026, 0, 5) }
            ];

            dates.forEach(date => {
                const btn = document.createElement('button');
                btn.className = 'toggle-btn';

                const weekEnd = new Date(date.startDate);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const isCurrentWeek = today >= date.startDate && today <= weekEnd;
                const displayName = isCurrentWeek ? `${date.name}（進行中）` : date.name;

                if (date.name === currentSelectedDate) {
                    btn.classList.add('selected');
                }

                const dateName = document.createTextNode(displayName);
                btn.appendChild(dateName);

                btn.onclick = () => {
                    currentSelectedDate = date.name;
                    document.getElementById('date-change-label').textContent = displayName;
                    closeDateChangeModal();
                };

                grid.appendChild(btn);
            });

            showModal('date-change-modal');
        }

        function closeDateChangeModal() {
            document.getElementById('date-change-modal').style.display = 'none';
            document.getElementById('modal-overlay').style.display = 'none';
            document.body.style.overflow = '';
        }

        let currentSelectedStore = '志免南里１丁目';

        function openStoreChangeModal() {
            const grid = document.getElementById('store-select-grid');
            grid.innerHTML = '';

            const stores = [
                { id: 'store1', name: '志免南里１丁目', location: '東京都渋谷区' },
                { id: 'store2', name: '志免向ヶ丘', location: '東京都新宿区' },
                { id: 'store3', name: '篠栗尾仲', location: '東京都豊島区' },
                { id: 'store4', name: '篠栗庄', location: '神奈川県横浜市' },
                { id: 'store5', name: 'ささぐりーん', location: '大阪府大阪市' },
                { id: 'store6', name: '中洲ロマン通り', location: '大阪府大阪市' }
            ];

            stores.forEach(store => {
                const btn = document.createElement('button');
                btn.className = 'toggle-btn';

                if (store.name === currentSelectedStore) {
                    btn.classList.add('selected');
                }

                const storeName = document.createTextNode(store.name);
                btn.appendChild(storeName);

                btn.onclick = () => {
                    currentSelectedStore = store.name;
                    document.getElementById('store-change-label').textContent = store.name;
                    closeStoreChangeModal();
                };

                grid.appendChild(btn);
            });

            showModal('store-change-modal');
        }

        function closeStoreChangeModal() {
            document.getElementById('store-change-modal').style.display = 'none';
            document.getElementById('modal-overlay').style.display = 'none';
            document.body.style.overflow = '';
        }

        function initStatusMenu() {
            const menuBtn = document.getElementById('status-menu-btn');
            const dropdown = document.getElementById('status-dropdown');
            const items = document.querySelectorAll('.status-menu-item');
            const statusLabel = document.getElementById('current-status');
            const statusBar = document.getElementById('status-bar-field');

            if (!menuBtn) return;

            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });

            document.addEventListener('click', () => {
                if (dropdown) dropdown.style.display = 'none';
            });

            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    const status = e.target.getAttribute('data-status');

                    let displayText = status;
                    if (status === '未確定') {
                        displayText = '未確定のシフト：要件を達成しているかを確認し修正が必要な場合は修正してください';
                    } else if (status === '確定') {
                        displayText = '進行中のシフト：変更する場合は変更後のシフトをスタッフに共有してください';
                    } else if (status === '最終') {
                        displayText = '最終';
                    }
                    statusLabel.textContent = displayText;

                    statusBar.classList.remove('status-pending', 'status-confirmed', 'status-final');
                    const appWrapper = document.getElementById('app-wrapper');
                    if (appWrapper) appWrapper.classList.remove('border-pending', 'border-confirmed', 'border-final');

                    if (status === '未確定') {
                        statusBar.classList.add('status-pending');
                        if (appWrapper) appWrapper.classList.add('border-pending');
                    }
                    if (status === '確定') {
                        statusBar.classList.add('status-confirmed');
                        if (appWrapper) appWrapper.classList.add('border-confirmed');
                    }
                    if (status === '最終') {
                        statusBar.classList.add('status-final');
                        if (appWrapper) appWrapper.classList.add('border-final');
                    }
                });
            });
        }

        function initHighlightModal() {
            document.getElementById('btn-highlight-close').addEventListener('click', () => {
                document.getElementById('highlight-modal').style.display = 'none';
                document.getElementById('modal-overlay').style.display = 'none';
                document.body.style.overflow = '';
            });
            document.getElementById('btn-highlight-clear').addEventListener('click', () => {
                state.highlightId = null;
                updateHighlights();
                updateHighlightLabel();
                closeHighlightModal();
            });
        }

        function openHighlightModal() {
            const grid = document.getElementById('staff-select-grid');
            grid.innerHTML = '';

            const activeStaffIds = new Set();
            if (APP_DATA.shifts) {
                shiftData.dayOrder.forEach(day => {
                    const dayShifts = APP_DATA.shifts[day] || {};
                    Object.keys(dayShifts).forEach(id => activeStaffIds.add(id));
                });
            }

            Object.keys(staffData)
                .filter(id => activeStaffIds.has(id))
                .sort()
                .forEach(id => {
                    const btn = document.createElement('button');
                    btn.className = 'toggle-btn';
                    if (state.highlightId === id) {
                        btn.classList.add('selected');
                    }

                    const text = document.createTextNode(staffData[id]);
                    btn.appendChild(text);

                    btn.onclick = () => {
                        state.highlightId = id;
                        updateHighlights();
                        updateHighlightLabel();
                        closeHighlightModal();
                    };
                    grid.appendChild(btn);
                });

            showModal('highlight-modal');
        }

        function closeHighlightModal() {
            document.getElementById('highlight-modal').style.display = 'none';
            document.getElementById('modal-overlay').style.display = 'none';
            document.body.style.overflow = '';
        }

        function updateHighlightLabel() {
            const label = document.getElementById('highlight-label');
            if (state.highlightId && staffData[state.highlightId]) {
                label.textContent = staffData[state.highlightId];
            } else {
                label.textContent = 'なし';
            }
        }

        let selectorState = { selectedStore: null };

        function initStaffSelectorModal() {
            document.getElementById('btn-staff-selector-close').addEventListener('click', () => {
                document.getElementById('staff-selector-modal').style.display = 'none';
            });
        }

        function openStaffSelectorModal() {
            document.getElementById('staff-selector-modal').style.display = 'block';
            selectorState.selectedStore = null;
            renderSelectorStoreList();

            if (APP_DATA.store && APP_DATA.store.id) {
                const container = document.getElementById('selector-store-list');
                const storeDivs = container.children;
                for (let div of storeDivs) {
                    if (div.dataset.storeNumber === APP_DATA.store.id) {
                        div.click();
                        break;
                    }
                }
            } else {
                renderSelectorStaffList(null);
            }
        }

        function renderSelectorStoreList() {
            const container = document.getElementById('selector-store-list');
            container.innerHTML = '';

            const stores = RAW_STAFF_MASTER.byStore || [];

            stores.forEach(s => {
                const div = document.createElement('div');
                div.textContent = s.name || `${s.number}店`;
                div.dataset.storeNumber = s.number;
                div.style.padding = '16px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #eee';
                div.style.fontSize = '14px';
                div.style.fontWeight = '500';

                div.onclick = () => {
                    Array.from(container.children).forEach(c => c.style.background = '');
                    div.style.background = '#e5e7eb';
                    renderSelectorStaffList(s);
                };
                container.appendChild(div);
            });
        }

        function renderSelectorStaffList(store) {
            const container = document.getElementById('selector-staff-list');
            container.innerHTML = '';

            if (!store) {
                container.innerHTML = '<div style="color:#888; padding:10px;">左側から店舗を選択してください</div>';
                return;
            }

            const staffs = store.staff || [];
            if (staffs.length === 0) {
                container.innerHTML = '<div style="color:#888; padding:10px;">スタッフがいません</div>';
                return;
            }

            staffs.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'toggle-btn';
                btn.style.width = '100%';
                btn.style.textAlign = 'left';
                btn.style.justifyContent = 'flex-start';

                const text = document.createTextNode(s.name);
                btn.appendChild(text);

                btn.onclick = () => {
                    selectStaff(store.number, store.name, s.id, s.name, s.display);
                };
                container.appendChild(btn);
            });
        }

        function selectStaff(storeNum, storeName, shortId, fullName, displayName) {
            const combinedId = storeNum + shortId;

            const nameToDisplay = displayName || fullName;
            staffData[combinedId] = nameToDisplay;

            document.getElementById('modal-staff-id').value = combinedId;
            document.getElementById('modal-staff-name').value = nameToDisplay;

            const currentStoreId = APP_DATA.store ? APP_DATA.store.id : "01234";
            const subTextField = document.getElementById('modal-sub-text');
            if (storeNum !== currentStoreId) {
                const note = `<${storeName || '他店'}>`;
                if (!subTextField.value.includes(note)) {
                    subTextField.value = subTextField.value ? `${subTextField.value} ${note}` : note;
                }
            }

            document.getElementById('staff-selector-modal').style.display = 'none';
        }

        function setTimeValue(prefix, h, m) {
            document.getElementById(`${prefix}-h`).value = h;
            const mOpts = [0, 0.25, 0.5, 0.75];
            const closest = mOpts.reduce((prev, curr) => Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev);
            document.getElementById(`${prefix}-m`).value = closest;
        }
        function getTimeValue(prefix) {
            const h = parseInt(document.getElementById(`${prefix}-h`).value);
            const m = parseFloat(document.getElementById(`${prefix}-m`).value);
            return h + m;
        }

        function initHeaderMenu() {
            const btn = document.getElementById('header-menu-btn');
            const drawer = document.getElementById('side-menu-drawer');
            const overlay = document.getElementById('side-menu-overlay');
            const closeBtn = document.getElementById('drawer-close-btn');

            if (!btn || !drawer || !overlay) return;

            function openDrawer() {
                overlay.style.display = 'block';
                setTimeout(() => drawer.classList.add('open'), 10);
            }
            function closeDrawer() {
                drawer.classList.remove('open');
                setTimeout(() => overlay.style.display = 'none', 300);
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDrawer();
            });
            overlay.addEventListener('click', closeDrawer);
            if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

            const menuStore = document.getElementById('drawer-store');
            if (menuStore) menuStore.addEventListener('click', () => {
                closeDrawer();
                if (typeof showModal === 'function') {
                    showModal('store-change-modal');
                } else {
                    const m = document.getElementById('store-change-modal');
                    if (m) {
                        m.style.display = 'flex';
                        const overlay = document.getElementById('modal-overlay');
                        if (overlay) overlay.style.display = 'block';
                    }
                }
            });

            const menuJson = document.getElementById('drawer-json');
            if (menuJson) menuJson.addEventListener('click', () => {
                closeDrawer();
                const btn = document.getElementById('btn-edit-json');
                if (btn) btn.click();
            });

            const menuReset = document.getElementById('drawer-reset');
            if (menuReset) menuReset.addEventListener('click', () => {
                closeDrawer();
                const btn = document.getElementById('btn-reset');
                if (btn) btn.click();
            });
        }
        function normalizeTime(day, start, end) {
            if (start >= 24) {
                const idx = shiftData.dayOrder.indexOf(day);
                if (idx !== -1 && idx < shiftData.dayOrder.length - 1) {
                    return { day: shiftData.dayOrder[idx + 1], start: start - 24, end: end - 24, changed: true };
                }
            }
            return { day, start, end, changed: false };
        }
        function formatTime(val) { const h = Math.floor(val); const m = Math.round((val - h) * 60); const displayH = h % 24; return `${displayH}:${m < 10 ? '0' + m : m}`; }
        function formatTimeShort(val) { const h = Math.floor(val) % 24; const m = Math.round((val - Math.floor(val)) * 60); return `${h}:${m < 10 ? '0' + m : m}`; }
        function formatHours(val) { const total = Math.round(val * 60); const h = Math.floor(total / 60); const m = total % 60; return `${h}:${m < 10 ? '0' + m : m}`; }
        function getDayJa(en) { return { Sun: '日', Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土' }[en]; }

        initHeaderMenu();
        initDarkMode();

        function initDarkMode() {
            const btn = document.getElementById('drawer-dark-mode');
            if (!btn) return;

            const isDark = localStorage.getItem('shift_app_dark_mode') === 'true';
            if (isDark) {
                document.body.classList.add('dark-mode');
            }

            btn.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const currentMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('shift_app_dark_mode', currentMode);

                const drawer = document.getElementById('side-menu-drawer');
                const overlay = document.getElementById('side-menu-overlay');
                if (drawer) drawer.classList.remove('open');
                if (overlay) setTimeout(() => overlay.style.display = 'none', 300);
            });
        }
