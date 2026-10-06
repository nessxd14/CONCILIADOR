"use client";
import { Overview } from "@/components/Overview";
import { useCartera } from "@/lib/use-cartera";
export default function Page() { const { data, cargar } = useCartera(); return <Overview data={data} onRefresh={cargar} />; }
