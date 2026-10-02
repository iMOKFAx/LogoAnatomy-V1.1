var LA_LAYER = 'Logo Anatomy';
var LA_ITEMS = [];
function LA_q(s) { return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '') + '"'; }
function LA_json(v) {
if (v === null || v === undefined) return 'null';
if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 1000000) / 1000000) : 'null';
if (typeof v === 'boolean') return v ? 'true' : 'false';
if (typeof v === 'string') return LA_q(v);
if (v instanceof Array) { var a = []; for (var i = 0; i < v.length; i++) a.push(LA_json(v[i])); return '[' + a.join(',') + ']'; }
var o = []; for (var k in v) if (v.hasOwnProperty(k)) o.push(LA_q(k) + ':' + LA_json(v[k])); return '{' + o.join(',') + '}';
}
function LA_err(m) { return LA_json({ ok: false, err: m }); }
function LA_doc() { try { return app.documents.length ? app.activeDocument : null; } catch (e) { return null; } }
function LA_onGuideLayer(it) { try { var l = it.layer; while (l) { if (l.name === LA_LAYER) return true; l = (l.parent && l.parent.typename === 'Layer') ? l.parent : null; } } catch (e) {} return false; }
function LA_read() {
var doc = LA_doc(); if (!doc) return LA_err('Open a document first.');
var sel = doc.selection;
if (!sel || !sel.length || typeof sel === 'string') return LA_err('Select your logo first (with the Selection tool, V).');
LA_ITEMS = [];
var info = { text: 0, image: 0, other: 0, masks: 0, guides: 0, invisible: 0 };
function walk(it) {
if (LA_onGuideLayer(it)) return;
var t = it.typename;
if (t === 'PathItem') {
if (it.guides) { info.guides++; return; }
if (it.clipping) { info.masks++; return; }
var inCompound = it.parent && it.parent.typename === 'CompoundPathItem';
if (!inCompound && it.filled === false && it.stroked === false) { info.invisible++; return; }
if (it.hidden) return;
if (it.pathPoints.length > 1) LA_ITEMS.push(it);
} else if (t === 'CompoundPathItem') {
for (var i = 0; i < it.pathItems.length; i++) walk(it.pathItems[i]);
} else if (t === 'GroupItem') {
for (var j = 0; j < it.pageItems.length; j++) walk(it.pageItems[j]);
} else if (t === 'TextFrame') info.text++;
else if (t === 'PlacedItem' || t === 'RasterItem') info.image++;
else info.other++;
}
for (var s = 0; s < sel.length; s++) walk(sel[s]);
var shapes = [];
for (var k = 0; k < LA_ITEMS.length; k++) {
var pi = LA_ITEMS[k], pts = pi.pathPoints, nodes = [];
for (var n = 0; n < pts.length; n++) {
var a = pts[n].anchor, l = pts[n].leftDirection, r = pts[n].rightDirection;
nodes.push({ p: [a[0], -a[1]], hi: [l[0], -l[1]], ho: [r[0], -r[1]] });
}
shapes.push({ closed: pi.closed, nodes: nodes, id: k });
}
return LA_json({ ok: true, shapes: shapes, info: info, doc: doc.name, cmyk: doc.documentColorSpace === DocumentColorSpace.CMYK });
}
function LA_apply(json) {
var ch = eval('(' + json + ')'), done = 0, bad = 0;
for (var c = 0; c < ch.length; c++) {
var it = LA_ITEMS[ch[c].i];
try {
var pp = it.pathPoints[ch[c].k];
pp.anchor = [ch[c].p[0], -ch[c].p[1]];
pp.leftDirection = [ch[c].hi[0], -ch[c].hi[1]];
pp.rightDirection = [ch[c].ho[0], -ch[c].ho[1]];
done++;
} catch (e) { bad++; }
}
if (bad) return LA_err('Some points could not be moved: the logo is on a locked layer, or it was changed. Unlock it and press Make Guide again.');
return LA_json({ ok: true, moved: done });
}
function LA_show(i, k) {
var doc = LA_doc(); if (!doc) return LA_err('No document.');
try {
var it = LA_ITEMS[i], pp = it.pathPoints[k];
doc.selection = null;
pp.selected = PathPointSelection.ANCHORPOINT;
doc.activeView.centerPoint = pp.anchor;
return LA_json({ ok: true });
} catch (e) { return LA_err('That point is gone. Press Make Guide again.'); }
}
function LA_showAt(x, y) {
var doc = LA_doc(); if (!doc) return LA_err('No document.');
try { doc.activeView.centerPoint = [x, -y]; return LA_json({ ok: true }); } catch (e) { return LA_err(String(e)); }
}
function LA_color(hex, cmyk) {
var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
if (cmyk) {
var c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255, k = Math.min(c, m, y), cc = new CMYKColor();
cc.cyan = k < 1 ? (c - k) / (1 - k) * 100 : 0; cc.magenta = k < 1 ? (m - k) / (1 - k) * 100 : 0; cc.yellow = k < 1 ? (y - k) / (1 - k) * 100 : 0; cc.black = k * 100;
return cc;
}
var rc = new RGBColor(); rc.red = r; rc.green = g; rc.blue = b; return rc;
}
function LA_guideLayer(doc, make) {
var L = null;
for (var i = 0; i < doc.layers.length; i++) if (doc.layers[i].name === LA_LAYER) { L = doc.layers[i]; break; }
if (!L && make) { L = doc.layers.add(); L.name = LA_LAYER; }
return L;
}
function LA_clearLayer(L) {
L.locked = false; L.visible = true;
for (var i = L.layers.length - 1; i >= 0; i--) { var s = L.layers[i]; s.visible = true; s.locked = false; s.remove(); }
for (var j = L.pageItems.length - 1; j >= 0; j--) L.pageItems[j].remove();
}
function LA_draw(json) {
var doc = LA_doc(); if (!doc) return LA_err('Open a document first.');
var g = eval('(' + json + ')'), keepSel = doc.selection;
var L = LA_guideLayer(doc, true);
LA_clearLayer(L);
try { L.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (eZ) {}
var made = 0;
for (var o = g.order.length - 1; o >= 0; o--) {
var name = g.order[o], grp = g.groups[name]; if (!grp) continue;
var sub = L.layers.add(); sub.name = name;
for (var n = 0; n < grp.items.length; n++) {
var d = grp.items[n], it = null;
try {
if (d.t === 'line') { it = sub.pathItems.add(); it.setEntirePath([[d.x1, -d.y1], [d.x2, -d.y2]]); }
else if (d.t === 'circle') it = sub.pathItems.ellipse(-d.cy + d.r, d.cx - d.r, d.r * 2, d.r * 2);
else if (d.t === 'rect') it = sub.pathItems.rectangle(-d.y, d.x, d.w, d.h);
else if (d.t === 'dot') it = sub.pathItems.ellipse(-d.cy + d.r, d.cx - d.r, d.r * 2, d.r * 2);
else if (d.t === 'text') {
it = sub.textFrames.add(); it.contents = d.s; it.position = [d.x, -d.y];
var ca = it.textRange.characterAttributes; ca.size = d.size; ca.fillColor = LA_color(d.c, g.cmyk);
made++; continue;
}
if (!it) continue;
if (d.t === 'dot') { it.filled = true; it.fillColor = LA_color(d.c, g.cmyk); it.stroked = false; }
else { it.filled = false; it.stroked = true; it.strokeColor = LA_color(d.c, g.cmyk); it.strokeWidth = (d.t === 'rect') ? d.sw : d.w; if (d.dash) it.strokeDashes = d.dash; if (d.op !== undefined) it.opacity = d.op * 100; }
made++;
} catch (e) {}
}
sub.visible = grp.visible !== false;
sub.locked = true;
}
L.locked = true;
try { doc.selection = keepSel; } catch (eS) {}
return LA_json({ ok: true, made: made });
}
function LA_toggle(name, on) {
var doc = LA_doc(); if (!doc) return LA_err('No document.');
var L = LA_guideLayer(doc, false); if (!L) return LA_json({ ok: true });
for (var i = 0; i < L.layers.length; i++) if (L.layers[i].name === name) L.layers[i].visible = !!on;
return LA_json({ ok: true });
}
function LA_remove() {
var doc = LA_doc(); if (!doc) return LA_err('No document.');
var L = LA_guideLayer(doc, false); if (L) { L.locked = false; LA_clearLayer(L); L.remove(); }
return LA_json({ ok: true });
}
function LA_ping() { return LA_json({ ok: true, app: 'Illustrator', version: String(app.version) }); }
