import { useParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fmt = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export default function RelatorioPedido() {
  const { id } = useParams();
  const { pedidos, ops } = useStore() as any;
  const order = pedidos.find((p: any) => p.id === id);
  const orderOps = ops.filter((o: any) => o.orderId === id);

  if (!order) return <div className="p-6">Pedido não encontrado.</div>;

  const items = (orderOps[0]?.items || []) as any[];
  let totalStages = 0;
  let totalMs = 0;
  let totalCheck = 0;
  let totalCheckDone = 0;
  items.forEach((it) => {
    (it.stages || []).forEach((s: any) => {
      totalStages += 1;
      const cron = s.cron || { totalMs: 0 };
      totalMs += cron.totalMs || 0;
      totalCheck += (s.checklist || []).length;
      totalCheckDone += (s.checklist || []).filter((i: any) => i.done).length;
    });
  });

  const overdue = new Date(order.slaISO).getTime() < Date.now();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <span>Relatório • {order.id}</span>
            <span className="text-base font-normal">{order.clientName}</span>
            <Badge className={overdue ? 'bg-destructive text-white' : ''}>
              SLA: {new Date(order.slaISO).toLocaleString('pt-BR')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Itens: {items.length}</div>
          <div>Etapas totais: {totalStages}</div>
          <div>Tempo total em execução (somado): {fmt(totalMs)}</div>
          <div>Checklist concluído: {totalCheckDone}/{totalCheck}</div>
        </CardContent>
      </Card>

      {items.map((it, idx) => (
        <Card key={it.id} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              Item {idx + 1} — {it.productName} • {it.colorName} ({it.totalQty} pçs)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(it.stages || []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.kind === 'Terceirizada' ? 'secondary' : 'default'}>{s.kind || 'Interna'}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Tempo: {fmt((s.cron?.totalMs) || 0)} • Status: {s.status}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

