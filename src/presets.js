import { FORMAT } from './model.js';

const presets = [
  ['analyze', '先分析再修改', 'Analyze first', '先阅读相关内容，说明你的理解和修改计划，再进行必要的修改。', 'Read the relevant material, explain your understanding and proposed changes, then make the necessary edits.', '常用', 'General', true],
  ['review', '检查本次改动', 'Review changes', '检查当前改动，重点寻找逻辑错误、边界情况和潜在回归。指出具体位置，并按影响程度排序。', 'Review the current changes for logic errors, edge cases and regressions. Give specific locations and rank findings by impact.', '代码', 'Code', true],
  ['test', '运行相关测试', 'Run relevant tests', '运行与当前改动相关的测试，修复由本次修改引起的问题，并说明测试结果与尚未验证的部分。', 'Run tests relevant to the current changes, fix regressions introduced by these changes, and report the results and unverified areas.', '代码', 'Code', true],
  ['continue', '继续完成', 'Continue the task', '继续完成当前任务，结合最新进度处理剩余事项；完成后说明结果。', 'Continue the current task using the latest progress, finish the remaining work, and report the result.', '常用', 'General', true],
  ['scope', '只修改相关文件', 'Keep changes focused', '将本次修改限定在完成任务所必需的文件和代码，遵循项目现有风格，避免无关重构。', 'Limit changes to the files and code needed for this task, follow the existing project style, and avoid unrelated refactoring.', '代码', 'Code', false],
  ['explain', '解释这段代码', 'Explain code', '解释以下代码的用途、执行过程和关键设计，用容易理解的语言说明：\n\n{{代码}}', 'Explain the purpose, execution flow and key design choices of this code in plain language:\n\n{{code}}', '代码', 'Code', false],
  ['summary', '总结当前进度', 'Summarize progress', '总结当前任务：目标、已经完成的工作、关键决定、剩余事项，以及下一步建议。', 'Summarize this task: goal, completed work, key decisions, remaining work, and suggested next steps.', '常用', 'General', false],
  ['polish', '润色文本', 'Polish text', '润色以下文本，使表达清晰简洁，保留原意、事实和术语。只输出润色后的正文：\n\n{{文本}}', 'Polish this text for clarity and concision while preserving its meaning, facts and terminology. Return only the edited text:\n\n{{text}}', '写作', 'Writing', false],
];

export function initialDocument(locale = 'zh') {
  const zh = locale.startsWith('zh');
  return {
    format: FORMAT, version: 1, recent: [], preferences: { shortcut: false, showPinned: true },
    prompts: presets.map(([id, titleZh, titleEn, contentZh, contentEn, categoryZh, categoryEn, pinned], index) => ({
      id: `builtin-${id}`, title: zh ? titleZh : titleEn, content: zh ? contentZh : contentEn,
      category: zh ? categoryZh : categoryEn, pinned, scope: 'global', workspace: '', createdAt: index, updatedAt: 0,
    })),
  };
}
