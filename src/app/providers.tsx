"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import "dayjs/locale/fr";
import dayjs from "dayjs";

dayjs.locale("fr");

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry layer>
      <ConfigProvider
        locale={frFR}
        theme={{
          token: {
            colorPrimary: "#2563eb",
            borderRadius: 10,
            fontFamily: "inherit",
            fontSize: 13,
          },
          components: {
            Form: { labelFontSize: 12, verticalLabelPadding: "0 0 6px" },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
