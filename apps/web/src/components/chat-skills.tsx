"use client";

type Skill = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
};

const PRESET_SKILLS: Skill[] = [
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="3"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="5"
          y="14"
          width="4"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="10"
          y="8"
          width="4"
          height="12"
          rx="1"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="15"
          y="11"
          width="4"
          height="9"
          rx="1"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    ),
    label: "\u573a\u5730\u5206\u6790",
    prompt:
      "\u8bf7\u56f4\u7ed5\u5f53\u524d\u9879\u76ee\u751f\u6210\u4e00\u7248\u573a\u5730\u5206\u6790\u63d0\u7eb2\uff0c\u68b3\u7406\u533a\u4f4d\u3001\u52a8\u7ebf\u3001\u89c6\u7ebf\u3001\u65e5\u7167\u4e0e\u5173\u952e\u9650\u5236\uff0c\u5e76\u8bf4\u660e\u9002\u5408\u600e\u4e48\u653e\u5230\u753b\u5e03\u4e0a\u3002",
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} />
        <path
          d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    ),
    label: "\u4f53\u91cf\u63a8\u6f14",
    prompt:
      "\u8bf7\u8f93\u51fa 3 \u4e2a\u4f53\u91cf\u65b9\u5411\uff0c\u5bf9\u6bd4\u57fa\u5ea7\u7ec4\u7ec7\u3001\u9000\u53f0\u5173\u7cfb\u3001\u5929\u9645\u7ebf\u548c\u516c\u5171\u754c\u9762\uff0c\u5e76\u63a8\u8350\u6700\u503c\u5f97\u7ee7\u7eed\u6df1\u5316\u7684\u4e00\u7248\u3002",
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path
          d="M2 17l10 5 10-5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "\u7acb\u9762\u6c14\u8d28",
    prompt:
      "\u8bf7\u57fa\u4e8e\u5f53\u524d\u9700\u6c42\u751f\u6210 3 \u79cd\u7acb\u9762\u6750\u6599\u4e0e\u706f\u5149\u6c1b\u56f4\u65b9\u5411\uff0c\u5206\u522b\u8bf4\u660e\u9002\u7528\u573a\u666f\u3001\u98ce\u9669\u70b9\u548c\u540e\u7eed\u8868\u8fbe\u5efa\u8bae\u3002",
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    ),
    label: "\u955c\u5934\u811a\u672c",
    prompt:
      "\u8bf7\u4e3a\u5f53\u524d\u5efa\u7b51\u65b9\u6848\u751f\u6210\u4e00\u7ec4\u6f14\u793a\u89c6\u9891\u955c\u5934\u811a\u672c\uff0c\u5305\u542b\u5f00\u573a\u3001\u8fdb\u5165\u3001\u4e3b\u7a7a\u95f4\u3001\u7ec6\u8282\u4e0e\u6536\u675f\u955c\u5934\u3002",
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 4h16v16H4z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path d="M4 9h16M9 9v11" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    ),
    label: "\u6c47\u62a5\u63d0\u7eb2",
    prompt:
      "\u8bf7\u6574\u7406\u4e00\u7248\u5ba2\u6237\u6c47\u62a5\u7ed3\u6784\uff0c\u8bf4\u660e\u6bcf\u4e00\u9875\u5e94\u8be5\u653e\u54ea\u4e9b\u56fe\u3001\u54ea\u4e9b\u7ed3\u8bba\u4e0e\u5bf9\u6bd4\u5185\u5bb9\u3002",
  },
  {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path
          d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    ),
    label: "\u8bc4\u5ba1\u6e05\u5355",
    prompt:
      "\u8bf7\u751f\u6210\u4e00\u4efd\u5efa\u7b51\u65b9\u6848\u8bc4\u5ba1\u6e05\u5355\uff0c\u91cd\u70b9\u68c0\u67e5\u529f\u80fd\u3001\u4f53\u91cf\u3001\u7acb\u9762\u3001\u52a8\u7ebf\u3001\u6210\u672c\u4e0e\u8868\u8fbe\u5b8c\u6574\u6027\u3002",
  },
];

type ChatSkillsProps = {
  onSend: (text: string) => void;
};

export function ChatSkills({ onSend }: ChatSkillsProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-4">
      <p className="text-sm font-semibold text-foreground">
        {"\u8bd5\u8bd5\u8fd9\u4e9b\u5efa\u7b51\u521b\u4f5c\u6377\u5f84"}
      </p>
      <div className="flex max-w-[320px] flex-wrap justify-center gap-2">
        {PRESET_SKILLS.map((skill) => (
          <button
            key={skill.label}
            type="button"
            onClick={() => onSend(skill.prompt)}
            className="inline-flex h-9 max-w-full items-center justify-center gap-1 rounded-full border border-border bg-card px-[14px] text-sm text-foreground transition-colors hover:bg-muted active:bg-muted/80"
          >
            <span className="shrink-0 text-muted-foreground">{skill.icon}</span>
            <span className="truncate">{skill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
