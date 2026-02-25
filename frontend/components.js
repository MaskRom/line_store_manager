const Components = {
    /**
     * Renders the common header inside the specified container.
     * @param {string} containerId The ID of the container element.
     * @param {Object} options Configuration options.
     * @param {string} options.title The main title of the page (e.g. '店舗管理').
     * @param {string} options.userName The name of the logged-in user.
     * @param {string} options.userRole The role of the user (e.g. '管理者', 'スタッフ').
     */
    renderHeader: function (containerId, options) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const title = options.title || 'シフト管理Bot';
        const userName = options.userName || 'ユーザー';
        const userRole = options.userRole || '未設定';

        // Choose a badge color based on role
        let roleBadgeClass = 'role-badge-default';
        if (userRole.includes('管理')) {
            roleBadgeClass = 'role-badge-admin';
        } else if (userRole.includes('スタッフ')) {
            roleBadgeClass = 'role-badge-staff';
        }

        const headerHtml = `
            <div class="common-header">
                <div class="common-header-inner">
                    <div class="header-left">
                        <h1 class="header-title">${title}</h1>
                    </div>
                    <div class="header-right">
                        <div class="user-info">
                            <span class="user-name">${userName}</span>
                            <span class="role-badge ${roleBadgeClass}">${userRole}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = headerHtml;
    },

    /**
     * Renders the common footer inside the specified container.
     * @param {string} containerId The ID of the container element.
     */
    renderFooter: function (containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const footerHtml = `
            <div class="common-footer">
                <div class="common-footer-inner">
                    <p>&copy; ${new Date().getFullYear()} Shift Management System. All rights reserved.</p>
                </div>
            </div>
        `;
        container.innerHTML = footerHtml;
    }
};
