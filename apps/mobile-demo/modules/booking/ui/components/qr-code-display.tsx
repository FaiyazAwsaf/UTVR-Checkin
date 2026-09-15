"use client";

import { QRCodeSVG } from "qrcode.react";

export const QrCodeDisplay = ({ value }: { value: string }) => {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <QRCodeSVG level="M" size={200} value={value} />
    </div>
  );
};
