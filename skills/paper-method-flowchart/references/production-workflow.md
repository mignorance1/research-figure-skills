# 制作、导出与证据检查

## 内容与实现

从当前材料记录模块、输入、操作、输出、箭头去向、证据来源。区别真实数据、代码示例、语义图形。对照单独说明共享哪些输入、求解器、候选域与成本口径。缺少材料时先利用已有内容推进；算法判据缺少必要定义时才询问。

只要求导出手改成品时，从最新 PPT 导出。新图可用 PowerPoint、PptxGenJS 或用户指定工具；文字、图例、连接符保持可编辑。数学公式可单独渲染为 SVG/PDF，保留公式源。数值插图由代码生成并紧凑裁切，保留图例、单位与色标。

通用示例需要 Node.js 与 pptxgenjs，仓库根目录 `npm install` 后：

```sh
node skills/paper-method-flowchart/scripts/build_method_demo.cjs --out output/method-demo.pptx
```

示例对象、矩阵、波形和模块都可替换，但必须对应当前方法；不能宣称脚本自动完成任意研究流程图。

## 原生导出

Windows 已安装 PowerPoint 时：

```powershell
powershell -NoProfile -File skills/paper-method-flowchart/scripts/export_ppt_pdf.ps1 -Source "output/method-demo.pptx" -Destination "output/rendered"
```

脚本只读打开 PPT，导出 PDF、每页 PNG 与来源记录，不关闭用户已有 PowerPoint 会话。缺少 COM/字体时保留源文件并说明限制，可使用现有兼容渲染器，但需核对数学与箭头。

原生 PPT 对象可编辑，不代表 PDF 所有内容一定矢量。避免整页截图充当 PDF。没有查看最终 PDF 渲染的能力时，不声称完成 PDF 视觉检查。

## QA 与集成

先看全图并沿箭头读出各模块输入/输出，再检查小图例与数学局部，最后按目标论文宽度检查。核对遮挡、箭头反向/空心、框对比度、未说明颜色、白格消失、上下标及可见输出。XML 检查只是辅助，最终渲染优先；应实际查看预览。

仅请求集成时处理 tex/Overleaf：读取实际 includegraphics 路径，备份图与 ZIP，把新 PDF 写入原引用位置。ZIP 只替换目标条目，保留目录结构；比较 SHA-256、运行 CRC 检查，核对其余条目字节变化。按内容更新必要图注，分别记录 LaTeX 编译与单图验证。版式更新不重跑冻结实验。

交付编辑源、PDF、预览、生成/导出命令及简短来源/QA。保留历史版本，旧代码不能覆盖用户手改。
