"""Shared effect axis + supplied intervals + aligned absolute-value columns.

Input columns: dataset, comparator, delta, ci_low, ci_high, comparator_mean,
is_control. Values and intervals are supplied, never estimated here.
"""
import argparse
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import numpy as np
import pandas as pd
from publication_style import PALETTE, apply_style, figure_mm, heading, export_figure


def load_table(path):
    df = pd.read_csv(path)
    required = ['dataset', 'comparator', 'delta', 'ci_low', 'ci_high',
                'comparator_mean', 'is_control']
    if not set(required).issubset(df.columns):
        raise ValueError('Required columns: ' + ', '.join(required))
    if df.empty or df[required].isna().any().any():
        raise ValueError('Table must be nonempty and contain no missing required values.')
    if df.duplicated(['dataset', 'comparator']).any():
        raise ValueError('Duplicate dataset/comparator pairs.')
    for name in required[2:6]:
        df[name] = pd.to_numeric(df[name], errors='raise')
        if not np.isfinite(df[name]).all():
            raise ValueError('Nonfinite value in ' + name)
    if (df.ci_low > df.ci_high).any():
        raise ValueError('Reversed interval endpoints.')
    controls = df.is_control.astype(str).str.lower()
    if not controls.isin(['true', 'false', '1', '0']).all():
        raise ValueError('is_control must be true/false or 1/0.')
    df['is_control'] = controls.isin(['true', '1'])
    if df.groupby('comparator').is_control.nunique().max() != 1:
        raise ValueError('Control status must be consistent across datasets.')
    return df


def render(df, meta, out, sources):
    datasets = list(df.dataset.unique())
    comparators = list(df.comparator.unique())
    if not 1 <= len(datasets) <= 3:
        raise ValueError('This layout supports 1–3 datasets; use another layout for more.')
    expected = {(d, c) for d in datasets for c in comparators}
    if set(zip(df.dataset, df.comparator)) != expected:
        raise ValueError('Each dataset must have every comparator; do not silently hide cells.')
    for key in ('title', 'effect_label', 'absolute_label', 'interval_label', 'source_note'):
        if not meta.get(key):
            raise ValueError('Metadata must provide ' + key)
    if len(comparators) > 16:
        raise ValueError('Use a different layout for more than 16 comparators.')
    apply_style()
    height = max(90, 31 + 9.5 * len(comparators))
    fig = figure_mm(height=height)
    heading(fig, meta['title'], meta.get('protocol_note', ''))
    ax = fig.add_axes([.19, .205, .50, .58])
    columns = fig.add_axes([.735, .205, .23, .58], sharey=ax)
    colors = [PALETTE['blue'], PALETTE['teal'], PALETTE['violet']]
    markers = ['o', '^', 's']
    offsets = np.linspace(-.17, .17, len(datasets)) if len(datasets) > 1 else [0.]
    lo = min(0., df.ci_low.min(), df.delta.min())
    hi = max(0., df.ci_high.max(), df.delta.max())
    span = hi - lo if hi > lo else 1.
    ax.set_xlim(lo - .08 * span, hi + .22 * span)
    ax.set_ylim(len(comparators) - .5, -.65)
    ax.set_yticks(range(len(comparators)), comparators)
    ax.tick_params(axis='y', length=0, pad=5)
    ax.spines['left'].set_visible(False)
    ax.axvline(0, color='#A8A8A8', linewidth=.8, zorder=0)
    ax.set_xlabel(meta['effect_label'], labelpad=6)
    columns.set_xlim(-.45, len(datasets) - .55 if len(datasets) > 1 else .55)
    columns.axis('off')
    for i in range(len(comparators)):
        if i % 2 == 0:
            ax.axhspan(i - .45, i + .45, color=PALETTE['row'], zorder=-1)
            columns.axhspan(i - .45, i + .45, color=PALETTE['row'], zorder=-1)
    columns.text(.5, 1.15, meta['absolute_label'], transform=columns.transAxes,
                 ha='center', fontsize=8, fontweight='bold')
    handles = []
    labels = meta.get('dataset_labels', {})
    for j, dataset in enumerate(datasets):
        label = labels.get(dataset, dataset)
        columns.text(j, -.84, label, ha='center', fontsize=7.5, color=colors[j])
        handles.append(Line2D([], [], color=colors[j], marker=markers[j], label=label))
        for i, comparator in enumerate(comparators):
            r = df[(df.dataset == dataset) & (df.comparator == comparator)].iloc[0]
            y = i + offsets[j]
            c = PALETTE['neutral'] if r.is_control else colors[j]
            # Draw original endpoints separately; no assumption that point is inside CI.
            ax.plot([r.ci_low, r.ci_high], [y, y], color=c, linewidth=1.55)
            ax.vlines([r.ci_low, r.ci_high], y - .045, y + .045, color=c, linewidth=.9)
            ax.plot(r.delta, y, marker=markers[j], markersize=4, color=c)
            ax.text(max(r.ci_high, r.delta) + .025 * span, y,
                    f'{r.delta:+.3f}', va='center', color=c, fontsize=7.2)
            columns.text(j, y, f'{r.comparator_mean:.4f}',
                         va='center', ha='center', color=c, fontsize=7.7)
    fig.legend(handles=handles, loc='upper left', bbox_to_anchor=(.18, .86),
               ncol=len(datasets), handlelength=2, columnspacing=2)
    fig.text(.19, .075, meta['interval_label'], fontsize=7.3, color=PALETTE['neutral'])
    fig.text(.19, .03, meta['source_note'], fontsize=7.3, color=PALETTE['neutral'])
    record = export_figure(fig, out, sources=sources, data=df.to_dict(orient='records'),
                           metadata=meta)
    plt.close(fig)
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', required=True, type=Path)
    parser.add_argument('--meta', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path, help='Output stem without extension.')
    args = parser.parse_args()
    table = load_table(args.csv)
    metadata = json.loads(args.meta.read_text(encoding='utf-8'))
    record = render(table, metadata, args.out, [args.csv, args.meta])
    print(json.dumps({'width_mm': record['width_mm'], 'height_mm': record['height_mm'],
                      'rows': len(table), 'font': record['font']['name'],
                      'exports': list(record['exports'])}, ensure_ascii=False))
