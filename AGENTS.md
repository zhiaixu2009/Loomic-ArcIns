## 核心要求
- 代码旨在为高效生产和高质量要求而不是MVP搭建DEMO完成，完成功能要考虑产品特性和整体交互，阅读以及撰写时思维需要有大局观，以第一性原理直击痛点。
- 在相关代码加入对应日志便于后续线上或本地排查，以及TODO或相关备注 为后续他人接手提供更好的桥梁。赠人玫瑰手留余香。

# langchain框架使用指南

关于langchain，langgraph，deepagents相关开发查看官方llm.txt 作为索引 看对应网址文档 获取最佳实践，https://docs.langchain.com/llms.txt

对于其他框架包括nextjs,excalidraw等不理解或者不熟悉的地方 一定要 先去看文档或者源码再开始！ 确保先获取信息上下文再开干，不然容易导致返工。
## Subagent 默认策略
- 本仓库内任何 spawn_agent 调用都必须显式传入 model: "gpt-5.4"，除非用户明确要求其他模型。
- 不要因为任务看起来简单，就自动降级到 mini / cheap / codex-mini 一类模型。
- 如果后续确实需要改用其他模型，先在 progress.md 记录原因、风险和回退方案，再执行。
