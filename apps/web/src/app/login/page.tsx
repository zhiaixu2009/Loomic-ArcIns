"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AuthShell } from "../../components/auth/auth-shell";
import { LoginForm } from "../../components/login-form";
import { LoadingScreen } from "../../components/loading-screen";
import { useAuth } from "../../lib/auth-context";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_missing_code: "登录链接不完整，请重新获取后再试。",
  auth_exchange_failed: "这个登录链接无法验证，请重新获取后再试。",
  viewer_bootstrap_failed: "账号验证成功，但进入工作台失败，请稍后重试。",
  auth_callback_timeout: "登录耗时过长，请重新尝试。",
};

function LoginPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const initialErrorMessage = callbackError
    ? CALLBACK_ERROR_MESSAGES[callbackError] ??
      "无法完成登录，请稍后重试。"
    : null;

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading || user) return <LoadingScreen />;

  return (
    <AuthShell
      title="欢迎回来"
      description="登录后继续上次的无限画布创作与协同设计流程。"
      features={[
        "支持密码、登录链接与 Google 登录",
        "项目画布、对话记录与协作状态统一保存",
        "从灵感推敲到方案交付都留在同一个工作台里",
      ]}
    >
      <LoginForm initialErrorMessage={initialErrorMessage} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginPageContent />
    </Suspense>
  );
}
