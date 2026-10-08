"""Portable publication style and provenance; no statistical inference."""
from pathlib import Path
import hashlib
import json
import matplotlib as mpl
from matplotlib import font_manager
import matplotlib.pyplot as plt

PALETTE = {
    'blue': '#0F4D92', 'blue_secondary': '#3775BA', 'teal': '#42949E',
    'violet': '#9A4D8E', 'red': '#B64342', 'green': '#647D43',
    'ochre': '#A67B43', 'neutral': '#767676', 'ink': '#272727',
    'line': '#CFCECE', 'row': '#F5F7F9', 'green_light': '#AADCA9',
}


def apply_style():
    mpl.rcParams.update({
        'font.family': 'sans-serif',
        'font.sans-serif': ['Arial', 'Helvetica', 'DejaVu Sans'],
        'font.size': 8, 'axes.titlesize': 9, 'axes.labelsize': 8,
        'xtick.labelsize': 7.5, 'ytick.labelsize': 7.5,
        'axes.linewidth': 1.1, 'axes.spines.top': False,
        'axes.spines.right': False, 'legend.frameon': False,
        'legend.fontsize': 7.5, 'lines.linewidth': 1.5,
        'pdf.fonttype': 42, 'svg.fonttype': 'none',
        'savefig.facecolor': 'white', 'mathtext.fontset': 'dejavusans',
        'text.usetex': False,
    })


def figure_mm(width=183, height=90):
    if width <= 0 or height <= 0:
        raise ValueError('Figure dimensions must be positive.')
    return plt.figure(figsize=(width / 25.4, height / 25.4))


def heading(fig, title, note=''):
    # A separate protocol line prevents long titles and n notes colliding.
    fig.text(.04, .97, title, va='top', color=PALETTE['blue'],
             fontsize=10, fontweight='bold')
    if note:
        fig.text(.965, .92, note, ha='right', va='top',
                 color=PALETTE['neutral'], fontsize=7.5)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def export_figure(fig, output_stem, *, sources=(), data=None, metadata=None):
    """Fixed canvas export; fail on text outside canvas, not an overlap guarantee."""
    output_stem = Path(output_stem)
    output_stem.parent.mkdir(parents=True, exist_ok=True)
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    text_layout = []
    for t in fig.findobj(mpl.text.Text):
        if not t.get_visible() or not t.get_text().strip():
            continue
        bb = mpl.text.Text.get_window_extent(t, renderer)
        coordinates = [bb.x0 / fig.bbox.width, bb.y0 / fig.bbox.height,
                       bb.x1 / fig.bbox.width, bb.y1 / fig.bbox.height]
        text_layout.append({'text': t.get_text(), 'size_pt': t.get_fontsize(),
                            'bbox_fig': coordinates})
    outside = [t for t in text_layout if t['bbox_fig'][0] < -.002
               or t['bbox_fig'][1] < -.002 or t['bbox_fig'][2] > 1.002
               or t['bbox_fig'][3] > 1.002]
    font_path = font_manager.findfont(font_manager.FontProperties(family=['sans-serif']))
    record = {
        'width_mm': float(fig.get_figwidth() * 25.4),
        'height_mm': float(fig.get_figheight() * 25.4),
        'font': {'name': font_manager.FontProperties(fname=font_path).get_name(),
                 'file_name': Path(font_path).name},
        'sources': [{'file_name': Path(p).name, 'sha256': sha256(p)} for p in sources],
        'data': data, 'metadata': metadata or {}, 'text_layout': text_layout,
        'text_outside_canvas': outside,
        'visual_review_required': True,
    }
    record_path = output_stem.parent / (output_stem.name + '.json')
    if outside:
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
        raise ValueError('Text outside canvas: ' + ', '.join(t['text'] for t in outside))
    exports = {}
    for extension in ('pdf', 'svg', 'png'):
        path = output_stem.parent / (output_stem.name + '.' + extension)
        fig.savefig(path, dpi=600 if extension == 'png' else None, bbox_inches=None)
        exports[extension] = sha256(path)
    record['exports'] = exports
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return record
