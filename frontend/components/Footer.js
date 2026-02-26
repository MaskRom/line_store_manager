class CommonFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="common-footer">
                <div class="common-footer-inner">
                    <p>&copy; 2026 Shift Management System. All rights reserved.</p>
                </div>
            </div>
        `;
    }
}

// カスタム要素として登録
customElements.define('common-footer', CommonFooter);
