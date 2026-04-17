"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AuthShell } from "../../components/auth/auth-shell";
import { LoadingScreen } from "../../components/loading-screen";
import { RegisterForm } from "../../components/register-form";
import { useAuth } from "../../lib/auth-context";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router]);

  if (loading || user) return <LoadingScreen />;

  return (
    <AuthShell
      title="创建工作台账号"
      description="使用邮箱与密码注册，之后可在任意设备继续同一张画布与协同流程。"
      features={[
        "使用专属账号管理建筑项目与画布记录",
        "完成邮箱确认后可继续回到同一个工作台",
        "登录后沿用与正式用户一致的协同工作界面",
      ]}
    >
      <RegisterForm />
    </AuthShell>
  );
}
