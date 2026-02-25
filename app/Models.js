/**
 * Models.js
 * Django-like Model Structure
 */

// =================================================================
// Base Model
// =================================================================
class BaseModel {
    constructor(data = {}) {
        this.data = data;
    }

    static get sheetName() {
        throw new Error("sheetName must be defined");
    }

    static get columns() {
        throw new Error("columns must be defined");
    }

    static get design() {
        return {};
    }

    static get sheet() {
        const sheet = Settings.SS.getSheetByName(this.sheetName);
        if (!sheet) {
            Utils.log(`ERROR: ${this.sheetName} sheet not found.`);
            return null;
        }
        return sheet;
    }

    /**
     * Map row array to object based on columns definition.
     */
    static mapRow(row, rowIndex) {
        const obj = {};
        for (const [key, index] of Object.entries(this.columns)) {
            obj[key] = row[index];
        }
        obj._rowIndex = rowIndex + 1; // 1-based index
        return new this(obj);
    }

    /**
     * Get all records.
     */
    static get objects() {
        return {
            all: () => {
                const sheet = this.sheet;
                if (!sheet) return [];
                const data = sheet.getDataRange().getValues();
                const instances = [];
                // Skip header
                for (let i = 1; i < data.length; i++) {
                    instances.push(this.mapRow(data[i], i));
                }
                return instances;
            },

            filter: (predicate) => {
                const all = this.objects.all();
                return all.filter(predicate);
            },

            /**
             * Optimized single record retrieval using TextFinder.
             * @param {Object} query - Key-value pair for search (e.g., { lineId: "..." }). 
             *                         Currently matches the first key found in columns.
             */
            get: (query) => {
                const sheet = this.sheet;
                if (!sheet) return null;

                const cols = this.columns;
                const searchKey = Object.keys(query)[0]; // Use first key
                const searchValue = query[searchKey];

                if (!(searchKey in cols)) {
                    // Fallback to memory scan if key is not a column
                    const all = this.objects.all();
                    return all.find(item => item.data[searchKey] === searchValue) || null;
                }

                const colIndex = cols[searchKey];

                // TextFinder optimization
                const lastRow = sheet.getLastRow();
                if (lastRow < 2) return null; // データ行がない場合はnullを返す

                // Search in the specific column (1-based index)
                const range = sheet.getRange(2, colIndex + 1, lastRow - 1, 1);
                const textFinder = range.createTextFinder(searchValue).matchEntireCell(true);
                const validRow = textFinder.findNext();

                if (!validRow) return null;

                const rowIndex = validRow.getRow() - 1; // 0-based data index logic (though we use 1-based for getRange below)
                // Actually we need the whole row data.
                // validRow is a Range object of the found cell.
                // We need to fetch the entire row.

                const foundRowIndex = validRow.getRow(); // 1-based exact row number
                const lastCol = sheet.getLastColumn();
                const rowValues = sheet.getRange(foundRowIndex, 1, 1, lastCol).getValues()[0];

                // Map using 0-based data index (rowValues) and 0-based global index (foundRowIndex - 1)
                return this.mapRow(rowValues, foundRowIndex - 1);
            },

            create: (data) => {
                const sheet = this.sheet;
                if (!sheet) throw new Error(`${this.sheetName} sheet not found`);

                const row = [];
                const cols = this.columns;
                const strCols = this.stringColumns || [];
                // Determine max index to initialize array
                const maxIndex = Math.max(...Object.values(cols));
                for (let i = 0; i <= maxIndex; i++) row[i] = "";

                for (const [key, value] of Object.entries(data)) {
                    if (key in cols) {
                        row[cols[key]] = value;
                    }
                }

                sheet.appendRow(row);

                // 文字列型カラムを数値変換から保護（appendRow後に書式と値を上書き）
                if (strCols.length > 0) {
                    const newRowIndex = sheet.getLastRow();
                    for (const key of strCols) {
                        if (key in cols && key in data) {
                            const cell = sheet.getRange(newRowIndex, cols[key] + 1);
                            cell.setNumberFormat('@').setValue(String(data[key]));
                        }
                    }
                }

                return this.mapRow(row, sheet.getLastRow() - 1);
            }
        };
    }

