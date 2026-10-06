"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentReview } from "@/components/PaymentReview";
import { useCartera } from "@/lib/use-cartera";
export default function Page() {
  const [editing, setEditing] = useState(false);
  const params = useSearchParams();
  const { data, cargar, confirmarPago, confirmando, erroresPago } = useCartera(editing);
  const id = Number(params.get("pago"));
  return <PaymentReview data={data} onRefresh={cargar} onConfirm={confirmarPago} confirmando={confirmando} erroresPago={erroresPago} initialId={Number.isInteger(id) && id > 0 ? id : undefined} onEditing={setEditing} />;
}
