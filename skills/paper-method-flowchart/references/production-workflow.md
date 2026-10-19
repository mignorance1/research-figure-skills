# 制作、导出与交付

## 原生对象与布局

按当前作者材料记录输入、操作、返回对象与选择逻辑。先定模块范围和弯箭头走廊，再放波形、矩阵、参数网格、能量条和公式。给每个同功能对象设置统一名称前缀，便于组合编辑。

使用环境中可用的 PowerPoint 原生绘图工具。公开示例使用 PptxGenJS 绘制对象，再用 Python 标准库为 PPT 添加原生实心弯箭头及功能分组。辅助程序只修改指定页的对象结构，保留其他打包部件。

仓库根目录安装 Node.js 依赖后生成示例：

```sh
npm install
node skills/paper-method-flowchart/scripts/build_method_demo.cjs --out output/method-demo.pptx
```

脚本默认调用 `python`。可通过 `--python` 指定解释器：

```sh
node skills/paper-method-flowchart/scripts/build_method_demo.cjs --out output/method-demo.pptx --python /path/to/python
```

生成的 `.source.json` 记录示意对象、箭头路径和分组。示例的候选域、评分和对象只是绘图演示，研究图按论文定义替换。

## 修改现有图

从最新 PPT 的副本开始，局部批注只修改相关对象。保留已认可的字体、颜色、其他模块和科学内容。插入或重排公式图片时，核对它们是否在功能组内；某些绘图工具会将公式留在页根层级。

保持文字、矩阵格、曲线和实心弯箭头可单独编辑。复杂公式可用独立 SVG/高分辨率透明 PNG，保留公式源。清晰的短变量、数字和 ch 标签优先使用原生富文本。

## 原生导出

Windows 已安装 PowerPoint 时：

```powershell
powershell -NoProfile -File skills/paper-method-flowchart/scripts/export_ppt_pdf.ps1 -Source "output/method-demo.pptx" -Destination "output/rendered"
```

助手只读打开源文件，输出 PDF、逐页 PNG 与哈希记录。它只关闭自己打开的文档；已有 PowerPoint 会话保留。其他系统可使用可用渲染器并核对字体与公式。

## 图件检查

沿最终 PDF 从输入读到输出，核对每条箭头的对象、方向和汇合点。查看连接、上下标、ch 标签和图例局部，再按论文目标宽度查看整图。记录 PPTX 包完整性、图件页数、画幅、来源文件与输出哈希。

特别核对：合流处平滑、路径避开标签、同类文字同字号、公式顶端完整、零值浅底可见、图例含义明确。发现拥挤时调整结构和间距。

## 论文集成

用户要求集成时，读取正文实际引用路径，备份原图和投稿包，替换被引用图件。压缩包仅更新目标条目，核对其他条目字节与 CRC；随后按当前环境编译正文，检查图题与图件对应关系。

交付可编辑 PPTX、PDF、PNG 和来源记录。本地认可论文图保存在本地参考目录；公开包提供通用示例。