    save() {
        const sheet = this.constructor.sheet;
        if (!sheet || !this.data._rowIndex) return;

        const cols = this.constructor.columns;
        const strCols = this.constructor.stringColumns || [];
        for (const [key, value] of Object.entries(this.data)) {
            if (key in cols && key !== '_rowIndex') {
                const cell = sheet.getRange(this.data._rowIndex, cols[key] + 1);
                if (strCols.includes(key)) {
                    // 文字列型カラムは数値変換を防ぐため書式を明示的に設定
                    cell.setNumberFormat('@').setValue(String(value));
                } else {
                    cell.setValue(value);
                }
            }
        }
    }

    deleteRow() {
        const sheet = this.constructor.sheet;
        if (!sheet || !this.data._rowIndex) return;
        sheet.deleteRow(this.data._rowIndex);
    }
}

// =================================================================
// User Model
// =================================================================
class UserData extends BaseModel {
    static get sheetName() { return "USER"; }

    static get columns() {
        return {
            "lineId": 0,
            "name": 1,
            "sst": 2,
            "role": 3
        };
    }

    static get headers() { return ["LINE ID", "本名", "SST", "権限"]; }

    static get design() {
        return {
            headerBgColor: "#4A86E8",
            headerTextColor: "#FFFFFF",
            headerBold: true,
            freezeRows: 1,
            columnWidths: [200, 150, 120, 100]
        };
    }

    // Custom Managers
    static find(lineId) {
        return this.objects.get({ lineId: lineId });
    }

    static create(lineId) {
        return this.objects.create({
            lineId: lineId,
            name: "",
            sst: "",
            role: Settings.AUTH.TEMP
        });
    }

    static updateProfile(lineId, name, sst) {
        const user = this.find(lineId);
        if (!user) throw new Error("User not found");
        user.data.name = name;
        user.data.sst = sst;
        user.save();
        Utils.log(`INFO: Updated profile for ${lineId}`);
    }

    static updateRole(lineId, role) {
        const user = this.find(lineId);
        if (!user) throw new Error("User not found");
        user.data.role = role;
        user.save();
        Utils.log(`INFO: Updated role for ${lineId} to ${role}`);

        // Rich Menu Assignment
        try {
            RichMenuManager.assignToUser(lineId, role);
        } catch (e) {
            Utils.log(`WARN: Failed to assign Rich Menu during role update - ${e}`);
        }
    }

    static linkStore(lineId, storeId, employeeId, password) {
        // Cross-model logic? Or keep specific logic here.
        // Moving to ByStore model might be cleaner, but User.linkStore is semantic.
        return ByStore.linkUser(lineId, storeId, employeeId, password);
    }
}

// =================================================================
// Store Model
// =================================================================
class Store extends BaseModel {
    static get sheetName() { return "店舗"; }
    static get columns() {
        return {
            "id": 0,
            "name": 1,
            "groupId": 2,
            "daysBefore": 3,
            "prompt": 4,
            "location": 5,
            "isActive": 6
        };
    }
    static get headers() { return ["店番", "店舗名", "グループID", "何日前シフト", "追加プロンプト", "場所", "有効"]; }
    static get design() {
        return {
            headerBgColor: "#E67C73",
            headerTextColor: "#FFFFFF",
            headerBold: true,
            freezeRows: 1,
            columnWidths: [80, 200, 100, 80, 250, 150, 80]
        };
    }
    static getActive() {
        // すべての店舗を返す（空行をフィルタリング）
        const allStores = this.objects.all()
            .filter(s => s.data.id && String(s.data.id).trim() !== "")
            .map(s => ({
                id: s.data.id,
                name: s.data.name
            }));
        Utils.log(`DEBUG: Returning ${allStores.length} stores (all stores, empty rows filtered).`);
        return allStores;
    }
}

// =================================================================
// ByStore Model (Employee-Store Link)
// =================================================================
class ByStore extends BaseModel {
    static get sheetName() { return "店舗別"; }
    static get columns() {
        return {
            "storeId": 0,
            "lineId": 1,
            "name": 2,
            "displayName": 3,
            "employeeId": 4,
            "password": 5,
            "shiftRequest": 6,
            "isManager": 7,
            "isActive": 8
        };
    }
    // 数値として解釈されると困るカラムを文字列として保存する
    static get stringColumns() { return ["employeeId", "password"]; }
    static get headers() { return ["店番", "LINE ID", "名前", "表示名", "従業員ID", "パスワード", "シフト希望", "店舗責任者", "有効"]; }
    static get design() {
        return {
            headerBgColor: "#57BB8A",
            headerTextColor: "#FFFFFF",
            headerBold: true,
            freezeRows: 1,
            columnWidths: [80, 200, 120, 120, 100, 100, 150, 120, 80]
        };
    }

