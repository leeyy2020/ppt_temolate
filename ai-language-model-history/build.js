const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");
const {
  autoFontSize,
  calcTextBox,
  safeOuterShadow,
  svgToDataUri,
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers");

const pptx = new PptxGenJS();

const HEAD_FONT = "Noto Serif CJK SC";
const BODY_FONT = "Noto Sans CJK SC";
const MONO_FONT = "DejaVu Sans Mono";

const COLORS = {
  ink: "172033",
  dark: "0B1020",
  paper: "F7F1E8",
  white: "FFFDF8",
  sand: "EFE6D8",
  tan: "D6C5AA",
  gold: "F3B35E",
  teal: "69C8C4",
  blue: "3E6FF4",
  red: "D85C5C",
  green: "5BAE73",
  slate: "6D7487",
  mist: "DDE7F0",
  line: "D8D1C4",
};

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const PAGE_MARGIN = 0.56;

const sources = [
  { year: "2017", title: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762" },
  { year: "2019", title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding", url: "https://aclanthology.org/N19-1423/" },
  { year: "2020", title: "Language Models are Few-Shot Learners", url: "https://arxiv.org/abs/2005.14165" },
  { year: "2022", title: "Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155" },
  { year: "2022", title: "Introducing ChatGPT", url: "https://openai.com/index/chatgpt/" },
  { year: "2023", title: "GPT-4 Research", url: "https://openai.com/index/gpt-4-research/" },
  { year: "2024", title: "Google Gemini 1.5 announcement", url: "https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/" },
  { year: "2024", title: "Introducing Claude 3.5 Sonnet", url: "https://www.anthropic.com/news/claude-3-5-sonnet" },
  { year: "2024", title: "Meta AI built with Llama 3", url: "https://about.fb.com/news/2024/04/meta-ai-assistant-built-with-llama-3/" },
  { year: "2025", title: "DeepSeek-R1", url: "https://arxiv.org/abs/2501.12948" },
];

pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "OpenAI";
pptx.subject = "AI language model development history";
pptx.title = "AI语言模型发展历程";
pptx.lang = "zh-CN";
pptx.theme = {
  headFontFace: HEAD_FONT,
  bodyFontFace: BODY_FONT,
  lang: "zh-CN",
};

function makeNetworkSvg() {
  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#69C8C4" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#3E6FF4" stop-opacity="0.18"/>
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stop-color="#F3B35E" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#F3B35E" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      <rect width="900" height="600" fill="none"/>
      <circle cx="730" cy="165" r="118" fill="url(#g1)"/>
      <circle cx="635" cy="420" r="145" fill="url(#g2)"/>
      <g stroke="#A7E6E0" stroke-opacity="0.25" stroke-width="2.5" fill="none">
        <path d="M270 160 L470 120 L645 220 L770 165" />
        <path d="M280 350 L460 280 L635 420 L780 495" />
        <path d="M470 120 L460 280 L635 420" />
        <path d="M645 220 L635 420 L815 350" />
        <path d="M370 510 L460 280 L645 220" />
      </g>
      <g>
        <circle cx="270" cy="160" r="10" fill="#FFFDF8"/>
        <circle cx="470" cy="120" r="15" fill="#69C8C4"/>
        <circle cx="645" cy="220" r="18" fill="#F3B35E"/>
        <circle cx="770" cy="165" r="12" fill="#FFFDF8"/>
        <circle cx="280" cy="350" r="8" fill="#69C8C4"/>
        <circle cx="460" cy="280" r="18" fill="#FFFDF8"/>
        <circle cx="635" cy="420" r="21" fill="#3E6FF4"/>
        <circle cx="780" cy="495" r="10" fill="#F3B35E"/>
        <circle cx="815" cy="350" r="11" fill="#FFFDF8"/>
        <circle cx="370" cy="510" r="7" fill="#69C8C4"/>
      </g>
    </svg>
  `);
}

function addPageNumber(slide, pageNumber, dark = false) {
  slide.addText(String(pageNumber).padStart(2, "0"), {
    x: 12.48,
    y: 7.02,
    w: 0.34,
    h: 0.22,
    fontFace: MONO_FONT,
    fontSize: 9.2,
    bold: true,
    color: dark ? "D7E0EF" : COLORS.slate,
    align: "right",
    margin: 0,
  });
}

function addTopRule(slide, accent, dark = false) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.12,
    line: { color: accent, transparency: 100 },
    fill: { color: accent },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: PAGE_MARGIN,
    y: 6.84,
    w: SLIDE_W - PAGE_MARGIN * 2 - 0.32,
    h: 0,
    line: { color: dark ? "53607A" : COLORS.line, pt: 1.1 },
  });
}

function addHeader(slide, pageNumber, kicker, title, subtitle, dark = false) {
  const titleColor = dark ? COLORS.white : COLORS.ink;
  const subColor = dark ? "D7E0EF" : COLORS.slate;

  slide.addText(kicker.toUpperCase(), {
    x: PAGE_MARGIN,
    y: 0.33,
    w: 2.7,
    h: 0.22,
    fontFace: MONO_FONT,
    fontSize: 9.4,
    bold: true,
    tracking: 1.4,
    color: dark ? COLORS.gold : COLORS.blue,
    margin: 0,
  });

  slide.addText(title, {
    ...autoFontSize(title, HEAD_FONT, {
      x: PAGE_MARGIN,
      y: 0.57,
      w: 8.6,
      h: 0.5,
      fontSize: 28,
      minFontSize: 23,
      maxFontSize: 28,
      fontWeight: "bold",
      margin: 0,
      leading: 1.08,
      mode: "shrink",
    }),
    fontFace: HEAD_FONT,
    bold: true,
    color: titleColor,
    margin: 0,
  });

  const subtitleBox = calcTextBox(11.5, {
    text: subtitle,
    w: 6.1,
    fontFace: BODY_FONT,
    margin: 0,
    padding: 0.01,
    leading: 1.16,
  });
  slide.addText(subtitle, {
    x: PAGE_MARGIN,
    y: 1.24,
    w: 6.2,
    h: Math.max(0.34, subtitleBox.h),
    fontFace: BODY_FONT,
    fontSize: 11.5,
    color: subColor,
    margin: 0,
    leading: 1.16,
  });

  addPageNumber(slide, pageNumber, dark);
}

function addTag(slide, text, x, y, fill, color = COLORS.dark, w = 1.26) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.34,
    rectRadius: 0.06,
    line: { color: fill, transparency: 100 },
    fill: { color: fill },
  });
  slide.addText(text, {
    x,
    y: y + 0.06,
    w,
    h: 0.18,
    fontFace: MONO_FONT,
    fontSize: 8.8,
    bold: true,
    color,
    align: "center",
    margin: 0,
  });
}

function addCard(slide, options) {
  const {
    x,
    y,
    w,
    h,
    title,
    body,
    fill = COLORS.white,
    accent = COLORS.teal,
    titleColor = COLORS.ink,
    bodyColor = COLORS.ink,
    dark = false,
    bodyMin = 12.5,
    bodyMax = 18,
    titleMax = 17,
  } = options;

  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    line: { color: accent, pt: 1.15 },
    fill: { color: fill },
    shadow: safeOuterShadow(COLORS.dark, 0.14, 45, 1.5, 0.8),
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.12,
    y: y + 0.14,
    w: 0.12,
    h: 0.52,
    line: { color: accent, transparency: 100 },
    fill: { color: accent },
  });

  slide.addText(title, {
    ...autoFontSize(title, HEAD_FONT, {
      x: x + 0.34,
      y: y + 0.14,
      w: w - 0.48,
      h: 0.42,
      fontSize: titleMax,
      minFontSize: 14,
      maxFontSize: titleMax,
      fontWeight: "bold",
      margin: 0,
      mode: "shrink",
    }),
    fontFace: HEAD_FONT,
    bold: true,
    color: titleColor,
    margin: 0,
  });

  if (typeof body === "string") {
    slide.addText(body, {
      ...autoFontSize(body, BODY_FONT, {
        x: x + 0.34,
        y: y + 0.76,
        w: w - 0.56,
        h: h - 0.94,
        fontSize: bodyMax,
        minFontSize: bodyMin,
        maxFontSize: bodyMax,
        margin: 0,
        leading: 1.18,
        mode: "shrink",
      }),
      fontFace: BODY_FONT,
      color: bodyColor,
      margin: 0,
      leading: 1.18,
      valign: "top",
    });
  } else if (Array.isArray(body)) {
    slide.addText(body, {
      ...autoFontSize(body, BODY_FONT, {
        x: x + 0.34,
        y: y + 0.76,
        w: w - 0.56,
        h: h - 0.94,
        fontSize: bodyMax,
        minFontSize: bodyMin,
        maxFontSize: bodyMax,
        margin: 0,
        leading: 1.16,
        mode: "shrink",
      }),
      fontFace: BODY_FONT,
      color: dark ? COLORS.white : bodyColor,
      margin: 0,
      leading: 1.16,
      valign: "top",
    });
  }
}

function bulletRuns(items, color = COLORS.ink) {
  return items.flatMap((item, index) => [
    {
      text: item,
      options: {
        breakLine: index > 0,
        bullet: { indent: 12 },
        paraSpaceAfterPt: 8,
        color,
      },
    },
  ]);
}

function addBulletPanel(slide, x, y, w, h, label, items, accent) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    line: { color: accent, pt: 1.1 },
    fill: { color: COLORS.white },
  });
  addTag(slide, label, x + 0.18, y + 0.15, accent, COLORS.dark, 1.38);
  const runs = bulletRuns(items);
  slide.addText(runs, {
    ...autoFontSize(runs, BODY_FONT, {
      x: x + 0.18,
      y: y + 0.62,
      w: w - 0.34,
      h: h - 0.8,
      fontSize: 15.2,
      minFontSize: 11.5,
      maxFontSize: 15.2,
      margin: 0,
      leading: 1.16,
      mode: "shrink",
    }),
    fontFace: BODY_FONT,
    margin: 0,
    leading: 1.16,
    color: COLORS.ink,
    valign: "top",
  });
}

function addMilestone(slide, x, y, year, label, note, color) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: 0.28,
    h: 0.28,
    line: { color, pt: 1.2 },
    fill: { color },
  });
  slide.addText(year, {
    x: x - 0.05,
    y: y - 0.38,
    w: 0.42,
    h: 0.18,
    fontFace: MONO_FONT,
    fontSize: 9.2,
    bold: true,
    color: COLORS.slate,
    align: "center",
    margin: 0,
  });
  slide.addText(label, {
    x: x - 0.16,
    y: y + 0.34,
    w: 0.6,
    h: 0.22,
    fontFace: BODY_FONT,
    fontSize: 10.4,
    bold: true,
    color: COLORS.ink,
    align: "center",
    margin: 0,
  });
  slide.addText(note, {
    x: x - 0.58,
    y: y + 0.58,
    w: 1.42,
    h: 0.4,
    fontFace: BODY_FONT,
    fontSize: 8.7,
    color: COLORS.slate,
    align: "center",
    margin: 0,
  });
}

function finalizeSlide(slide) {
  warnIfSlideHasOverlaps(slide, pptx);
  warnIfSlideElementsOutOfBounds(slide, pptx);
}

function buildCover() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.dark };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.12,
    line: { color: COLORS.gold, transparency: 100 },
    fill: { color: COLORS.gold },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.62,
    y: 6.88,
    w: 2.18,
    h: 0.06,
    line: { color: COLORS.teal, transparency: 100 },
    fill: { color: COLORS.teal },
  });
  slide.addImage({
    data: makeNetworkSvg(),
    x: 6.08,
    y: 0.92,
    w: 6.2,
    h: 4.8,
  });

  slide.addText("AI语言模型发展历程", {
    ...autoFontSize("AI语言模型发展历程", HEAD_FONT, {
      x: 0.82,
      y: 1.22,
      w: 4.8,
      h: 0.78,
      fontSize: 31,
      minFontSize: 27,
      maxFontSize: 31,
      fontWeight: "bold",
      margin: 0,
      mode: "shrink",
    }),
    fontFace: HEAD_FONT,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });

  const subtitle =
    "从统计语言模型、RNN 与 Transformer，走到多模态、长上下文、开放权重与推理模型。";
  const subtitleBox = calcTextBox(14.5, {
    text: subtitle,
    w: 4.52,
    fontFace: BODY_FONT,
    margin: 0,
    padding: 0.01,
    leading: 1.15,
  });
  slide.addText(subtitle, {
    x: 0.86,
    y: 2.2,
    w: 4.6,
    h: subtitleBox.h,
    fontFace: BODY_FONT,
    fontSize: 14.5,
    color: "D7E0EF",
    margin: 0,
    leading: 1.15,
  });

  addTag(slide, "2017-2025 主线", 0.86, 0.72, COLORS.gold, COLORS.dark, 1.56);
  addTag(slide, "前史补足", 2.52, 0.72, COLORS.teal, COLORS.dark, 1.18);

  ["架构跃迁", "规模革命", "对齐训练", "产品化", "推理强化"].forEach((label, index) => {
    addTag(
      slide,
      label,
      0.86 + index * 0.98,
      5.7,
      index % 2 === 0 ? "23304A" : "1B2439",
      index % 2 === 0 ? COLORS.gold : "D7E0EF",
      0.88
    );
  });

  slide.addText("语言模型的故事，不只是模型变大，而是“可并行的架构 + 可迁移的预训练 + 可对齐的交互界面”逐层叠加。", {
    x: 0.86,
    y: 6.18,
    w: 5.36,
    h: 0.46,
    fontFace: BODY_FONT,
    fontSize: 10.8,
    color: "9FA8BD",
    italic: true,
    margin: 0,
  });

  slide.addText("OpenAI Codex | editable deck", {
    x: 0.86,
    y: 6.94,
    w: 2.6,
    h: 0.18,
    fontFace: MONO_FONT,
    fontSize: 8.8,
    color: COLORS.teal,
    margin: 0,
  });

  finalizeSlide(slide);
}

function buildOverview() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.gold);
  addHeader(
    slide,
    2,
    "overview",
    "一页看懂语言模型的几次拐点",
    "本质上是三次叠加：架构革命、规模革命、对齐革命；2024-2025 又叠加了长上下文、开放权重与推理强化。"
  );

  slide.addShape(pptx.ShapeType.line, {
    x: 0.96,
    y: 3.06,
    w: 11.42,
    h: 0,
    line: { color: COLORS.line, pt: 2.1 },
  });

  const milestones = [
    ["1980s-2016", "统计/循环", "n-gram, RNN, LSTM", COLORS.teal, 1.05],
    ["2017", "Transformer", "self-attention 并行化", COLORS.blue, 3.18],
    ["2018-2019", "预训练迁移", "BERT 让“预训练+微调”成为主流", COLORS.gold, 5.12],
    ["2020-2022", "规模与对齐", "GPT-3, InstructGPT, ChatGPT", COLORS.red, 7.34],
    ["2023", "多模态平台", "GPT-4 走向产品化平台", COLORS.green, 9.42],
    ["2024-2025", "长上下文/推理", "Gemini 1.5, Claude 3.5, Llama 3, DeepSeek-R1", COLORS.blue, 11.18],
  ];
  milestones.forEach(([year, label, note, color, x]) => addMilestone(slide, x, 2.92, year, label, note, color));

  addCard(slide, {
    x: 0.78,
    y: 4.05,
    w: 3.82,
    h: 1.92,
    title: "输入形态在变",
    body: "从词预测，到段落生成，再到图文、音频、长文档与外部工具调用。模型不再只面对一段短文本。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 15,
  });
  addCard(slide, {
    x: 4.76,
    y: 4.05,
    w: 3.82,
    h: 1.92,
    title: "优化目标在变",
    body: "早期更看重困惑度与下游分数；今天还要同时考虑有用性、安全性、可控性、成本和延迟。",
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMax: 15,
  });
  addCard(slide, {
    x: 8.74,
    y: 4.05,
    w: 3.82,
    h: 1.92,
    title: "产品边界在变",
    body: "从 API 到聊天机器人，再到可检索、可执行、可验证的 agent/workflow 系统。",
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMax: 15,
  });

  finalizeSlide(slide);
}

function buildOrigins() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.teal);
  addHeader(
    slide,
    3,
    "prehistory",
    "Transformer 之前：统计方法与序列神经网络",
    "真正的“语言模型”能力并非突然出现。Transformer 接住的是几十年对语言建模、表示学习和序列训练的积累。"
  );

  addBulletPanel(slide, 0.78, 1.66, 3.76, 4.7, "阶段演进", [
    "1950s-1980s：规则系统与符号 AI 为主，知识可解释，但维护成本高。",
    "1990s-2000s：n-gram + 平滑方法统治工业语言建模，擅长局部统计，不擅长长距离依赖。",
    "2013-2016：word2vec、seq2seq、attention、LSTM 让表示学习和端到端训练成为主流。",
  ], COLORS.teal);

  addCard(slide, {
    x: 4.86,
    y: 1.66,
    w: 3.46,
    h: 2.22,
    title: "旧范式的瓶颈",
    body: bulletRuns([
      "RNN/LSTM 训练天然串行，难以充分吃满并行算力。",
      "长距离依赖会逐步衰减，模型难把全局语义“同时看到”。",
      "预训练与迁移能力有限，知识更像任务专用而非通用底座。",
    ]),
    accent: COLORS.red,
    fill: COLORS.white,
    bodyMin: 11.3,
    bodyMax: 13.6,
  });
  addCard(slide, {
    x: 8.5,
    y: 1.66,
    w: 4.04,
    h: 2.22,
    title: "为什么 2017 会爆发",
    body: bulletRuns([
      "注意力机制已经被证明能改进 seq2seq。",
      "更大的语料、GPU/TPU 与分布式训练逐渐成熟。",
      "产业开始相信“统一预训练底座”比大量小模型更划算。",
    ]),
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMin: 11.3,
    bodyMax: 13.6,
  });

  slide.addText("底层矛盾", {
    x: 4.88,
    y: 4.34,
    w: 1.06,
    h: 0.18,
    fontFace: MONO_FONT,
    fontSize: 9,
    bold: true,
    color: COLORS.slate,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 4.9,
    y: 4.74,
    w: 7.22,
    h: 0,
    line: { color: COLORS.line, pt: 1.5 },
  });
  ["串行训练", "局部上下文", "任务孤岛", "迁移成本高"].forEach((label, index) => {
    addTag(slide, label, 4.9 + index * 1.82, 4.52, index % 2 === 0 ? COLORS.sand : COLORS.mist, COLORS.ink, 1.58);
  });
  slide.addText("Transformer 并不是“突然更聪明”，而是第一次把计算并行性、全局依赖建模、统一预训练底座这三件事同时做对了。", {
    x: 4.9,
    y: 5.24,
    w: 7.24,
    h: 0.72,
    fontFace: BODY_FONT,
    fontSize: 14.4,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    leading: 1.18,
  });

  finalizeSlide(slide);
}

function buildTransformerEra() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.blue);
  addHeader(
    slide,
    4,
    "2017-2019",
    "Transformer 把“可扩展性”带进语言模型",
    "从这一步开始，语言模型进入了以注意力为中心的家族演化：encoder、decoder 和 encoder-decoder 分工逐渐清晰。"
  );

  addCard(slide, {
    x: 0.78,
    y: 1.64,
    w: 4.2,
    h: 4.96,
    title: "2017 关键变化",
    body: bulletRuns([
      "Self-attention 让序列中每个 token 直接看到其它 token，长距离依赖不再只靠“记忆链条”。",
      "训练可以高度并行化，模型扩展速度第一次明显超越 RNN 家族。",
      "同一套架构既能做理解，也能做生成，还能进一步演化成统一预训练底座。",
    ]),
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMin: 12.2,
    bodyMax: 14.5,
  });

  addCard(slide, {
    x: 5.16,
    y: 1.64,
    w: 3.18,
    h: 2.24,
    title: "Transformer",
    body: "《Attention Is All You Need》提交于 2017-06-12，标志着“注意力优先”的架构路线成为主流。",
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMax: 14.4,
  });
  addCard(slide, {
    x: 8.52,
    y: 1.64,
    w: 4.0,
    h: 2.24,
    title: "BERT",
    body: "2019 NAACL 版本把双向预训练 + 下游微调推到工业主流，模型从“针对任务训练”转向“先学通用语言，再迁移”。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 14.2,
  });

  addTag(slide, "模型分工", 5.18, 4.14, COLORS.sand, COLORS.ink, 1.22);
  addCard(slide, {
    x: 5.16,
    y: 4.54,
    w: 2.1,
    h: 1.82,
    title: "理解任务",
    body: "更擅长分类、抽取、问答等“读懂再判断”的任务。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 12.8,
    titleMax: 15,
  });
  addCard(slide, {
    x: 7.48,
    y: 4.54,
    w: 2.1,
    h: 1.82,
    title: "生成任务",
    body: "自回归 decoder 更适合开放生成，后来成为 GPT 系列主路线。",
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMax: 12.8,
    titleMax: 15,
  });
  addCard(slide, {
    x: 9.8,
    y: 4.54,
    w: 2.72,
    h: 1.82,
    title: "统一接口",
    body: "text-to-text 思路让更多任务被写成统一输入输出格式，为后面的 instruction tuning 铺路。",
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMax: 12.8,
    titleMax: 15,
  });

  finalizeSlide(slide);
}

function buildScalingAndAlignment() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.red);
  addHeader(
    slide,
    5,
    "2020-2022",
    "规模定律之外，更关键的是“对齐”",
    "GPT-3 证明大模型能通过 in-context learning 做通用任务；InstructGPT 和 ChatGPT 则证明“让模型更像一个合作对象”同样重要。"
  );

  addCard(slide, {
    x: 0.78,
    y: 1.78,
    w: 3.76,
    h: 2.1,
    title: "2020 | GPT-3",
    body: "论文明确写到模型拥有 1750 亿参数，并展示 few-shot / zero-shot 能力，很多任务无需再单独训练专门模型。",
    accent: COLORS.red,
    fill: COLORS.white,
    bodyMax: 14.4,
  });

  addCard(slide, {
    x: 8.8,
    y: 1.78,
    w: 3.72,
    h: 2.1,
    title: "2022 | ChatGPT",
    body: "2022-11-30 发布后，对话界面把语言模型从 API 能力变成大众产品；“提示词”第一次进入主流工作流。",
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMax: 14.2,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.84,
    y: 1.82,
    w: 3.32,
    h: 4.62,
    rectRadius: 0.08,
    line: { color: COLORS.sand, pt: 1 },
    fill: { color: COLORS.white },
  });
  slide.addText("从“会续写”到“会合作”", {
    x: 5.08,
    y: 2.06,
    w: 2.84,
    h: 0.26,
    fontFace: HEAD_FONT,
    fontSize: 18,
    bold: true,
    color: COLORS.ink,
    align: "center",
    margin: 0,
  });
  const flowX = 5.26;
  const flowY = [2.56, 3.3, 4.04, 4.78];
  [
    ["预训练", "海量文本上学习分布"],
    ["指令微调", "让输出更贴近用户意图"],
    ["RLHF", "引入人类偏好与安全约束"],
    ["聊天产品", "把交互链路暴露给普通用户"],
  ].forEach(([title, note], index) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: flowX,
      y: flowY[index],
      w: 2.48,
      h: 0.56,
      rectRadius: 0.06,
      line: { color: index === 2 ? COLORS.red : COLORS.line, pt: 1.1 },
      fill: { color: index === 2 ? "FCE6E6" : COLORS.paper },
    });
    slide.addText(title, {
      x: flowX + 0.16,
      y: flowY[index] + 0.06,
      w: 2.14,
      h: 0.16,
      fontFace: BODY_FONT,
      fontSize: 11.2,
      bold: true,
      color: COLORS.ink,
      align: "center",
      margin: 0,
    });
    slide.addText(note, {
      x: flowX + 0.14,
      y: flowY[index] + 0.24,
      w: 2.16,
      h: 0.16,
      fontFace: BODY_FONT,
      fontSize: 8.9,
      color: COLORS.slate,
      align: "center",
      margin: 0,
    });
    if (index < flowY.length - 1) {
      slide.addShape(pptx.ShapeType.line, {
        x: flowX + 1.24,
        y: flowY[index] + 0.56,
        w: 0,
        h: 0.18,
        line: { color: COLORS.line, pt: 1.3, beginArrowType: "none", endArrowType: "triangle" },
      });
    }
  });

  addCard(slide, {
    x: 0.78,
    y: 4.26,
    w: 3.76,
    h: 2.18,
    title: "2022 | InstructGPT",
    body: "OpenAI 的 RLHF 论文把“人类更偏好的回答”作为目标之一，说明后训练不只是锦上添花，而是体验核心。",
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMax: 14.2,
  });

  addCard(slide, {
    x: 8.8,
    y: 4.26,
    w: 3.72,
    h: 2.18,
    title: "行业影响",
    body: "从这一阶段开始，模型竞争不再只看参数量，还要看工具调用、系统提示、内容审核、延迟与单位成本。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 14.2,
  });

  finalizeSlide(slide);
}

function buildMultimodalAndContext() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.gold);
  addHeader(
    slide,
    6,
    "2023-2024",
    "多模态与长上下文，把语言模型变成工作平台",
    "模型开始同时处理图像、长文档和更复杂的工作流，API 不再只是“补全文本”，而是变成更通用的软件能力层。"
  );

  addCard(slide, {
    x: 0.78,
    y: 1.76,
    w: 3.72,
    h: 4.9,
    title: "GPT-4 | 2023-03-14",
    body: "官方页将 GPT-4 定义为“multimodal”，可以接收图像与文本输入、输出文本。这一步把能力边界从纯文本聊天推进到更泛化的感知与工作辅助。",
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMax: 14.1,
  });

  addCard(slide, {
    x: 4.82,
    y: 1.76,
    w: 3.72,
    h: 4.9,
    title: "Gemini 1.5 | 2024-02-15",
    body: "Google 在官方公告中强调 1M token 上下文窗口。长上下文意味着模型开始有能力“读完整份材料再回答”，检索与记忆设计随之变化。",
    accent: COLORS.gold,
    fill: COLORS.white,
    bodyMax: 14.1,
  });

  addCard(slide, {
    x: 8.86,
    y: 1.76,
    w: 3.68,
    h: 4.9,
    title: "Claude 3.5 Sonnet | 2024-06-20",
    body: "Anthropic 把它定位为在 frontier intelligence 上更强、同时速度约为 Claude 3 Opus 的两倍。模型竞赛开始明显转向“质量 + 速度 + 可靠工作流”。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 13.8,
  });

  addTag(slide, "看得更多", 1.18, 5.98, COLORS.mist, COLORS.ink, 0.98);
  addTag(slide, "读得更长", 5.22, 5.98, COLORS.sand, COLORS.ink, 1.02);
  addTag(slide, "用得更稳", 9.3, 5.98, "DCEFE3", COLORS.ink, 0.98);

  finalizeSlide(slide);
}

function buildOpenAndReasoning() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.teal);
  addHeader(
    slide,
    7,
    "2024-2025",
    "开放权重与推理模型，重新定义竞争焦点",
    "到这一阶段，问题不再只是“谁更会聊天”，而是“谁更便宜、更可部署、更会调用工具、更能在推理链路中自我修正”。"
  );

  addCard(slide, {
    x: 0.78,
    y: 1.72,
    w: 5.88,
    h: 2.48,
    title: "开放权重路线：Llama 3 代表了能力扩散",
    body: "Meta 在 2024-04-18 的官方发布中把 Llama 3 推向更大规模生态。开放权重让蒸馏、微调、私有部署与行业模型更快扩散，竞争从“只有谁有前沿模型”转向“谁能最快落地”。",
    accent: COLORS.teal,
    fill: COLORS.white,
    bodyMax: 14.4,
  });

  addCard(slide, {
    x: 6.84,
    y: 1.72,
    w: 5.68,
    h: 2.48,
    title: "推理强化路线：DeepSeek-R1 把 RL 再次推上台前",
    body: "论文提交日期为 2025-01-22，并在摘要中强调 reasoning models can emerge from pure reinforcement learning。重点从静态回答转向推理过程、验证、反思与测试时计算。",
    accent: COLORS.blue,
    fill: COLORS.white,
    bodyMax: 13.9,
  });

  addBulletPanel(slide, 0.78, 4.48, 3.0, 1.88, "系统能力", [
    "工具使用",
    "检索与文件理解",
    "代码生成与测试循环",
  ], COLORS.gold);
  addBulletPanel(slide, 4.02, 4.48, 3.0, 1.88, "工程约束", [
    "单位成本",
    "时延与吞吐",
    "部署和数据主权",
  ], COLORS.red);
  addBulletPanel(slide, 7.26, 4.48, 2.7, 1.88, "评测变化", [
    "从 benchmark 到 workflow",
    "从单次回答到多步任务",
  ], COLORS.teal);
  addBulletPanel(slide, 10.2, 4.48, 2.32, 1.88, "产品结果", [
    "Copilot",
    "Agent",
    "行业工作台",
  ], COLORS.blue);

  finalizeSlide(slide);
}

function buildTakeaways() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.dark };
  addTopRule(slide, COLORS.teal, true);
  addHeader(
    slide,
    8,
    "takeaways",
    "今天再看语言模型，关键结论是什么",
    "架构仍然重要，但真正决定产品差异的，越来越是后训练、工具链、系统设计和推理时计算。",
    true
  );

  addCard(slide, {
    x: 0.78,
    y: 1.76,
    w: 5.84,
    h: 1.76,
    title: "结论 1 | 主干架构仍是 Transformer 家族",
    body: "虽然名字不断变化，但过去几年主流语言模型仍然围绕 Transformer 及其变体展开。",
    accent: COLORS.gold,
    fill: "131C31",
    titleColor: COLORS.white,
    bodyColor: "D7E0EF",
    dark: true,
    bodyMax: 13.6,
  });
  addCard(slide, {
    x: 6.74,
    y: 1.76,
    w: 5.78,
    h: 1.76,
    title: "结论 2 | 参数不是全部，post-training 越来越重要",
    body: "指令微调、偏好优化、系统提示、工具调用与安全策略共同决定了最终体验。",
    accent: COLORS.teal,
    fill: "131C31",
    titleColor: COLORS.white,
    bodyColor: "D7E0EF",
    dark: true,
    bodyMax: 13.6,
  });
  addCard(slide, {
    x: 0.78,
    y: 3.88,
    w: 5.84,
    h: 1.76,
    title: "结论 3 | 聊天只是入口，系统化能力才是终局",
    body: "当模型能读长文档、调用工具、执行验证时，它更像一个软件子系统，而不是单一问答器。",
    accent: COLORS.blue,
    fill: "131C31",
    titleColor: COLORS.white,
    bodyColor: "D7E0EF",
    dark: true,
    bodyMax: 13.4,
  });
  addCard(slide, {
    x: 6.74,
    y: 3.88,
    w: 5.78,
    h: 1.76,
    title: "结论 4 | 闭源 frontier 与开放生态会长期并存",
    body: "前者追求极限性能，后者追求扩散速度、低成本与可控部署；两条路线都会继续存在。",
    accent: COLORS.red,
    fill: "131C31",
    titleColor: COLORS.white,
    bodyColor: "D7E0EF",
    dark: true,
    bodyMax: 13.4,
  });

  slide.addText("继续观察的四个变量", {
    x: 0.78,
    y: 6.18,
    w: 2.4,
    h: 0.2,
    fontFace: MONO_FONT,
    fontSize: 9,
    bold: true,
    color: COLORS.gold,
    margin: 0,
  });
  ["推理时计算", "上下文成本", "工具可靠性", "行业工作流整合"].forEach((item, index) => {
    addTag(slide, item, 3.34 + index * 2.2, 6.02, index % 2 === 0 ? "23304A" : "1B2439", COLORS.white, 1.86);
  });

  finalizeSlide(slide);
}

function buildReferences() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addTopRule(slide, COLORS.gold);
  addHeader(
    slide,
    9,
    "references",
    "参考来源",
    "最近节点优先使用官方论文、机构博客或官方研究页面；链接已保留，便于后续继续扩展这份 deck。"
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.78,
    y: 1.76,
    w: 12.0,
    h: 4.62,
    rectRadius: 0.08,
    line: { color: COLORS.line, pt: 1 },
    fill: { color: COLORS.white },
  });

  const left = sources.slice(0, 5);
  const right = sources.slice(5);
  function addSourceColumn(items, x) {
    items.forEach((entry, index) => {
      const y = 2.04 + index * 0.9;
      slide.addText(entry.year, {
        x,
        y,
        w: 0.5,
        h: 0.16,
        fontFace: MONO_FONT,
        fontSize: 9.6,
        bold: true,
        color: COLORS.blue,
        margin: 0,
      });
      slide.addText(entry.title, {
        x: x + 0.62,
        y: y - 0.02,
        w: 4.88,
        h: 0.2,
        fontFace: BODY_FONT,
        fontSize: 10.8,
        bold: true,
        color: COLORS.ink,
        margin: 0,
      });
      slide.addText(entry.url, {
        x: x + 0.62,
        y: y + 0.24,
        w: 4.9,
        h: 0.42,
        fontFace: MONO_FONT,
        fontSize: 7.8,
        color: COLORS.slate,
        margin: 0,
      });
    });
  }
  addSourceColumn(left, 1.12);
  addSourceColumn(right, 6.84);

  slide.addText("构建说明", {
    x: 0.94,
    y: 6.72,
    w: 1.12,
    h: 0.18,
    fontFace: MONO_FONT,
    fontSize: 8.8,
    bold: true,
    color: COLORS.slate,
    margin: 0,
  });
  slide.addText("这份演示文稿由 PptxGenJS 生成，保留了可编辑文本和形状对象，便于继续改写、增删页或替换配色。", {
    x: 2.06,
    y: 6.68,
    w: 10.2,
    h: 0.22,
    fontFace: BODY_FONT,
    fontSize: 9.8,
    color: COLORS.slate,
    margin: 0,
  });

  finalizeSlide(slide);
}

async function main() {
  const outDir = path.join(__dirname, "dist");
  fs.mkdirSync(outDir, { recursive: true });
  buildCover();
  buildOverview();
  buildOrigins();
  buildTransformerEra();
  buildScalingAndAlignment();
  buildMultimodalAndContext();
  buildOpenAndReasoning();
  buildTakeaways();
  buildReferences();

  const outputFile = path.join(outDir, "ai-language-model-history.pptx");
  await pptx.writeFile({ fileName: outputFile });
  console.log(`Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
