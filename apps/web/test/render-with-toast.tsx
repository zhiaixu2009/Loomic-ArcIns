import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { ToastProvider } from "../src/components/toast";

export function renderWithToast(ui: ReactElement): RenderResult {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
