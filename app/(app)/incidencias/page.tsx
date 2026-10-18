import { Incidencias } from '@/components/Incidencias';

export default async function Page({searchParams}:{searchParams:Promise<{pedido?:string|string[]}>}) {
 const params=await searchParams;
 const id=typeof params.pedido==='string'?Number(params.pedido):NaN;
 return <Incidencias initialPedidoId={Number.isSafeInteger(id)&&id>0?id:undefined}/>;
}
