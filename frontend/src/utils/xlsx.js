// Small, dependency-free XLSX writer for the two server-calculated report tables.
const encoder = new TextEncoder();
const xml = (value) => String(value ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (n) => { let s = ''; for (n++; n; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
function worksheet(rows) {
    const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => value === null ? '' : typeof value === 'number' ? `<c r="${col(c)}${r + 1}"><v>${value}</v></c>` : `<c r="${col(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}
function crc32(bytes) { let crc = -1; for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++)
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
} return (crc ^ -1) >>> 0; }
function zip(files) {
    const chunks = [], centers = [];
    let offset = 0;
    const u16 = (v, o, n) => v.setUint16(o, n, true), u32 = (v, o, n) => v.setUint32(o, n, true);
    for (const [name, content] of Object.entries(files)) {
        const n = encoder.encode(name), b = encoder.encode(content), crc = crc32(b);
        const local = new Uint8Array(30 + n.length + b.length), v = new DataView(local.buffer);
        u32(v, 0, 0x04034b50);
        u16(v, 4, 20);
        u16(v, 8, 0);
        u32(v, 14, crc);
        u32(v, 18, b.length);
        u32(v, 22, b.length);
        u16(v, 26, n.length);
        local.set(n, 30);
        local.set(b, 30 + n.length);
        chunks.push(local);
        const central = new Uint8Array(46 + n.length), c = new DataView(central.buffer);
        u32(c, 0, 0x02014b50);
        u16(c, 4, 20);
        u16(c, 6, 20);
        u32(c, 16, crc);
        u32(c, 20, b.length);
        u32(c, 24, b.length);
        u16(c, 28, n.length);
        u32(c, 42, offset);
        central.set(n, 46);
        centers.push(central);
        offset += local.length;
    }
    const centralSize = centers.reduce((s, x) => s + x.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
    u32(e, 0, 0x06054b50);
    u16(e, 8, centers.length);
    u16(e, 10, centers.length);
    u32(e, 12, centralSize);
    u32(e, 16, offset);
    const output = new Uint8Array(offset + centralSize + 22);
    let pos = 0;
    for (const part of [...chunks, ...centers, end]) {
        output.set(part, pos);
        pos += part.length;
    }
    return output;
}
const time = (iso) => iso ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)) : '';
export function downloadReport(report) {
    const daily = [['Date', 'Attendance', 'Attendance time (IST)', 'Attendance reason', 'Breaks', 'Break minutes', 'Break excess minutes', 'Off-study minutes', 'Fine (₹)'], ...report.days.map(d => [d.date, d.attendance, time(d.checkedAt), d.attendanceReason, d.breakCount, d.breakMinutes, d.excessMinutes, d.offMinutes, d.fineRupees])];
    const breaks = [['Date', 'Break', 'Start (IST)', 'Return (IST)', 'Allowed minutes', 'Actual minutes', 'Exceeded by minutes', 'Fine (₹)', 'Reason'], ...report.entries.map(e => [e.date, e.label, time(e.startedAt), time(e.endedAt), e.plannedMinutes, e.actualMinutes, e.excessMinutes, e.fineRupees, e.reason])];
    const files = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Daily routine" sheetId="1" r:id="rId1"/><sheet name="Break details" sheetId="2" r:id="rId2"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
        'xl/worksheets/sheet1.xml': worksheet(daily), 'xl/worksheets/sheet2.xml': worksheet(breaks),
    };
    const bytes = zip(files), blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = `home-gurukul-${report.scope}-${report.startDay}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