    static findByLineId(lineId) {
        return this.objects.get({ lineId: lineId });
    }

    /**
     * 指定のlineIdに紐付く全店舗レコードを返す（複数店舗対応）
     */
    static filterByLineId(lineId) {
        return this.objects.filter(item => item.data.lineId === lineId);
    }

    static linkUser(lineId, storeId, employeeId, password) {
        const all = this.objects.all();
        // Manual search to mimic original logic (check pass, check duplication)
        let found = false;

        for (const record of all) {
            // Ensure string comparison
            const recStoreId = String(record.data.storeId);
            const empId = String(record.data.employeeId);
            const pass = String(record.data.password);

            if (recStoreId === String(storeId) && empId === String(employeeId) && pass === String(password)) {
                // Check if linked to another user
                if (record.data.lineId && record.data.lineId !== lineId) {
                    return { success: false, message: "この従業員IDは既に別のLINEアカウントと紐付けられています" };
                }

                record.data.lineId = lineId;
                record.save();
                found = true;
                Utils.log(`INFO: Linked ${lineId} to store row ${record.data._rowIndex}`);
            }
        }

        if (found) {
            return { success: true, message: `店舗紐付け完了` };
        } else {
            return { success: false, message: "店舗、従業員ID、またはパスワードが正しくありません" };
        }
    }
}


// =================================================================
// DayOff Model
// =================================================================
class DayOff extends BaseModel {
    static get sheetName() { return "休み希望"; }
    static get columns() {
        return {
            "storeId": 0,
            "employeeId": 1,
            "rawData": 2,
            "summary": 3,
            "isActive": 4
        };
    }
    static get headers() { return ["店番", "従業員ID", "元データ", "要約", "有効"]; }
    static get design() {
        return {
            headerBgColor: "#F6B26B",
            headerTextColor: "#FFFFFF",
            headerBold: true,
            freezeRows: 1,
            columnWidths: [100, 100, 300, 300, 80]
        };
    }

    /**
     * 店番+従業員IDで既存レコードを更新、なければ新規作成
     */
    static upsert(storeId, employeeId, rawData) {
        const existing = this.findByStoreAndEmployee(storeId, employeeId);
        if (existing) {
            existing.data.rawData = rawData;
            existing.data.isActive = true;
            existing.save();
            return existing;
        } else {
            return this.objects.create({
                storeId: storeId,
                employeeId: employeeId,
                rawData: rawData,
                summary: "",
                isActive: true
            });
        }
    }

    /**
     * 店番+従業員IDでレコードを検索
     */
    static findByStoreAndEmployee(storeId, employeeId) {
        const results = this.objects.filter(
            r => String(r.data.storeId) === String(storeId) &&
                String(r.data.employeeId) === String(employeeId)
        );
        return results[0] || null;
    }
}

// =================================================================
// ShiftDB Model
// =================================================================
class ShiftDB extends BaseModel {
    static get sheetName() { return "シフトDB"; }
    static get columns() {
        return {
            "date": 0,
            "storeId": 1,
            "json": 2
        };
    }
    static get headers() { return ["日付", "店番", "JSON"]; }
    static get design() {
        return {
            headerBgColor: "#A64D79",
            headerTextColor: "#FFFFFF",
            headerBold: true,
            freezeRows: 1,
            columnWidths: [150, 100, 600]
        };
    }
}


// Export globally
const Models = {
    User: UserData, // Alias 'User' to 'UserData' class to avoid conflict if 'User' name is reserved or confusing
    Store: Store,
    ByStore: ByStore,
    DayOff: DayOff,
    ShiftDB: ShiftDB,
    SHEET: {
        USER: { NAME: UserData.sheetName, COL: UserData.columns, HEADER: UserData.headers, DESIGN: UserData.design },
        STORE: { NAME: Store.sheetName, COL: Store.columns, HEADER: Store.headers, DESIGN: Store.design },
        BY_STORE: { NAME: ByStore.sheetName, COL: ByStore.columns, HEADER: ByStore.headers, DESIGN: ByStore.design },
        DAY_OFF: { NAME: DayOff.sheetName, COL: DayOff.columns, HEADER: DayOff.headers, DESIGN: DayOff.design },
        SHIFT_DB: { NAME: ShiftDB.sheetName, COL: ShiftDB.columns, HEADER: ShiftDB.headers, DESIGN: ShiftDB.design }
    }
};