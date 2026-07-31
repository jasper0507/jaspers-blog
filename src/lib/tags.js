export const tagVocabulary = {
  人工智能: "artificial-intelligence",
  后端开发: "backend",
  工程实践: "engineering",
  计算机基础: "computer-science",
  计算机网络: "computer-networks",
  教程: "tutorials",
  联邦学习: "federated-learning",
  论文精读: "paper-notes",
  模型架构: "model-architecture",
  容器与环境: "containers",
  深度学习基础: "deep-learning",
  数据结构与算法: "data-structures-and-algorithms",
  算法: "algorithms",
  文档写作: "documentation",
  学习笔记: "study-notes",
  医学影像: "medical-imaging",
  语言基础: "language-basics",
  站点与博客: "websites-and-blogs",
  知识蒸馏: "knowledge-distillation",
  版本控制: "version-control",
  "Web 框架": "web-frameworks",
  Docker: "docker",
  Gin: "gin",
  Git: "git",
  GitHub: "github",
  Go: "go",
  Hexo: "hexo",
  Linux: "linux",
  LoRA: "lora",
  Markdown: "markdown",
  PEFT: "peft",
  PyTorch: "pytorch",
  Transformer: "transformer",
  WSL: "wsl",
};

export const tags = Object.entries(tagVocabulary).map(([name, slug]) => ({
  name,
  slug,
}));

export function getTagError(tag) {
  if (!Object.hasOwn(tagVocabulary, tag)) return `未登记标签：${tag}`;
}

export function getTagSlug(tag) {
  const error = getTagError(tag);
  if (error) throw new Error(error);
  return tagVocabulary[tag];
}
