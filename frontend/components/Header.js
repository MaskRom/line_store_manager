class CommonHeader extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const title = this.getAttribute('title') || 'ページ';
        const backUrl = this.getAttribute('back-url');
        const showBack = this.getAttribute('show-back') !== 'false' && backUrl;

        let backButtonHtml = '';
        if (showBack) {
            backButtonHtml = `<a href="${backUrl}" class="header-back-btn"><i class="fas fa-chevron-left"></i></a>`;
        }

        this.innerHTML = `
            <div class="common-header">
                <div class="common-header-inner">
                    <div class="header-left">
                        ${backButtonHtml}
                        <h1 class="header-title" id="pageTitle">${title}</h1>
                    </div>
                    <div class="header-right">
                        <div class="user-info">
                            <span class="user-name" id="userName">読込中...</span>
                            <span class="role-badge role-badge-gray" id="userRole">確認中</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // グローバルなupdateHeader関数を置き換えるメソッド
    updateUserInfo(title, userName, roleNum, customRoleConfig = null) {
        const roleConfig = customRoleConfig || {
            0: { name: "権限なし", colorClass: "role-badge-gray" },
            1: { name: "仮登録", colorClass: "role-badge-gray" },
            2: { name: "スタッフ", colorClass: "role-badge-green" },
            3: { name: "責任者", colorClass: "role-badge-blue" },
            4: { name: "管理者", colorClass: "role-badge-red" },
            5: { name: "開発者", colorClass: "role-badge-black" }
        };

        const pageTitle = this.querySelector('#pageTitle');
        const userNameEl = this.querySelector('#userName');
        const userRoleEl = this.querySelector('#userRole');

        if (pageTitle && title) pageTitle.textContent = title;
        if (userNameEl && userName) userNameEl.textContent = userName;

        if (userRoleEl) {
            if (roleNum !== undefined && roleConfig[roleNum]) {
                userRoleEl.textContent = roleConfig[roleNum].name;
                userRoleEl.className = 'role-badge ' + roleConfig[roleNum].colorClass;
            } else {
                userRoleEl.textContent = '未設定';
                userRoleEl.className = 'role-badge role-badge-gray';
            }
        }
    }
}

// カスタム要素として登録
customElements.define('common-header', CommonHeader);

// 互換性のためへのグローバル関数 (移行期間用・既存コードの修正を最小限にするため)
window.updateHeader = function (title, userName, roleNum, roleConfig) {
    const headerEl = document.querySelector('common-header');
    if (headerEl && typeof headerEl.updateUserInfo === 'function') {
        headerEl.updateUserInfo(title, userName, roleNum, roleConfig);
    }
};
