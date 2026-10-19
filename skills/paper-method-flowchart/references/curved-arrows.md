# 原生实心弯箭头接口

`scripts/curved_arrows.py` 读取现有 PPTX 和 JSON 路径规格，添加可编辑闭合自由形状。仅依赖 Python 标准库。箭身沿三次贝塞尔中心线等距扩展，箭头与箭身连成一个对象。

```sh
python scripts/curved_arrows.py --source base.pptx --spec arrows.json --output result.pptx
```

规格例子：

```json
{
  "slide": 1,
  "canvas": [1280, 800],
  "paths": [
    {
      "name": "panel1__input_to_model",
      "segments": [[[157,230],[157,251],[183,250],[183,275]]],
      "width": 5.3,
      "head": true,
      "head_width": 16,
      "head_length": 11
    },
    {
      "name": "shared__merged_data",
      "segments": [[[411,438],[503,438],[439,104],[495,104]]],
      "width": 5,
      "head": false
    }
  ],
  "groups": [
    {
      "prefix": "panel1__",
      "name": "01 Candidate representations",
      "box": [18,18,454,475]
    }
  ]
}
```

坐标单位由 `canvas` 统一映射到实际页幅。一个 `segments` 元素按起点、两个控制点、终点给出；多段路径的相邻端点重合，控制点方向决定连接的切线。

- `width` 控制填充箭身宽度；`head_width`、`head_length` 控制一体式箭头。
- `head: false` 用于主干、分流母线和平滑汇合。汇合的两路末端切线与下游主干方向一致。
- `color` 默认 `000000`。独立对照等有明确语义的路径可另外设色。
- `groups` 按原生对象 `cNvPr.name` 的前缀收集同功能内容。PptxGenJS 使用 `objectName` 设置此前缀。分组保留绝对坐标。
- 输出路径应与源文件不同。脚本检查页号、点数、有限数值、画幅及重复对象名称；太紧的弯曲出现自交时应重新布线路径。

需要查看路径本身时，可加 `--svg-preview preview.svg`。SVG 只显示路径，最终 PPT 和 PDF 仍需放回完整布局检查。
