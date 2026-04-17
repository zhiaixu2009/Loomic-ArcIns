-- Align legacy English defaults with the Chinese-first studio experience.
ALTER TABLE public.chat_sessions
  ALTER COLUMN title SET DEFAULT '新对话';

UPDATE public.chat_sessions
SET title = '新对话'
WHERE btrim(title) = 'New Chat';

UPDATE public.projects
SET name = '未命名项目'
WHERE btrim(name) = 'Untitled';
