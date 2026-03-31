# Lemon Squeezy 产品创建指南

> 代码已全部就绪，你只需要在 Lemon Squeezy Dashboard 创建产品，然后把 variant ID 填到 `.env.local` 即可。

## 步骤 1：创建 4 个产品

登录 [app.lemonsqueezy.com](https://app.lemonsqueezy.com)，在 Store "loomicfancy" 中创建以下产品：

| 产品名称 | 描述 |
|---------|------|
| **Loomic Starter** | 个人创作者的起点 - 1,200 积分/月 |
| **Loomic Pro** | 专业设计师的首选 - 5,000 积分/月 |
| **Loomic Ultra** | 团队与高产出工作室 - 15,000 积分/月 |
| **Loomic Business** | 规模化创意生产 - 50,000 积分/月 |

## 步骤 2：为每个产品创建 2 个 Variant（价格方案）

每个产品创建 **Monthly** 和 **Yearly** 两个订阅变体：

### Loomic Starter
| Variant 名称 | 价格 | 计费周期 |
|-------------|------|---------|
| Monthly | ¥89/月 (≈$12) | Monthly subscription |
| Yearly | ¥649/年 (≈$108, 即 ¥54/月) | Yearly subscription |

### Loomic Pro
| Variant 名称 | 价格 | 计费周期 |
|-------------|------|---------|
| Monthly | ¥289/月 (≈$39) | Monthly subscription |
| Yearly | ¥2,149/年 (≈$348, 即 ¥179/月) | Yearly subscription |

### Loomic Ultra
| Variant 名称 | 价格 | 计费周期 |
|-------------|------|---------|
| Monthly | ¥719/月 (≈$99) | Monthly subscription |
| Yearly | ¥5,749/年 (≈$948, 即 ¥479/月) | Yearly subscription |

### Loomic Business
| Variant 名称 | 价格 | 计费周期 |
|-------------|------|---------|
| Monthly | ¥1,799/月 (≈$249) | Monthly subscription |
| Yearly | ¥14,389/年 (≈$2,388, 即 ¥1,199/月) | Yearly subscription |

> 价格仅供参考，你可以根据实际需求调整。

## 步骤 3：记录 Variant ID

创建完成后，每个 Variant 会有一个数字 ID。在产品详情页或 Variant 列表中可以看到。

## 步骤 4：填入 `.env.local`

```bash
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=123456
LEMONSQUEEZY_VARIANT_STARTER_YEARLY=123457
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=123458
LEMONSQUEEZY_VARIANT_PRO_YEARLY=123459
LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY=123460
LEMONSQUEEZY_VARIANT_ULTRA_YEARLY=123461
LEMONSQUEEZY_VARIANT_BUSINESS_MONTHLY=123462
LEMONSQUEEZY_VARIANT_BUSINESS_YEARLY=123463
```

## 步骤 5：配置 Webhook

1. 打开 [app.lemonsqueezy.com/settings/webhooks](https://app.lemonsqueezy.com/settings/webhooks)
2. 编辑之前创建的 webhook
3. 更新 Callback URL 为你的实际地址：
   - 本地测试：用 `ngrok http 3001` 获取公网 URL，然后填 `https://xxx.ngrok.io/api/payments/webhook`
   - 生产环境：`https://your-domain.com/api/payments/webhook`
4. 确保勾选了以下事件：
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_payment_success`
   - `subscription_payment_failed`

## 步骤 6：测试

1. 启动服务：`pnpm dev`
2. 打开 pricing 页面
3. 点击任意付费套餐的按钮
4. 应该弹出 Lemon Squeezy checkout 弹窗
5. 使用测试卡号 `4242 4242 4242 4242` 完成支付
6. Webhook 会自动触发，更新套餐和积分

## 步骤 7：验证

- 检查 Settings → Billing 页面是否显示订阅信息
- 检查积分余额是否增加了对应套餐的月度积分
- 检查 `/api/credits` 返回的 plan 是否已更新
