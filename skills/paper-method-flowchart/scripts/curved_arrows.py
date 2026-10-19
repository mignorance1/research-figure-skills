#!/usr/bin/env python3
"""Add editable filled Bezier arrows and functional groups to a PPTX.

Coordinates are in the JSON canvas space. Python standard library only.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import posixpath
import re
import xml.etree.ElementTree as E
from zipfile import ZipFile

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
P, A = '{' + NS['p'] + '}', '{' + NS['a'] + '}'
for prefix, uri in NS.items():
    E.register_namespace(prefix, uri)


def positive(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(label + ' must be a positive finite number')
    return float(value)


def point(c, t):
    u = 1 - t
    return tuple(u**3*c[0][k] + 3*u*u*t*c[1][k] + 3*u*t*t*c[2][k] + t**3*c[3][k] for k in (0, 1))


def direction(c, t):
    u = 1 - t
    d = [3*u*u*(c[1][k]-c[0][k]) + 6*u*t*(c[2][k]-c[1][k]) + 3*t*t*(c[3][k]-c[2][k]) for k in (0, 1)]
    length = math.hypot(*d)
    if length < 1e-10:
        a, b = point(c, max(0, t-1e-4)), point(c, min(1, t+1e-4))
        d = [b[k]-a[k] for k in (0, 1)]
        length = math.hypot(*d)
    if length < 1e-10:
        raise ValueError('A curve segment has no usable direction')
    return d[0]/length, d[1]/length


def curve_polygon(spec):
    """Return the single closed contour of a curved band or integrated arrow."""
    segments = spec.get('segments', [])
    if not segments:
        raise ValueError('At least one Bezier segment is required')
    width = positive(spec.get('width', 5), 'width')
    headed = spec.get('head', True)
    if not isinstance(headed, bool):
        raise ValueError('head must be true or false')
    hw = positive(spec.get('head_width', width*3), 'head_width')
    hl = positive(spec.get('head_length', width*2), 'head_length')
    if headed and hw < width:
        raise ValueError('head_width must be at least width')
    points, tangents = [], []
    for index, c in enumerate(segments):
        if len(c) != 4 or any(len(q) != 2 for q in c):
            raise ValueError('Each segment needs four [x,y] points')
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for q in c for v in q):
            raise ValueError('Curve coordinates must be finite numbers')
        if index and math.dist(segments[index-1][-1], c[0]) > 1e-6:
            raise ValueError('Adjacent Bezier segments must share an endpoint')
        for j in range(0 if index == 0 else 1, 181):
            t = j/180
            points.append(point(c, t))
            tangents.append(direction(c, t))
    arc = [0.0]
    for a, b in zip(points, points[1:]):
        arc.append(arc[-1] + math.dist(a, b))
    if arc[-1] < 1e-6:
        raise ValueError('Curve length is zero')
    cut = len(points)-1
    if headed:
        target = arc[-1] - min(hl, arc[-1]*.43)
        cut = min(range(len(points)), key=lambda i: abs(arc[i]-target))
    left, right = [], []
    for q, (dx, dy) in zip(points[:cut+1], tangents[:cut+1]):
        left.append((q[0]-dy*width/2, q[1]+dx*width/2))
        right.append((q[0]+dy*width/2, q[1]-dx*width/2))
    if headed:
        base, tip = points[cut], points[-1]
        length = math.dist(base, tip)
        if length < 1e-8:
            raise ValueError('Arrow head has zero chord length')
        nx, ny = -(tip[1]-base[1])/length, (tip[0]-base[0])/length
        left.extend([(base[0]+nx*hw/2, base[1]+ny*hw/2), tip,
                     (base[0]-nx*hw/2, base[1]-ny*hw/2)])
    return left + list(reversed(right))


def shape_name(el):
    nv = el.find('.//p:cNvPr', NS)
    return nv.get('name', '') if nv is not None else ''


def freeform(points, name, sid, sx, sy, color):
    xs, ys = [q[0]*sx for q in points], [q[1]*sy for q in points]
    x, y = min(xs), min(ys)
    w, h = max(1, max(xs)-x), max(1, max(ys)-y)
    sp = E.Element(P+'sp'); nv = E.SubElement(sp, P+'nvSpPr')
    E.SubElement(nv, P+'cNvPr', id=str(sid), name=name, descr='Editable filled curved data-flow path')
    E.SubElement(nv, P+'cNvSpPr'); E.SubElement(nv, P+'nvPr')
    pr = E.SubElement(sp, P+'spPr'); xf = E.SubElement(pr, A+'xfrm')
    E.SubElement(xf, A+'off', x=str(round(x)), y=str(round(y)))
    E.SubElement(xf, A+'ext', cx=str(round(w)), cy=str(round(h)))
    geom = E.SubElement(pr, A+'custGeom')
    for tag in ('avLst', 'gdLst', 'ahLst', 'cxnLst'):
        E.SubElement(geom, A+tag)
    E.SubElement(geom, A+'rect', l='0', t='0', r='w', b='h')
    path = E.SubElement(E.SubElement(geom, A+'pathLst'), A+'path',
                        w=str(round(w)), h=str(round(h)), fill='norm', stroke='false')
    for i, (xx, yy) in enumerate(zip(xs, ys)):
        E.SubElement(E.SubElement(path, A+('moveTo' if i == 0 else 'lnTo')), A+'pt', x=str(round(xx-x)), y=str(round(yy-y)))
    E.SubElement(path, A+'close')
    E.SubElement(E.SubElement(pr, A+'solidFill'), A+'srgbClr', val=color)
    E.SubElement(E.SubElement(pr, A+'ln', w='0'), A+'noFill')
    return sp


def apply_paths(source, output, spec, svg_preview=None):
    source, output = Path(source), Path(output)
    if source.resolve() == output.resolve():
        raise ValueError('Use an output path different from source')
    canvas = spec.get('canvas', [1280, 800])
    if len(canvas) != 2:
        raise ValueError('canvas must be [width,height]')
    cw, ch = positive(canvas[0], 'canvas width'), positive(canvas[1], 'canvas height')
    slide = spec.get('slide', 1)
    if isinstance(slide, bool) or not isinstance(slide, int) or slide < 1:
        raise ValueError('slide must be a positive integer')
    with ZipFile(source) as z:
        infos = z.infolist(); comment = z.comment
        parts = {info.filename: z.read(info) for info in infos}
    presentation = E.fromstring(parts['ppt/presentation.xml'])
    slides = presentation.findall('p:sldIdLst/p:sldId', NS)
    if slide > len(slides):
        raise ValueError('Requested slide is not in presentation')
    rels = E.fromstring(parts['ppt/_rels/presentation.xml.rels'])
    rid = slides[slide-1].get('{'+NS['r']+'}id')
    target = next(rel.get('Target') for rel in rels if rel.get('Id') == rid)
    part = posixpath.normpath(posixpath.join('ppt', target)).lstrip('/')
    size = presentation.find('p:sldSz', NS)
    sx, sy = int(size.get('cx'))/cw, int(size.get('cy'))/ch
    for _, (prefix, uri) in E.iterparse(io.BytesIO(parts[part]), events=('start-ns',)):
        if not re.fullmatch(r'ns\d+', prefix):
            E.register_namespace(prefix, uri)
    doc = E.fromstring(parts[part]); tree = doc.find('p:cSld/p:spTree', NS)
    sid = max(int(nv.get('id')) for nv in doc.findall('.//p:cNvPr', NS))+1
    names = {nv.get('name') for nv in doc.findall('.//p:cNvPr', NS)}
    preview = []
    for index, path in enumerate(spec.get('paths', [])):
        name = path.get('name', 'Filled curve '+str(index+1))
        if not isinstance(name, str) or not name or name in names:
            raise ValueError('Each path needs a unique nonempty name: '+str(name))
        color = path.get('color', '000000').lstrip('#').upper()
        if not re.fullmatch('[0-9A-F]{6}', color):
            raise ValueError('color must be a six-digit hex value')
        polygon = curve_polygon(path)
        if any(x < 0 or y < 0 or x > cw or y > ch for x, y in polygon):
            raise ValueError('A filled path extends outside the canvas: '+name)
        tree.append(freeform(polygon, name, sid, sx, sy, color)); sid += 1
        names.add(name); preview.append((polygon, color))
    groups = spec.get('groups', [])
    prefixes = [g.get('prefix', '') for g in groups]
    if any(not isinstance(x, str) or not x for x in prefixes) or any(a.startswith(b) or b.startswith(a) for i, a in enumerate(prefixes) for b in prefixes[i+1:]):
        raise ValueError('Group prefixes must be nonempty and nonoverlapping')
    for group in groups:
        label = group.get('name', '')
        if not label or label in names:
            raise ValueError('Each group needs a unique nonempty name')
        children = [el for el in tree if shape_name(el).startswith(group['prefix'])]
        if not children:
            raise ValueError('Group prefix selects no objects: '+group['prefix'])
        box = group.get('box', [0, 0, cw, ch])
        if len(box) != 4 or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in box):
            raise ValueError('Group box must be finite [x,y,width,height]')
        x, y, w, h = box
        if x < 0 or y < 0 or w <= 0 or h <= 0 or x+w > cw or y+h > ch:
            raise ValueError('Group box extends outside canvas')
        g = E.Element(P+'grpSp'); nv = E.SubElement(g, P+'nvGrpSpPr')
        E.SubElement(nv, P+'cNvPr', id=str(sid), name=label); sid += 1
        E.SubElement(nv, P+'cNvGrpSpPr'); E.SubElement(nv, P+'nvPr')
        xf = E.SubElement(E.SubElement(g, P+'grpSpPr'), A+'xfrm')
        for tag, attrib in [('off', {'x': str(round(x*sx)), 'y': str(round(y*sy))}),
                            ('ext', {'cx': str(round(w*sx)), 'cy': str(round(h*sy))}),
                            ('chOff', {'x': str(round(x*sx)), 'y': str(round(y*sy))}),
                            ('chExt', {'cx': str(round(w*sx)), 'cy': str(round(h*sy))})]:
            E.SubElement(xf, A+tag, attrib)
        pos = list(tree).index(children[0]); tree.insert(pos, g)
        for el in children:
            tree.remove(el); g.append(el)
        names.add(label)
    parts[part] = E.tostring(doc, encoding='utf-8', xml_declaration=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w') as z:
        z.comment = comment
        for info in infos:
            z.writestr(info, parts[info.filename])
    if svg_preview:
        svg = E.Element('svg', xmlns='http://www.w3.org/2000/svg', viewBox=f'0 0 {cw:g} {ch:g}')
        for polygon, color in preview:
            d = 'M ' + ' L '.join(f'{x:.3f},{y:.3f}' for x, y in polygon) + ' Z'
            E.SubElement(svg, 'path', d=d, fill='#'+color)
        preview_path = Path(svg_preview); preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview_path.write_bytes(E.tostring(svg, encoding='utf-8', xml_declaration=True))
    return {'slide': slide, 'paths': len(preview), 'groups': len(groups),
            'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--spec', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--svg-preview', type=Path)
    args = parser.parse_args()
    try:
        spec = json.loads(args.spec.read_text(encoding='utf-8'))
        result = apply_paths(args.source, args.output, spec, args.svg_preview)
    except (ValueError, KeyError, StopIteration, OSError) as error:
        parser.exit(2, 'error: '+str(error)+'\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
