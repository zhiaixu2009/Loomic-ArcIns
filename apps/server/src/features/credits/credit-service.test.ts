import { describe, expect, it, vi } from "vitest";

import { createCreditService } from "./credit-service.js";

describe("createCreditService", () => {
  it("omits the optional refund description when none is provided", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "tx_refund_123",
      error: null,
    });

    const service = createCreditService({
      getAdminClient: vi.fn(
        () =>
          ({
            rpc,
          }) as never,
      ),
    });

    const transactionId = await service.refundCredits(
      "workspace_123",
      "user_123",
      25,
      "job_123",
    );

    expect(transactionId).toBe("tx_refund_123");
    expect(rpc).toHaveBeenCalledWith("refund_credits", {
      p_workspace_id: "workspace_123",
      p_user_id: "user_123",
      p_amount: 25,
      p_job_id: "job_123",
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_description");
  });
});
